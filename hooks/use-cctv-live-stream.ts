'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CCTV_LIVE_CONNECT_TIMEOUT_MS,
  CCTV_LIVE_MAX_RECONNECT_ATTEMPTS,
  CCTV_LIVE_RECONNECT_DELAY_MS,
  CCTV_WHEP_PROXY_ENDPOINT,
} from '@/constants/cctv-monitoring';
import type {
  CctvCamera,
  CctvLiveStatus,
  UseCctvLiveStreamResult,
} from '@/types/cctv-monitoring';

/** 현재 재생 중인 스트림 상태. 어느 경로의 결과인지 함께 들고 다닌다. */
interface LiveState {
  streamPath: string;
  stream: MediaStream | null;
  status: CctvLiveStatus;
  error: string | null;
}

/**
 * ICE 후보 수집이 끝날 때까지 기다린다.
 * 후보를 모두 담아 한 번에 보내면(non-trickle) 세션 자원에 추가 요청을 보낼 필요가 없다.
 */
const waitForIceGathering = (pc: RTCPeerConnection, timeoutMs: number): Promise<void> =>
  new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const finish = () => {
      pc.removeEventListener('icegatheringstatechange', handleChange);
      window.clearTimeout(timeoutId);
      resolve();
    };

    const handleChange = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };

    // 후보 수집이 오래 걸려도 재생을 막지 않도록 시간이 지나면 그대로 진행한다
    const timeoutId = window.setTimeout(finish, timeoutMs);
    pc.addEventListener('icegatheringstatechange', handleChange);
  });

/**
 * WHEP(WebRTC)으로 카메라 실시간 영상을 재생한다.
 *
 * 동일 출처 프록시에 SDP 오퍼를 POST 해 앤서를 받아 연결하고,
 * 실제 영상은 브라우저와 카메라 서버가 WebRTC 로 직접 주고받는다.
 * `camera` 가 null 이면(모달이 닫히면) 연결과 세션을 정리한다.
 */
export function useCctvLiveStream(camera: CctvCamera | null): UseCctvLiveStreamResult {
  const [live, setLive] = useState<LiveState | null>(null);
  const [manualAttempt, setManualAttempt] = useState(0);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const timersRef = useRef<{ start: number | null; reconnect: number | null; connect: number | null }>({
    start: null,
    reconnect: null,
    connect: null,
  });
  const reconnectAttemptsRef = useRef(0);

  const streamPath = camera?.stream.path ?? null;

  const clearTimers = useCallback(() => {
    const timers = timersRef.current;
    (['start', 'reconnect', 'connect'] as const).forEach(key => {
      if (timers[key] !== null) {
        window.clearTimeout(timers[key] as number);
        timers[key] = null;
      }
    });
  }, []);

  /**
   * WHEP 세션을 서버에서 정리한다. 실패해도 화면 동작에는 영향이 없다.
   * `sendBeacon` 은 항상 POST 라 쓸 수 없어, 페이지 이탈 중에도 전송되도록 keepalive 를 쓴다.
   */
  const releaseSession = useCallback((resourceUrl: string) => {
    if (!resourceUrl) return;

    void fetch(`${CCTV_WHEP_PROXY_ENDPOINT}?resource=${encodeURIComponent(resourceUrl)}`, {
      method: 'DELETE',
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  const closePeer = useCallback(() => {
    const pc = peerRef.current;
    peerRef.current = null;
    if (!pc) return;

    // 정리 중 발생하는 이벤트로 상태가 다시 바뀌지 않게 핸들러부터 뗀다
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.oniceconnectionstatechange = null;

    const { __whepResource: resourceUrl } = pc as RTCPeerConnection & { __whepResource?: string };
    if (resourceUrl) releaseSession(resourceUrl);

    try {
      pc.close();
    } catch {
      // 이미 닫힌 연결은 무시한다
    }
  }, [releaseSession]);

  const retry = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setManualAttempt(current => current + 1);
  }, []);

  useEffect(() => {
    if (!streamPath) return undefined;

    const currentPath = streamPath;
    let isCancelled = false;

    /** 이 경로의 결과일 때만 상태를 갱신한다 (카메라를 바꾼 뒤 늦게 온 이벤트 무시) */
    const update = (patch: Partial<Omit<LiveState, 'streamPath'>>) => {
      if (isCancelled) return;
      setLive(current => {
        const base: LiveState =
          current?.streamPath === currentPath
            ? current
            : { streamPath: currentPath, stream: null, status: 'connecting', error: null };
        return { ...base, ...patch };
      });
    };

    const scheduleReconnect = (message: string) => {
      if (isCancelled) return;

      if (reconnectAttemptsRef.current >= CCTV_LIVE_MAX_RECONNECT_ATTEMPTS) {
        update({ status: 'error', error: message });
        return;
      }

      reconnectAttemptsRef.current += 1;
      timersRef.current.reconnect = window.setTimeout(connect, CCTV_LIVE_RECONNECT_DELAY_MS);
    };

    async function connect() {
      if (isCancelled) return;

      closePeer();

      const pc = new RTCPeerConnection({
        // 사내망 안에서만 쓰므로 외부 STUN 서버 없이 로컬 후보만 사용한다
        iceServers: [],
        bundlePolicy: 'max-bundle',
      });
      peerRef.current = pc;

      // 영상이 붙지 않은 채로 계속 기다리지 않도록 감시 타이머를 건다
      timersRef.current.connect = window.setTimeout(() => {
        if (isCancelled || pc.connectionState === 'connected') return;
        update({ status: 'error', error: '영상 서버에 연결하지 못했습니다. 다시 시도해주세요.' });
        closePeer();
      }, CCTV_LIVE_CONNECT_TIMEOUT_MS);

      // 트랙은 협상 직후 생기므로 화면에만 연결하고, 재생 표시는 실제 연결 이후로 미룬다
      pc.ontrack = event => {
        if (isCancelled) return;
        const [remoteStream] = event.streams;
        if (remoteStream) update({ stream: remoteStream });
      };

      pc.onconnectionstatechange = () => {
        if (isCancelled || peerRef.current !== pc) return;

        if (pc.connectionState === 'connected') {
          reconnectAttemptsRef.current = 0;
          if (timersRef.current.connect !== null) {
            window.clearTimeout(timersRef.current.connect);
            timersRef.current.connect = null;
          }
          update({ status: 'playing', error: null });
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          scheduleReconnect('실시간 영상 연결이 끊겼습니다. 다시 시도해주세요.');
        }
      };

      try {
        // 수신 전용으로 영상·음성 트랙을 요청한다
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIceGathering(pc, 3_000);

        if (isCancelled || peerRef.current !== pc) return;

        const response = await fetch(
          `${CCTV_WHEP_PROXY_ENDPOINT}?path=${encodeURIComponent(currentPath)}`,
          {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/sdp' },
            body: pc.localDescription?.sdp ?? offer.sdp ?? '',
          },
        );

        if (!response.ok) {
          throw new Error(`WHEP 요청 실패 (${response.status})`);
        }

        const answerSdp = await response.text();
        if (isCancelled || peerRef.current !== pc) return;

        // 세션 종료 요청에 쓰도록 자원 주소를 연결 객체에 함께 보관한다
        const resourceUrl = response.headers.get('x-whep-resource');
        if (resourceUrl) {
          (pc as RTCPeerConnection & { __whepResource?: string }).__whepResource = resourceUrl;
        }

        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      } catch (caught) {
        if (isCancelled || peerRef.current !== pc) return;
        console.error('[lab/cctv-monitoring] WHEP 연결 실패', caught);
        scheduleReconnect('실시간 영상 서버와 연결하지 못했습니다.');
      }
    }

    reconnectAttemptsRef.current = 0;
    // effect 본문에서 곧바로 상태를 바꾸지 않도록 다음 틱에 연결을 시작한다
    timersRef.current.start = window.setTimeout(connect, 0);

    return () => {
      isCancelled = true;
      clearTimers();
      closePeer();
    };
  }, [clearTimers, closePeer, manualAttempt, streamPath]);

  // 다른 카메라의 오래된 상태가 잠깐이라도 보이지 않도록 값은 파생시켜 돌려준다
  const isCurrent = Boolean(streamPath) && live?.streamPath === streamPath;

  if (!camera) {
    return { stream: null, status: 'idle', error: null, retry };
  }

  if (!streamPath) {
    return {
      stream: null,
      status: 'error',
      error: '이 카메라에는 실시간 영상 경로가 없습니다.',
      retry,
    };
  }

  return {
    stream: isCurrent ? (live?.stream ?? null) : null,
    status: isCurrent ? (live?.status ?? 'connecting') : 'connecting',
    error: isCurrent ? (live?.error ?? null) : null,
    retry,
  };
}
