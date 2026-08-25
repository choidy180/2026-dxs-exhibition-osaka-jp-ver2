import type { MaterialListItem, MaterialStats } from '@/types/material-monitoring';

export const compactText = (value?: string | null, fallback = '-', max = 22) => {
  const text = value?.trim() || fallback;
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

export const formatLogDateTime = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 16) : '-');

export const formatQty = (value?: number | string) => {
  if (value === undefined || value === null || value === '') return '-';
  const numberValue = Number(String(value).replace(/,/g, '').replace(/EA/gi, '').trim());
  return Number.isNaN(numberValue) ? `${value}` : `${numberValue.toLocaleString('ko-KR')} EA`;
};

export const makeMaterialKey = (item: MaterialListItem, index = 0) =>
  `${item.InvoiceNo || 'NO-INVOICE'}-${item.CdGItem || item.NmGItem || 'ITEM'}-${item.LogSeq || item.PurInDate || index}`;

export const getMaterialStats = (items: MaterialListItem[]): MaterialStats => {
  const total = items.length;
  const done = items.filter(item => item.InspConf === 'Y' || item.QmConf === 'Y').length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
};
