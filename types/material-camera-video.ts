import type { RefObject } from 'react';

export type MaterialCameraPlayback = {
  src: string | null;
  resetUntil: number | null;
  remainingSeconds: number;
  revision: number;
  videoRef: RefObject<HTMLVideoElement | null>;
};
