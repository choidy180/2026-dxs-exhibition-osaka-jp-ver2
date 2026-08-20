/**
 * 생산계획 업로드 도메인 타입
 *
 * API 응답 형태가 확정되면 `PlanRowResponse` / `PlanRevisionResponse` 만 실제 스키마로 교체하고
 * `utils/production-plan-api.ts` 의 매핑 함수를 수정하면 화면 코드는 그대로 사용할 수 있다.
 */

/** 계획 열 하나 = 근무일 하루 */
export type PlanDay = {
  /** 'YYYY-MM-DD' — 열 식별자로도 사용한다 */
  date: string;
  /** 'YYYY-MM' — 월 그룹 헤더 병합 기준 */
  month: string;
  /** '6/1' — 헤더 표시용 */
  label: string;
  /** '월' ~ '일' */
  weekday: string;
  isWeekend: boolean;
};

/** 품목 한 줄 */
export type PlanRow = {
  id: string;
  line: string;
  pjt: string;
  partNo: string;
  partNm: string;
  /** 'YYYY-MM-DD' → 계획수량. 값이 없는 날은 키를 두지 않는다 */
  quantities: Record<string, number>;
};

/** 리비전 확정 상태 — 화면 배지와 1:1 대응 */
export type RevisionStatus = 'confirmed' | 'reconfirmed' | 'draft';

/** 업로드 히스토리 항목 */
export type PlanRevision = {
  id: string;
  /** 업로드 일자 'YYYY-MM-DD' */
  uploadDate: string;
  /** 같은 업로드 일자 안에서의 리비전 번호 (0부터) */
  revision: number;
  /** 업로드된 계획 행 수 (품목수 × 계획일수) */
  rowCount: number;
  /** 'YYYY-MM-DD HH:mm' */
  uploadedAt: string;
  status: RevisionStatus;
  /** 원본 엑셀 파일명 (있는 경우) */
  fileName?: string;
};

/** 미리보기 그리드 데이터 */
export type PlanDataset = {
  revisionId: string;
  days: PlanDay[];
  rows: PlanRow[];
};

/** 상단 지표 카드 값 */
export type PlanSummary = {
  itemCount: number;
  dayCount: number;
  totalQty: number;
  revisionLabel: string;
};

/** 엑셀 파싱 결과 */
export type ParsedPlanFile = {
  fileName: string;
  days: PlanDay[];
  rows: PlanRow[];
  /** 파싱 중 건너뛴 행·열 안내 (사용자에게 노출) */
  warnings: string[];
};

/** DB 저장 결과 — API 연결 전에는 pending 으로만 응답한다 */
export type PlanSaveResult = {
  ok: boolean;
  message: string;
};

/* ───────── API 원본 응답 형태 (연결 시 실제 스키마로 교체) ───────── */

export type PlanRevisionResponse = {
  REV_ID: string;
  UPLOAD_YMD: string;
  REV_NO: number | string;
  ROW_CNT: number | string;
  UPLOAD_DT: string;
  CONF_GB: string;
  FILE_NM?: string;
};

export type PlanRowResponse = {
  ROW_ID?: string;
  LINE_NM: string;
  PJT_NM: string;
  PART_NO: string;
  PART_NM: string;
  PLAN_YMD: string;
  PLAN_QTY: number | string;
};
