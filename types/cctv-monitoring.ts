/** CCTV가 설치된 건물 식별자 */
export type CctvBuildingId = 'D' | 'E' | 'F';

/** 카메라 운영 상태 */
export type CctvCameraStatus = 'online' | 'offline' | 'maintenance';

/** 향후 실시간 재생 연결에 사용할 WHEP 메타데이터 */
export interface CctvStreamConfig {
  transport: 'whep';
  baseUrl: string | null;
  path: string | null;
}

/** 상황 모니터링 화면에서 사용하는 정규화된 카메라 정보 */
export interface CctvCamera {
  id: string;
  code: string;
  name: string;
  buildingId: CctvBuildingId;
  location: string;
  status: CctvCameraStatus;
  thumbnailUrl: string | null;
  thumbnailVersion: number | null;
  objectPosition: string;
  thumbnailUpdatedAt: string | null;
  lastSeenAt: string | null;
  /** 실제 API의 카메라 키를 받을 자리 */
  apiCameraId: string | null;
  /** UI 단계에서는 메타데이터만 보관하며 WebSocket을 직접 생성하지 않는다 */
  stream: CctvStreamConfig;
}

/** 한 번의 목록·썸네일 갱신 결과 */
export interface CctvMonitoringSnapshot {
  cameras: CctvCamera[];
  generatedAt: string;
  revision: number;
}

/** 사내 CCTV API가 반환하는 카메라 항목 계약 */
export interface CctvCameraApiItem {
  number?: string | null;
  name?: string | null;
  thumbnailUrl?: string | null;
  thumbnailVersion?: number | string | null;
  webrtcPath?: string | null;
}

/** 사내 CCTV 목록·썸네일 API 응답 계약 */
export interface CctvMonitoringApiResponse {
  whepBaseUrl?: string | null;
  cameras?: CctvCameraApiItem[] | null;
  generatedAt?: string | null;
}

/** CCTV 데이터 훅의 공개 반환 타입 */
export interface UseCctvMonitoringResult {
  cameras: CctvCamera[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  refresh: () => void;
  lastUpdatedAt: string | null;
  nextRefreshSeconds: number;
  isRefreshing: boolean;
  refreshError: string | null;
  revision: number;
}
