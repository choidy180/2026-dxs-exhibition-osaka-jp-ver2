import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMaterialListApiUrl } from '@/constants/material-monitoring';
import type { MaterialListItem } from '@/types/material-monitoring';
import { getMaterialStats } from '@/utils/material-monitoring';

const isMaterialListItem = (value: unknown): value is MaterialListItem => {
  return value !== null && typeof value === 'object';
};

const isPendingMaterial = (item: MaterialListItem) => {
  return item.InspConf !== 'Y' && item.QmConf !== 'Y';
};

export function useMaterialData() {
  const [materialList, setMaterialList] = useState<MaterialListItem[]>([]);
  const [inspectionLogs, setInspectionLogs] = useState<MaterialListItem[]>([]);
  const [isMaterialLoading, setIsMaterialLoading] = useState(true);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const pendingList = useMemo(() => materialList.filter(isPendingMaterial), [materialList]);
  const materialStats = useMemo(() => getMaterialStats(materialList), [materialList]);

  // 자재 API 조회
  const fetchMaterialData = useCallback(async () => {
    requestControllerRef.current?.abort();

    const controller = new AbortController();
    requestControllerRef.current = controller;
    setMaterialError(null);
    setIsMaterialLoading(true);

    try {
      const res = await fetch(getMaterialListApiUrl(), {
        cache: 'no-store',
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);

      const json: unknown = await res.json();
      if (!Array.isArray(json)) {
        throw new Error('Material API returned an invalid response.');
      }

      const data = json
        .filter(isMaterialListItem)
        .filter(item => !item.NmCustm?.includes('대일화학'));

      setMaterialList(data);
      setInspectionLogs(data.slice(0, 40));
    } catch (caughtError) {
      if (controller.signal.aborted) return;

      console.error(caughtError);
      setMaterialError('입고 대기 정보를 불러오지 못했습니다.');
      setMaterialList([]);
      setInspectionLogs([]);
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setIsMaterialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, []);

  return {
    materialList,
    pendingList,
    inspectionLogs,
    materialStats,
    isMaterialLoading,
    materialError,
    fetchMaterialData
  };
}
