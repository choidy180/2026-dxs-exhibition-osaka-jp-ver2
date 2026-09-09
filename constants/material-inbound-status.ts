import type { InboundPeriod } from '@/types/material-inbound-status';

// 기간별 입고 현황은 gapi의 송장 단건 조회와 응답 원천이 다른 기존 전용 API를 사용한다.
export const INBOUND_STATUS_API_URL = 'https://api.dxsplatform.com/api/V_PurchaseIn';
export const INBOUND_REQUEST_TIMEOUT_MS = 30_000;

export const INBOUND_PERIODS: Array<{ id: InboundPeriod; label: string }> = [
  { id: 'day', label: '일' },
  { id: 'week', label: '주' },
  { id: 'month', label: '월' },
  { id: 'year', label: '연간' },
];
