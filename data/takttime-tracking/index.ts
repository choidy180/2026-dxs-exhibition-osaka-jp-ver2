import foaming from './foaming.json';
import assembly1 from './assembly-1.json';
import assembly2 from './assembly-2.json';
import type { TakttimeLine, TrackingTimeline } from '@/types/takttime-vision';

export const TAKTTIME_TRACKING: Record<TakttimeLine, TrackingTimeline> = {
  A: foaming,
  B: assembly1,
  C: assembly2,
};
