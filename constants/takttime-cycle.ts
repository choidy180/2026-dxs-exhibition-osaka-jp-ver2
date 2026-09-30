import type { TakttimeLine } from '@/types/takttime-vision';

export const TAKTTIME_TARGET_SECONDS = 60;
export const TAKTTIME_CHART_MAX_SECONDS = 75;

export const TAKTTIME_DEMO_PROFILES: Record<TakttimeLine, { baseline: number; amplitude: number; phase: number }> = {
  A: { baseline: 56.2, amplitude: 1.3, phase: 0 },
  B: { baseline: 41.5, amplitude: 1.25, phase: 1.8 },
  C: { baseline: 57.5, amplitude: 1.3, phase: 3.4 },
};
