import { TAKTTIME_DEMO_PROFILES } from '@/constants/takttime-cycle';
import type { TakttimeLine } from '@/types/takttime-vision';

/** 생산 순번을 따라 완만하게 변동시켜 초기 이력·영상 반복·보기 전환 사이의 급등락을 막는다. */
export function getDemoCycleTime(line: TakttimeLine, production: number): number {
  const { baseline, amplitude, phase } = TAKTTIME_DEMO_PROFILES[line];
  const drift = amplitude * Math.sin(production * .16 + phase);
  const variation = .25 * Math.sin(production * .43 + phase * .7);
  return Math.round((baseline + drift + variation) * 10) / 10;
}
