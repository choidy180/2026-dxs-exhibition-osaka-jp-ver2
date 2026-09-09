'use client';

import { useEffect, useState } from 'react';
import { resolveDxResourceUrl } from '@/utils/dx-api';

import { getInspectionApiUrl, POLLING_INTERVAL_MS } from '@/constants/sixPointInspection';
import type { ApiData, InspectionApiResponse, TotalData } from '@/types/sixPointInspection';

interface InspectionPollingState {
  apiData: ApiData | null;
  totalStats: TotalData | null;
  isDefectMode: boolean;
  hasFetched: boolean;
}

export const useInspectionPolling = () => {
  const [state, setState] = useState<InspectionPollingState>({
    apiData: null,
    totalStats: null,
    isDefectMode: false,
    hasFetched: false,
  });

  useEffect(() => {
    let mounted = true;

    const fetchInspectionData = async () => {
      try {
        const response = await fetch(getInspectionApiUrl());
        const json = (await response.json()) as InspectionApiResponse;

        if (!mounted) {
          return;
        }

        const rawData = json.success && json.data?.length ? json.data[0] : null;
        const nextData = rawData ? {
          ...rawData,
          FILEPATH1: resolveDxResourceUrl(rawData.FILEPATH1),
          FILEPATH2: resolveDxResourceUrl(rawData.FILEPATH2),
          FILEPATH3: resolveDxResourceUrl(rawData.FILEPATH3),
          FILEPATH4: resolveDxResourceUrl(rawData.FILEPATH4),
          FILEPATH5: resolveDxResourceUrl(rawData.FILEPATH5),
          FILEPATH6: resolveDxResourceUrl(rawData.FILEPATH6),
        } : null;
        const nextStats = json.success && json.total_data ? json.total_data : null;

        setState({
          apiData: nextData,
          totalStats: nextStats,
          isDefectMode: Boolean(nextData && nextData.RESULT !== '정상'),
          hasFetched: true,
        });
      } catch (error) {
        console.error('[SixPointInspection] API polling failed:', error);

        if (mounted) {
          setState((previous) => ({
            ...previous,
            hasFetched: true,
          }));
        }
      }
    };

    fetchInspectionData();
    const intervalId = window.setInterval(fetchInspectionData, POLLING_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
};
