'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CCTV_LIVE_FIRST_FRAME_TIMEOUT_MS,
  CCTV_LIVE_MAX_RECONNECT_ATTEMPTS,
  CCTV_LIVE_RECONNECT_DELAY_MS,
  CCTV_LIVE_STALL_TIMEOUT_MS,
} from '@/constants/cctv-monitoring';
import type {
  CctvCamera,
  CctvLiveStatus,
  UseCctvLiveStreamResult,
} from '@/types/cctv-monitoring';

/** 현재 재생 중인 스트림의 상태. 어느 주소의 결과인지 함께 들고 다닌다. */
interface LiveState {
  streamUrl: string;
  frameUrl: string | null;
  status: CctvLiveStatus;
  error: string | null;
  frameCount: number;
}

/**
 * 카메라의 실시간 영상 WebSocket 주소를 만든다.
 * 경로만 있고 기준 주소가 없으면 재생할 수 없으므로 null 을 돌려준다.
 */
const buildStreamUrl = (camera: CctvCamera | null): string | null => {
  if (!camera?.stream.baseUrl || !camera.stream.path) return null;

  try {
    return new URL(camera.stream.path, camera.stream.baseUrl).toString();
  } catch {
    return null;
  }
};

/**
 * HTTPS 페이지에서는 브라우저가 ws:// 연결을 혼합 콘텐츠로 차단한다.
 * 연결을 시도해도 원인을 알 수 없는 오류만 남으므로 미리 걸러 안내한다.
 */
const isBlockedByMixedContent = (streamUrl: string): boolean =>
  window.location.protocol === 'https:' && streamUrl.startsWith('ws://');

/**
 * WebSocket 으로 JPEG 프레임을 받아 실시간 영상을 재생한다.
 *
 * 메시지 한 건이 JPEG 한 장이며, 받은 즉시 Blob URL 로 바꿔 `<img>` 에 물린다.
 * 직전 프레임 URL 은 다음 프레임이 도착한 뒤에 해제해 깜빡임 없이 메모리를 회수한다.
 * `camera` 가 null 이면(모달이 닫히면) 연결을 정리한다.
 */
export function useCctvLiveStream(camera: CctvCamera | null): UseCctvLiveStreamResult {
  const [live, setLive] = useState<LiveState | null>(null);
  const [manualAttempt, setManualAttempt] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  /** 표시 중인 URL 과 직전 URL 을 함께 들고 있다가 오래된 것부터 해제한다 */
  const frameUrlsRef = useRef<string[]>([]);
  const timersRef = useRef<{ start: number | null; reconnect: number | null; watchdog: number | null }>({
    start: null,
    reconnect: null,
    watchdog: null,
  });
  const reconnectAttemptsRef = useRef(0);

  const streamUrl = buildStreamUrl(camera);

  const releaseFrameUrls = useCallback(() => {
    frameUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    frameUrlsRef.current = [];
  }, []);

  const clearTimers = useCallback(() => {
    const timers = timersRef.current;
    (['start', 'reconnect', 'watchdog'] as const).forEach(key => {
      if (timers[key] !== null) {
        window.clearTimeout(timers[key] as number);
        timers[key] = null;
      }
    });
  }, []);

  const closeSocket = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (!socket) return;

    // 정리 중 발생하는 이벤트로 상태가 다시 바뀌지 않게 핸들러부터 뗀다
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  }, []);

  const retry = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setManualAttempt(current => current + 1);
  }, []);

  useEffect(() => {
    if (!streamUrl) return undefined;

    const currentStreamUrl = streamUrl;
    let isCancelled = false;

    /** 이 스트림의 결과일 때만 상태를 갱신한다 (카메라를 바꾼 뒤 늦게 온 이벤트 무시) */
    const update = (patch: Partial<Omit<LiveState, 'streamUrl'>>) => {
      if (isCancelled) return;
      setLive(current => {
        const base: LiveState =
          current?.streamUrl === currentStreamUrl
            ? current
            : { streamUrl: currentStreamUrl, frameUrl: null, status: 'connecting', error: null, frameCount: 0 };
        return { ...base, ...patch };
      });
    };

    /** 첫 프레임 지연과 중간 끊김을 같은 타이머로 감시한다 */
    const armWatchdog = (timeoutMs: number, message: string) => {
      if (timersRef.current.watchdog !== null) window.clearTimeout(timersRef.current.watchdog);
      timersRef.current.watchdog = window.setTimeout(() => {
        update({ status: 'stalled', error: message });
      }, timeoutMs);
    };

    const scheduleReconnect = () => {
      if (isCancelled) return;

      if (reconnectAttemptsRef.current >= CCTV_LIVE_MAX_RECONNECT_ATTEMPTS) {
        update({ status: 'error', error: '실시간 영상 연결이 끊겼습니다. 다시 시도해주세요.' });
        return;
      }

      reconnectAttemptsRef.current += 1;
      timersRef.current.reconnect = window.setTimeout(connect, CCTV_LIVE_RECONNECT_DELAY_MS);
    };

    function connect() {
      if (isCancelled) return;

      closeSocket();

      if (isBlockedByMixedContent(currentStreamUrl)) {
        update({
          status: 'error',
          error: '보안 연결(HTTPS)에서는 사내 실시간 영상(ws://)에 접속할 수 없습니다.',
        });
        return;
      }

      armWatchdog(CCTV_LIVE_FIRST_FRAME_TIMEOUT_MS, '영상 신호가 들어오지 않습니다.');

      let socket: WebSocket;
      try {
        socket = new WebSocket(currentStreamUrl);
      } catch (caught) {
        console.error('[lab/cctv-monitoring] WebSocket 생성 실패', caught);
        update({ status: 'error', error: '실시간 영상 서버에 연결할 수 없습니다.' });
        return;
      }

      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;

      socket.onopen = () => {
        if (isCancelled) return;
        reconnectAttemptsRef.current = 0;
      };

      socket.onmessage = (event: MessageEvent<ArrayBuffer | Blob | string>) => {
        if (isCancelled) return;

        // 서버가 상태 문자열을 보낼 수도 있으므로 이진 데이터만 프레임으로 처리한다
        let blob: Blob | null = null;
        if (event.data instanceof ArrayBuffer) {
          if (event.data.byteLength === 0) return;
          blob = new Blob([event.data], { type: 'image/jpeg' });
        } else if (event.data instanceof Blob) {
          if (event.data.size === 0) return;
          blob = event.data;
        }

        if (!blob) return;

        const nextUrl = URL.createObjectURL(blob);
        frameUrlsRef.current.push(nextUrl);
        // 표시 중인 프레임과 새 프레임만 남기고 그 이전 것은 해제한다
        while (frameUrlsRef.current.length > 2) {
          const staleUrl = frameUrlsRef.current.shift();
          if (staleUrl) URL.revokeObjectURL(staleUrl);
        }

        setLive(current => {
          const base: LiveState =
            current?.streamUrl === currentStreamUrl
              ? current
              : { streamUrl: currentStreamUrl, frameUrl: null, status: 'connecting', error: null, frameCount: 0 };
          return {
            ...base,
            frameUrl: nextUrl,
            frameCount: base.frameCount + 1,
            status: 'playing',
            error: null,
          };
        });

        armWatchdog(CCTV_LIVE_STALL_TIMEOUT_MS, '영상 신호가 끊겼습니다. 다시 연결하는 중입니다.');
      };

      socket.onerror = () => {
        if (isCancelled) return;
        console.error('[lab/cctv-monitoring] WebSocket 오류', currentStreamUrl);
      };

      socket.onclose = () => {
        if (isCancelled) return;
        socketRef.current = null;
        scheduleReconnect();
      };
    }

    reconnectAttemptsRef.current = 0;
    // effect 본문에서 곧바로 상태를 바꾸지 않도록 다음 틱에 연결을 시작한다
    timersRef.current.start = window.setTimeout(connect, 0);

    return () => {
      isCancelled = true;
      clearTimers();
      closeSocket();
      releaseFrameUrls();
    };
  }, [clearTimers, closeSocket, manualAttempt, releaseFrameUrls, streamUrl]);

  // 다른 카메라의 오래된 상태가 잠깐이라도 보이지 않도록 값은 파생시켜 돌려준다
  const isCurrent = Boolean(streamUrl) && live?.streamUrl === streamUrl;

  if (!camera) {
    return { frameUrl: null, status: 'idle', error: null, frameCount: 0, retry };
  }

  if (!streamUrl) {
    return {
      frameUrl: null,
      status: 'error',
      error: '이 카메라에는 실시간 영상 주소가 없습니다.',
      frameCount: 0,
      retry,
    };
  }

  return {
    frameUrl: isCurrent ? (live?.frameUrl ?? null) : null,
    status: isCurrent ? (live?.status ?? 'connecting') : 'connecting',
    error: isCurrent ? (live?.error ?? null) : null,
    frameCount: isCurrent ? (live?.frameCount ?? 0) : 0,
    retry,
  };
}
