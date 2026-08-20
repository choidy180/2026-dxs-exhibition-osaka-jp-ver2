'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BomDataset, BomFilter } from '@/types/lab';
import { EMPTY_BOM_FILTER, filterBomRows, getBomSummary } from '@/utils/lab';
import { fetchBomExplosion } from '@/utils/lab-api';

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message && !error.message.startsWith('API ')) return error.message;
  return fallback;
};

export function useBomExplosion() {
  const [dataset, setDataset] = useState<BomDataset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 입력 중인 조건과 '조회' 로 적용된 조건을 분리한다
  const [draftFilter, setDraftFilter] = useState<BomFilter>(EMPTY_BOM_FILTER);
  const [appliedFilter, setAppliedFilter] = useState<BomFilter>(EMPTY_BOM_FILTER);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchBomExplosion();
      if (!isMountedRef.current) return;
      setDataset(result);
    } catch (caught) {
      if (!isMountedRef.current) return;
      console.error('[lab/bom] BOM 정전개 조회 실패', caught);
      setDataset(null);
      setError(toErrorMessage(caught, 'BOM 정전개 데이터를 불러오지 못했습니다.'));
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** 전체 데이터 기준 지표 — 필터와 무관하게 원본 규모를 보여준다 */
  const summary = useMemo(() => getBomSummary(dataset?.rows ?? []), [dataset]);

  const filteredRows = useMemo(
    () => (dataset ? filterBomRows(dataset.rows, appliedFilter) : []),
    [appliedFilter, dataset],
  );

  const updateDraft = useCallback(<K extends keyof BomFilter>(key: K, value: BomFilter[K]) => {
    setDraftFilter(current => ({ ...current, [key]: value }));
  }, []);

  const applyFilter = useCallback(() => setAppliedFilter(draftFilter), [draftFilter]);

  const resetFilter = useCallback(() => {
    setDraftFilter(EMPTY_BOM_FILTER);
    setAppliedFilter(EMPTY_BOM_FILTER);
  }, []);

  const isFiltered = useMemo(
    () => JSON.stringify(appliedFilter) !== JSON.stringify(EMPTY_BOM_FILTER),
    [appliedFilter],
  );

  return {
    dataset,
    filteredRows,
    summary,
    isLoading,
    error,
    draftFilter,
    isFiltered,
    updateDraft,
    applyFilter,
    resetFilter,
    retry: load,
  };
}
