/**
 * 실험실 화면 설정
 *
 * API 가 준비되면 `NEXT_PUBLIC_LAB_USE_MOCK=false` 로 두면 실제 엔드포인트를 호출한다.
 */

const DEFAULT_API_BASE_URL = 'https://gapi.dxsplatform.com/api';

export const API_BASE_URL = process.env.NEXT_PUBLIC_LAB_API_BASE ?? DEFAULT_API_BASE_URL;

export const API_ENDPOINTS = {
  /** MES DB Link — BOM 정전개 전체 리스트 */
  BOM_EXPLOSION: '/DX_API000201',
  /** 전체 BOM CSV — 화면의 목업/조회 조건과 별개인 엑셀 다운로드용 */
  BOM_EXPORT: '/DX_API000053/export',
  /** 발주대상 산출 */
  ORDER_TARGET: '/DX_API000202',
  /** 발주 소요량 재계산 */
  ORDER_CALCULATE: '/DX_API000203',
  /** MES 발주 전송 */
  MES_TRANSFER: '/DX_API000204',
} as const;

export const USE_MOCK_DATA = (process.env.NEXT_PUBLIC_LAB_USE_MOCK ?? 'true').toLowerCase() !== 'false';

export const MOCK_LATENCY_MS = 460;

/** MES 발주 전송 — API 연결 전까지 비활성 */
export const ENABLE_MES_TRANSFER = false;

/** SSR/CSR 렌더 결과를 맞추기 위한 고정 기준일 */
export const BOM_BASE_DATE = '2026-07-27';
export const DEFAULT_ORDER_PLAN_DATE = '2026-08-15';

/** 발주예정일 열 개수 (주말 포함) */
export const ORDER_SCHEDULE_DAY_COUNT = 14;

/* ───────────────────────── BOM 그리드 ───────────────────────── */

export const BOM_COLUMNS = [
  { key: 'no', label: 'No', width: 46, align: 'center', sticky: true },
  { key: 'level', label: 'Level', width: 106, align: 'left', sticky: true },
  { key: 'itemNo', label: '품목번호', width: 124, align: 'left', sticky: true },
  { key: 'itemNm', label: '품목명', width: 208, align: 'left', sticky: true },
  { key: 'designBomNo', label: '설계BOM번호', width: 94, align: 'right', sticky: false },
  { key: 'purchaseBomNo', label: '구매BOM번호', width: 94, align: 'right', sticky: false },
  { key: 'pjtCode', label: 'PJT코드', width: 82, align: 'center', sticky: false },
  { key: 'productNo', label: '제품번호', width: 118, align: 'left', sticky: false },
  { key: 'productNm', label: '제품명', width: 196, align: 'left', sticky: false },
  { key: 'parentItemNo', label: '상위품번', width: 118, align: 'left', sticky: false },
  { key: 'parentItemNm', label: '상위품명', width: 196, align: 'left', sticky: false },
  { key: 'spec', label: '규격', width: 214, align: 'left', sticky: false },
  { key: 'material', label: '재질', width: 92, align: 'left', sticky: false },
  { key: 'unit', label: '단위', width: 56, align: 'center', sticky: false },
] as const;

export type BomColumnKey = (typeof BOM_COLUMNS)[number]['key'];

/* ───────────────────────── 발주대상 그리드 ───────────────────────── */

/** 좌측 고정 컬럼 */
export const ORDER_FIXED_COLUMNS = [
  { key: 'no', label: 'No', width: 46, align: 'center' },
  { key: 'vendorCode', label: '거래처코드', width: 96, align: 'left' },
  { key: 'vendorNm', label: '거래처명', width: 128, align: 'left' },
  { key: 'pjtCode', label: 'PJT코드', width: 84, align: 'center' },
  { key: 'itemNo', label: '품목번호', width: 124, align: 'left' },
  { key: 'itemNm', label: '품목명', width: 188, align: 'left' },
] as const;

/** 발주예정일 앞의 수치 컬럼 */
export const ORDER_VALUE_COLUMNS = [
  { key: 'unit', label: '단위', width: 56, align: 'center' },
  { key: 'totalRequired', label: '총소요량', width: 88, align: 'right' },
  { key: 'leadTimeDays', label: '리드타임(일)', width: 92, align: 'right' },
  { key: 'safetyStock', label: '안전재고', width: 84, align: 'right' },
  { key: 'orderNeed', label: '발주필요', width: 84, align: 'center' },
  { key: 'note', label: '비고', width: 96, align: 'left' },
] as const;

export const ORDER_DAY_COLUMN_WIDTH = 54;

/** 그리드 행 높이 — 남는 높이만큼 늘어난다 */
export const GRID_ROW_HEIGHT = {
  min: 32,
  max: 56,
} as const;

/* ───────────────────────── 필터 옵션 ───────────────────────── */

export const LEVEL_OPTIONS = ['전체', '0', '1', '2', '3', '4', '5', '6'] as const;

export const PROCESS_GB_OPTIONS = ['전체', '조립', '사출', '발포', '진공성형', '외주'] as const;

export const ORDER_GB_OPTIONS = ['전체', '구매', '외주', '사내생산', '무상지급'] as const;

export const BUYER_OPTIONS = ['전체', '김민수', '박지훈', '이서연', '정우진', '최다은'] as const;

export const MATERIAL_MANAGER_OPTIONS = ['전체', '강태호', '윤채원', '임현우', '한소희'] as const;

export const ORDER_NEED_OPTIONS = ['전체', '긴급', '발주필요', '해당없음'] as const;
