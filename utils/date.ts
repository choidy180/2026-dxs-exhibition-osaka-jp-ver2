/**
 * 공용 날짜 유틸
 *
 * 여러 화면(생산계획, 발주대상리스트 등)이 같은 일자 표기·달력 규칙을 쓰도록 한곳에 모았다.
 * 화면 고유의 도메인 계산은 각 feature 의 `utils/<feature>.ts` 에 둔다.
 */

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 그리드 일자 열 하나 */
export type CalendarDay = {
  /** 'YYYY-MM-DD' — 열 식별자 */
  date: string;
  /** 'YYYY-MM' — 월 그룹 헤더 병합 기준 */
  month: string;
  /** '6/1' — 헤더 표시용 */
  label: string;
  /** '월' ~ '일' */
  weekday: string;
  isWeekend: boolean;
};

const pad = (value: number) => String(value).padStart(2, '0');

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

/** '2026-08-19' → '2026년 08월 19일 (수)' */
export const formatDateLabel = (value: string) => {
  const date = parseDateKey(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}년 ${pad(date.getMonth() + 1)}월 ${pad(date.getDate())}일 (${WEEKDAY_LABELS[date.getDay()]})`;
};

/** '2026-06' → '2026년 06월' */
export const formatMonthLabel = (month: string) => {
  const [year, monthPart] = month.split('-');
  return `${year}년 ${monthPart}월`;
};

export const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const buildDay = (date: Date): CalendarDay => {
  const weekday = date.getDay();
  return {
    date: toDateKey(date),
    month: `${date.getFullYear()}-${pad(date.getMonth() + 1)}`,
    label: `${date.getMonth() + 1}/${date.getDate()}`,
    weekday: WEEKDAY_LABELS[weekday],
    isWeekend: weekday === 0 || weekday === 6,
  };
};

/** 시작일부터 `count` 일. `skipWeekend` 를 주면 주말을 건너뛰고 근무일만 센다. */
export const buildDayRange = (
  startKey: string,
  count: number,
  options?: { skipWeekend?: boolean },
): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const cursor = parseDateKey(startKey);

  while (days.length < count) {
    const day = buildDay(cursor);
    if (!options?.skipWeekend || !day.isWeekend) days.push(day);
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
};

/** 시작일~종료일 사이의 근무일(주말 제외) */
export const buildWorkingDays = (startKey: string, endKey: string): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const cursor = parseDateKey(startKey);
  const end = parseDateKey(endKey);

  while (cursor <= end) {
    const day = buildDay(cursor);
    if (!day.isWeekend) days.push(day);
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
};

/** 달력 팝오버용 그리드 (해당 월 1일 앞의 빈칸은 null) */
export const buildCalendarDays = (view: Date): Array<Date | null> => {
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= lastDate; day += 1) cells.push(new Date(year, month, day));
  return cells;
};

/** 월 그룹 헤더 병합 정보 */
export const getMonthGroups = <T extends { month: string }>(days: T[]) => {
  const groups: Array<{ month: string; label: string; span: number }> = [];

  days.forEach(day => {
    const last = groups[groups.length - 1];
    if (last && last.month === day.month) {
      last.span += 1;
      return;
    }
    groups.push({ month: day.month, label: formatMonthLabel(day.month), span: 1 });
  });

  return groups;
};
