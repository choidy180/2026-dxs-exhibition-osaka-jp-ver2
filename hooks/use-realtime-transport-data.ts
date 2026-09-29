'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TRANSPORT_POLL_INTERVAL_MS,
  TRANSPORT_REQUEST_TIMEOUT_MS,
} from '@/constants/realtime-transport';
import { createSampleTransportVehicles } from '@/data/dummy-realtime-transport';
import type { TransportVehicleRecord } from '@/types/realtime-transport';
import { createTransportMarkers, getTransportVehicleRuntime } from '@/utils/realtime-transport';

type TransportResult = {
  sampleMode: boolean;
  records: TransportVehicleRecord[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
};

const EMPTY_RECORDS: TransportVehicleRecord[] = [];

export function useRealtimeTransportData() {
  const [isSampleMode, setIsSampleMode] = useState(true);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<TransportResult>({
    sampleMode: false, records: EMPTY_RECORDS, isLoading: true, error: null, lastUpdated: null,
  });
  const requestRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRequest = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const fetchData = useCallback(async (showLoading: boolean) => {
    stopRequest();
    const controller = new AbortController();
    requestRef.current = controller;
    setResult(previous => ({
      sampleMode: isSampleMode,
      records: previous.sampleMode === isSampleMode ? previous.records : EMPTY_RECORDS,
      isLoading: showLoading || previous.lastUpdated === null,
      error: null,
      lastUpdated: previous.sampleMode === isSampleMode ? previous.lastUpdated : null,
    }));

    timeoutRef.current = setTimeout(() => {
      if (requestRef.current !== controller) return;
      stopRequest();
      setResult(previous => ({
        ...previous, isLoading: false, error: '운행 정보 응답이 지연되고 있습니다. 다시 시도해 주세요.',
      }));
    }, TRANSPORT_REQUEST_TIMEOUT_MS);

    try {
      const records = createSampleTransportVehicles();
      if (controller.signal.aborted || requestRef.current !== controller) return;
      const receivedAt = new Date();
      setNow(receivedAt.getTime());
      setResult({ sampleMode: isSampleMode, records, isLoading: false, error: null, lastUpdated: receivedAt });
    } catch {
      if (controller.signal.aborted || requestRef.current !== controller) return;
      setResult(previous => ({
        ...previous, isLoading: false, error: '운행 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
      }));
    } finally {
      if (requestRef.current === controller) stopRequest();
    }
  }, [isSampleMode, stopRequest]);

  const refreshData = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    void refreshData();
    // 샘플은 명시적으로 새로고침할 때만 재생성해 진행률이 주기적으로 되돌아가지 않게 한다.
    const pollingTimer = isSampleMode ? null : window.setInterval(() => { void fetchData(false); }, TRANSPORT_POLL_INTERVAL_MS);
    return () => {
      if (pollingTimer !== null) window.clearInterval(pollingTimer);
      stopRequest();
    };
  }, [fetchData, isSampleMode, refreshData, stopRequest]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 모드 변경 직후 effect가 실행되기 전에도 이전 모드의 데이터를 표시하지 않는다.
  const isCurrent = result.sampleMode === isSampleMode;
  const records = isCurrent ? result.records : EMPTY_RECORDS;
  const vehicles = useMemo(() => records.map(vehicle => getTransportVehicleRuntime(vehicle, now)), [records, now]);
  const markers = useMemo(() => createTransportMarkers(vehicles), [vehicles]);

  return {
    vehicles,
    markers,
    isLoading: !isCurrent || result.isLoading,
    error: isCurrent ? result.error : null,
    lastUpdated: isCurrent ? result.lastUpdated : null,
    isSampleMode,
    setIsSampleMode,
    refreshData,
  };
}
