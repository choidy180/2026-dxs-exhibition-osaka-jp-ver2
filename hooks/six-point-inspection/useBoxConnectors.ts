'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';

import { CORNER_KEYS, TOP_POINT_KEYS } from '@/constants/sixPointInspection';
import type { ConnectorLine, CornerKey, CornerItem, InspectionViewType } from '@/types/sixPointInspection';

interface UseBoxConnectorsParams {
  cameraTileRefs: MutableRefObject<Record<CornerKey, HTMLButtonElement | null>>;
  cornerItems: CornerItem[];
  hotspotRefs: MutableRefObject<Record<CornerKey, HTMLButtonElement | null>>;
  stageRef: MutableRefObject<HTMLDivElement | null>;
  viewType: InspectionViewType;
}

export const useBoxConnectors = ({
  cameraTileRefs,
  cornerItems,
  hotspotRefs,
  stageRef,
  viewType,
}: UseBoxConnectorsParams) => {
  const [lines, setLines] = useState<Partial<Record<CornerKey, ConnectorLine>>>({});

  const recalculate = useCallback(() => {
    const stage = stageRef.current;
    const shouldShowConnectors = viewType === 'split' || viewType === 'rightStack';

    if (!stage || !shouldShowConnectors) {
      setLines({});
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const nextLines: Partial<Record<CornerKey, ConnectorLine>> = {};

    CORNER_KEYS.forEach((key) => {
      const hotspot = hotspotRefs.current?.[key];
      const cameraTile = cameraTileRefs.current?.[key];

      if (!hotspot || !cameraTile) {
        return;
      }

      const hotspotRect = hotspot.getBoundingClientRect();
      const tileRect = cameraTile.getBoundingClientRect();
      const hotspotCenterX = hotspotRect.left + hotspotRect.width / 2 - stageRect.left;
      const hotspotCenterY = hotspotRect.top + hotspotRect.height / 2 - stageRect.top;
      const tileCenterX = tileRect.left + tileRect.width / 2 - stageRect.left;
      const tileCenterY = tileRect.top + tileRect.height / 2 - stageRect.top;

      if (viewType === 'rightStack') {
        nextLines[key] = {
          x1: tileRect.left - stageRect.left,
          y1: tileCenterY,
          x2: hotspotCenterX,
          y2: hotspotCenterY,
        };
        return;
      }

      nextLines[key] = {
        x1: tileCenterX,
        y1: TOP_POINT_KEYS.includes(key)
          ? tileRect.bottom - stageRect.top
          : tileRect.top - stageRect.top,
        x2: hotspotCenterX,
        y2: hotspotCenterY,
      };
    });

    setLines(nextLines);
  }, [cameraTileRefs, hotspotRefs, stageRef, viewType]);

  useEffect(() => {
    const shouldShowConnectors = viewType === 'split' || viewType === 'rightStack';

    if (!shouldShowConnectors) return;

    const update = () => {
      window.requestAnimationFrame(recalculate);
    };

    const timeoutId = window.setTimeout(update, 120);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);

    if (resizeObserver) {
      if (stageRef.current) {
        resizeObserver.observe(stageRef.current);
      }

      CORNER_KEYS.forEach((key) => {
        const hotspot = hotspotRefs.current?.[key];
        const cameraTile = cameraTileRefs.current?.[key];

        if (hotspot) {
          resizeObserver.observe(hotspot);
        }

        if (cameraTile) {
          resizeObserver.observe(cameraTile);
        }
      });
    }

    window.addEventListener('resize', update);
    update();

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', update);
      resizeObserver?.disconnect();
    };
  }, [cornerItems, hotspotRefs, cameraTileRefs, recalculate, stageRef, viewType]);

  return {
    lines: viewType === 'guide' ? {} : lines,
    recalculate,
  };
};
