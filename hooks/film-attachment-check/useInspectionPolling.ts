'use client';

import { createSingleInspectionSnapshot } from '@/data/exhibition-inspection';
import { useDemoInspection } from '@/hooks/use-demo-inspection';

const createSnapshot = (sequence: number) => createSingleInspectionSnapshot(sequence, 'film');

export function useInspectionPolling() {
  const { data, isLoading, error, retry } = useDemoInspection(createSnapshot);
  return {
    apiData: data?.apiData ?? null,
    totalStats: data?.totalStats ?? null,
    isDefectMode: data?.isDefectMode ?? false,
    hasFetched: !isLoading,
    isLoading, error, retry,
  };
}
