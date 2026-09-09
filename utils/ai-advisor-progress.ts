/** 2026-09-09 동일 출처 정상 질의 3건의 전체 응답 시간(ms). */
export const ADVISOR_BASELINE_DURATIONS_MS = [13_609, 13_425, 15_240] as const;

export const ADVISOR_WAIT_STEPS = [
  { label: '질문 의도 파악' },
  { label: '조회 조건 구성' },
  { label: '데이터 조회' },
  { label: '답변 정리' },
] as const;

export function getAdvisorWaitProfile(samples: readonly number[]) {
  const recent = samples.filter(value => Number.isFinite(value) && value > 0 && value < 125_000).slice(-5);
  const durations = recent.length ? recent : [...ADVISOR_BASELINE_DURATIONS_MS];
  const sorted = [...durations].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  const typicalMs = Math.min(60_000, Math.max(4_000, median));
  const lowerSeconds = Math.max(1, Math.floor(sorted[0] / 1000));
  const upperSeconds = Math.max(lowerSeconds + 1, Math.ceil(sorted[sorted.length - 1] / 1000));
  const slowAfterMs = Math.max(20_000, median * 1.5);

  return {
    typicalMs,
    lowerSeconds,
    upperSeconds,
    // 실측 약 14초일 때 3/6/10초 전환. 서버 진행률이 아닌 예상 안내다.
    thresholdsMs: [0, typicalMs * 0.22, typicalMs * 0.44, typicalMs * 0.74],
    slowAfterMs,
    longWaitAfterMs: Math.max(60_000, slowAfterMs + 30_000),
  };
}

export function getAdvisorWaitStage(elapsedMs: number, thresholdsMs: readonly number[]) {
  let index = 0;
  for (let step = 1; step < thresholdsMs.length; step++) {
    if (elapsedMs >= thresholdsMs[step]) index = step;
  }
  return Math.min(index, ADVISOR_WAIT_STEPS.length - 1);
}

export function formatAdvisorElapsed(elapsedMs: number) {
  const seconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  return `${Math.floor(seconds / 60).toLocaleString('ko-KR', { minimumIntegerDigits: 2 })}:${(seconds % 60).toLocaleString('ko-KR', { minimumIntegerDigits: 2 })}`;
}
