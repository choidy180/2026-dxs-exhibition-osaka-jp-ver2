import type { ScreenMode } from '@/types/gasketCheck';


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