'use client';

import { createPointInspectionSnapshot } from '@/data/exhibition-inspection';
import { useDemoInspection } from '@/hooks/use-demo-inspection';

export function useInspectionPolling() {
  const { data, isLoading, error, retry } = useDemoInspection(createPointInspectionSnapshot);
  return {
    apiData: data?.apiData ?? null,
    totalStats: data?.totalStats ?? null,
    isDefectMode: data?.isDefectMode ?? false,
    hasFetched: !isLoading,
    isLoading, error, retry,
  };
}
