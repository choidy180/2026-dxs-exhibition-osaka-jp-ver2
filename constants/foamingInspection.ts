/** 발포 공정 이상징후 대시보드 설정 */

/** 3초 주기 폴링 */
export const POLLING_INTERVAL_MS = 3000;

/** 차트에 그릴 최근 측정 개수 */
export const CHART_POINT_LIMIT = 40;

/** 실시간 감지 로그 최대 행 수 */
export const LIVE_LOG_LIMIT = 12;

/**
 * 조회할 seq 목록.
 * seq 하나가 센서 하나에 대응하며, 센서명은 응답의 TYPE으로 결정된다.
 * (seq→센서 매핑을 코드에 하드코딩하지 않으므로 목록만 늘리면 차트가 추가된다)
 */
export const SENSOR_SEQS = [1, 2, 3] as const;

/** 탭에 노출할 공정 목록 — id가 그대로 PHP 파일명 접두어로 쓰인다 */
export const PROCESS_TABS = [
  { id: 'GR2', label: 'GR2 공정' },
  { id: 'GR3', label: 'GR3 공정' },
  { id: 'GR5', label: 'GR5 공정' },
  { id: 'GR9', label: 'GR9 공정' },
] as const;

export const DEFAULT_PROCESS = 'GR2';

/** 허용 공정 코드 (프록시 라우트에서 경로 조작 방지용 화이트리스트) */
export const ALLOWED_PROCESSES: readonly string[] = PROCESS_TABS.map((t) => t.id);

/**
 * 정상범위 경계로부터 이 비율 안쪽이면 '주의'로 판정한다.
 * (범위 폭의 10%)
 */
export const WARN_MARGIN_RATIO = 0.1;
