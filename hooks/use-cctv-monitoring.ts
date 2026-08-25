'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { THUMBNAIL_REFRESH_MS } from '@/constants/cctv-monitoring';
import type { CctvCamera, UseCctvMonitoringResult } from '@/types/cctv-monitoring';
import { fetchCctvMonitoringSnapshot } from '@/utils/cctv-monitoring-api';

const REFRESH_SECONDS = Math.ceil(THUMBNAIL_REFRESH_MS / 1_000);

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && /[가-힣]/.test(error.message)) return error.message;
  return fallback;
};

/**
 * CCTV 목록과 썸네일 메타데이터를 10초마다 갱신한다.
 * 숨겨진 탭에서는 네트워크 요청과 타이머를 중지하고 복귀 시 즉시 다시 조회한다.
 */
export function useCctvMonitoring(): UseCctvMonitoringResult {
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [nextRefreshSeconds, setNextRefreshSeconds] = useState(REFRESH_SECONDS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const isMountedRef = useRef(false);
  const hasSnapshotRef = useRef(false);
  const activeRequestRef = useRef<number | null>(null);
  const requestSequenceRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const nextRefreshAtRef = useRef<number | null>(null);

  const loadSnapshot = useCallback(async () => {
    if (!isMountedRef.current || document.hidden || activeRequestRef.current !== null) return;

    const isBackgroundRefresh = hasSnapshotRef.current;
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    activeRequestRef.current = requestId;

    const controller = new AbortController();
    abortRef.current = controller;

    if (isBackgroundRefresh) {
      setIsRefreshing(true);
      setRefreshError(null);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const snapshot = await fetchCctvMonitoringSnapshot(controller.signal);
      if (!isMountedRef.current || activeRequestRef.current !== requestId) return;

      hasSnapshotRef.current = true;
      setCameras(snapshot.cameras);
      setLastUpdatedAt(snapshot.generatedAt);
      setRevision(snapshot.revision);
      setError(null);
      setRefreshError(null);
    } catch (caught) {
      if (
        !isMountedRef.current ||
        activeRequestRef.current !== requestId ||
        isAbortError(caught)
      ) {
        return;
      }

      console.error('[lab/cctv-monitoring] CCTV 목록·썸네일 조회 실패', caught);

      if (isBackgroundRefresh) {
        setRefreshError(
          toErrorMessage(caught, 'CCTV 썸네일을 갱신하지 못했습니다. 잠시 후 다시 시도합니다.'),
        );
      } else {
        setCameras([]);
        setError(toErrorMessage(caught, 'CCTV 목록을 불러오지 못했습니다.'));
      }
    } finally {
      if (activeRequestRef.current === requestId) {
        activeRequestRef.current = null;
        abortRef.current = null;

        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    let pollingTimer: number | null = null;
    let countdownTimer: number | null = null;

    const updateCountdown = () => {
      if (nextRefreshAtRef.current === null) {
        setNextRefreshSeconds(0);
        return;
      }

      const remainingMs = Math.max(0, nextRefreshAtRef.current - Date.now());
      setNextRefreshSeconds(Math.ceil(remainingMs / 1_000));
    };

    const stopPolling = (updateState = true) => {
      if (pollingTimer !== null) window.clearInterval(pollingTimer);
      if (countdownTimer !== null) window.clearInterval(countdownTimer);
      pollingTimer = null;
      countdownTimer = null;
      nextRefreshAtRef.current = null;
      if (updateState) setNextRefreshSeconds(0);
    };

    const startPolling = () => {
      if (pollingTimer !== null || document.hidden) return;

      nextRefreshAtRef.current = Date.now() + THUMBNAIL_REFRESH_MS;
      setNextRefreshSeconds(REFRESH_SECONDS);

      pollingTimer = window.setInterval(() => {
        nextRefreshAtRef.current = Date.now() + THUMBNAIL_REFRESH_MS;
        setNextRefreshSeconds(REFRESH_SECONDS);
        void loadSnapshot();
      }, THUMBNAIL_REFRESH_MS);

      countdownTimer = window.setInterval(updateCountdown, 1_000);
    };

    const cancelActiveRequest = () => {
      abortRef.current?.abort();
      abortRef.current = null;
      activeRequestRef.current = null;
      setIsLoading(false);
      setIsRefreshing(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        cancelActiveRequest();
        return;
      }

      void loadSnapshot();
      startPolling();
    };

    if (!document.hidden) {
      void loadSnapshot();
      startPolling();
    } else {
      setNextRefreshSeconds(0);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      stopPolling(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      abortRef.current?.abort();
      abortRef.current = null;
      activeRequestRef.current = null;
    };
  }, [loadSnapshot]);

  const refresh = useCallback(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  return {
    cameras,
    isLoading,
    error,
    retry: refresh,
    refresh,
    lastUpdatedAt,
    nextRefreshSeconds,
    isRefreshing,
    refreshError,
    revision,
  };
}
