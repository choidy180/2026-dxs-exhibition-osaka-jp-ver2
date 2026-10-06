/** 중단 가능한 대기. 타이머·abort 리스너를 완료와 취소 경로에서 모두 정리한다. */
export function demoDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

/** 숨긴 탭에서는 남은 시간을 유지한다. 복귀 시 여러 버튼을 한꺼번에 누르지 않는다. */
export async function demoVisibleDelay(ms: number, signal: AbortSignal): Promise<void> {
  let remaining = ms;
  while (remaining > 0) {
    if (document.hidden) {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          document.removeEventListener('visibilitychange', changed);
          signal.removeEventListener('abort', aborted);
        };
        const changed = () => { if (!document.hidden) { cleanup(); resolve(); } };
        const aborted = () => { cleanup(); reject(signal.reason); };
        if (signal.aborted) { reject(signal.reason); return; }
        document.addEventListener('visibilitychange', changed);
        signal.addEventListener('abort', aborted, { once: true });
      });
    }
    const started = performance.now();
    await demoDelay(Math.min(remaining, 100), signal);
    if (!document.hidden) remaining -= performance.now() - started;
  }
}

export function findDemoTarget(id: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-demo="${id}"]`))
    .find(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    }) ?? null;
}

export async function waitForDemoTarget(id: string, signal: AbortSignal, timeout: number, interactive = true): Promise<HTMLElement> {
  let elapsed = 0;
  while (elapsed < timeout) {
    await demoVisibleDelay(100, signal);
    const target = findDemoTarget(id);
    if (target && (!interactive || !target.matches(':disabled, [aria-busy="true"]'))) return target;
    elapsed += 100;
  }
  throw new Error(`Demo target unavailable: ${id}`);
}

/** 확인 창이 없는 경우 바로 진행하고, 있을 때는 React가 닫은 뒤에만 안내를 시작한다. */
export async function dismissDemoTargets(ids: readonly string[], signal: AbortSignal, timeout: number): Promise<void> {
  if (signal.aborted) throw signal.reason;
  for (const id of ids) {
    if (signal.aborted) throw signal.reason;
    const target = findDemoTarget(id);
    if (!target) continue;
    if (target.matches(':disabled, [aria-busy="true"]')) throw new Error(`Demo confirmation unavailable: ${id}`);
    target.click();
    let elapsed = 0;
    while (findDemoTarget(id)) {
      await demoVisibleDelay(100, signal);
      elapsed += 100;
      if (elapsed >= timeout && findDemoTarget(id)) throw new Error(`Demo confirmation did not close: ${id}`);
    }
  }
}

/** OFF·경로 변경·오류에도 열린 시연 모달을 닫는 공통 실행 경계. */
export async function withDemoCleanup(work: () => Promise<void>, cleanup: () => void): Promise<void> {
  try { await work(); } finally { cleanup(); }
}
