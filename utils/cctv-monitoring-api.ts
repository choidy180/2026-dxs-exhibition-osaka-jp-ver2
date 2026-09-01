/**
 * CCTV 상황 모니터링 API 경계.
 * 화면과 훅은 이 모듈만 사용하며 실제 API 연결 시 응답 매핑만 교체한다.
 */

import {
  CCTV_MOCK_LATENCY_MS,
  CCTV_MONITORING_API_ENDPOINT,
  CCTV_THUMBNAIL_PROXY_ENDPOINT,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const toThumbnailVersion = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const toIsoDate = (value: string | null | undefined, fallback: string): string => {
  if (!value) return fallback;
  return Number.isNaN(Date.parse(value)) ? fallback : new Date(value).toISOString();
};

const toThumbnailDate = (version: number | null): string | null => {
  if (version === null) return null;
  const date = new Date(version * 1_000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toThumbnailProxyUrl = (source: string | null): string | null => {
  if (!source) return null;
  const params = new URLSearchParams({ source });
  return `${CCTV_THUMBNAIL_PROXY_ENDPOINT}?${params.toString()}`;
};

const mapApiCamera = (
  value: CctvCameraApiItem,
  index: number,
  streamBaseUrl: string | null,
): CctvCamera => {
  const item = isRecord(value) ? value : {};
  const number = toText(item.number) || `카메라 ${String(index + 1).padStart(2, '0')}`;
  const buildingMatch = number.match(/^\s*([DEF])\s*동(?:\s|$)/iu);
  const rawBuildingId = buildingMatch?.[1]?.toUpperCase();
  const buildingId = isBuildingId(rawBuildingId) ? rawBuildingId : 'F';
  const apiId = toText(item.id);
  const streamPath = toText(item.streamPath);
  const thumbnailVersion = toThumbnailVersion(item.thumbnailVersion);
  const rawThumbnailUrl = toText(item.thumbnailUrl);
  const hasThumbnail = thumbnailVersion !== null && rawThumbnailUrl !== null;
  const status: CctvCameraStatus = hasThumbnail ? 'online' : 'offline';
  const id = apiId || streamPath || `cctv-${number}-${index}`;

  return {
    id,
    code: number,
    name: toText(item.name) || '이름 미지정 카메라',
    buildingId,
    location: '-',
    status,
    thumbnailUrl: hasThumbnail ? toThumbnailProxyUrl(rawThumbnailUrl) : null,
    thumbnailVersion,
    objectPosition: '50% 50%',
    thumbnailUpdatedAt: toThumbnailDate(thumbnailVersion),
    lastSeenAt: toThumbnailDate(thumbnailVersion),
    apiCameraId: apiId,
    stream: {
      transport: 'websocket-jpeg',
      baseUrl: streamBaseUrl,
      path: streamPath,
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
      thumbnailVersion: mockRevision,
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
  if (!payload || !Array.isArray(payload.cameras)) {
    throw new Error('CCTV API 응답 형식이 올바르지 않습니다.');
  }

  const generatedAt = toIsoDate(payload.generatedAt, new Date().toISOString());
  const streamBaseUrl = toText(payload.streamBaseUrl);
  const cameras = payload.cameras.map((item, index) =>
    mapApiCamera(item, index, streamBaseUrl),
  );
  const revision = cameras.reduce(
    (latest, camera) => Math.max(latest, camera.thumbnailVersion ?? 0),
    0,
  );

  return {
    cameras,
    generatedAt,
    revision,
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
