import { useCallback, useEffect, useMemo, useState } from 'react';
import { getVehicleApiUrl } from '@/constants/material-monitoring';
import type { VehicleApiResponse, VehicleSlotDetail } from '@/types/material-monitoring';

export function useVehicleData() {
  const [now, setNow] = useState<Date | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleSlotDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 현재 시간 갱신
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 차량 API 조회
  const fetchVehicleData = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await fetch(getVehicleApiUrl());
      if (!res.ok) throw new Error('Vehicle API Error');

      const data: VehicleApiResponse = await res.json();
      const slots = Object.values(data).flatMap(area => area.slots_detail);
      const validSlots = slots
        .filter(slot => slot.FILEPATH && slot.FILENAME && /\.(jpg|png)$/i.test(slot.FILENAME))
        .sort((a, b) => new Date(b.entry_time || 0).getTime() - new Date(a.entry_time || 0).getTime());

      setVehicleInfo(validSlots[0] || null);
      setIsLoaded(true);
    } catch (error) {
      console.error(error);
      setIsLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 체류 시간 계산
  const dwellString = useMemo(() => {
    if (!now || !vehicleInfo?.entry_time) return '-';

    const diffMins = Math.max(0, Math.floor((now.getTime() - new Date(vehicleInfo.entry_time).getTime()) / 60000));
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;

    return hours ? `${hours}시간 ${minutes}분` : `${minutes}분`;
  }, [now, vehicleInfo]);

  return {
    vehicleInfo,
    isVehicleLoading: isLoading,
    isVehicleDataLoaded: isLoaded,
    dwellString,
    fetchVehicleData
  };
}
