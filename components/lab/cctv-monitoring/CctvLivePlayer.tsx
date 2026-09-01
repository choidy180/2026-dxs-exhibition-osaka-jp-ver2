'use client';

import { useEffect, useRef } from 'react';
import { Loader2, Radio, RefreshCw, WifiOff } from 'lucide-react';
import { useCctvLiveStream } from '@/hooks/use-cctv-live-stream';
import type { CctvCamera } from '@/types/cctv-monitoring';
import type { ToneName } from '@/styles/design-tokens';
import { LiveBadge, LiveFrame, LiveOverlay, LiveVideo } from './styles';

interface CctvLivePlayerProps {
  camera: CctvCamera;
}

/**
 * 실시간 CCTV 재생 화면 (WHEP/WebRTC).
 *
 * 훅이 만들어 준 MediaStream 을 `<video>` 에 연결한다.
 * 연결 중이거나 실패했을 때는 상태 안내를 화면 위에 겹쳐 보여준다.
 */
export default function CctvLivePlayer({ camera }: CctvLivePlayerProps) {
  const { stream, status, error, retry } = useCctvLiveStream(camera);
  const videoRef = useRef<HTMLVideoElement>(null);

  // MediaStream 은 속성이 아니라 srcObject 로만 연결할 수 있다
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    if (stream) {
      // 자동재생 정책 때문에 막히면 조용히 넘기고 사용자가 클릭할 수 있게 둔다
      void video.play().catch(() => undefined);
    }
  }, [stream]);

  const isPlaying = status === 'playing';
  const showOverlay = status !== 'playing';
  const overlayTone: ToneName = status === 'error' ? 'danger' : 'info';

  const overlayTitle =
    status === 'error' ? '실시간 영상을 재생할 수 없습니다' : '실시간 영상 연결 중...';

  const overlayDescription =
    error ?? '사내망에서만 연결됩니다. 잠시만 기다려주세요.';

  return (
    <LiveFrame>
      <LiveVideo
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label={`${camera.name} 실시간 화면`}
      />

      <LiveBadge $active={isPlaying}>
        <span className="live-dot" aria-hidden="true" />
        {isPlaying ? 'LIVE' : 'LIVE 대기'}
      </LiveBadge>

      {showOverlay && (
        <LiveOverlay $tone={overlayTone} role="status">
          <span className="live-icon" aria-hidden="true">
            {status === 'error' ? <WifiOff size={24} /> : <Loader2 className="spin" size={24} />}
          </span>
          <strong>{overlayTitle}</strong>
          <span>{overlayDescription}</span>

          {status === 'error' && (
            <button type="button" onClick={retry}>
              <RefreshCw size={14} aria-hidden="true" />
              다시 연결
            </button>
          )}

          {status === 'connecting' && camera.stream.path && (
            <span>
              <Radio size={12} aria-hidden="true" /> {camera.stream.path}
            </span>
          )}
        </LiveOverlay>
      )}
    </LiveFrame>
  );
}
