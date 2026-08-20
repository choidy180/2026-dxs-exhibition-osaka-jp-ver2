import * as XLSX from 'xlsx';
import {
  ACCEPTED_FILE_EXTENSIONS,
  FIXED_COLUMNS,
  GRID_COLUMN_WIDTH,
  HEADER_ALIASES,
  MAX_UPLOAD_SIZE_BYTES,
} from '@/constants/production-plan';
import type {
  ParsedPlanFile,
  PlanDataset,
  PlanDay,
  PlanRevision,
  PlanRow,
  PlanSummary,
  RevisionStatus,
} from '@/types/production-plan';
import { buildDay, getMonthGroups } from './date';

/* ───────────────────────── 날짜 ───────────────────────── */

/**
 * 날짜 계산은 공용 유틸(utils/date.ts)을 사용한다.
 * 기존 import 경로를 유지하기 위해 이 모듈에서 다시 내보낸다.
 */
export {
  buildCalendarDays,
  buildWorkingDays,
  formatDateLabel,
  formatMonthLabel,
  parseDateKey,
  toDateKey,
} from './date';
export { getMonthGroups };

/** 계획 일자 한 칸 — 공용 buildDay 와 구조가 같다 */
export const buildPlanDay = (date: Date): PlanDay => buildDay(date);

/* ───────────────────────── 집계 ───────────────────────── */

export const getRowTotal = (row: PlanRow) =>
  Object.values(row.quantities).reduce((sum, qty) => sum + qty, 0);

/** 일자별 합계 — 그리드 하단 '합계' 행 */
export const getDayTotals = (dataset: PlanDataset): Record<string, number> => {
  const totals: Record<string, number> = {};

  dataset.days.forEach(day => {
    totals[day.date] = dataset.rows.reduce((sum, row) => sum + (row.quantities[day.date] ?? 0), 0);
  });

  return totals;
};

export const getGrandTotal = (dataset: PlanDataset) =>
  dataset.rows.reduce((sum, row) => sum + getRowTotal(row), 0);

export const getPlanSummary = (dataset: PlanDataset | null, revision: PlanRevision | null): PlanSummary => {
  if (!dataset) {
    return { itemCount: 0, dayCount: 0, totalQty: 0, revisionLabel: '-' };
  }

  return {
    itemCount: dataset.rows.length,
    dayCount: dataset.days.length,
    totalQty: getGrandTotal(dataset),
    revisionLabel: revision ? `Rev ${revision.revision}` : '-',
  };
};

/** 품목수 × 계획일수 = 업로드 행 수 */
export const getRowCount = (rows: PlanRow[], days: PlanDay[]) => rows.length * days.length;

/* ───────────────────────── 표시 형식 ───────────────────────── */

export const formatNumber = (value: number) => value.toLocaleString('ko-KR');

/** 0 과 빈값은 셀을 비워 밀집한 그리드의 가독성을 확보한다 */
export const formatQuantity = (value?: number) => (value ? value.toLocaleString('ko-KR') : '');

export const REVISION_STATUS_LABEL: Record<RevisionStatus, string> = {
  confirmed: '확정',
  reconfirmed: '리확정',
  draft: '-',
};

export const getRevisionTitle = (revision: PlanRevision) =>
  `${revision.uploadDate} (Rev ${revision.revision})`;

/** 히스토리 정렬 — 업로드 시각 내림차순, 같으면 리비전 내림차순 */
export const sortRevisions = (revisions: PlanRevision[]) =>
  [...revisions].sort((a, b) => {
    if (a.uploadedAt !== b.uploadedAt) return a.uploadedAt < b.uploadedAt ? 1 : -1;
    return b.revision - a.revision;
  });

/** 같은 업로드 일자의 다음 리비전 번호 */
export const getNextRevisionNumber = (revisions: PlanRevision[], uploadDate: string) => {
  const sameDate = revisions.filter(revision => revision.uploadDate === uploadDate);
  if (!sameDate.length) return 0;
  return Math.max(...sameDate.map(revision => revision.revision)) + 1;
};

/**
 * 확정 버튼을 눌렀을 때의 다음 상태.
 * 한 번 확정을 취소한 뒤 다시 확정하면 '리확정' 으로 구분한다.
 */
export const getConfirmedStatus = (current: RevisionStatus, hasBeenConfirmed: boolean): RevisionStatus =>
  hasBeenConfirmed || current === 'reconfirmed' ? 'reconfirmed' : 'confirmed';

/* ───────────────────────── 그리드 폭 ───────────────────────── */

/** 좌측 고정 컬럼의 누적 left 오프셋 (sticky 위치 계산용) */
export const FIXED_COLUMN_OFFSETS = FIXED_COLUMNS.reduce<number[]>((offsets, column, index) => {
  offsets.push(index === 0 ? 0 : offsets[index - 1] + FIXED_COLUMNS[index - 1].width);
  return offsets;
}, []);

export const FIXED_COLUMNS_WIDTH = FIXED_COLUMNS.reduce((sum, column) => sum + column.width, 0);

export const getGridWidth = (dayCount: number) =>
  FIXED_COLUMNS_WIDTH + dayCount * GRID_COLUMN_WIDTH.day;

/* ───────────────────────── 파일 검증 ───────────────────────── */

export const validateUploadFile = (file: File): string | null => {
  const lowerName = file.name.toLowerCase();
  const hasValidExtension = ACCEPTED_FILE_EXTENSIONS.some(extension => lowerName.endsWith(extension));

  if (!hasValidExtension) {
    return `엑셀 파일(${ACCEPTED_FILE_EXTENSIONS.join(', ')})만 업로드할 수 있습니다.`;
  }
  if (file.size === 0) {
    return '빈 파일입니다. 내용이 있는 엑셀 파일을 선택해주세요.';
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `파일 용량이 너무 큽니다. ${Math.floor(MAX_UPLOAD_SIZE_BYTES / 1024 / 1024)}MB 이하 파일을 사용해주세요.`;
  }
  return null;
};

/* ───────────────────────── 엑셀 파싱 ───────────────────────── */

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const matchFixedColumn = (header: string) => {
  const normalized = normalizeHeader(header);
  if (!normalized) return null;

  const entry = Object.entries(HEADER_ALIASES).find(([, aliases]) =>
    aliases.some(alias => normalized === alias || normalized.replace(/[\s_.]/g, '') === alias.replace(/[\s_.]/g, '')),
  );

  return entry ? (entry[0] as keyof typeof HEADER_ALIASES) : null;
};

/** 엑셀 날짜 직렬값을 Date 로 변환 (1900 기준, 윈도우 엑셀) */
const fromExcelSerial = (serial: number) => {
  const utcDays = Math.floor(serial) - 25_569;
  return new Date(utcDays * 86_400_000);
};

/**
 * 헤더 셀을 날짜로 해석한다.
 * 지원 형태: 엑셀 날짜 직렬값 / Date / 'YYYY-MM-DD' / 'M/D' / 'M월 D일'
 * 연도가 없는 형태는 `fallbackYear` 를 사용한다.
 */
const parseDayHeader = (value: unknown, fallbackYear: number): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'number' && value > 20_000 && value < 80_000) {
    const parsed = fromExcelSerial(value);
    return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  }

  const text = String(value ?? '').trim();
  if (!text) return null;

  const full = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (full) return new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]));

  const monthDay = text.match(/^(\d{1,2})\s*[-./월]\s*(\d{1,2})/);
  if (monthDay) {
    const month = Number(monthDay[1]);
    const day = Number(monthDay[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(fallbackYear, month - 1, day);
    }
  }

  return null;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value ?? '').replace(/,/g, '').trim();
  if (!text) return 0;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isTotalRowLabel = (value: unknown) => {
  const normalized = normalizeHeader(value);
  return normalized === '합계' || normalized === '총계' || normalized === 'total' || normalized === 'sum';
};

/**
 * 업로드된 엑셀 시트를 미리보기 데이터로 변환한다.
 *
 * 기대 형태(1행 헤더): NO | LINE | PJT | PART NO | PART NM | TOTAL | 6/1 | 6/2 | ...
 * - 헤더 행은 'PART NO' 로 인식되는 셀이 있는 첫 행을 사용한다.
 * - 고정 컬럼 뒤에 오는 날짜 헤더 열만 계획일로 취급한다.
 * - 'PART NO' 가 비었거나 '합계' 로 시작하는 행에서 멈춘다.
 */
export const parsePlanWorkbook = (
  buffer: ArrayBuffer,
  fileName: string,
  fallbackYear: number,
): ParsedPlanFile => {
  // 라이브러리 오류 메시지는 영문이므로 사용자용 한국어 문장으로 바꿔 던진다
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch (error) {
    console.error('[production-plan] 엑셀 파일 해석 실패', error);
    throw new Error('엑셀 파일을 열 수 없습니다. 손상되었거나 암호가 걸린 파일인지 확인해주세요.');
  }

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('시트를 찾을 수 없습니다. 엑셀 파일을 확인해주세요.');
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });

  const headerRowIndex = matrix.findIndex(row =>
    Array.isArray(row) && row.some(cell => matchFixedColumn(String(cell ?? '')) === 'partNo'),
  );

  if (headerRowIndex === -1) {
    throw new Error("헤더를 찾을 수 없습니다. 'PART NO' 컬럼이 포함된 엑셀인지 확인해주세요.");
  }

  const headerRow = matrix[headerRowIndex] ?? [];
  const warnings: string[] = [];

  const fixedIndex: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  const dayColumns: Array<{ index: number; day: PlanDay }> = [];

  headerRow.forEach((cell, index) => {
    const fixedKey = matchFixedColumn(String(cell ?? ''));
    if (fixedKey && fixedIndex[fixedKey] === undefined) {
      fixedIndex[fixedKey] = index;
      return;
    }

    const date = parseDayHeader(cell, fallbackYear);
    if (date && !Number.isNaN(date.getTime())) {
      dayColumns.push({ index, day: buildPlanDay(date) });
    }
  });

  if (fixedIndex.partNo === undefined) {
    throw new Error("'PART NO' 컬럼을 찾을 수 없습니다.");
  }
  if (!dayColumns.length) {
    throw new Error('날짜 컬럼을 찾을 수 없습니다. 헤더에 6/1 또는 2026-06-01 형식의 일자를 넣어주세요.');
  }

  // 같은 날짜가 중복으로 들어온 경우 첫 열만 사용한다
  const seenDates = new Set<string>();
  const uniqueDayColumns = dayColumns.filter(({ day }) => {
    if (seenDates.has(day.date)) {
      warnings.push(`중복된 일자 ${day.label} 열을 건너뛰었습니다.`);
      return false;
    }
    seenDates.add(day.date);
    return true;
  });

  uniqueDayColumns.sort((a, b) => (a.day.date < b.day.date ? -1 : 1));

  const rows: PlanRow[] = [];
  let skippedRows = 0;

  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const raw = matrix[rowIndex];
    if (!Array.isArray(raw)) continue;

    const partNo = String(raw[fixedIndex.partNo] ?? '').trim();

    // 합계 행이나 첫 컬럼이 '합계'인 행을 만나면 데이터 영역 종료
    if (isTotalRowLabel(partNo) || isTotalRowLabel(raw[0])) break;

    if (!partNo) {
      const hasAnyValue = raw.some(cell => String(cell ?? '').trim() !== '');
      if (hasAnyValue) skippedRows += 1;
      continue;
    }

    const quantities: Record<string, number> = {};
    uniqueDayColumns.forEach(({ index, day }) => {
      const qty = toNumber(raw[index]);
      if (qty > 0) quantities[day.date] = qty;
    });

    rows.push({
      id: `${partNo}-${rowIndex}`,
      line: String(raw[fixedIndex.line ?? -1] ?? '').trim(),
      pjt: String(raw[fixedIndex.pjt ?? -1] ?? '').trim(),
      partNo,
      partNm: String(raw[fixedIndex.partNm ?? -1] ?? '').trim(),
      quantities,
    });
  }

  if (!rows.length) {
    throw new Error('읽을 수 있는 품목 행이 없습니다. 엑셀 내용을 확인해주세요.');
  }
  if (skippedRows) {
    warnings.push(`품번이 없는 ${skippedRows}개 행을 건너뛰었습니다.`);
  }

  return {
    fileName,
    days: uniqueDayColumns.map(({ day }) => day),
    rows,
    warnings,
  };
};

/* ───────────────────────── 엑셀 다운로드 ───────────────────────── */

/**
 * 현재 미리보기 그리드를 그대로 엑셀로 내려받는다.
 * 화면과 동일하게 월 그룹 행 / 일자 행 / 요일 행 / 데이터 / 합계 행 순서로 구성한다.
 */
export const downloadPlanWorkbook = (
  dataset: PlanDataset,
  revision: PlanRevision | null,
  fileName?: string,
) => {
  const monthGroups = getMonthGroups(dataset.days);
  const dayTotals = getDayTotals(dataset);
  const fixedLabels = FIXED_COLUMNS.map(column => column.label);

  const monthRow: Array<string | number | null> = [...fixedLabels.map(() => null)];
  monthGroups.forEach(group => {
    monthRow.push(group.label);
    for (let index = 1; index < group.span; index += 1) monthRow.push(null);
  });

  const headerRow: Array<string | number | null> = [
    ...fixedLabels,
    ...dataset.days.map(day => day.label),
  ];

  const weekdayRow: Array<string | number | null> = [
    ...fixedLabels.map((_, index) => (index === fixedLabels.length - 1 ? 'SUM' : null)),
    ...dataset.days.map(day => day.weekday),
  ];

  const bodyRows = dataset.rows.map((row, index) => [
    index + 1,
    row.line,
    row.pjt,
    row.partNo,
    row.partNm,
    getRowTotal(row),
    ...dataset.days.map(day => row.quantities[day.date] ?? null),
  ]);

  const totalRow: Array<string | number | null> = [
    '합계',
    null,
    null,
    null,
    null,
    getGrandTotal(dataset),
    ...dataset.days.map(day => dayTotals[day.date] ?? 0),
  ];

  const sheet = XLSX.utils.aoa_to_sheet([monthRow, headerRow, weekdayRow, ...bodyRows, totalRow]);

  // 월 그룹 헤더 병합
  let cursor = fixedLabels.length;
  sheet['!merges'] = monthGroups.map(group => {
    const start = cursor;
    cursor += group.span;
    return { s: { r: 0, c: start }, e: { r: 0, c: start + group.span - 1 } };
  });

  sheet['!cols'] = [
    ...FIXED_COLUMNS.map(column => ({ wpx: column.width })),
    ...dataset.days.map(() => ({ wpx: GRID_COLUMN_WIDTH.day })),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '생산계획');

  const suffix = revision ? `${revision.uploadDate}_Rev${revision.revision}` : 'preview';
  XLSX.writeFile(workbook, fileName ?? `생산계획_${suffix}.xlsx`);
};
