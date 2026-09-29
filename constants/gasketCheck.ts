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
