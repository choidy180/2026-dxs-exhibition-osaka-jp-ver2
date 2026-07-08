import type { ScreenMode } from '@/types/gasketCheck';

const FILM_ATTACHMENT_DEV_API_URL = 'https://gapi.dxsplatform.com/api/DX_API000026';
const FILM_ATTACHMENT_INTERNAL_API_URL = 'http://192.168.2.147:24828/api/DX_API000026';

export const FILM_ATTACHMENT_API_URL =
  typeof window !== 'undefined' &&
  (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.pathname.includes('-dev')
  )
    ? FILM_ATTACHMENT_DEV_API_URL
    : FILM_ATTACHMENT_INTERNAL_API_URL;

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
        padding: '20px',
        gap: '16px',
        headerHeight: '104px',
        imageColumn: 'minmax(0, 2.8fr)',
        logColumn: 'minmax(360px, 0.95fr)',
    },
    QHD: {
        padding: '28px',
        gap: '20px',
        headerHeight: '118px',
        imageColumn: 'minmax(0, 2.9fr)',
        logColumn: 'minmax(440px, 0.9fr)',
    },
};