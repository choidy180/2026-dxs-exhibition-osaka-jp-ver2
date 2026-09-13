import type { VWorldMarker } from '@/components/vworld-map-dev';
import {
  TRANSPORT_DEFAULT_DURATION_SECONDS,
  TRANSPORT_DEFAULT_POSITION,
  TRANSPORT_FACILITY_MARKERS,
  TRANSPORT_LOCATIONS,
} from '@/constants/realtime-transport';
import type { TransportPosition, TransportVehicle, TransportVehicleRecord } from '@/types/realtime-transport';

const textValue = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

export function parseTransportCoordinate(value: unknown, locationName: unknown): TransportPosition {
  const title = textValue(locationName) || '-';
  const parts = textValue(value).split(',');
  if (parts.length === 2 && parts.every(part => part.trim() !== '')) {
    const [lat, lng] = parts.map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)
      && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && lat !== 0 && lng !== 0) {
      return { lat, lng, title, coordinateSource: 'api' };
    }
  }

  if (title !== '-') {
    const knownLocation = Object.entries(TRANSPORT_LOCATIONS).find(([key, location]) =>
      title.includes(key) || key.includes(title) || title.includes(location.title) || location.title.includes(title));
    if (knownLocation) return { ...knownLocation[1], title, coordinateSource: 'facility' };
  }
  return { ...TRANSPORT_DEFAULT_POSITION, title };
}

/** 서버의 시간대 없는 출발 일시는 한국 표준시로 해석한다. */
export function parseTransportTimestamp(value: unknown): number {
  const source = textValue(value);
  if (!source) return Number.NaN;
  const normalized = source.replace(' ', 'T');
  const withoutTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(normalized);
  return Date.parse(withoutTimezone ? `${normalized}+09:00` : normalized);
}

function parseDuration(value: unknown): number | null {
  const source = textValue(value);
  if (!/^\d+:\d{2}:\d{2}(?:\.\d+)?$/.test(source)) return null;
  const [hours, minutes, seconds] = source.split(':').map(Number);
  const duration = hours * 3600 + minutes * 60 + seconds;
  return minutes < 60 && seconds < 60 && duration > 0 && Number.isFinite(duration) ? duration : null;
}

/** 응답 모양이 잘못된 경우 빈 결과로 숨기지 않고 조회 오류로 처리한다. */
export function mapTransportApiResponse(value: unknown): TransportVehicleRecord[] {
  if (!Array.isArray(value)) throw new Error('Unexpected transport response');

  const rows = value.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid transport row');
    return entry as Record<string, unknown>;
  });
  const tripCounts = new Map<string, number>();
  for (const row of rows) {
    const vehicleNo = textValue(row.차량번호);
    if (vehicleNo) tripCounts.set(vehicleNo, (tripCounts.get(vehicleNo) ?? 0) + 1);
  }
  const idCounts = new Map<string, number>();

  return rows.map((row, index): TransportVehicleRecord => {
    const vehicleNo = textValue(row.차량번호);
    const rawId = typeof row.출도착처리ID === 'number' && Number.isFinite(row.출도착처리ID)
      ? String(row.출도착처리ID) : textValue(row.출도착처리ID);
    const baseId = rawId || `transport-${vehicleNo || 'unknown'}-${textValue(row.출발시간)}-${index}`;
    const duplicateCount = idCounts.get(baseId) ?? 0;
    idCounts.set(baseId, duplicateCount + 1);
    const duration = parseDuration(row.소요시간);

    return {
      id: duplicateCount ? `${baseId}-${duplicateCount}` : baseId,
      vehicleNo: vehicleNo || '-',
      driver: textValue(row.운전자명) || '-',
      startPos: parseTransportCoordinate(row.출발위치, row.출발지),
      destPos: parseTransportCoordinate(row.도착위치, row.도착지),
      // 기존 화면과 같은 기본 추정치. API는 경로 거리/화물/온도를 제공하지 않는다.
      totalDistanceKm: 45,
      baseDurationSec: duration ?? TRANSPORT_DEFAULT_DURATION_SECONDS,
      startTime: parseTransportTimestamp(row.출발시간),
      status: textValue(row.상태) === '도착' ? 'Arrived' : 'Moving',
      cargo: '-',
      temp: '-',
      dailyTripCount: tripCounts.get(vehicleNo) ?? 1,
      isDistanceEstimated: true,
      isDurationEstimated: duration === null,
    };
  }).sort((a, b) => (Number.isFinite(b.startTime) ? b.startTime : 0) - (Number.isFinite(a.startTime) ? a.startTime : 0));
}

export function getTransportVehicleRuntime(vehicle: TransportVehicleRecord, now: number): TransportVehicle {
  const elapsed = Number.isFinite(vehicle.startTime) ? Math.max(0, (now - vehicle.startTime) / 1000) : 0;
  const duration = Math.max(1, vehicle.baseDurationSec);
  const arrived = vehicle.status === 'Arrived' || elapsed >= duration;
  const progress = arrived ? 1 : Math.min(1, elapsed / duration);
  return {
    ...vehicle,
    status: arrived ? 'Arrived' : 'Moving',
    progress,
    remainingSeconds: arrived ? 0 : Math.max(0, Math.ceil(duration - elapsed)),
  };
}

export function createTransportMarkers(vehicles: TransportVehicle[]): VWorldMarker[] {
  return [
    ...TRANSPORT_FACILITY_MARKERS,
    ...vehicles.filter(vehicle => vehicle.status === 'Moving').map((vehicle): VWorldMarker => ({
      id: vehicle.id,
      title: vehicle.id,
      vehicleNo: vehicle.vehicleNo,
      lat: vehicle.startPos.lat + (vehicle.destPos.lat - vehicle.startPos.lat) * vehicle.progress,
      lng: vehicle.startPos.lng + (vehicle.destPos.lng - vehicle.startPos.lng) * vehicle.progress,
      startLat: vehicle.startPos.lat,
      startLng: vehicle.startPos.lng,
      destLat: vehicle.destPos.lat,
      destLng: vehicle.destPos.lng,
      progress: vehicle.progress,
      driver: vehicle.driver,
      cargo: vehicle.cargo,
      eta: `${formatDuration(vehicle.remainingSeconds)} 후 도착 예상`,
      remainingTime: formatDuration(vehicle.remainingSeconds),
      flip: vehicle.startPos.title.includes('LG'),
    })),
  ];
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '-';
  if (seconds === 0) return '0분';
  if (seconds < 60) return '1분 미만';
  const minutes = Math.ceil(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0
    ? `${hours.toLocaleString('ko-KR')}시간${remainder ? ` ${remainder.toLocaleString('ko-KR')}분` : ''}`
    : `${minutes.toLocaleString('ko-KR')}분`;
}

export function formatTransportTime(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return '-';
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
}
