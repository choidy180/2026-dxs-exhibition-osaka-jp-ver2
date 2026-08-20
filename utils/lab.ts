import * as XLSX from 'xlsx';
import {
  BOM_COLUMNS,
  ORDER_DAY_COLUMN_WIDTH,
  ORDER_FIXED_COLUMNS,
  ORDER_VALUE_COLUMNS,
} from '@/constants/lab';
import type {
  BomFilter,
  BomRow,
  BomSummary,
  OrderNeed,
  OrderPlanDataset,
  OrderPlanFilter,
  OrderPlanSummary,
  OrderTargetRow,
} from '@/types/lab';

/* ───────────────────────── 표시 형식 ───────────────────────── */

export const formatNumber = (value: number) => value.toLocaleString('ko-KR');

/** 값이 없으면 '-' 로 표기한다 */
export const formatOptionalNumber = (value: number | null | undefined) =>
  value === null || value === undefined ? '-' : value.toLocaleString('ko-KR');

/** 0 과 빈값은 셀을 비워 밀집한 그리드의 가독성을 확보한다 */
export const formatQuantity = (value?: number) => (value ? value.toLocaleString('ko-KR') : '');

export const ORDER_NEED_LABEL: Record<OrderNeed, string> = {
  urgent: '긴급',
  required: 'Y',
  none: '-',
};

/* ───────────────────────── BOM ───────────────────────── */

export const EMPTY_BOM_FILTER: BomFilter = {
  productNo: '전체',
  itemNo: '',
  itemNm: '',
  level: '전체',
  processGb: '전체',
  orderGb: '전체',
  vendor: '',
  buyer: '전체',
  materialManager: '전체',
};

const includesText = (source: string, keyword: string) =>
  !keyword.trim() || source.toLowerCase().includes(keyword.trim().toLowerCase());

const matchesSelect = (source: string, selected: string) => selected === '전체' || source === selected;

export const filterBomRows = (rows: BomRow[], filter: BomFilter) =>
  rows.filter(
    row =>
      matchesSelect(row.productNo, filter.productNo) &&
      includesText(row.itemNo, filter.itemNo) &&
      includesText(row.itemNm, filter.itemNm) &&
      (filter.level === '전체' || String(row.level) === filter.level) &&
      matchesSelect(row.processGb, filter.processGb) &&
      matchesSelect(row.orderGb, filter.orderGb) &&
      includesText(row.vendor, filter.vendor) &&
      matchesSelect(row.buyer, filter.buyer) &&
      matchesSelect(row.materialManager, filter.materialManager),
  );

export const getBomSummary = (rows: BomRow[]): BomSummary => ({
  totalRows: rows.length,
  uniqueItems: new Set(rows.map(row => row.itemNo)).size,
  maxLevel: rows.reduce((max, row) => Math.max(max, row.level), 0),
  vendorCount: new Set(rows.map(row => row.vendor)).size,
});

/** Level 열 표시 — 0·1 은 숫자만, 2 이상은 전개 표시를 붙인다 */
export const getLevelLabel = (level: number) => (level >= 2 ? `─ ${level}` : String(level));

export const BOM_STICKY_COLUMNS = BOM_COLUMNS.filter(column => column.sticky);
export const BOM_SCROLL_COLUMNS = BOM_COLUMNS.filter(column => !column.sticky);

/** 좌측 고정 컬럼의 누적 left 오프셋 */
export const BOM_STICKY_OFFSETS = BOM_STICKY_COLUMNS.reduce<number[]>((offsets, column, index) => {
  offsets.push(index === 0 ? 0 : offsets[index - 1] + BOM_STICKY_COLUMNS[index - 1].width);
  return offsets;
}, []);

export const BOM_GRID_WIDTH = BOM_COLUMNS.reduce((sum, column) => sum + column.width, 0);

export const bomGridTemplate = BOM_COLUMNS.map(column => `${column.width}px`).join(' ');

/* ───────────────────────── 발주대상 ───────────────────────── */

export const EMPTY_ORDER_FILTER: OrderPlanFilter = {
  vendor: '',
  itemNo: '',
  itemNm: '',
  orderNeed: '전체',
};

const ORDER_NEED_BY_OPTION: Record<string, OrderNeed> = {
  긴급: 'urgent',
  발주필요: 'required',
  해당없음: 'none',
};

export const filterOrderRows = (rows: OrderTargetRow[], filter: OrderPlanFilter) =>
  rows.filter(row => {
    if (!includesText(row.vendorNm, filter.vendor) && !includesText(row.vendorCode, filter.vendor)) {
      return false;
    }
    if (!includesText(row.itemNo, filter.itemNo)) return false;
    if (!includesText(row.itemNm, filter.itemNm)) return false;
    if (filter.orderNeed !== '전체' && row.orderNeed !== ORDER_NEED_BY_OPTION[filter.orderNeed]) {
      return false;
    }
    return true;
  });

export const getOrderPlanSummary = (rows: OrderTargetRow[]): OrderPlanSummary => ({
  totalItems: rows.length,
  orderTargetItems: rows.filter(row => row.orderNeed !== 'none').length,
  urgentItems: rows.filter(row => row.orderNeed === 'urgent').length,
});

/** 일자별 발주예정 합계 */
export const getOrderDayTotals = (dataset: OrderPlanDataset, rows: OrderTargetRow[]) => {
  const totals: Record<string, number> = {};

  dataset.days.forEach(day => {
    totals[day.date] = rows.reduce((sum, row) => sum + (row.schedule[day.date] ?? 0), 0);
  });

  return totals;
};

export const ORDER_LEFT_COLUMNS_WIDTH = ORDER_FIXED_COLUMNS.reduce((sum, column) => sum + column.width, 0);

export const ORDER_VALUE_COLUMNS_WIDTH = ORDER_VALUE_COLUMNS.reduce((sum, column) => sum + column.width, 0);

/** 좌측 고정 컬럼의 누적 left 오프셋 */
export const ORDER_FIXED_OFFSETS = ORDER_FIXED_COLUMNS.reduce<number[]>((offsets, column, index) => {
  offsets.push(index === 0 ? 0 : offsets[index - 1] + ORDER_FIXED_COLUMNS[index - 1].width);
  return offsets;
}, []);

export const getOrderGridWidth = (dayCount: number) =>
  ORDER_LEFT_COLUMNS_WIDTH + ORDER_VALUE_COLUMNS_WIDTH + dayCount * ORDER_DAY_COLUMN_WIDTH;

/** 헤더와 본문이 공유하는 단일 컬럼 정의 */
export const orderGridTemplate = (dayCount: number) =>
  [
    ...ORDER_FIXED_COLUMNS.map(column => `${column.width}px`),
    ...ORDER_VALUE_COLUMNS.map(column => `${column.width}px`),
    `repeat(${dayCount}, ${ORDER_DAY_COLUMN_WIDTH}px)`,
  ].join(' ');

/* ───────────────────────── 엑셀 다운로드 ───────────────────────── */

/** 현재 조회된 BOM 정전개 목록을 엑셀로 내려받는다 */
export const downloadBomExcel = (rows: BomRow[], baseDate: string) => {
  const header = BOM_COLUMNS.map(column => column.label);

  const body = rows.map((row, index) => [
    index + 1,
    getLevelLabel(row.level),
    row.itemNo,
    row.itemNm,
    row.designBomNo,
    row.purchaseBomNo,
    row.pjtCode,
    row.productNo,
    row.productNm,
    row.parentItemNo,
    row.parentItemNm,
    row.spec,
    row.material,
    row.unit,
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet['!cols'] = BOM_COLUMNS.map(column => ({ wpx: column.width }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'BOM 정전개');
  XLSX.writeFile(workbook, `MES_BOM_정전개_${baseDate}.xlsx`);
};

/** 현재 조회된 발주대상 목록을 엑셀로 내려받는다 */
export const downloadOrderPlanExcel = (dataset: OrderPlanDataset, rows: OrderTargetRow[]) => {
  const fixedLabels = ORDER_FIXED_COLUMNS.map(column => column.label);
  const valueLabels = ORDER_VALUE_COLUMNS.map(column => column.label);

  const groupRow: Array<string | number | null> = [
    ...fixedLabels.map(() => null),
    ...valueLabels.map(() => null),
    ...dataset.days.map((day, index) => (index === 0 ? '발주예정일' : null)),
  ];

  const header = [...fixedLabels, ...valueLabels, ...dataset.days.map(day => `${day.label}(${day.weekday})`)];

  const body = rows.map((row, index) => [
    index + 1,
    row.vendorCode,
    row.vendorNm,
    row.pjtCode,
    row.itemNo,
    row.itemNm,
    row.unit,
    row.totalRequired,
    row.leadTimeDays,
    row.safetyStock,
    ORDER_NEED_LABEL[row.orderNeed],
    row.note,
    ...dataset.days.map(day => row.schedule[day.date] ?? null),
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([groupRow, header, ...body]);
  sheet['!cols'] = [
    ...ORDER_FIXED_COLUMNS.map(column => ({ wpx: column.width })),
    ...ORDER_VALUE_COLUMNS.map(column => ({ wpx: column.width })),
    ...dataset.days.map(() => ({ wpx: ORDER_DAY_COLUMN_WIDTH })),
  ];
  // 발주예정일 그룹 헤더 병합
  const groupStart = fixedLabels.length + valueLabels.length;
  sheet['!merges'] = [
    { s: { r: 0, c: groupStart }, e: { r: 0, c: groupStart + dataset.days.length - 1 } },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '발주대상');
  XLSX.writeFile(workbook, `발주대상리스트_${dataset.planDate}.xlsx`);
};
