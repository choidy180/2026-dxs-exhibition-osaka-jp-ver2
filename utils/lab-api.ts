/** 전시회용 BOM·발주 데이터. 모든 조회와 전송 시뮬레이션은 로컬에서 실행한다. */
import { MOCK_LATENCY_MS } from '@/constants/lab';
import { DUMMY_BOM_DATASET, buildOrderPlanDataset } from '@/data/dummy-lab';
import type { BomDataset, BomFilter, MesTransferResult, OrderPlanDataset, PlanRevisionOption } from '@/types/lab';
import { filterBomRows } from './lab';
import { fetchRevisions as fetchPlanRevisions } from './production-plan-api';

const delay = () => new Promise<void>(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
export class BomQueryError extends Error {
  constructor(message: string) { super(message); this.name = 'BomQueryError'; }
}

export const fetchBomExplosion = async (filter: BomFilter, signal?: AbortSignal): Promise<BomDataset> => {
  signal?.throwIfAborted();
  await delay();
  signal?.throwIfAborted();
  return {
    baseDate: filter.applyDate,
    rows: structuredClone(filterBomRows(DUMMY_BOM_DATASET.rows, filter, filter.applyDate)),
  };
};
export const fetchPlanRevisionOptions = async (): Promise<PlanRevisionOption[]> => {
  const revisions = await fetchPlanRevisions();
  return revisions.map(revision => ({
    id: revision.id,
    label: `Rev.${String(revision.revision).padStart(2, '0')} (${revision.uploadDate.replaceAll('-', '.')} 적용)`,
  }));
};

const transferred = new Map<string, Set<string>>();
const transferredItems = (revisionId: string) => {
  if (!transferred.has(revisionId)) {
    let items: string[] = [];
    try {
      const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(`dxs-exhibition-orders-${revisionId}`);
      const saved: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(saved)) items = saved.filter((value): value is string => typeof value === 'string');
    } catch { /* 저장소 제한 시 현재 세션에서 계속 동작한다. */ }
    transferred.set(revisionId, new Set(items));
  }
  return transferred.get(revisionId)!;
};
export const fetchOrderPlan = async (revisionId: string, planDate: string): Promise<OrderPlanDataset> => {
  await delay();
  const dataset = buildOrderPlanDataset(revisionId, planDate);
  const sent = transferredItems(revisionId);
  return { ...dataset, rows: dataset.rows.map(row => sent.has(row.itemNo) ? { ...row, note: '전송 완료' } : row) };
};
export const recalculateOrderPlan = fetchOrderPlan;
export const transferToMes = async (revisionId: string, itemNos: string[]): Promise<MesTransferResult> => {
  await delay();
  const sent = transferredItems(revisionId);
  itemNos.forEach(item => sent.add(item));
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(`dxs-exhibition-orders-${revisionId}`, JSON.stringify([...sent]));
  } catch { /* 저장소 제한 시 현재 세션에서 계속 동작한다. */ }
  return { ok: true, message: `전시용 발주 ${itemNos.length.toLocaleString('ko-KR')}건의 전송 시뮬레이션을 완료했습니다.` };
};
