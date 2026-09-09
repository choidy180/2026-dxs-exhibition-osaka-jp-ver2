'use client';

import { useEffect, useState } from 'react';
import { getInspectionApiUrl } from '@/constants/smartFactoryViewer';
import type { ApiDataItem, EquipmentPositionItem } from '@/types/smartFactoryViewer';
import {
  getEquipmentPositionSignature,
  normalizeApiItem,
  normalizeEquipmentPosition,
} from '@/utils/smartFactoryViewer';

interface ApiResponse {
  success?: boolean;
  data?: Partial<ApiDataItem>[];
  DX_EQUIP_LIST?: Partial<EquipmentPositionItem>[];
}

const POLL_INTERVAL_MS = 2000;

export const useSmartFactoryData = () => {
  const [apiData, setApiData] = useState<ApiDataItem[]>([]);
  const [equipmentPositions, setEquipmentPositions] = useState<EquipmentPositionItem[]>([]);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let mounted = true;
    let pollTimer: number | null = null;
    let activeController: AbortController | null = null;

    const fetchData = async () => {
      const requestStartedAt = performance.now();
      const controller = new AbortController();
      const requestTimer = window.setTimeout(() => controller.abort(), 15000);
      activeController = controller;

      try {
        const response = await fetch(getInspectionApiUrl(), {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Smart factory API request failed: ${response.status}`);
        }

        const json = (await response.json()) as ApiResponse;

        if (!mounted) return;

        if (json.success) {
          if (Array.isArray(json.DX_EQUIP_LIST) && json.DX_EQUIP_LIST.length > 0) {
            const nextPositions = json.DX_EQUIP_LIST.map(normalizeEquipmentPosition);
            const nextSignature = getEquipmentPositionSignature(nextPositions);

            setEquipmentPositions((currentPositions) => (
              getEquipmentPositionSignature(currentPositions) === nextSignature
                ? currentPositions
                : nextPositions
            ));
          }

          if (Array.isArray(json.data) && json.data.length > 0) {
            setApiData(json.data.map(normalizeApiItem));
            setIsFallback(false);
            return;
          }
        }

        console.warn('Smart factory API returned no usable data. Keeping the last response.');
        setIsFallback(true);
      } catch (error) {
        if (!mounted) return;
        console.error('Failed to fetch smart factory data:', error);
        setIsFallback(true);
      } finally {
        window.clearTimeout(requestTimer);
        if (activeController === controller) activeController = null;

        if (mounted) {
          const requestElapsed = performance.now() - requestStartedAt;
          pollTimer = window.setTimeout(
            fetchData,
            Math.max(POLL_INTERVAL_MS - requestElapsed, 0),
          );
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
      activeController?.abort();
      if (pollTimer !== null) window.clearTimeout(pollTimer);
    };
  }, []);

  return {
    apiData,
    equipmentPositions,
    isFallback,
  };
};
