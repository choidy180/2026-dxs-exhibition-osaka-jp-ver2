'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCheck, Film, Loader2, Pause, Play, RefreshCw, ScanLine } from 'lucide-react';
import styled from 'styled-components';
import { TAKTTIME_CAMERA_VIDEOS, TAKTTIME_PART_NAMES, TAKTTIME_PLAYBACK_RATE } from '@/constants/takttime-camera-videos';
import { useConveyorVisionPlayback } from '@/hooks/use-conveyor-vision-playback';
import { color, focusRing, font, fontSize, fontWeight, radius, space, tone } from '@/styles/design-tokens';
import type { ProjectedBox, TakttimeLine, VisionRecognition } from '@/types/takttime-vision';
import { getTrackingFrame, projectCoverBox, projectCoverPoint } from '@/utils/takttime-vision';

const ConveyorVisionVideo = memo(function ConveyorVisionVideo({ line, onRecognition }: {
  line: TakttimeLine;
  onRecognition: (line: TakttimeLine, event: VisionRecognition) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const playback = useConveyorVisionPlayback(line, onRecognition);
  const { videoRef, attempt, state, playing, clock, recognition, timeline } = playback;
  const src = TAKTTIME_CAMERA_VIDEOS[line];
  const mediaTime = clock?.mediaTime ?? 0;
  const parts = getTrackingFrame(timeline, mediaTime);
  const gate = timeline.gate.map(([x, y]) => projectCoverPoint(x, y, viewport, timeline));
  const recentlyRecognized = recognition && clock && clock.elapsed - recognition.sequence * timeline.partIntervalSeconds < .55;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return <Frame ref={frameRef} data-vision-line={line} data-recognition-sequence={recognition?.sequence ?? 0}>
    {src && <video ref={videoRef} key={`${line}-${attempt}`} src={src} poster={src.replace(/\.mp4$/, '.jpg')}
      autoPlay loop muted playsInline preload="auto" aria-label="부품 인식 공정 영상" />}
    {state === 'ready' && <Overlay aria-hidden="true">
      <Gate width={viewport.width} height={viewport.height}>
        <line x1={gate[0].x} y1={gate[0].y} x2={gate[1].x} y2={gate[1].y} />
      </Gate>
      {parts.map(part => {
        const box = projectCoverBox(part, viewport, timeline);
        if (!box) return null;
        const detected = part.worldX >= 0 && part.worldX < .66;
        const trackId = 100 + Math.floor((clock?.elapsed ?? 0) / timeline.cycleSeconds) * 3 - part.id;
        return <BoundingBox key={trackId} $box={box} $detected={detected} data-tracked-part={part.kind}>
          <PartLabel $detected={detected}><span>{TAKTTIME_PART_NAMES[line][part.kind]}</span><small>ID {trackId.toLocaleString('ko-KR')}</small></PartLabel>
        </BoundingBox>;
      })}
      <RecognitionBadge $active={Boolean(recentlyRecognized)}>
        {recentlyRecognized ? <CheckCheck size={13} /> : <ScanLine size={13} />}
        <span>{recentlyRecognized ? '인식 완료 · 그래프 반영' : playing ? '부품 추적 중' : '일시 정지'}</span>
      </RecognitionBadge>
    </Overlay>}
    {(!src || state !== 'ready') && <State role="status">
      {!src ? <><Film size={20} />영상이 없습니다.</> : state === 'error' ? <>
        <AlertCircle size={20} />영상을 재생할 수 없습니다.
        <Control type="button" onClick={playback.retry}><RefreshCw size={14} />재시도</Control>
      </> : <><Loader2 size={20} />영상을 준비하고 있습니다.</>}
    </State>}
    <Toolbar>
      <ModeBadge><ScanLine size={13} /><span>비전 인식 · 데모</span><b>{TAKTTIME_PLAYBACK_RATE.toLocaleString('ko-KR')}×</b></ModeBadge>
      <Control type="button" disabled={state !== 'ready'} onClick={playback.togglePlayback}
        aria-label={playing ? '영상 일시 정지' : '영상 재생'} title={playing ? '영상 일시 정지' : '영상 재생'}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </Control>
    </Toolbar>
  </Frame>;
});

export default ConveyorVisionVideo;

const Frame = styled.div`
  position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden;
  background: ${color.surfaceSubtle}; border-radius: ${radius.row}px; font-family: ${font.family};
  video { display: block; width: 100%; height: 100%; object-fit: cover; }
`;
const Overlay = styled.div`position: absolute; inset: 0; pointer-events: none; overflow: hidden;`;
const Gate = styled.svg`
  position: absolute; inset: 0;
  line { stroke: ${tone.info.fg}; stroke-width: 1; stroke-dasharray: 5 5; }
`;
const BoundingBox = styled.div.attrs<{ $box: ProjectedBox; $detected: boolean }>(({ $box }) => ({
  style: { left: $box.x, top: $box.y, width: $box.width, height: $box.height },
}))`
  position: absolute; box-sizing: border-box; border: 1px solid ${({ $detected }) => $detected ? tone.info.fg : tone.success.fg};
  background: ${({ $detected }) => $detected ? tone.info.bg : tone.success.bg}12;
  border-radius: ${radius.bar}px;
`;
const PartLabel = styled.div<{ $detected: boolean }>`
  position: absolute; left: 0; top: 0; max-width: 100%; display: flex; align-items: center;
  gap: ${space.xs}px; padding: ${space.xs}px ${space.sm}px; box-sizing: border-box;
  background: ${({ $detected }) => $detected ? tone.info.bg : tone.success.bg};
  color: ${({ $detected }) => $detected ? tone.info.fg : tone.success.fg};
  border-radius: ${radius.bar}px; font-size: ${fontSize.caption}; font-weight: ${fontWeight.medium}; white-space: nowrap;
  span { overflow: hidden; text-overflow: ellipsis; }
  small { font: inherit; font-variant-numeric: tabular-nums; }
`;
const Toolbar = styled.div`
  position: absolute; top: ${space.md}px; left: ${space.md}px; right: ${space.md}px;
  display: flex; align-items: center; justify-content: space-between; gap: ${space.md}px;
`;
const ModeBadge = styled.div`
  display: inline-flex; gap: ${space.sm}px; align-items: center; padding: ${space.sm}px ${space.md}px;
  color: ${color.ink2}; background: ${color.surface}; border: 1px solid ${color.border}; border-radius: ${radius.bar}px;
  font-size: ${fontSize.caption}; font-weight: ${fontWeight.medium};
  b { font-weight: ${fontWeight.semibold}; color: ${tone.info.fg}; }
`;
const RecognitionBadge = styled.div<{ $active: boolean }>`
  position: absolute; bottom: ${space.md}px; right: ${space.md}px;
  display: inline-flex; align-items: center; gap: ${space.xs}px; padding: ${space.sm}px ${space.md}px;
  border: 1px solid ${({ $active }) => $active ? tone.info.border : tone.success.border};
  background: ${({ $active }) => $active ? tone.info.bg : tone.success.bg};
  color: ${({ $active }) => $active ? tone.info.fg : tone.success.fg};
  border-radius: ${radius.bar}px; font-size: ${fontSize.caption}; font-weight: ${fontWeight.medium};
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
