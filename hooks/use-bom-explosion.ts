'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { USE_MOCK_BOM_DATA } from '@/constants/lab';
import type { BomDataset, BomFilter } from '@/types/lab';
import {
  EMPTY_BOM_FILTER, filterBomRows, getBomSummary, normalizeBomFilter, validateBomFilter,
} from '@/utils/lab';
import { BomQueryError, fetchBomExplosion } from '@/utils/lab-api';

export function useBomExplosion() {
  const [dataset, setDataset] = useState<BomDataset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 입력 중인 조건과 '조회' 로 적용된 조건을 분리한다
  const [draftFilter, setDraftFilter] = useState<BomFilter>(EMPTY_BOM_FILTER);
  const [appliedFilter, setAppliedFilter] = useState<BomFilter | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<BomFilter | null>(null);

  useEffect(() => () => { controllerRef.current?.abort(); }, []);

  const load = useCallback(async (filter: BomFilter) => {
    const normalized = normalizeBomFilter(filter);
    const invalid = validateBomFilter(normalized);
    setValidationError(invalid);
    if (invalid) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    lastRequestRef.current = normalized;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchBomExplosion(normalized, controller.signal);
      if (controller.signal.aborted || controllerRef.current !== controller) return;
      setDataset(result);
      setAppliedFilter(normalized);
    } catch (caught) {
      if (controller.signal.aborted || controllerRef.current !== controller) return;
      setDataset(null);
      setError(caught instanceof BomQueryError
        ? caught.message
        : 'BOM 정전개 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (!controller.signal.aborted && controllerRef.current === controller) setIsLoading(false);
    }
  }, []);

  /** 실제 조회는 서버에서 조건을 적용하므로 응답 전체가 조회 결과다. */
  const summary = useMemo(() => getBomSummary(dataset?.rows ?? []), [dataset]);

  const filteredRows = useMemo(
    () => dataset && appliedFilter
      ? USE_MOCK_BOM_DATA ? filterBomRows(dataset.rows, appliedFilter, dataset.baseDate) : dataset.rows
      : [],
    [appliedFilter, dataset],
  );

  const updateDraft = useCallback(<K extends keyof BomFilter>(key: K, value: BomFilter[K]) => {
    setDraftFilter(current => ({ ...current, [key]: value }));
    setValidationError(null);
  }, []);

  const applyFilter = useCallback(() => { void load(draftFilter); }, [draftFilter, load]);
  const retry = useCallback(() => {
    if (lastRequestRef.current) void load(lastRequestRef.current);
  }, [load]);

  const resetFilter = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    lastRequestRef.current = null;
    setDraftFilter(EMPTY_BOM_FILTER);
    setAppliedFilter(null);
    setDataset(null);
    setIsLoading(false);
    setError(null);
    setValidationError(null);
  }, []);

  const isDraftDirty = appliedFilter === null ||
    JSON.stringify(normalizeBomFilter(draftFilter)) !== JSON.stringify(appliedFilter);

  return {
    dataset,
    filteredRows,
    summary,
    isLoading,
    error,
    validationError,
    draftFilter,
    appliedFilter,
    isFiltered: appliedFilter !== null,
    isDraftDirty,
    updateDraft,
    applyFilter,
    resetFilter,
    retry,
  };
}
