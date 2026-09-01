import type { CctvBuildingId, CctvCameraStatus } from '@/types/cctv-monitoring';

/** 썸네일 목록을 새로 받는 주기 */
export const THUMBNAIL_REFRESH_MS = 10_000;

/** 목업 요청에서도 최초 로딩 상태가 보이도록 짧은 지연을 둔다 */
export const CCTV_MOCK_LATENCY_MS = 420;

/** 임시 썸네일 이미지 — 실제 연동 시 API 응답 URL로 대체한다 */
export const CCTV_THUMBNAIL_IMAGE_PATH = '/images/cctv-monitoring/factory-floor-cctv.png';

/** 브라우저가 사내 HTTP API를 직접 호출하지 않도록 동일 출처 프록시를 사용한다 */
export const CCTV_MONITORING_API_ENDPOINT = '/api/cctv-monitoring';

/** 상대 썸네일 경로를 안전하게 중계하는 동일 출처 프록시 */
export const CCTV_THUMBNAIL_PROXY_ENDPOINT = '/api/cctv-monitoring/thumbnail';

/** 실시간 영상: 첫 프레임을 기다리는 시간. 넘기면 '신호 없음'으로 안내한다 */
export const CCTV_LIVE_FIRST_FRAME_TIMEOUT_MS = 10_000;

/** 실시간 영상: 마지막 프레임 이후 이 시간이 지나면 끊긴 것으로 본다 */
export const CCTV_LIVE_STALL_TIMEOUT_MS = 8_000;

/** 실시간 영상: 연결이 끊겼을 때 자동 재연결 간격 */
export const CCTV_LIVE_RECONNECT_DELAY_MS = 2_000;

/** 실시간 영상: 자동 재연결 최대 시도 횟수 */
export const CCTV_LIVE_MAX_RECONNECT_ATTEMPTS = 5;

/** 실제 API가 기본이며, 화면 검증이 필요할 때만 환경변수로 목업을 켠다 */
export const USE_MOCK_DATA =
  (process.env.NEXT_PUBLIC_CCTV_MONITORING_USE_MOCK ?? 'false').toLowerCase() === 'true';

export const CCTV_BUILDINGS: ReadonlyArray<{ id: CctvBuildingId; label: string }> = [
  { id: 'D', label: 'D동' },
  { id: 'E', label: 'E동' },
  { id: 'F', label: 'F동' },
];

export const CCTV_STATUS_LABEL: Record<CctvCameraStatus, string> = {
  online: '연결됨',
  offline: '연결 안 됨',
  maintenance: '점검 중',
};
