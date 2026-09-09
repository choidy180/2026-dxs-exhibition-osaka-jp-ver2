/**
 * 생산계획 업로드 설정
 *
 * API 가 준비되면 `NEXT_PUBLIC_PRODUCTION_PLAN_USE_MOCK=false` 만 설정하면
 * 목업 대신 실제 엔드포인트로 전환된다. 엔드포인트 경로는 아래 상수만 교체한다.
 */

import { getDxApiUrl } from '@/utils/dx-api';

export const getApiBaseUrl = () => getDxApiUrl('/api');

export const API_ENDPOINTS = {
  /** 업로드 히스토리(리비전 목록) 조회 */
  REVISIONS: '/DX_API000101',
  /** 리비전 상세 — 품목 × 일자별 계획수량 */
  REVISION_DETAIL: '/DX_API000102',
  /** 엑셀 업로드 등록 (multipart 또는 JSON) */
  UPLOAD: '/DX_API000103',
  /** 확정 / 확정취소 */
  CONFIRM: '/DX_API000104',
  /** DB 저장 (현재 미연결) */
  SAVE: '/DX_API000105',
} as const;

/**
 * 목업 모드 스위치.
 * 기본값은 목업(true). 환경변수에 'false' 를 넣으면 실제 API 를 호출한다.
 */
export const USE_MOCK_DATA =
  (process.env.NEXT_PUBLIC_PRODUCTION_PLAN_USE_MOCK ?? 'true').toLowerCase() !== 'false';

/** 목업 응답 지연 (실제 API 체감과 로딩 상태 확인용) */
export const MOCK_LATENCY_MS = 420;

/** DB 저장 기능 사용 여부 — API 연결 전까지 비활성 */
export const ENABLE_DB_SAVE = false;

/** 업로드 허용 확장자 */
export const ACCEPTED_FILE_EXTENSIONS = ['.xlsx', '.xls'] as const;

/** 업로드 허용 최대 용량 (10MB) */
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

/** 초기 업로드 일자 — SSR/CSR 렌더 결과를 일치시키기 위해 고정값을 사용한다 */
export const DEFAULT_UPLOAD_DATE = '2026-08-19';

/**
 * 미리보기 그리드 컬럼 폭 (px)
 * 22일 기준으로 1920px 모니터에서 가로 스크롤이 최소화되도록 맞춘 값이다.
 * 계획 기간이 길어지면 좌측 고정 컬럼을 유지한 채 가로 스크롤된다.
 */
export const GRID_COLUMN_WIDTH = {
  no: 38,
  line: 88,
  pjt: 78,
  partNo: 112,
  partNm: 144,
  total: 70,
  day: 46,
} as const;

/** 좌측 고정 컬럼 정의 — 헤더와 본문이 같은 정의를 공유한다 */
/**
 * 미리보기 그리드 행 높이 (px)
 * 본문 행은 `min` ~ `max` 사이에서 늘어나 그리드 영역을 세로로 채운다.
 * 품목이 많아 `min` 으로도 넘치면 세로 스크롤이 생기고, 품목이 적으면 `max` 에서 멈춘다.
 */
export const GRID_ROW_HEIGHT = {
  min: 34,
  /** 15품목 기준으로 1440p 높이까지 여백 없이 채워지는 값 */
  max: 72,
} as const;

export const FIXED_COLUMNS = [
  { key: 'no', label: 'NO', width: GRID_COLUMN_WIDTH.no, align: 'center' },
  { key: 'line', label: 'LINE', width: GRID_COLUMN_WIDTH.line, align: 'left' },
  { key: 'pjt', label: 'PJT', width: GRID_COLUMN_WIDTH.pjt, align: 'left' },
  { key: 'partNo', label: 'PART NO', width: GRID_COLUMN_WIDTH.partNo, align: 'left' },
  { key: 'partNm', label: 'PART NM', width: GRID_COLUMN_WIDTH.partNm, align: 'left' },
  { key: 'total', label: 'TOTAL', width: GRID_COLUMN_WIDTH.total, align: 'right' },
] as const;

export type FixedColumnKey = (typeof FIXED_COLUMNS)[number]['key'];

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 엑셀 파싱 시 고정 컬럼으로 인식할 헤더 별칭 */
export const HEADER_ALIASES: Record<Exclude<FixedColumnKey, 'total'> | 'total', string[]> = {
  no: ['no', 'no.', '번호', '순번'],
  line: ['line', '라인', '라인명'],
  pjt: ['pjt', 'project', '프로젝트'],
  partNo: ['part no', 'partno', 'part_no', '품번', '품목코드'],
  partNm: ['part nm', 'partnm', 'part_nm', 'part name', '품명', '품목명'],
  total: ['total', '합계', '총계', 'sum'],
};
