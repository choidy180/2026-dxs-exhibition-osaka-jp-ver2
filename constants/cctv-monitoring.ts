import type { CctvCameraStatus } from '@/types/cctv-monitoring';

/** 썸네일 목록을 새로 받는 주기 (30분) */
export const THUMBNAIL_REFRESH_MS = 30 * 60 * 1_000;

/** '30분' / '45초' 처럼 사람이 읽기 쉬운 주기 표기 */
export const formatRefreshInterval = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1_000);
  if (totalSeconds < 60) return `${totalSeconds.toLocaleString('ko-KR')}초`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0
    ? `${minutes.toLocaleString('ko-KR')}분`
    : `${minutes.toLocaleString('ko-KR')}분 ${seconds}초`;
};

/** 남은 시간을 '12분 34초' / '45초' 로 표기 */
export const formatRemainingTime = (totalSeconds: number): string => {
  if (totalSeconds < 60) return `${totalSeconds.toLocaleString('ko-KR')}초`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0
    ? `${minutes.toLocaleString('ko-KR')}분`
    : `${minutes.toLocaleString('ko-KR')}분 ${String(seconds).padStart(2, '0')}초`;
};

/** 목업 요청에서도 최초 로딩 상태가 보이도록 짧은 지연을 둔다 */
export const CCTV_MOCK_LATENCY_MS = 420;

/** 임시 썸네일 이미지 — 실제 연동 시 API 응답 URL로 대체한다 */
export const CCTV_THUMBNAIL_IMAGE_PATH = '/images/cctv-monitoring/factory-floor-cctv.png';

/** 브라우저가 사내 HTTP API를 직접 호출하지 않도록 동일 출처 프록시를 사용한다 */
export const CCTV_MONITORING_API_ENDPOINT = '/api/cctv-monitoring';

/** 상대 썸네일 경로를 안전하게 중계하는 동일 출처 프록시 */
export const CCTV_THUMBNAIL_PROXY_ENDPOINT = '/api/cctv-monitoring/thumbnail';

/** WHEP 신호 교환을 중계하는 동일 출처 프록시 (실제 영상은 WebRTC로 직접 흐른다) */
export const CCTV_WHEP_PROXY_ENDPOINT = '/api/cctv-monitoring/whep';

/** 실시간 영상: 영상이 실제로 붙을 때까지 기다리는 시간 */
export const CCTV_LIVE_CONNECT_TIMEOUT_MS = 15_000;

/** 실시간 영상: 연결이 끊겼을 때 자동 재연결 간격 */
export const CCTV_LIVE_RECONNECT_DELAY_MS = 2_000;

/** 실시간 영상: 자동 재연결 최대 시도 횟수 */
export const CCTV_LIVE_MAX_RECONNECT_ATTEMPTS = 5;

/** WHEP 신호 교환(Offer/Answer) 요청 제한 시간 */
export const CCTV_WHEP_REQUEST_TIMEOUT_MS = 10_000;

/** 실제 API가 기본이며, 화면 검증이 필요할 때만 환경변수로 목업을 켠다 */
export const USE_MOCK_DATA =
  (process.env.NEXT_PUBLIC_CCTV_MONITORING_USE_MOCK ?? 'false').toLowerCase() === 'true';

export const CCTV_STATUS_LABEL: Record<CctvCameraStatus, string> = {
  online: '연결됨',
  offline: '연결 안 됨',
  maintenance: '점검 중',
};
