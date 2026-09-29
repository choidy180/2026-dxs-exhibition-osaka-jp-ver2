import type { ApiData as GlassInspectionData } from '@/types/glassGapInspection';
import type { ApiData as SingleInspectionData } from '@/types/gasketCheck';
import type { FoamingSensorPayload, FoamingSensorSeries } from '@/types/foamingSensor';

/** 전시 화면은 네트워크나 설비 연결 없이 매번 현재 시각의 데이터를 만든다. */
export const DEMO_INSPECTION_IMAGE = '/demo/inspection-door.png';
export const DEMO_FACTORY_IMAGE = '/demo/factory-floor.png';
export const DEMO_CAMERA_VIDEO = '/videos/dashboard-short.mp4';

const timeLabel = (date: Date) => date.toLocaleTimeString('ko-KR', { hour12: false });

/** 선택한 날짜에 맞는 이력을 구성하고 미래 날짜는 빈 상태로 표시한다. */
export function createInspectionHistoryForDate<T extends { id: string; wo: string }>(date: string, samples: T[]): T[] {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return [];
  return samples.map((sample, index) => ({
    ...sample, id: `${date}-${sample.id}`, wo: `WO-${date.replaceAll('-', '')}-${String(index + 1).padStart(3, '0')}`,
  }));
}

export function createPointInspectionSnapshot(sequence = 0) {
  const now = new Date();
  const isDefect = sequence > 0 && sequence % 17 === 0;
  const result = isDefect ? '불량' : '정상';
  const apiData: GlassInspectionData & {
    FILENAME5: string; FILENAME6: string; FILEPATH5: string; FILEPATH6: string;
    LABEL005: string; LABEL006: string;
  } = {
    TIMEVALUE: timeLabel(now), TIMEVALUE2: now.toISOString(),
    FILENAME1: 'inspection-01.png', FILENAME2: 'inspection-02.png',
    FILENAME3: 'inspection-03.png', FILENAME4: 'inspection-04.png',
    FILENAME5: 'inspection-05.png', FILENAME6: 'inspection-06.png',
    FILEPATH1: DEMO_INSPECTION_IMAGE, FILEPATH2: DEMO_INSPECTION_IMAGE,
    FILEPATH3: DEMO_INSPECTION_IMAGE, FILEPATH4: DEMO_INSPECTION_IMAGE,
    FILEPATH5: DEMO_INSPECTION_IMAGE, FILEPATH6: DEMO_INSPECTION_IMAGE,
    CDGITEM: ['GL-650 PREMIUM', 'GL-820 SIGNATURE', 'GL-650 PREMIUM'][Math.floor(sequence / 8) % 3],
    WO: `WO-${now.getFullYear()}-${String(1024 + Math.floor(sequence / 24)).padStart(5, '0')}`,
    COUNT_NUM: String(1248 + sequence), RESULT: result,
    LABEL001: '정상', LABEL002: result, LABEL003: '정상', LABEL004: '정상',
    LABEL005: '정상', LABEL006: '정상',
  };
  return {
    apiData,
    totalStats: { total_count: 1248 + sequence, normal_count: 1236 + sequence - Math.floor(sequence / 17) },
    isDefectMode: isDefect,
    hasFetched: true,
  };
}

export function createSingleInspectionSnapshot(sequence = 0, station: 'film' | 'gasket' = 'gasket') {
  const snapshot = createPointInspectionSnapshot(sequence);
  const apiData: SingleInspectionData = {
    TIMEVALUE: snapshot.apiData.TIMEVALUE,
    FILENAME1: `${station}-inspection.png`, FILEPATH1: DEMO_INSPECTION_IMAGE,
    CDGITEM: snapshot.apiData.CDGITEM, COUNT_NUM: snapshot.apiData.COUNT_NUM,
    RESULT: snapshot.apiData.RESULT, STATUS002: '검사완료',
  };
  return { ...snapshot, apiData };
}

const SENSOR_CONFIG = [
  { seq: 1, name: '온조#1 리턴온도', unit: '℃', optimal: 28, lower: 25, upper: 32 },
  { seq: 2, name: 'R액 탱크온도', unit: '℃', optimal: 26, lower: 22, upper: 30 },
  { seq: 3, name: 'P액 압력', unit: 'bar', optimal: 150, lower: 135, upper: 165 },
];

export function createFoamingSensorSnapshot(process: string, now = new Date()): FoamingSensorPayload {
  const phase = now.getTime() / 3000;
  const processOffset = Number(process.replace(/\D/g, '')) || 2;
  const series: FoamingSensorSeries[] = SENSOR_CONFIG.map(config => {
    const amplitude = (config.upper - config.lower) * 0.28;
    const readings = Array.from({ length: 40 }, (_, index) => {
      const timestamp = new Date(now.getTime() - (39 - index) * 3000);
      const wave = Math.sin((phase - 39 + index) / 4 + config.seq + processOffset);
      return { timestamp: timeLabel(timestamp), value: Number((config.optimal + amplitude * wave).toFixed(2)), sfValue: Number((wave * 0.08).toFixed(3)) };
    });
    const latest = readings[readings.length - 1];
    return {
      ...config, rawType: `${config.name}(${config.unit})`, modelNo: `GL-${processOffset}20`,
      readings, latest, status: 'normal', breach: 0,
    };
  });
  return { ok: true, process, fetchedAt: now.toISOString(), series, errors: [] };
}
