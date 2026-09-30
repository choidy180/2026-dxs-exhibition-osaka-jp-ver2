import type { ProjectedBox, TrackedPart, TrackingTimeline, VisionClock, VisionRecognition } from '@/types/takttime-vision';

export function getTrackingFrame(timeline: TrackingTimeline, mediaTime: number) {
  const phase = ((mediaTime % timeline.cycleSeconds) + timeline.cycleSeconds) % timeline.cycleSeconds;
  return timeline.frames[Math.floor(phase * timeline.fps + 0.0001)] ?? [];
}

export function projectCoverPoint(x: number, y: number, viewport: { width: number; height: number }, source: { width: number; height: number }) {
  const scale = Math.max(viewport.width / source.width, viewport.height / source.height);
  return {
    x: x * source.width * scale + (viewport.width - source.width * scale) / 2,
    y: y * source.height * scale + (viewport.height - source.height * scale) / 2,
  };
}

export function projectCoverBox(part: TrackedPart, viewport: { width: number; height: number }, source: { width: number; height: number }): ProjectedBox | null {
  if (viewport.width <= 0 || viewport.height <= 0) return null;
  const start = projectCoverPoint(part.x, part.y, viewport, source);
  const end = projectCoverPoint(part.x + part.width, part.y + part.height, viewport, source);
  const x = Math.max(0, start.x);
  const y = Math.max(0, start.y);
  const width = Math.min(viewport.width, end.x) - x;
  const height = Math.min(viewport.height, end.y) - y;
  if (width < 20 || height < 12 || width * height < (end.x - start.x) * (end.y - start.y) * .2) return null;
  return { x, y, width, height };
}

/** 미디어 시간이 진행될 때만 계수하고 반복 경계와 탐색에서 중복 기록을 막는다. */
export function advanceVisionClock(previous: VisionClock | null, mediaTime: number, duration: number, interval: number): { clock: VisionClock; recognition: VisionRecognition | null } {
  if (!previous) return { clock: { mediaTime, elapsed: mediaTime, sequence: Math.floor(mediaTime / interval) }, recognition: null };
  let delta = mediaTime - previous.mediaTime;
  if (delta < 0) {
    if (previous.mediaTime >= duration - .5 && mediaTime < .5) delta += duration;
    else return { clock: { mediaTime, elapsed: mediaTime, sequence: Math.floor(mediaTime / interval) }, recognition: null };
  }
  // 프레임 누락은 허용하되 여러 부품을 건너뛰는 탐색은 새 인식으로 세지 않는다.
  if (delta > interval) return { clock: { mediaTime, elapsed: previous.elapsed + delta, sequence: Math.floor((previous.elapsed + delta) / interval) }, recognition: null };
  const elapsed = previous.elapsed + delta;
  const sequence = Math.floor((elapsed + 0.0001) / interval);
  return {
    clock: { mediaTime, elapsed, sequence },
    recognition: sequence > previous.sequence ? { sequence, kind: ((-sequence % 3) + 3) % 3, mediaTime } : null,
  };
}
