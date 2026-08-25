import type { CctvBuildingId, CctvCameraStatus } from '@/types/cctv-monitoring';

/** 썸네일 목록을 새로 받는 주기 */
export const THUMBNAIL_REFRESH_MS = 10_000;

/** 목업 요청에서도 최초 로딩 상태가 보이도록 짧은 지연을 둔다 */
export const CCTV_MOCK_LATENCY_MS = 420;

/** 임시 썸네일 이미지 — 실제 연동 시 API 응답 URL로 대체한다 */
export const CCTV_THUMBNAIL_IMAGE_PATH = '/images/cctv-monitoring/factory-floor-cctv.png';

/** 향후 목록·썸네일 API가 연결될 기본 엔드포인트 */
export const CCTV_MONITORING_API_ENDPOINT = '/api/cctv-monitoring';

/** API 연결 전에는 기본적으로 목업 데이터 한 갈래만 사용한다 */
export const USE_MOCK_DATA =
  (process.env.NEXT_PUBLIC_CCTV_MONITORING_USE_MOCK ?? 'true').toLowerCase() !== 'false';

export const CCTV_BUILDINGS: ReadonlyArray<{ id: CctvBuildingId; label: string }> = [
  { id: 'D', label: 'D동' },
  { id: 'E', label: 'E동' },
  { id: 'F', label: 'F동' },
];

export const CCTV_STATUS_LABEL: Record<CctvCameraStatus, string> = {
  online: '온라인',
  offline: '오프라인',
  maintenance: '점검 중',
};
