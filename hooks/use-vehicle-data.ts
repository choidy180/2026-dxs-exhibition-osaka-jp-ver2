import { useCallback, useEffect, useMemo, useState } from 'react';
import { createExhibitionVehicle } from '@/data/exhibition-material';
import type { VehicleSlotDetail } from '@/types/material-monitoring';

export function useVehicleData() {
  const [now, setNow] = useState<Date | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleSlotDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  // 현재 시간 갱신
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 차량 API 조회
  const fetchVehicleData = useCallback(async () => {
    setIsLoading(true);
    setVehicleError(null);

    try {
      setVehicleInfo(createExhibitionVehicle());
      setIsLoaded(true);
    } catch (error) {
      console.error(error);
      setVehicleError('차량 정보를 불러오지 못했습니다.');
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
    vehicleError,
    isVehicleLoading: isLoading,
    isVehicleDataLoaded: isLoaded,
    dwellString,
    fetchVehicleData
  };
}
