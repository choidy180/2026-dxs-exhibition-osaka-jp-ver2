/**
 * 발포 공정 설비 이상징후 센서 타입
 * 원본: GR{n}_002_AI2.php?json=gomotec2&seq={n}&select_date=
 */

/** PHP 응답 원본 레코드 (모든 수치가 문자열로 올 수 있음) */
export interface FoamingSensorRawRecord {
  SFVALUE?: number | string;
  TYPE?: string;
  SFREALVALUE?: number | string;
  MODELNO?: string;
  MAX?: string | number;
  MIN?: string | number;
  TIMESTAMP?: string;
  best_value?: string | number;
}

export interface FoamingSensorRawResponse {
  gomotec?: FoamingSensorRawRecord[];
}

/** 정규화된 측정 1건 */
export interface FoamingReading {
  /** "HH:MM:SS" */
  timestamp: string;
  /** SFREALVALUE — 실측값 */
  value: number;
  /** SFVALUE — 원본이 함께 주는 부가 수치(편차/스코어 추정) */
  sfValue: number | null;
}

export type FoamingStatus = 'normal' | 'warn' | 'critical' | 'unknown';

/** seq 하나에 대응하는 센서 시계열 */
export interface FoamingSensorSeries {
  seq: number;
  /** TYPE 원문 (예: "온조#1리턴온도(℃)") */
  rawType: string;
  /** 단위를 제거한 센서명 (예: "온조#1리턴온도") */
  name: string;
  /** TYPE 괄호 안 단위 (예: "℃") */
  unit: string;
  modelNo: string | null;
  /** 정상범위 하한 — 원본 MAX/MIN이 뒤바뀌어 오므로 작은 값으로 정규화 */
  lower: number | null;
  /** 정상범위 상한 */
  upper: number | null;
  /** best_value — 최적값 */
  optimal: number | null;
  /** 시간 오름차순, 동일 timestamp 중복 제거 */
  readings: FoamingReading[];
  latest: FoamingReading | null;
  status: FoamingStatus;
  /** 최신값의 범위 이탈량 (정상이면 0, 상한 초과는 +, 하한 미달은 -) */
  breach: number;
}

export interface FoamingSensorPayload {
  ok: boolean;
  /** 공정 코드 (GR2 등) */
  process: string;
  /** 서버가 응답을 만든 시각 (ISO) */
  fetchedAt: string;
  series: FoamingSensorSeries[];
  /** seq 단위 실패 내역 — 일부 seq만 실패해도 나머지는 그대로 내려준다 */
  errors: { seq: number; message: string }[];
}
