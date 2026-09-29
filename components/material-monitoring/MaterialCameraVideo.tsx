'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Loader2, RotateCw, Video } from 'lucide-react';
import type { MaterialCameraPlayback } from '@/types/material-camera-video';
import { MATERIAL_CAMERA_RESET_MS } from '@/constants/material-camera-videos';
import styled, { css } from 'styled-components';
import { color, controlHeight, focusRing, fontSize, fontWeight, motionDuration, radius, space, tone } from '@/styles/design-tokens';

type Props = {
  camera: MaterialCameraPlayback;
  label: string;
  mirror?: boolean;
  onEnded: () => void;
  onRetry: () => void;
};

export default function MaterialCameraVideo(props: Props) {
  // 영상이 바뀌거나 재시도할 때 로딩 상태와 미디어 엘리먼트를 함께 초기화한다.
  return <CameraVideo key={props.camera.revision} {...props} />;
}

function CameraVideo({ camera, label, mirror = false, onEnded, onRetry }: Props) {
  const [status, setStatus] = useState<'loading' | 'playing' | 'error'>('loading');
  const reducedMotion = useReducedMotion();
  const resetting = camera.resetUntil !== null;
  const empty = !camera.src && camera.revision > 0;
  const phase = resetting ? 'resetting' : empty ? 'empty' : status;

  const syncMirror = (video: HTMLVideoElement) => {
    const source = camera.videoRef.current;
    if (mirror && source && Number.isFinite(source.currentTime)) video.currentTime = source.currentTime;
  };

  return (
    <CameraPlaybackFrame data-camera-playback={phase}>
      {camera.src && !resetting && (
        <video
          ref={mirror ? undefined : camera.videoRef}
          src={camera.src}
          autoPlay muted playsInline preload="auto"
          aria-label={label}
          onLoadedMetadata={event => syncMirror(event.currentTarget)}
          onPlaying={() => setStatus('playing')}
          onWaiting={() => setStatus('loading')}
          onError={() => setStatus('error')}
          onEnded={mirror ? undefined : onEnded}
        />
      )}
      <AnimatePresence>
        {phase !== 'playing' && (
          <CameraPlaybackState
            key={phase}
            $phase={phase}
            $mirror={mirror}
            role="status"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : motionDuration.fast }}
          >
            <div className="state-content">
              {phase === 'error' ? <AlertCircle size={24} /> : phase === 'empty' ? <Video size={28} /> : (
                <motion.span className="state-icon" aria-hidden="true"
                  animate={{ rotate: reducedMotion ? 0 : 360 }}
                  transition={{ duration: motionDuration.spin, ease: 'linear', repeat: reducedMotion ? 0 : Infinity }}>
                  {resetting ? <RotateCw size={24} /> : <Loader2 size={24} />}
                </motion.span>
              )}
              <strong>{resetting ? '카메라 초기화 중' : empty ? '등록된 영상이 없습니다.' : status === 'error' ? '영상을 불러오지 못했습니다.' : '영상 준비 중...'}</strong>
              {resetting && <>
                <span className="countdown">{`${camera.remainingSeconds.toLocaleString('ko-KR')}초`}</span>
                <span className="state-description">잠시 후 다음 영상을 재생합니다.</span>
                <CameraResetProgress className="reset-progress" role="progressbar" aria-label="카메라 초기화 진행률"
                  aria-valuemin={0} aria-valuemax={MATERIAL_CAMERA_RESET_MS / 1000}
                  aria-valuenow={MATERIAL_CAMERA_RESET_MS / 1000 - camera.remainingSeconds}>
                  <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 - camera.remainingSeconds / (MATERIAL_CAMERA_RESET_MS / 1000) }}
                    transition={{ duration: reducedMotion ? 0 : motionDuration.enter }} />
                </CameraResetProgress>
              </>}
              {empty && <span className="state-description">카메라에 재생할 영상을 추가해 주세요.</span>}
              {phase === 'error' && <button type="button" onClick={onRetry}><RotateCw size={14} />재시도</button>}
            </div>
          </CameraPlaybackState>
        )}
      </AnimatePresence>
    </CameraPlaybackFrame>
  );
}

const CameraPlaybackFrame = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: ${color.surfaceSubtle};

  video { display: block; width: 100%; height: 100%; object-fit: cover; }
`;

const CameraPlaybackState = styled(motion.div)<{ $phase: string; $mirror: boolean }>`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: ${space.xl}px;
  background: ${color.surfaceSubtle};
  color: ${color.ink3};
  text-align: center;
  font-size: ${fontSize.caption};

  .state-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${space.sm}px;
    width: 100%;
    max-width: 300px;
    padding: ${space.xl}px;
    border: 1px ${({ $phase }) => $phase === 'empty' ? 'dashed' : 'solid'}
      ${({ $phase }) => $phase === 'error' ? tone.danger.border : $phase === 'resetting' ? tone.info.border : color.borderStrong};
    border-radius: ${radius.card}px;
    background: ${({ $phase }) => $phase === 'error' ? tone.danger.bg : $phase === 'resetting' ? tone.info.bg : color.surface};
  }
  .state-icon { display: inline-flex; color: ${color.ink3}; }
  strong { color: ${color.ink2}; font-size: ${fontSize.meta}; font-weight: ${fontWeight.semibold}; }
  .countdown { color: ${color.ink}; font-size: ${fontSize.pageTitle}; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; }
  button {
    display: inline-flex;
    align-items: center;
    gap: ${space.sm}px;
    min-height: ${controlHeight.sm}px;
    padding: 0 ${space.xl}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.control}px;
    background: ${color.surface};
    color: ${color.ink2};
    cursor: pointer;
    &:hover { background: ${color.fill}; }
    &:focus-visible { outline: ${focusRing}; outline-offset: ${space.xs}px; }
  }

  ${({ $mirror }) => !$mirror && css`
    @media (max-width: 1500px) {
      padding: ${space.huge * 2}px ${space.sm}px ${space.sm}px;
      .state-content { padding: ${space.sm}px; gap: ${space.xs}px; }
      .state-icon, .state-content > svg, .state-description, .reset-progress { display: none; }
      strong { font-size: ${fontSize.caption}; }
      .countdown { font-size: ${fontSize.body}; }
    }
  `}
`;

const CameraResetProgress = styled.div`
  width: 100%;
  height: ${space.sm}px;
  border-radius: ${radius.bar}px;
  overflow: hidden;
  background: ${color.fill};

  > div { height: 100%; background: ${tone.info.fg}; transform-origin: left; }
`;
