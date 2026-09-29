'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_ORDER_PLAN_DATE } from '@/constants/lab';
import { toDateKey } from '@/utils/date';
import type { OrderPlanDataset, OrderPlanFilter, PlanRevisionOption } from '@/types/lab';
import { EMPTY_ORDER_FILTER, filterOrderRows, getOrderPlanSummary } from '@/utils/lab';
import {
  fetchOrderPlan,
  fetchPlanRevisionOptions,
  recalculateOrderPlan,
  transferToMes,
} from '@/utils/lab-api';

export type OrderNotice = {
  tone: 'success' | 'warning' | 'info' | 'danger';
  message: string;
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message && !error.message.startsWith('API ')) return error.message;
  return fallback;
};

export function useOrderPlan() {
  const [revisionOptions, setRevisionOptions] = useState<PlanRevisionOption[]>([]);
  const [revisionId, setRevisionId] = useState<string>('');
  const [planDate, setPlanDate] = useState(DEFAULT_ORDER_PLAN_DATE);

  const [dataset, setDataset] = useState<OrderPlanDataset | null>(null);
  const [isOptionsLoading, setIsOptionsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<OrderNotice | null>(null);

  const [draftFilter, setDraftFilter] = useState<OrderPlanFilter>(EMPTY_ORDER_FILTER);
  const [appliedFilter, setAppliedFilter] = useState<OrderPlanFilter>(EMPTY_ORDER_FILTER);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    setPlanDate(toDateKey(new Date()));
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /** 적용 생산계획 목록 조회 */
  const loadOptions = useCallback(async () => {
    setIsOptionsLoading(true);

    try {
      const options = await fetchPlanRevisionOptions();
      if (!isMountedRef.current) return;

      setRevisionOptions(options);
      setRevisionId(current => (current && options.some(o => o.id === current) ? current : options[0]?.id ?? ''));
    } catch (caught) {
      if (!isMountedRef.current) return;
      console.error('[lab/order] 생산계획 리비전 조회 실패', caught);
      setNotice({ tone: 'danger', message: '적용 생산계획 목록을 불러오지 못했습니다.' });
    } finally {
      if (isMountedRef.current) setIsOptionsLoading(false);
    }
  }, []);

  const loadDataset = useCallback(async (targetRevisionId: string, targetPlanDate: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchOrderPlan(targetRevisionId, targetPlanDate);
      if (!isMountedRef.current) return;
      setDataset(result);
    } catch (caught) {
      if (!isMountedRef.current) return;
      console.error('[lab/order] 발주대상 조회 실패', caught);
      setDataset(null);
      setError(toErrorMessage(caught, '발주대상 데이터를 불러오지 못했습니다.'));
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!revisionId) return;
    loadDataset(revisionId, planDate);
  }, [loadDataset, planDate, revisionId]);

  const summary = useMemo(() => getOrderPlanSummary(dataset?.rows ?? []), [dataset]);

  const filteredRows = useMemo(
    () => (dataset ? filterOrderRows(dataset.rows, appliedFilter) : []),
    [appliedFilter, dataset],
  );

  const updateDraft = useCallback(<K extends keyof OrderPlanFilter>(key: K, value: OrderPlanFilter[K]) => {
    setDraftFilter(current => ({ ...current, [key]: value }));
  }, []);

  const applyFilter = useCallback(() => setAppliedFilter(draftFilter), [draftFilter]);

  const resetFilter = useCallback(() => {
    setDraftFilter(EMPTY_ORDER_FILTER);
    setAppliedFilter(EMPTY_ORDER_FILTER);
  }, []);

  /** 발주 소요량 재계산 */
  const recalculate = useCallback(async () => {
    if (!revisionId) return;

    setIsCalculating(true);
    setNotice(null);

    try {
      const result = await recalculateOrderPlan(revisionId, planDate);
      if (!isMountedRef.current) return;

      setDataset(result);
      setError(null);
      const stats = getOrderPlanSummary(result.rows);
      setNotice({
        tone: 'success',
        message: `발주 소요량을 다시 산출했습니다. 총 ${stats.totalItems.toLocaleString('ko-KR')}품목 · 발주대상 ${stats.orderTargetItems.toLocaleString('ko-KR')}품목`,
      });
    } catch (caught) {
      if (!isMountedRef.current) return;
      console.error('[lab/order] 발주 소요량 계산 실패', caught);
      setNotice({ tone: 'danger', message: toErrorMessage(caught, '발주 소요량을 계산하지 못했습니다.') });
    } finally {
      if (isMountedRef.current) setIsCalculating(false);
    }
  }, [planDate, revisionId]);

  /** MES 발주 전송 — 현재 미연결 */
  const sendToMes = useCallback(async () => {
    if (!dataset) return;

    const targets = filteredRows.filter(row => row.orderNeed !== 'none');
    if (!targets.length) {
      setNotice({ tone: 'warning', message: '전송할 발주대상이 없습니다.' });
      return;
    }

    setIsTransferring(true);
    try {
      const result = await transferToMes(dataset.revisionId, targets.map(row => row.itemNo));
      if (!isMountedRef.current) return;
      setNotice({ tone: result.ok ? 'success' : 'warning', message: result.message });
      if (result.ok) await loadDataset(dataset.revisionId, dataset.planDate);
    } catch (caught) {
      if (!isMountedRef.current) return;
      console.error('[lab/order] MES 발주 전송 실패', caught);
      setNotice({ tone: 'danger', message: toErrorMessage(caught, 'MES 발주 전송 중 오류가 발생했습니다.') });
    } finally {
      if (isMountedRef.current) setIsTransferring(false);
    }
  }, [dataset, filteredRows, loadDataset]);

  const clearNotice = useCallback(() => setNotice(null), []);
  const showNotice = useCallback((next: OrderNotice) => setNotice(next), []);

  return {
    revisionOptions,
    revisionId,
    planDate,
    dataset,
    filteredRows,
    summary,
    isOptionsLoading,
    isLoading,
    isCalculating,
    isTransferring,
    error,
    notice,
    draftFilter,
    setRevisionId,
    setPlanDate,
    updateDraft,
    applyFilter,
    resetFilter,
    recalculate,
    sendToMes,
    clearNotice,
    showNotice,
    retry: () => loadDataset(revisionId, planDate),
  };
}
