'use client';

import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { DEMO_FACTORY_IMAGE } from '@/data/exhibition-inspection';
import { useCctvLiveStream } from '@/hooks/use-cctv-live-stream';
import type { CctvCamera } from '@/types/cctv-monitoring';
import type { ToneName } from '@/styles/design-tokens';
import { LiveBadge, LiveFrame, LiveOverlay, LiveVideo } from './styles';

interface CctvLivePlayerProps {
  camera: CctvCamera;
}

/** 전시장에서는 로컬 동영상을 반복 재생한다. */
export default function CctvLivePlayer({ camera }: CctvLivePlayerProps) {
  const { src, key, status, error, retry, onPlaying, onError } = useCctvLiveStream(camera);

  const isPlaying = status === 'playing';
  const showOverlay = status !== 'playing';
  const overlayTone: ToneName = status === 'error' ? 'danger' : 'info';

  const overlayTitle =
    status === 'error' ? '실시간 영상을 재생할 수 없습니다' : '실시간 영상 연결 중...';

  const overlayDescription =
    error ?? '영상을 준비하고 있습니다.';

  return (
    <LiveFrame>
      <LiveVideo
        key={key}
        src={src}
        poster={DEMO_FACTORY_IMAGE}
        loop
        controls
        autoPlay
        muted
        playsInline
        onPlaying={onPlaying}
        onError={onError}
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

        </LiveOverlay>
      )}
    </LiveFrame>
  );
}
