'use client';

import { AlertTriangle, Loader2, RefreshCw, Radio, WifiOff } from 'lucide-react';
import { useCctvLiveStream } from '@/hooks/use-cctv-live-stream';
import type { CctvCamera } from '@/types/cctv-monitoring';
import type { ToneName } from '@/styles/design-tokens';
import { LiveBadge, LiveFrame, LiveImage, LiveOverlay } from './styles';

interface CctvLivePlayerProps {
  camera: CctvCamera;
}

/**
 * 실시간 CCTV 재생 화면.
 *
 * WebSocket 으로 받은 JPEG 프레임을 그대로 `<img>` 에 표시한다.
 * 첫 프레임이 오기 전이나 연결이 끊겼을 때는 상태 안내를 덮어 보여준다.
 */
export default function CctvLivePlayer({ camera }: CctvLivePlayerProps) {
  const { frameUrl, status, error, frameCount, retry } = useCctvLiveStream(camera);

  const isPlaying = status === 'playing';
  const hasFrame = Boolean(frameUrl);
  // 프레임을 한 번이라도 받은 뒤 끊기면 마지막 화면 위에 안내만 겹쳐 보여준다
  const showOverlay = !hasFrame || status === 'error' || status === 'stalled';

  const overlayTone: ToneName =
    status === 'error' ? 'danger' : status === 'stalled' ? 'warning' : 'info';

  const overlayTitle =
    status === 'error'
      ? '실시간 영상을 재생할 수 없습니다'
      : status === 'stalled'
        ? '영상 신호가 끊겼습니다'
        : '실시간 영상 연결 중...';

  const overlayDescription =
    error
      ?? (status === 'connecting'
        ? '사내망에서만 연결됩니다. 잠시만 기다려주세요.'
        : '잠시 후 다시 시도해주세요.');

  return (
    <LiveFrame>
      {frameUrl && (
        <LiveImage
          src={frameUrl}
          alt={`${camera.name} 실시간 화면`}
          decoding="async"
        />
      )}

      <LiveBadge $active={isPlaying}>
        <span className="live-dot" aria-hidden="true" />
        {isPlaying ? `LIVE · ${frameCount.toLocaleString('ko-KR')}프레임` : 'LIVE 대기'}
      </LiveBadge>

      {showOverlay && (
        <LiveOverlay $tone={overlayTone} role="status">
          <span className="live-icon" aria-hidden="true">
            {status === 'error' ? (
              <WifiOff size={24} />
            ) : status === 'stalled' ? (
              <AlertTriangle size={24} />
            ) : (
              <Loader2 className="spin" size={24} />
            )}
          </span>
          <strong>{overlayTitle}</strong>
          <span>{overlayDescription}</span>

          {(status === 'error' || status === 'stalled') && (
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
