'use client';

import { useCallback } from 'react';
import { createFoamingSensorSnapshot } from '@/data/exhibition-inspection';
import { useDemoInspection } from '@/hooks/use-demo-inspection';

export function useFoamingSensor(processId: string) {
  const createSnapshot = useCallback(() => createFoamingSensorSnapshot(processId), [processId]);
  const { data, isLoading, error, refresh } = useDemoInspection(createSnapshot);
  const isCurrentProcess = data?.process === processId;
  return {
    data: isCurrentProcess ? data : null,
    isInitialLoading: isLoading || (!isCurrentProcess && !error),
    error,
    refetch: refresh,
  };
}
