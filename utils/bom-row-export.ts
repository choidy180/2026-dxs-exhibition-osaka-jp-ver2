import { BOM_COLUMNS } from '../constants/lab';
import type { BomRow } from '../types/lab';

/** 화면과 같은 열·순서를 유지하며 수식과 품번도 문자열로 안전하게 변환한다. */
export function bomRowsToCsv(rows: BomRow[]): string {
  const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [BOM_COLUMNS.map(column => quote(column.label)).join(',')];
  rows.forEach((row, index) => {
    lines.push(BOM_COLUMNS.map(column => {
      if (column.key === 'no') return quote(index + 1);
      if (column.key === 'level') return quote(row.level >= 2 ? `─ ${row.level}` : row.level);
      return quote(row[column.key] ?? '-');
    }).join(','));
  });
  return lines.join('\r\n');
}
