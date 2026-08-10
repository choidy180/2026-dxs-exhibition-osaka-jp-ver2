import { useCallback, useEffect, useRef, useState } from 'react';
import { POLLING_INTERVAL_MS } from '@/constants/foamingInspection';
import type { FoamingSensorPayload } from '@/types/foamingSensor';

interface UseFoamingSensorResult {
  data: FoamingSensorPayload | null;
  /** 첫 로딩 중에만 true (폴링 갱신 중에는 false — 화면 깜빡임 방지) */
  isInitialLoading: boolean;
  /** 마지막 요청이 실패했는지. data는 직전 성공값을 유지한다. */
  error: string | null;
  refetch: () => void;
}

/**
 * 발포 공정 센서를 3초 주기로 폴링한다.
 *
 * - 이전 요청이 끝나기 전에는 다음 요청을 보내지 않는다(요청 쌓임 방지).
 * - 일시적 실패 시 직전 성공 데이터를 유지한다(관제 화면이 비지 않도록).
 * - 탭이 백그라운드면 폴링을 멈추고, 복귀 시 즉시 1회 조회한다.
 */
export function useFoamingSensor(processId: string): UseFoamingSensorResult {
  const [data, setData] = useState<FoamingSensorPayload | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 진행 중 요청 여부 — 3초보다 응답이 느릴 때 중복 발사를 막는다 */
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  /** 언마운트 이후 setState 방지 */
  const mountedRef = useRef(true);

  const fetchOnce = useCallback(async () => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/foaming-sensor?process=${encodeURIComponent(processId)}`,
        { signal: controller.signal, cache: 'no-store' }
      );

      const payload = (await res.json()) as FoamingSensorPayload;

      if (!mountedRef.current) return;

      if (!res.ok || !payload.ok) {
        const detail = payload?.errors?.[0]?.message;
        setError(detail ? `센서 조회 실패: ${detail}` : '센서 조회 실패');
        // data는 갱신하지 않고 직전 값 유지
        return;
      }

      setData(payload);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      // 언마운트/공정 변경으로 인한 취소는 오류가 아니다
      if (err instanceof DOMException && err.name === 'AbortError') return;

      setError(err instanceof Error ? err.message : '센서 조회 실패');
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setIsInitialLoading(false);
    }
  }, [processId]);

  useEffect(() => {
    mountedRef.current = true;
    // 공정이 바뀌면 이전 공정 데이터를 그대로 두지 않는다
    setIsInitialLoading(true);
    setData(null);
    setError(null);

    let timer: number | null = null;

    const start = () => {
      if (timer !== null) return;
      timer = window.setInterval(fetchOnce, POLLING_INTERVAL_MS);
    };

    const stop = () => {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        void fetchOnce();
        start();
      }
    };

    void fetchOnce();
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mountedRef.current = false;
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      abortRef.current?.abort();
      inFlightRef.current = false;
    };
  }, [fetchOnce]);

  const refetch = useCallback(() => {
    void fetchOnce();
  }, [fetchOnce]);

  return { data, isInitialLoading, error, refetch };
}
