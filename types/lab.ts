/**
 * 실험실(개발 진행 중) 화면 도메인 타입
 *
 * API 응답 형태가 확정되면 `*Response` 타입만 실제 스키마로 교체하고
 * `utils/lab-api.ts` 의 매핑 함수를 수정하면 화면 코드는 그대로 사용할 수 있다.
 */

import type { CalendarDay } from '@/utils/date';

/* ───────────────────────── MES BOM 정전개 ───────────────────────── */

/** BOM 정전개 한 줄 */
export type BomRow = {
  id: string;
  /** 전개 레벨 (0 = 제품) */
  level: number;
  itemNo: string;
  itemNm: string;
  designBomNo: number;
  purchaseBomNo: number;
  pjtCode: string;
  productNo: string;
  productNm: string;
  parentItemNo: string;
  parentItemNm: string;
  spec: string;
  material: string;
  unit: string;
  /** 필터 전용 필드 — 그리드에는 노출하지 않는다 */
  processGb: string;
  orderGb: string;
  vendor: string;
  buyer: string;
  materialManager: string;
};

export type BomFilter = {
  applyDate: string;
  pjtCode: string;
  productNo: string;
  orderGb: '' | '발주' | '미발주';
};

export type BomSummary = {
  /** 총 BOM 건수 */
  totalRows: number;
  /** 고유 품목수 */
  uniqueItems: number;
  /** 최대 LEVEL */
  maxLevel: number;
  /** 거래처 수 */
  vendorCount: number;
};

export type BomDataset = {
  /** 데이터 기준일 'YYYY-MM-DD' */
  baseDate: string;
  rows: BomRow[];
};

/* ───────────────────────── 발주대상리스트 ───────────────────────── */

/** 발주 필요 여부 */
export type OrderNeed = 'urgent' | 'required' | 'none';

/** 발주대상 한 줄 */
export type OrderTargetRow = {
  id: string;
  vendorCode: string;
  vendorNm: string;
  pjtCode: string;
  itemNo: string;
  itemNm: string;
  unit: string;
  /** 총소요량 — 값이 없는 품목은 null */
  totalRequired: number | null;
  leadTimeDays: number;
  /** 안전재고 — 값이 없는 품목은 null */
  safetyStock: number | null;
  orderNeed: OrderNeed;
  note: string;
  /** 'YYYY-MM-DD' → 발주예정 수량 */
  schedule: Record<string, number>;
};

export type OrderPlanFilter = {
  vendor: string;
  itemNo: string;
  itemNm: string;
  orderNeed: string;
};

export type OrderPlanSummary = {
  /** 총 품목수 */
  totalItems: number;
  /** 발주대상 품목수 */
  orderTargetItems: number;
  /** 긴급 발주 품목 */
  urgentItems: number;
};

export type OrderPlanDataset = {
  /** 적용된 생산계획 리비전 id */
  revisionId: string;
  /** 발주 요구일자 */
  planDate: string;
  /** 발주예정일 열 (주말 포함) */
  days: CalendarDay[];
  rows: OrderTargetRow[];
};

/** 적용 생산계획 선택 옵션 */
export type PlanRevisionOption = {
  id: string;
  /** 'Rev.03 (2026.08.14 적용)' */
  label: string;
};

/** MES 발주 전송 결과 */
export type MesTransferResult = {
  ok: boolean;
  message: string;
};

/* ───────────────────────── API 원본 응답 (연결 시 교체) ───────────────────────── */

export type BomRowResponse = {
  LVL: number | string;
  ITEM_NO: string;
  ITEM_NM: string;
  DESIGN_BOM_NO: number | string;
  PUR_BOM_NO: number | string;
  PJT_CD: string;
  PROD_NO: string;
  PROD_NM: string;
  UP_ITEM_NO: string;
  UP_ITEM_NM: string;
  SPEC: string;
  MATERIAL: string;
  UNIT: string;
  PROC_GB?: string;
  ORDER_GB?: string;
  VENDOR?: string;
  BUYER?: string;
  MAT_MGR?: string;
};

export type OrderTargetResponse = {
  VENDOR_CD: string;
  VENDOR_NM: string;
  PJT_CD: string;
  ITEM_NO: string;
  ITEM_NM: string;
  UNIT: string;
  REQ_QTY: number | string | null;
  LEAD_TIME: number | string;
  SAFE_STOCK: number | string | null;
  ORDER_GB: string;
  REMARK?: string;
  /** [{ PLAN_YMD, ORDER_QTY }] */
  SCHEDULE?: Array<{ PLAN_YMD: string; ORDER_QTY: number | string }>;
};
