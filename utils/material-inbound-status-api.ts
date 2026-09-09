import { INBOUND_STATUS_API_URL } from '@/constants/material-inbound-status';
import type { InboundDateRange } from '@/types/material-inbound-status';
import type { MaterialListItem } from '@/types/material-monitoring';

export async function fetchInboundStatus(range: InboundDateRange, signal: AbortSignal): Promise<MaterialListItem[]> {
  const url = new URL(INBOUND_STATUS_API_URL);
  url.searchParams.set('startDate1', range.startDate);
  url.searchParams.set('endDate1', range.endDate);
  const response = await fetch(url.toString(), { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Inbound API HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))) {
    throw new Error('Inbound API returned an invalid list.');
  }
  return (data as MaterialListItem[]).filter(item => !String(item.NmCustm ?? '').includes('대일화학'));
}
