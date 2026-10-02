import { TAKTTIME_DEMO_PROFILES } from '@/constants/takttime-cycle';
import type { TakttimeLine } from '@/types/takttime-vision';

/** 라인별 정상 변동과 간헐적인 단일 지연을 섞어 다양한 시연 추세를 보여준다. */
export function getDemoCycleTime(line: TakttimeLine, production: number): number {
  const { baseline, amplitude, phase } = TAKTTIME_DEMO_PROFILES[line];
  const delayOffset = { A: 0, B: 6, C: 12 }[line];
  if ((production + delayOffset) % 19 === 0) {
    return Math.round((61 + 4 * (.5 + .5 * Math.sin(production * 1.37 + phase))) * 10) / 10;
  }
  const drift = amplitude * Math.sin(production * .78 + phase);
  const variation = .9 * Math.sin(production * 1.91 + phase * .7);
  return Math.round((baseline + drift + variation) * 10) / 10;
}
