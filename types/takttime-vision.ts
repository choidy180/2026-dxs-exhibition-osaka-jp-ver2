export type TakttimeLine = 'A' | 'B' | 'C';

export type TrackedPart = {
  id: number;
  kind: number;
  x: number;
  y: number;
  width: number;
  height: number;
  worldX: number;
};

export type TrackingTimeline = {
  width: number;
  height: number;
  fps: number;
  cycleSeconds: number;
  partIntervalSeconds: number;
  gate: number[][];
  frames: TrackedPart[][];
};

export type VisionClock = { mediaTime: number; elapsed: number; sequence: number };
export type VisionRecognition = { sequence: number; kind: number; mediaTime: number };
export type ProjectedBox = { x: number; y: number; width: number; height: number };
