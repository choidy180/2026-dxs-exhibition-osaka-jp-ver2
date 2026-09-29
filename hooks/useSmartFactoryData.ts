'use client';

import { useEffect, useState } from 'react';
import { createMockApiData } from '@/data/smartFactoryViewer';
import type { ApiDataItem, EquipmentPositionItem } from '@/types/smartFactoryViewer';

export const useSmartFactoryData = () => {
  const [apiData, setApiData] = useState<ApiDataItem[]>([]);
  const [equipmentPositions, setEquipmentPositions] = useState<EquipmentPositionItem[]>([]);
  useEffect(() => {
    let tick = 0;
    const update = () => {
      setApiData(createMockApiData());
      setEquipmentPositions(['삽입', '닫힘', '주입', '오픈', '취출'].map((name, index) => ({
        CdEquip: 'BMC021', NmEquip: 'GR2 발포 설비',
        CartNo: String((Math.floor(tick / 5) + index * 2) % 12 + 1), OP: `OP${index + 1}`, OPName: name,
      })));
      tick += 1;
    };
    update();
    const timer = window.setInterval(update, 2_000);
    return () => window.clearInterval(timer);
  }, []);
  return { apiData, equipmentPositions, isFallback: false };
};
