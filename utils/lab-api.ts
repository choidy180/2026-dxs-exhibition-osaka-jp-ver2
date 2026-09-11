/**
 * 실험실 화면 API 클라이언트
 *
 * BOM은 실제 MES API를 기본으로 사용하고 명시적인 목업 설정만 허용한다.
 * 발주대상 화면은 `USE_MOCK_DATA` 설정에 따라 목업 또는 실제 API로 동작한다.
 * 화면·훅 코드는 이 모듈만 사용하므로 API 연결 시 수정할 곳은 이 파일뿐이다.
 */

import {
  getApiBaseUrl,
  API_ENDPOINTS,
  ENABLE_MES_TRANSFER,
  MOCK_LATENCY_MS,
  ORDER_SCHEDULE_DAY_COUNT,
  USE_MOCK_BOM_DATA,
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
  BomFilter,
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
  const url = new URL(`${getApiBaseUrl()}${endpoint}`);
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

export class BomQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BomQueryError';
  }
}

const BOM_QUERY_TIMEOUT_MS = 90_000;
const BOM_RESPONSE_ERROR = 'BOM 서버의 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.';
const bomText = (value: unknown) => String(value ?? '').trim();

/** MES는 하위 레벨을 '.1', '..2'처럼 점으로 들여쓰기해 반환한다. */
const parseBomLevel = (value: unknown): number | null => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const matched = /^\.*(\d+)$/.exec(String(value).trim());
  if (!matched) return null;
  const level = Number(matched[1]);
  return Number.isSafeInteger(level) ? level : null;
};

const isBomRowResponse = (value: unknown): value is BomRowResponse => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return parseBomLevel(row.BomLevel) !== null &&
    ['CdGItem', 'PrjCode', 'ItemCode'].every(key =>
      key in row && (row[key] === null || typeof row[key] === 'string'),
    ) && ['NmGItem', 'CdGItUp', 'NmGItUp', 'SzStand', 'Ingrdnt', 'SzSUnit', 'NmProcGB',
      'PurType', 'NmCustmIn', 'NmEmplo'].every(key =>
      row[key] === undefined || row[key] === null || typeof row[key] === 'string',
    ) && ['BomID', 'PurchaseID'].every(key =>
      row[key] === undefined || row[key] === null || typeof row[key] === 'number' || typeof row[key] === 'string',
    );
};

const mapBomRow = (item: BomRowResponse, index: number): BomRow => ({
  id: `${bomText(item.ItemCode)}-${bomText(item.CdGItem)}-${index}`,
  level: parseBomLevel(item.BomLevel)!,
  itemNo: bomText(item.CdGItem),
  itemNm: bomText(item.NmGItem),
  designBomNo: toOptionalNumber(item.BomID),
  purchaseBomNo: toOptionalNumber(item.PurchaseID),
  pjtCode: bomText(item.PrjCode),
  productNo: bomText(item.ItemCode),
  // 계약에 없는 제품명·자재 담당자에 다른 품목/담당자 정보를 대신 붙이지 않는다.
  productNm: '',
  parentItemNo: bomText(item.CdGItUp),
  parentItemNm: bomText(item.NmGItUp),
  spec: bomText(item.SzStand),
  material: bomText(item.Ingrdnt),
  unit: bomText(item.SzSUnit),
  processGb: bomText(item.NmProcGB),
  orderGb: bomText(item.PurType),
  vendor: bomText(item.NmCustmIn),
  buyer: bomText(item.NmEmplo),
  materialManager: '',
});

/** 실제 MES 서버에서 적용일자·PJT·제품번호·발주구분 조건을 적용한다. */
export const fetchBomExplosion = async (filter: BomFilter, signal?: AbortSignal): Promise<BomDataset> => {
  signal?.throwIfAborted();
  if (USE_MOCK_BOM_DATA) {
    await delay(MOCK_LATENCY_MS);
    signal?.throwIfAborted();
    return DUMMY_BOM_DATASET;
  }

  const params: Record<string, string> = {
    AdaptDate: filter.applyDate.trim(),
    PrjCode: filter.pjtCode.trim(),
  };
  if (filter.productNo.trim()) params.ItemCode = filter.productNo.trim();
  if (filter.orderGb) params.PurType = filter.orderGb;

  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, BOM_QUERY_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(API_ENDPOINTS.BOM_EXPLOSION, params), {
      method: 'GET',
      credentials: 'omit',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new BomQueryError(`BOM 서버에서 조회하지 못했습니다. (HTTP ${response.status}) 잠시 후 다시 시도해 주세요.`);
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new BomQueryError(BOM_RESPONSE_ERROR);
    }
    signal?.throwIfAborted();
    if (!Array.isArray(data) || !data.every(isBomRowResponse)) {
      throw new BomQueryError(BOM_RESPONSE_ERROR);
    }
    return { baseDate: filter.applyDate.trim(), rows: data.map(mapBomRow) };
  } catch (error) {
    signal?.throwIfAborted();
    if (timedOut) {
      throw new BomQueryError('BOM 조회 응답 시간이 90초를 초과했습니다. 조건을 좁히거나 잠시 후 다시 시도해 주세요.');
    }
    if (error instanceof BomQueryError) throw error;
    throw new BomQueryError('BOM 서버에 연결하지 못했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
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
