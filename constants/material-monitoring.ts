export const PORT = 8080;
export const MAX_CAMERA_COUNT = 6;
export const CAMERA_RECHECK_INTERVAL_MS = 15_000;
export const DEFAULT_STREAM_HOSTS =
  process.env.NEXT_PUBLIC_MATERIAL_CAMERA_HOSTS ?? '10.172.167.185, 192.168.0.54';

const DEV_API_BASE_URL = 'https://gapi.dxsplatform.com/api';
const INTERNAL_API_BASE_URL = 'http://192.168.2.147:24828/api';

export const API_ENDPOINTS = {
  VEHICLE: '/DX_API000020',
  INVOICE: '/V_PurchaseIn',
  MATERIAL_LIST: '/DX_API000034',
} as const;

const isDevApiEnvironment = () => {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'development';
  }

  const { hostname, pathname } = window.location;

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    pathname.includes('inbound-inspection-dev')
  );
};

export const getApiBaseUrl = () => {
  return isDevApiEnvironment() ? DEV_API_BASE_URL : INTERNAL_API_BASE_URL;
};

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

export const API_URL_VEHICLE = buildApiUrl(API_ENDPOINTS.VEHICLE);
export const API_URL_INVOICE = buildApiUrl(API_ENDPOINTS.INVOICE);
export const API_URL_MATERIAL_LIST = buildApiUrl(API_ENDPOINTS.MATERIAL_LIST);
