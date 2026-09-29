import { createExhibitionMaterials } from '@/data/exhibition-material';
import type { InboundDateRange } from '@/types/material-inbound-status';
import type { MaterialListItem } from '@/types/material-monitoring';
import { isInboundWithinRange } from './material-inbound-status';

export async function fetchInboundStatus(range: InboundDateRange, signal: AbortSignal): Promise<MaterialListItem[]> {
  signal.throwIfAborted();
  return createExhibitionMaterials(90).filter(item => isInboundWithinRange(item, range.startDate, range.endDate));
}
