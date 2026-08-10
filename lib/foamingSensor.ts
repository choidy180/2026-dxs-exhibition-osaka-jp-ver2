import { WARN_MARGIN_RATIO } from '@/constants/foamingInspection';
import type {
  FoamingReading,
  FoamingSensorRawRecord,
  FoamingSensorSeries,
  FoamingStatus,
} from '@/types/foamingSensor';

/**
 * GR{n}_002_AI2.php 응답을 화면에서 바로 쓸 수 있는 형태로 정규화한다.
 * 순수 함수만 두어 라우트 없이 단독 검증이 가능하도록 분리했다.
 */

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** "온조#1리턴온도(℃)" → { name: "온조#1리턴온도", unit: "℃" } */
export function splitType(rawType: string): { name: string; unit: string } {
  const matched = rawType.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (matched) {
    return { name: matched[1].trim(), unit: matched[2].trim() };
  }
  return { name: rawType.trim(), unit: '' };
}

export function classify(
  value: number | null,
  lower: number | null,
  upper: number | null
): { status: FoamingStatus; breach: number } {
  if (value === null || lower === null || upper === null) {
    return { status: 'unknown', breach: 0 };
  }

  if (value > upper) return { status: 'critical', breach: value - upper };
  if (value < lower) return { status: 'critical', breach: value - lower };

  // 범위 안이지만 경계에 근접하면 주의
  const margin = (upper - lower) * WARN_MARGIN_RATIO;
  if (margin > 0 && (upper - value <= margin || value - lower <= margin)) {
    return { status: 'warn', breach: 0 };
  }

  return { status: 'normal', breach: 0 };
}

export function normalizeSeries(
  seq: number,
  records: FoamingSensorRawRecord[]
): FoamingSensorSeries | null {
  if (!records.length) return null;

  // 시간 오름차순 정렬. TIMESTAMP는 "HH:MM:SS" 시각만 오고 원본 배열은
  // SFVALUE 그룹 순서로 섞여 있으므로 정렬이 반드시 필요하다.
  // 같은 날짜 기준이라 문자열 비교로 충분하다.
  const sorted = [...records]
    .filter((r) => typeof r.TIMESTAMP === 'string' && r.TIMESTAMP.trim() !== '')
    .sort((a, b) => String(a.TIMESTAMP).localeCompare(String(b.TIMESTAMP)));

  // 동일 TIMESTAMP가 여러 SFVALUE 그룹에 중복 등장한다 → 마지막 값만 남긴다.
  const byTimestamp = new Map<string, FoamingReading>();

  for (const record of sorted) {
    const value = toNumber(record.SFREALVALUE);
    if (value === null) continue;

    const timestamp = String(record.TIMESTAMP).trim();
    byTimestamp.set(timestamp, {
      timestamp,
      value,
      sfValue: toNumber(record.SFVALUE),
    });
  }

  const readings = [...byTimestamp.values()];
  if (!readings.length) return null;

  // 메타(TYPE/MAX/MIN/best_value)는 레코드마다 동일하므로 마지막 것을 쓴다.
  const meta = sorted[sorted.length - 1] ?? records[records.length - 1];
  const rawType = typeof meta.TYPE === 'string' ? meta.TYPE : '';
  const { name, unit } = splitType(rawType);

  // 원본은 MAX=48, MIN=70처럼 상/하한이 뒤바뀌어 온다.
  // 이름을 믿지 않고 크기로 정규화한다.
  const bounds = [toNumber(meta.MAX), toNumber(meta.MIN)].filter(
    (v): v is number => v !== null
  );
  const lower = bounds.length === 2 ? Math.min(...bounds) : null;
  const upper = bounds.length === 2 ? Math.max(...bounds) : null;

  const latest = readings[readings.length - 1] ?? null;
  const { status, breach } = classify(latest?.value ?? null, lower, upper);

  return {
    seq,
    rawType,
    name: name || `센서 ${seq}`,
    unit,
    modelNo: typeof meta.MODELNO === 'string' ? meta.MODELNO : null,
    lower,
    upper,
    optimal: toNumber(meta.best_value),
    readings,
    latest,
    status,
    breach,
  };
}
