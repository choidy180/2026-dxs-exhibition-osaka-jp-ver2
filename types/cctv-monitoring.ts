/** CCTV가 설치된 건물 식별자 */
export type CctvBuildingId = 'D' | 'E' | 'F';

/** 카메라 운영 상태 */
export type CctvCameraStatus = 'online' | 'offline' | 'maintenance';

/**
 * 실시간 영상 연결 정보.
 * WebSocket 메시지 한 건이 JPEG 한 장인 방식이라 `baseUrl + path` 로 접속한다.
 */
export interface CctvStreamConfig {
  transport: 'websocket-jpeg';
  /** 'ws://호스트:포트' — 목록 API 응답에서 받는다 */
  baseUrl: string | null;
  /** '/ws/camera-203' */
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
  id?: string | null;
  number?: string | null;
  name?: string | null;
  thumbnailUrl?: string | null;
  thumbnailVersion?: number | string | null;
  /** '/ws/camera-203' — 실시간 JPEG 스트림 WebSocket 경로 */
  streamPath?: string | null;
}

/** 사내 CCTV 목록·썸네일 API 응답 계약 */
export interface CctvMonitoringApiResponse {
  cameras?: CctvCameraApiItem[] | null;
  generatedAt?: string | null;
  /** 동일 출처 프록시가 사내 API 주소에서 파생시켜 넣어주는 값 */
  streamBaseUrl?: string | null;
}

/** 실시간 영상 연결 상태 */
export type CctvLiveStatus = 'idle' | 'connecting' | 'playing' | 'stalled' | 'error';

/** 실시간 영상 훅의 공개 반환 타입 */
export interface UseCctvLiveStreamResult {
  /** 최신 JPEG 프레임의 Blob URL */
  frameUrl: string | null;
  status: CctvLiveStatus;
  error: string | null;
  /** 수신한 프레임 수 */
  frameCount: number;
  retry: () => void;
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
