import { addDays, parseDateKey, toDateKey } from '@/utils/date';
import type { InboundDateRange, InboundPeriod } from '@/types/material-inbound-status';
import type { MaterialListItem } from '@/types/material-monitoring';

export const formatInboundDate = (value: string) => value ? value.replaceAll('-', '.') : '-';

export const getInboundRangeLabel = (start: string, end: string) => {
  if (!start || !end) return '조회일을 준비하고 있습니다.';
  return start === end ? `${formatInboundDate(start)} 기준` : `${formatInboundDate(start)} ~ ${formatInboundDate(end)}`;
};

export function getInboundDateRange(dateKey: string, period: InboundPeriod): InboundDateRange {
  const date = parseDateKey(dateKey);
  if (period === 'week') {
    const weekday = date.getDay();
    const start = addDays(date, weekday === 0 ? -6 : 1 - weekday);
    return { startDate: toDateKey(start), endDate: toDateKey(addDays(start, 6)) };
  }
  if (period === 'month') {
    return {
      startDate: toDateKey(new Date(date.getFullYear(), date.getMonth(), 1)),
      endDate: toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
    };
  }
  if (period === 'year') {
    return { startDate: `${date.getFullYear()}-01-01`, endDate: `${date.getFullYear()}-12-31` };
  }
  return { startDate: dateKey, endDate: dateKey };
}

/** 업무 날짜의 앞부분을 비교해 시간 문자열과 브라우저 시간대의 영향을 피한다. */
export function isInboundWithinRange(item: MaterialListItem, start: string, end: string): boolean {
  if (!start || !end || typeof item.PurInDate !== 'string') return false;
  const match = item.PurInDate.trim().match(/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})(?:[ T]|$)/);
  if (!match) return false;
  const key = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === key && key >= start && key <= end;
}

export const isInboundDone = (item: MaterialListItem) => item.InspConf === 'Y' || item.QmConf === 'Y';

export const isInboundTabletChecked = (item: MaterialListItem) => [
  item.TabletConf, item.TabletInspConf, item.TabletYn,
  item.TabletCheck, item.MobileConf, item.TabletInspYn,
].some(value => String(value ?? '').toUpperCase() === 'Y');

export const inboundPercent = (value: number, total: number) => total > 0 ? Math.round(value / total * 1000) / 10 : 0;

export const compactInboundText = (value?: string | null, fallback = '-', max = 28) => {
  const text = value?.trim() || fallback;
  return text.length > max ? `${text.slice(0, max)}...` : text;
};
