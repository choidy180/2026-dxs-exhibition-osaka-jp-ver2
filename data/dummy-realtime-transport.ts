import { TRANSPORT_LOCATIONS } from '@/constants/realtime-transport';
import type { TransportVehicleRecord } from '@/types/realtime-transport';

/** 사용자가 샘플 모드를 선택했을 때만 생성하는 가상 운행 이력. */
export function createSampleTransportVehicles(now = Date.now()): TransportVehicleRecord[] {
  const routes = [
    { start: 'GMT_부산', dest: 'LG1_선진화', duration: 1800, progress: 0.1, distance: 45, trips: 1, cargo: '부품' },
    { start: 'LG1_선진화', dest: 'GMT_부산', duration: 1800, progress: 0.8, distance: 45, trips: 4, cargo: '모터' },
    { start: 'CKD납품', dest: 'GMT_부산', duration: 1200, progress: 0.5, distance: 20, trips: 2, cargo: '전자부품' },
    { start: '신창원물류', dest: 'LG1_선진화', duration: 1000, progress: 0.95, distance: 15, trips: 5, cargo: '플라스틱' },
    { start: '성철사', dest: 'GMT_부산', duration: 2000, progress: 0.2, distance: 30, trips: 3, cargo: '금속부품' },
    { start: 'GMT_부산', dest: 'LG1_선진화', duration: 1800, progress: 1.1, distance: 45, trips: 3, cargo: '완제품' },
    { start: 'LG1_선진화', dest: 'GMT_부산', duration: 1800, progress: 1.5, distance: 45, trips: 4, cargo: '회수품' },
  ];

  return routes.map((route, index): TransportVehicleRecord => ({
    id: `sample-${index + 1}`,
    vehicleNo: `샘플 차량 ${String.fromCharCode(65 + index)}`,
    driver: `샘플 기사 ${String.fromCharCode(65 + index)}`,
    startPos: { ...TRANSPORT_LOCATIONS[route.start], coordinateSource: 'facility' },
    destPos: { ...TRANSPORT_LOCATIONS[route.dest], coordinateSource: 'facility' },
    totalDistanceKm: route.distance,
    baseDurationSec: route.duration,
    startTime: now - route.duration * 1000 * route.progress,
    status: route.progress >= 1 ? 'Arrived' : 'Moving',
    cargo: route.cargo,
    temp: '상온',
    dailyTripCount: route.trips,
    isDistanceEstimated: true,
    isDurationEstimated: true,
  })).sort((a, b) => b.startTime - a.startTime);
}
