import type { VWorldMarker } from '@/components/vworld-map-dev';
import type { TransportPosition } from '@/types/realtime-transport';

export const REALTIME_TRANSPORT_API_PATH = '/api/DX_API000002';
export const TRANSPORT_POLL_INTERVAL_MS = 30_000;
export const TRANSPORT_REQUEST_TIMEOUT_MS = 15_000;
export const TRANSPORT_DEFAULT_DURATION_SECONDS = 1_800;

export const TRANSPORT_LOCATIONS: Record<string, TransportPosition> = {
  GMT_부산: { lat: 35.1487345915681, lng: 128.859885213419, title: '고모텍 부산공장' },
  GMT: { lat: 35.1487345915681, lng: 128.859885213419, title: '고모텍 본사' },
  LG1_선진화: { lat: 35.2078432680624, lng: 128.666263957419, title: 'LG전자' },
  신창원물류: { lat: 35.2255, lng: 128.6044, title: '신창원 물류센터' },
  CKD납품: { lat: 35.21302, lng: 128.635923, title: 'CKD 납품장' },
  성철사: { lat: 35.1855, lng: 128.9044, title: '성철사' },
};

export const TRANSPORT_DEFAULT_POSITION: TransportPosition = {
  lat: 35.148734,
  lng: 128.859885,
  title: '-',
  coordinateSource: 'fallback',
};

export const TRANSPORT_FACILITY_MARKERS: VWorldMarker[] = [
  { id: 'fac-gmt', ...TRANSPORT_LOCATIONS.GMT_부산, isFacility: true },
  { id: 'fac-lg', ...TRANSPORT_LOCATIONS.LG1_선진화, isFacility: true },
];
