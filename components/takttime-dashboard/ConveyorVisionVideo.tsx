'use client';

import { memo } from 'react';
import { AlertCircle, Film, Loader2, RefreshCw } from 'lucide-react';
import styled from 'styled-components';
import { TAKTTIME_CAMERA_VIDEOS } from '@/constants/takttime-camera-videos';
import { useConveyorVisionPlayback } from '@/hooks/use-conveyor-vision-playback';
import { color, focusRing, font, fontSize, radius, space } from '@/styles/design-tokens';
import type { TakttimeLine } from '@/types/takttime-vision';

const ignoreRecognition = () => {};

const ConveyorVisionVideo = memo(function ConveyorVisionVideo({ line }: { line: TakttimeLine }) {
  const playback = useConveyorVisionPlayback(line, ignoreRecognition);
  const { videoRef, attempt, state, recognition } = playback;
  const src = TAKTTIME_CAMERA_VIDEOS[line];

  return <Frame data-vision-line={line} data-recognition-sequence={recognition?.sequence ?? 0}>
    {src && <video ref={videoRef} key={`${line}-${attempt}`} src={src} poster={src.replace(/\.mp4$/, '.jpg')}
      autoPlay loop muted playsInline preload="auto" aria-label="부품 인식 공정 영상" />}
    {(!src || state !== 'ready') && <State role="status">
      {!src ? <><Film size={20} />영상이 없습니다.</> : state === 'error' ? <>
        <AlertCircle size={20} />영상을 재생할 수 없습니다.
        <Control type="button" onClick={playback.retry}><RefreshCw size={14} />재시도</Control>
      </> : <><Loader2 size={20} />영상을 준비하고 있습니다.</>}
    </State>}
  </Frame>;
});

export default ConveyorVisionVideo;

const Frame = styled.div`
  position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden;
  background: ${color.surfaceSubtle}; border-radius: ${radius.row}px; font-family: ${font.family};
  video { display: block; width: 100%; height: 100%; object-fit: cover; }
`;
const Control = styled.button`
  display: inline-flex; align-items: center; justify-content: center; gap: ${space.sm}px; padding: ${space.md}px;
  border: 1px solid ${color.border}; border-radius: ${radius.row}px; background: ${color.surface}; color: ${color.ink2}; cursor: pointer;
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
  &:disabled { opacity: .5; cursor: default; }
`;
const State = styled.div`
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: ${space.md}px; background: ${color.surface}; color: ${color.ink3}; font-size: ${fontSize.meta};
`;
