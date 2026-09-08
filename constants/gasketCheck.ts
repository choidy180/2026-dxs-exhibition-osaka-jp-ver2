import type { ScreenMode } from '@/types/gasketCheck';

const GASKET_CHECK_DEV_API_URL = 'https://gapi.dxsplatform.com/api/DX_API000026';
const GASKET_CHECK_INTERNAL_API_URL = 'http://192.168.2.147:24828/api/DX_API000026';

export const GASKET_CHECK_API_URL =
  typeof window !== 'undefined' &&
  (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.pathname.includes('-dev')
  )
    ? GASKET_CHECK_DEV_API_URL
    : GASKET_CHECK_INTERNAL_API_URL;

export const POLLING_INTERVAL_MS = 3000;

export const LIVE_LOG_LIMIT = 15;

export const LAYOUT_CONFIGS: Record<ScreenMode, {
    padding: string;
    gap: string;
    headerHeight: string;
    imageColumn: string;
    logColumn: string;
}> = {
    FHD: {
        padding: '16px',
        gap: '12px',
        headerHeight: '92px',
        imageColumn: 'minmax(0, 3fr)',
        logColumn: 'minmax(340px, 0.9fr)',
    },
    QHD: {
        padding: '22px',
        gap: '16px',
        headerHeight: '108px',
        imageColumn: 'minmax(0, 3fr)',
        logColumn: 'minmax(420px, 0.88fr)',
    },
};
