/** CCTV가 설치된 건물 식별자 */
export type CctvBuildingId =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'
  | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R'
  | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

/** 건물, 카메라 용도 또는 미분류로 구분한 표시 그룹 */
export interface CctvCameraGroup {
  id: string;
  label: string;
  kind: 'building' | 'purpose' | 'unclassified';
}

/** 카메라 운영 상태 */
export type CctvCameraStatus = 'online' | 'offline' | 'maintenance';

/**
 * 실시간 영상 연결 정보.
 * WHEP(WebRTC) 방식이라 신호 교환 경로만 있으면 되고, 영상은 WebRTC 로 직접 흐른다.
 */
export interface CctvStreamConfig {
  transport: 'local';
  /** '/camera-204/whep' — 동일 출처 프록시에 넘길 경로 */
  path: string | null;
}

/** 상황 모니터링 화면에서 사용하는 정규화된 카메라 정보 */
export interface CctvCamera {
  id: string;
  code: string;
  name: string;
  buildingId: CctvBuildingId | null;
  /** API 번호에서 읽은 분류. 기존 목업은 buildingId로 그룹을 구한다. */
  group?: CctvCameraGroup;
  location: string;
  /** 번호 규칙으로 계산한 카메라 IP. 계산할 수 없으면 API 값을 쓰고, 둘 다 없으면 null */
  ipAddress: string | null;
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
  /**
   * 실시간 영상 경로. 사내 API 는 'camera-204' 처럼 카메라 키만 내려준다.
   * 앞뒤 슬래시나 '/whep' 이 붙어 오는 경우도 있어 매핑에서 정규화한다.
   */
  webrtcPath?: string | null;
  streamPath?: string | null;
  whepPath?: string | null;
  /** 카메라 IP. 서버마다 키가 달라 여러 이름을 함께 인식한다 */
  ip?: string | null;
  ipAddress?: string | null;
  cameraIp?: string | null;
  host?: string | null;
  address?: string | null;
  rtspUrl?: string | null;
}

/** 사내 CCTV 목록·썸네일 API 응답 계약 */
export interface CctvMonitoringApiResponse {
  cameras?: CctvCameraApiItem[] | null;
  generatedAt?: string | null;
}

/** 실시간 영상 연결 상태 */
export type CctvLiveStatus = 'idle' | 'connecting' | 'playing' | 'error';

/** 실시간 영상 훅의 공개 반환 타입 */
export interface UseCctvLiveStreamResult {
  /** `<video>` 에 물릴 WebRTC 미디어 스트림 */
  stream: MediaStream | null;
  status: CctvLiveStatus;
  error: string | null;
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
