import { useCallback, useMemo, useState } from 'react';
import { createExhibitionMaterials } from '@/data/exhibition-material';
import type { MaterialListItem } from '@/types/material-monitoring';
import { getMaterialStats } from '@/utils/material-monitoring';

export function useMaterialData() {
  const [materialList, setMaterialList] = useState<MaterialListItem[]>([]);
  const [isMaterialLoading, setIsMaterialLoading] = useState(true);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const pendingList = useMemo(() => materialList.filter(item => item.InspConf !== 'Y' && item.QmConf !== 'Y'), [materialList]);
  const materialStats = useMemo(() => getMaterialStats(materialList), [materialList]);
  const fetchMaterialData = useCallback(async () => {
    setIsMaterialLoading(true);
    setMaterialError(null);
    try { setMaterialList(createExhibitionMaterials()); }
    catch { setMaterialError('입고 대기 정보를 불러오지 못했습니다.'); }
    finally { setIsMaterialLoading(false); }
  }, []);
  return { materialList, pendingList, inspectionLogs: materialList.slice(0, 40), materialStats,
    isMaterialLoading, materialError, fetchMaterialData };
}
