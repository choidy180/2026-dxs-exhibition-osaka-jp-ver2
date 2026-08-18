import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL_VEHICLE_ENTRY_EXIT } from '@/constants/material-monitoring';
import type { VehicleEntryExitItem } from '@/types/material-monitoring';
import { sortByLongestStayTime } from '@/utils/vehicle-entry-exit';

const isVehicleEntryExitItem = (value: unknown): value is VehicleEntryExitItem => {
  if (!value || typeof value !== 'object') return false;

  const item = value as Record<string, unknown>;
  return (
    typeof item.INOUTCARID === 'string' &&
    typeof item.CARNO === 'string' &&
    typeof item.INDT === 'string' &&
    (typeof item.CUSTNM === 'string' || item.CUSTNM === null) &&
    typeof item.STAYTIME === 'string'
  );
};

export function useVehicleEntryExitData() {
  const [vehicles, setVehicles] = useState<VehicleEntryExitItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  const fetchVehicleEntryExitData = useCallback(async () => {
    requestControllerRef.current?.abort();

    const controller = new AbortController();
    requestControllerRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL_VEHICLE_ENTRY_EXIT, {
        cache: 'no-store',
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Vehicle entry/exit API error: ${response.status}`);
      }

      const json: unknown = await response.json();
      if (!Array.isArray(json)) {
        throw new Error('Vehicle entry/exit API returned an invalid response.');
      }

      const sortedVehicles = sortByLongestStayTime(json.filter(isVehicleEntryExitItem));

      setVehicles(sortedVehicles);
    } catch (caughtError) {
      if (controller.signal.aborted) return;

      console.error(caughtError);
      setError('차량입출차 정보를 불러오지 못했습니다.');
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => requestControllerRef.current?.abort();
  }, []);

  return {
    vehicles,
    isVehicleEntryExitLoading: isLoading,
    vehicleEntryExitError: error,
    fetchVehicleEntryExitData
  };
}
