import { useCallback, useEffect, useMemo, useState } from 'react';
import { createExhibitionMaterials, createExhibitionVehicleEntries } from '@/data/exhibition-material';
import { createMockApiData } from '@/data/smartFactoryViewer';

interface UseMultiFetchGetResult<T = unknown> {
  data: T[]; errors: (Error | null)[]; loading: boolean; refetch: () => Promise<void>;
}
/** 기존 호출부 계약을 유지하면서 전시용 데이터만 반환한다. */
export function useMultiFetchGet<T = unknown>(urls: string[], _options?: RequestInit, immediate = true): UseMultiFetchGetResult<T> {
  void _options;
  const [data, setData] = useState<T[]>([]);
  const [errors, setErrors] = useState<(Error | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(urls);
  const sources = useMemo(() => JSON.parse(key) as string[], [key]);
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setData(sources.map(url => (
      url.includes('000035') ? { success: true, data: createMockApiData() }
        : url.includes('000052') ? createExhibitionVehicleEntries() : createExhibitionMaterials()
    )) as T[]);
    setErrors(sources.map(() => null));
    setLoading(false);
  }, [sources]);
  useEffect(() => {
    if (!immediate) return;
    const timer = window.setTimeout(() => { void fetchAll(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAll, immediate]);
  return { data, errors, loading, refetch: fetchAll };
}
