import { getDxApiUrl } from '@/utils/dx-api';

export const PORT = 8080;
export const MAX_CAMERA_COUNT = 6;
export const CAMERA_RECHECK_INTERVAL_MS = 15_000;
export const DEFAULT_STREAM_HOSTS =
  process.env.NEXT_PUBLIC_MATERIAL_CAMERA_HOSTS ?? '10.172.167.185, 192.168.0.54';

export const API_ENDPOINTS = {
  VEHICLE: '/DX_API000020',
  VEHICLE_ENTRY_EXIT: '/DX_API000052',
  INVOICE: '/V_PurchaseIn',
  MATERIAL_LIST: '/DX_API000034',
} as const;

export const getApiBaseUrl = () => getDxApiUrl('/api');

export const buildApiUrl = (
  endpoint: string,
  params?: Record<string, string | number | boolean | null | undefined>
) => {
  const url = new URL(`${getApiBaseUrl()}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

export const getVehicleApiUrl = () => buildApiUrl(API_ENDPOINTS.VEHICLE);
export const getVehicleEntryExitApiUrl = (origin?: string) => getDxApiUrl(`/api${API_ENDPOINTS.VEHICLE_ENTRY_EXIT}`, origin);
export const getInvoiceApiUrl = () => buildApiUrl(API_ENDPOINTS.INVOICE);
export const getMaterialListApiUrl = () => buildApiUrl(API_ENDPOINTS.MATERIAL_LIST);
