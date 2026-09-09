'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { INBOUND_REQUEST_TIMEOUT_MS } from '@/constants/material-inbound-status';
import type { MaterialListItem } from '@/types/material-monitoring';
import { fetchInboundStatus } from '@/utils/material-inbound-status-api';
import { toDateKey } from '@/utils/date';

const getBrowserToday = () => toDateKey(new Date());
const getServerToday = () => '';
const subscribeToToday = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 60_000);
  window.addEventListener('focus', onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('focus', onChange);
  };
};

/** 서버의 임의 기준일을 화면에 먼저 그리지 않고 브라우저 날짜가 준비된 뒤 조회한다. */
export function useInboundToday() {
  return useSyncExternalStore(subscribeToToday, getBrowserToday, getServerToday);
}

type InboundResult = {
  key: string;
  rows: MaterialListItem[];
  loading: boolean;
  error: string | null;
};

const EMPTY_ROWS: MaterialListItem[] = [];

export function useInboundStatus(startDate: string, endDate: string) {
  const [result, setResult] = useState<InboundResult>({ key: '', rows: EMPTY_ROWS, loading: true, error: null });
  const requestRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `${startDate}/${endDate}`;
  const enabled = !!startDate && !!endDate;

  const stopRequest = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (!startDate || !endDate) return;
    stopRequest();
    const controller = new AbortController();
    requestRef.current = controller;
    setResult({ key, rows: EMPTY_ROWS, loading: true, error: null });

    timeoutRef.current = setTimeout(() => {
      if (requestRef.current !== controller) return;
      stopRequest();
      setResult({ key, rows: EMPTY_ROWS, loading: false, error: '입고 데이터 응답이 지연되고 있습니다. 다시 시도해 주세요.' });
    }, INBOUND_REQUEST_TIMEOUT_MS);

    try {
      const rows = await fetchInboundStatus({ startDate, endDate }, controller.signal);
      // 취소된 요청이 늦게 끝나도 최신 기간의 데이터와 로딩 상태는 덮어쓰지 않는다.
      if (controller.signal.aborted || requestRef.current !== controller) return;
      setResult({ key, rows, loading: false, error: null });
    } catch {
      if (controller.signal.aborted || requestRef.current !== controller) return;
      setResult({ key, rows: EMPTY_ROWS, loading: false, error: '입고 데이터를 불러오지 못했습니다. 다시 시도해 주세요.' });
    } finally {
      if (requestRef.current === controller) stopRequest();
    }
  }, [endDate, key, startDate, stopRequest]);

  useEffect(() => {
    void refresh();
    return stopRequest;
  }, [refresh, stopRequest]);

  // 날짜가 바뀐 직후 effect 실행 전에도 이전 기간의 결과를 표시하지 않는다.
  const isCurrent = enabled && result.key === key;
  return {
    rows: isCurrent ? result.rows : EMPTY_ROWS,
    isLoading: !isCurrent || result.loading,
    error: isCurrent ? result.error : null,
    refresh,
  };
}
