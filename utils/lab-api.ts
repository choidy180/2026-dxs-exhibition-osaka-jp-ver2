/**
 * 실험실 화면 API 클라이언트
 *
 * `USE_MOCK_DATA` 가 true 인 동안은 목업 데이터로 동작하고,
 * false 로 바꾸면 같은 함수 시그니처로 실제 엔드포인트를 호출한다.
 * 화면·훅 코드는 이 모듈만 사용하므로 API 연결 시 수정할 곳은 이 파일뿐이다.
 */

import {
  API_BASE_URL,
  API_ENDPOINTS,
  BOM_BASE_DATE,
  ENABLE_MES_TRANSFER,
  MOCK_LATENCY_MS,
  ORDER_SCHEDULE_DAY_COUNT,
  USE_MOCK_DATA,
} from '@/constants/lab';
import {
  DUMMY_BOM_DATASET,
  DUMMY_PLAN_REVISION_OPTIONS,
  buildOrderPlanDataset,
} from '@/data/dummy-lab';
import { buildDayRange } from '@/utils/date';
import type {
  BomDataset,
  BomRow,
  BomRowResponse,
  MesTransferResult,
  OrderNeed,
  OrderPlanDataset,
  OrderTargetResponse,
  OrderTargetRow,
  PlanRevisionOption,
} from '@/types/lab';
import { fetchRevisions as fetchPlanRevisions } from './production-plan-api';

const buildUrl = (endpoint: string, params?: Record<string, string>) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!response.ok) throw new Error(`API ${response.status}`);
  return (await response.json()) as T;
};

const delay = (ms: number) => new Promise<void>(resolve => { setTimeout(resolve, ms); });

const toNumber = (value: unknown): number => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

/* ───────────────────────── 응답 매핑 ───────────────────────── */

const mapBomRow = (item: BomRowResponse, index: number): BomRow => ({
  id: `${item.ITEM_NO}-${index}`,
  level: toNumber(item.LVL),
  itemNo: String(item.ITEM_NO ?? '').trim(),
  itemNm: String(item.ITEM_NM ?? '').trim(),
  designBomNo: toNumber(item.DESIGN_BOM_NO),
  purchaseBomNo: toNumber(item.PUR_BOM_NO),
  pjtCode: String(item.PJT_CD ?? '').trim(),
  productNo: String(item.PROD_NO ?? '').trim(),
  productNm: String(item.PROD_NM ?? '').trim(),
  parentItemNo: String(item.UP_ITEM_NO ?? '').trim(),
  parentItemNm: String(item.UP_ITEM_NM ?? '').trim(),
  spec: String(item.SPEC ?? '').trim(),
  material: String(item.MATERIAL ?? '').trim(),
  unit: String(item.UNIT ?? '').trim(),
  processGb: String(item.PROC_GB ?? '').trim(),
  orderGb: String(item.ORDER_GB ?? '').trim(),
  vendor: String(item.VENDOR ?? '').trim(),
  buyer: String(item.BUYER ?? '').trim(),
  materialManager: String(item.MAT_MGR ?? '').trim(),
});

const ORDER_NEED_BY_CODE: Record<string, OrderNeed> = {
  U: 'urgent',
  긴급: 'urgent',
  Y: 'required',
  N: 'none',
};

const mapOrderRow = (item: OrderTargetResponse, index: number): OrderTargetRow => {
  const schedule: Record<string, number> = {};

  (item.SCHEDULE ?? []).forEach(entry => {
    const dateKey = String(entry.PLAN_YMD ?? '').replace(/[./]/g, '-').slice(0, 10);
    const qty = toNumber(entry.ORDER_QTY);
    if (dateKey && qty > 0) schedule[dateKey] = (schedule[dateKey] ?? 0) + qty;
  });

  return {
    id: `${item.ITEM_NO}-${index}`,
    vendorCode: String(item.VENDOR_CD ?? '').trim(),
    vendorNm: String(item.VENDOR_NM ?? '').trim(),
    pjtCode: String(item.PJT_CD ?? '').trim(),
    itemNo: String(item.ITEM_NO ?? '').trim(),
    itemNm: String(item.ITEM_NM ?? '').trim(),
    unit: String(item.UNIT ?? '').trim(),
    totalRequired: toOptionalNumber(item.REQ_QTY),
    leadTimeDays: toNumber(item.LEAD_TIME),
    safetyStock: toOptionalNumber(item.SAFE_STOCK),
    orderNeed: ORDER_NEED_BY_CODE[String(item.ORDER_GB ?? '').trim().toUpperCase()] ?? 'none',
    note: String(item.REMARK ?? '').trim(),
    schedule,
  };
};

/* ───────────────────────── MES BOM ───────────────────────── */

/** BOM 정전개 전체 리스트 조회 */
export const fetchBomExplosion = async (): Promise<BomDataset> => {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY_MS);
    return DUMMY_BOM_DATASET;
  }

  const data = await requestJson<BomRowResponse[]>(buildUrl(API_ENDPOINTS.BOM_EXPLOSION));
  return {
    baseDate: BOM_BASE_DATE,
    rows: (Array.isArray(data) ? data : []).map(mapBomRow),
  };
};

/* ───────────────────────── 발주대상 ───────────────────────── */

/**
 * 적용 생산계획 선택 옵션.
 * 생산계획 화면의 리비전 목록을 그대로 사용해 두 화면의 리비전이 어긋나지 않게 한다.
 */
export const fetchPlanRevisionOptions = async (): Promise<PlanRevisionOption[]> => {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY_MS);
    return DUMMY_PLAN_REVISION_OPTIONS;
  }

  const revisions = await fetchPlanRevisions();
  return revisions.map(revision => ({
    id: revision.id,
    label: `Rev.${String(revision.revision).padStart(2, '0')} (${revision.uploadDate.replace(/-/g, '.')} 적용)`,
  }));
};

/** 발주대상 산출 결과 조회 */
export const fetchOrderPlan = async (
  revisionId: string,
  planDate: string,
): Promise<OrderPlanDataset> => {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY_MS);
    return buildOrderPlanDataset(revisionId, planDate);
  }

  const data = await requestJson<OrderTargetResponse[]>(
    buildUrl(API_ENDPOINTS.ORDER_TARGET, { revId: revisionId, planYmd: planDate }),
  );

  return {
    revisionId,
    planDate,
    days: buildDayRange(planDate, ORDER_SCHEDULE_DAY_COUNT),
    rows: (Array.isArray(data) ? data : []).map(mapOrderRow),
  };
};

/** 발주 소요량 재계산 — 생산계획과 BOM 소요량을 다시 전개한다 */
export const recalculateOrderPlan = async (
  revisionId: string,
  planDate: string,
): Promise<OrderPlanDataset> => {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY_MS);
    return buildOrderPlanDataset(revisionId, planDate);
  }

  const data = await requestJson<OrderTargetResponse[]>(buildUrl(API_ENDPOINTS.ORDER_CALCULATE), {
    method: 'POST',
    body: JSON.stringify({ REV_ID: revisionId, PLAN_YMD: planDate }),
  });

  return {
    revisionId,
    planDate,
    days: buildDayRange(planDate, ORDER_SCHEDULE_DAY_COUNT),
    rows: (Array.isArray(data) ? data : []).map(mapOrderRow),
  };
};

/**
 * MES 발주 전송 — 현재 미연결 기능.
 * `ENABLE_MES_TRANSFER` 를 true 로 바꾸면 아래 실제 호출이 동작한다.
 */
export const transferToMes = async (
  revisionId: string,
  itemNos: string[],
): Promise<MesTransferResult> => {
  if (!ENABLE_MES_TRANSFER) {
    return {
      ok: false,
      message: `MES 발주 전송은 API 연결 후 사용할 수 있습니다. (전송 대상 ${itemNos.length.toLocaleString('ko-KR')}건)`,
    };
  }

  const data = await requestJson<{ RESULT: string; MESSAGE?: string }>(
    buildUrl(API_ENDPOINTS.MES_TRANSFER),
    { method: 'POST', body: JSON.stringify({ REV_ID: revisionId, ITEMS: itemNos }) },
  );

  const ok = String(data.RESULT ?? '').toUpperCase() === 'Y';
  return { ok, message: data.MESSAGE ?? (ok ? 'MES 발주 전송이 완료되었습니다.' : 'MES 발주 전송에 실패했습니다.') };
};
