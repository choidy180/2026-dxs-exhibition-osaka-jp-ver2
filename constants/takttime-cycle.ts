import type { TakttimeLine } from '@/types/takttime-vision';

export const TAKTTIME_TARGET_SECONDS = 60;
export const TAKTTIME_CHART_MAX_SECONDS = 75;
export const TAKTTIME_DEMO_UPDATE_MS = 3_000;

export const TAKTTIME_DEMO_PROFILES: Record<TakttimeLine, { baseline: number; amplitude: number; phase: number }> = {
  A: { baseline: 54.5, amplitude: 3.3, phase: 0 },
  B: { baseline: 46.5, amplitude: 3.6, phase: 1.8 },
  C: { baseline: 55, amplitude: 3.2, phase: 3.4 },
};
