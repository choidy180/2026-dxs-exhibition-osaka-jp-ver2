type IntervalHost = {
  hidden: boolean;
  addEventListener: (name: 'visibilitychange', listener: () => void) => void;
  removeEventListener: (name: 'visibilitychange', listener: () => void) => void;
};

/** 숨김 중에는 타이머 자체를 해제하고 복귀 시 하나만 등록한다. */
export function startVisibleInterval(callback: () => void, ms: number, host: IntervalHost = document): () => void {
  let timer: ReturnType<typeof setInterval> | undefined;
  const sync = () => {
    if (timer !== undefined) clearInterval(timer);
    timer = host.hidden ? undefined : setInterval(callback, ms);
  };
  sync();
  host.addEventListener('visibilitychange', sync);
  return () => {
    if (timer !== undefined) clearInterval(timer);
    host.removeEventListener('visibilitychange', sync);
  };
}
