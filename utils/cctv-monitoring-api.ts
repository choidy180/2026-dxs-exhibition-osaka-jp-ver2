/**
 * CCTV 상황 모니터링 API 경계.
 * 화면과 훅은 이 모듈만 사용하며 실제 API 연결 시 응답 매핑만 교체한다.
 */

import {
  CCTV_MOCK_LATENCY_MS,
  CCTV_MONITORING_API_ENDPOINT,
  CCTV_THUMBNAIL_IMAGE_PATH,
  USE_MOCK_DATA,
} from '@/constants/cctv-monitoring';
import { DUMMY_CCTV_CAMERAS } from '@/data/dummy-cctv-monitoring';
import type {
  CctvBuildingId,
  CctvCamera,
  CctvCameraApiItem,
  CctvCameraStatus,
  CctvMonitoringApiResponse,
  CctvMonitoringSnapshot,
} from '@/types/cctv-monitoring';

let mockRevision = 0;

const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('CCTV 요청이 취소되었습니다.', 'AbortError'));
      return;
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException('CCTV 요청이 취소되었습니다.', 'AbortError'));
    };

    signal?.addEventListener('abort', handleAbort, { once: true });
  });

const isBuildingId = (value: string | null | undefined): value is CctvBuildingId =>
  value === 'D' || value === 'E' || value === 'F';

const toStatus = (value: string | null | undefined): CctvCameraStatus => {
  if (value === 'online' || value === 'offline' || value === 'maintenance') return value;
  return 'offline';
};

const toIsoDate = (value: string | null | undefined, fallback: string): string => {
  if (!value) return fallback;
  return Number.isNaN(Date.parse(value)) ? fallback : new Date(value).toISOString();
};

const mapApiCamera = (item: CctvCameraApiItem, index: number, generatedAt: string): CctvCamera => {
  const rawBuildingId = item.buildingId?.trim().toUpperCase();
  const buildingId = isBuildingId(rawBuildingId) ? rawBuildingId : 'D';
  const code = item.code?.trim() || `${buildingId}${String(index + 1).padStart(2, '0')}`;
  const id = String(item.id ?? item.apiCameraId ?? `cctv-${code.toLowerCase()}`);
  const websocketUrl = item.websocketUrl?.trim() || null;
  const websocketChannel = item.websocketChannel?.trim() || null;

  return {
    id,
    code,
    name: item.name?.trim() || '이름 미지정 카메라',
    buildingId,
    location: item.location?.trim() || '-',
    status: toStatus(item.status?.trim().toLowerCase()),
    thumbnailUrl: item.thumbnailUrl?.trim() || CCTV_THUMBNAIL_IMAGE_PATH,
    objectPosition: item.objectPosition?.trim() || '50% 50%',
    thumbnailUpdatedAt: toIsoDate(item.thumbnailUpdatedAt, generatedAt),
    lastSeenAt: item.lastSeenAt ? toIsoDate(item.lastSeenAt, generatedAt) : null,
    apiCameraId: item.apiCameraId === null || item.apiCameraId === undefined
      ? null
      : String(item.apiCameraId),
    stream: {
      transport: 'websocket',
      endpoint: websocketUrl,
      channel: websocketChannel,
    },
  };
};

const buildMockSnapshot = (generatedAt: string): CctvMonitoringSnapshot => {
  mockRevision += 1;

  return {
    generatedAt,
    revision: mockRevision,
    cameras: DUMMY_CCTV_CAMERAS.map(camera => ({
      ...camera,
      thumbnailUpdatedAt: generatedAt,
      lastSeenAt: camera.status === 'online' ? generatedAt : camera.lastSeenAt,
      stream: { ...camera.stream },
    })),
  };
};

const requestApiSnapshot = async (signal?: AbortSignal): Promise<CctvMonitoringSnapshot> => {
  const response = await fetch(CCTV_MONITORING_API_ENDPOINT, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`CCTV API 요청에 실패했습니다. (${response.status})`);
  }

  const payload = (await response.json()) as CctvMonitoringApiResponse;
  const generatedAt = toIsoDate(payload.generatedAt, new Date().toISOString());
  const parsedRevision = Number(payload.revision);

  return {
    cameras: (Array.isArray(payload.cameras) ? payload.cameras : []).map((item, index) =>
      mapApiCamera(item, index, generatedAt),
    ),
    generatedAt,
    revision: Number.isFinite(parsedRevision) ? parsedRevision : 0,
  };
};

/** 카메라 목록과 최신 썸네일 메타데이터를 한 번 조회한다 */
export const fetchCctvMonitoringSnapshot = async (
  signal?: AbortSignal,
): Promise<CctvMonitoringSnapshot> => {
  if (USE_MOCK_DATA) {
    await delay(CCTV_MOCK_LATENCY_MS, signal);
    return buildMockSnapshot(new Date().toISOString());
  }

  return requestApiSnapshot(signal);
};
