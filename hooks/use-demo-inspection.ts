'use client';

import { startVisibleInterval } from '@/utils/visible-interval';
import { useCallback, useEffect, useRef, useState } from 'react';

/** 생성 함수만 실행하므로 실제 API나 설비에 접근하지 않는다. */
export function useDemoInspection<T>(createSnapshot: (sequence: number) => T) {
  const sequence = useRef(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    try {
      setData(createSnapshot(sequence.current++));
      setError(null);
    } catch {
      setError('전시 데이터를 불러오지 못했습니다. 다시 시도해주세요.');
    }
  }, [createSnapshot]);

  useEffect(() => {
    const initial = window.setTimeout(refresh, 120);
    const timer = startVisibleInterval(refresh, 5000);
    return () => { window.clearTimeout(initial); timer(); };
  }, [refresh]);

  return { data, isLoading: data === null && error === null, error, retry: refresh, refresh };
}
