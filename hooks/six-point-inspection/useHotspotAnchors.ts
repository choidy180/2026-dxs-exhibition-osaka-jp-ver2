'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_HOTSPOT_ANCHORS,
  HOTSPOT_STORAGE_KEY,
} from '@/constants/sixPointInspection';
import type { AnchorMap, AnchorPoint, CornerKey } from '@/types/sixPointInspection';
import { getAnchorMapFromStorageValue, normalizeAnchor } from '@/utils/sixPointInspection';

export const useHotspotAnchors = () => {
  const [anchors, setAnchors] = useState<AnchorMap>(DEFAULT_HOTSPOT_ANCHORS);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(HOTSPOT_STORAGE_KEY);
    const timer = window.setTimeout(() => setAnchors(getAnchorMapFromStorageValue(storedValue)), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      window.localStorage.setItem(HOTSPOT_STORAGE_KEY, JSON.stringify(anchors));
    }, 120);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [anchors]);

  const setAnchor = useCallback((key: CornerKey, anchor: AnchorPoint) => {
    setAnchors((previous) => ({
      ...previous,
      [key]: normalizeAnchor(anchor),
    }));
  }, []);

  const resetAnchors = useCallback(() => {
    setAnchors(DEFAULT_HOTSPOT_ANCHORS);
    window.localStorage.removeItem(HOTSPOT_STORAGE_KEY);
  }, []);

  return {
    anchors,
    resetAnchors,
    setAnchor,
  };
};
