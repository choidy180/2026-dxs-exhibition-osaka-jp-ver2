'use client';

import { useCallback, useEffect, useState } from 'react';
import { getFilmAttachmentApiUrl, POLLING_INTERVAL_MS } from '@/constants/filmAttachmentCheck';
import type { ApiData, TotalData } from '@/types/gasketCheck';
import { getInspectionTone } from '@/utils/gasketCheck';

interface ApiResponse {
    success?: boolean;
    data?: ApiData[];
    total_data?: TotalData;
}

export function useInspectionPolling() {
    const [apiData, setApiData] = useState<ApiData | null>(null);
    const [totalStats, setTotalStats] = useState<TotalData | null>(null);
    const [isDefectMode, setIsDefectMode] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(getFilmAttachmentApiUrl(), {
                cache: 'no-store',
            });
            const json = await response.json() as ApiResponse;

            if (!json.success) {
                return;
            }

            const nextData = json.data?.[0] ?? null;

            if (nextData) {
                setApiData(nextData);
                setIsDefectMode(getInspectionTone(nextData.RESULT) === 'ng');
            }

            if (json.total_data) {
                setTotalStats(json.total_data);
            }
        } catch (error) {
            console.error('Film attachment API fetch failed:', error);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const intervalId = window.setInterval(fetchData, POLLING_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [fetchData]);

    return {
        apiData,
        totalStats,
        isDefectMode,
    };
}
