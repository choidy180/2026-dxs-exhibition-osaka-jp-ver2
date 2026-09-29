import type { CctvCameraStatus } from '@/types/cctv-monitoring';

/** 썸네일 목록을 새로 받는 주기 (30초) */
export const THUMBNAIL_REFRESH_MS = 30 * 1_000;

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
export const CCTV_THUMBNAIL_IMAGE_PATH = '/demo/factory-floor.png';

/** 모든 전시 화면은 로컬 데모 자료만 사용한다. */
export const USE_MOCK_DATA = true;

export const CCTV_STATUS_LABEL: Record<CctvCameraStatus, string> = {
  online: '연결됨',
  offline: '연결 안 됨',
  maintenance: '점검 중',
};
