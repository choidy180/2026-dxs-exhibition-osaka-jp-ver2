'use client';

import { useMemo, useState } from 'react';
import { ImageOff, Loader2, RefreshCw, WifiOff, Wrench } from 'lucide-react';
import type { CctvCamera } from '@/types/cctv-monitoring';
import {
  CameraImage,
  CameraUnavailable,
  ThumbnailFailure,
  ThumbnailFrame,
  ThumbnailLoading,
} from './styles';

interface CctvThumbnailProps {
  camera: CctvCamera;
  revision: number;
  large?: boolean;
  allowRetry?: boolean;
  sizes?: string;
}

export default function CctvThumbnail({
  camera,
  revision,
  large = false,
  allowRetry = false,
  sizes = large ? '75vw' : '260px',
}: CctvThumbnailProps) {
  const [attempt, setAttempt] = useState(0);
  const [imageState, setImageState] = useState<{
    src: string | null;
    status: 'loading' | 'loaded' | 'error';
  }>({ src: null, status: 'loading' });

  const imageSrc = useMemo(() => {
    if (!camera.thumbnailUrl) return null;
    const separator = camera.thumbnailUrl.includes('?') ? '&' : '?';
    return `${camera.thumbnailUrl}${separator}v=${revision}-${attempt}`;
  }, [attempt, camera.thumbnailUrl, revision]);

  const currentStatus = !imageSrc
    ? 'error'
    : imageState.src === imageSrc
      ? imageState.status
      : 'loading';
  const isLoaded = currentStatus === 'loaded';
  const hasError = currentStatus === 'error';

  const unavailable = camera.status !== 'online';

  return (
    <ThumbnailFrame $large={large} $offline={unavailable}>
      {imageSrc && !hasError && (
        <CameraImage
          className="camera-image"
          src={imageSrc}
          alt={`${camera.name} CCTV 썸네일`}
          fill
          sizes={sizes}
          $position={camera.objectPosition}
          unoptimized
          onLoad={() => setImageState({ src: imageSrc, status: 'loaded' })}
          onError={() => setImageState({ src: imageSrc, status: 'error' })}
        />
      )}

      {imageSrc && !hasError && !isLoaded && (
        <ThumbnailLoading aria-label="썸네일 불러오는 중">
          <Loader2 size={large ? 26 : 15} aria-hidden="true" />
        </ThumbnailLoading>
      )}

      {hasError && (
        <ThumbnailFailure $large={large} role="status">
          <ImageOff size={large ? 28 : 15} aria-hidden="true" />
          <span>{large ? '썸네일을 불러오지 못했습니다.' : '이미지 없음'}</span>
          {allowRetry && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setAttempt(current => current + 1);
              }}
            >
              <RefreshCw size={13} aria-hidden="true" />
              다시 불러오기
            </button>
          )}
        </ThumbnailFailure>
      )}

      {!hasError && camera.status === 'offline' && (
        <CameraUnavailable $tone="danger">
          <WifiOff size={12} aria-hidden="true" />
          연결 끊김
        </CameraUnavailable>
      )}

      {!hasError && camera.status === 'maintenance' && (
        <CameraUnavailable $tone="warning">
          <Wrench size={12} aria-hidden="true" />
          점검 중
        </CameraUnavailable>
      )}
    </ThumbnailFrame>
  );
}
