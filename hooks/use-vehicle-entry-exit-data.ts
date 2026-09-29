import { useCallback, useState } from 'react';
import { createExhibitionVehicleEntries } from '@/data/exhibition-material';
import type { VehicleEntryExitItem } from '@/types/material-monitoring';
import { sortByLongestStayTime } from '@/utils/vehicle-entry-exit';

export function useVehicleEntryExitData() {
  const [vehicles, setVehicles] = useState<VehicleEntryExitItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchVehicleEntryExitData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try { setVehicles(sortByLongestStayTime(createExhibitionVehicleEntries())); }
    catch { setError('차량입출차 정보를 불러오지 못했습니다.'); }
    finally { setIsLoading(false); }
  }, []);
  return { vehicles, isVehicleEntryExitLoading: isLoading, vehicleEntryExitError: error, fetchVehicleEntryExitData };
}
