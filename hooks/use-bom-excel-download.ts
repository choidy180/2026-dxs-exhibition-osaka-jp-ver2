'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/lab';
import type { BomExportWorkerMessage } from '@/types/bom-export';

type DownloadPhase = 'idle' | 'fetching' | 'converting' | 'complete' | 'empty' | 'error' | 'cancelled';
type DownloadState = { phase: DownloadPhase; rows: number; error: string | null };

const INITIAL_STATE: DownloadState = { phase: 'idle', rows: 0, error: null };
const MAX_EXPORT_DURATION_MS = 5 * 60 * 1_000;

const getFilename = () => {
  const timestamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(new Date()).replace(/[-:]/g, '').replace(' ', '_');
  return `MES_BOM_전체_${timestamp}.xlsx`;
};

export function useBomExcelDownload() {
  const [state, setState] = useState<DownloadState>(INITIAL_STATE);
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  useEffect(() => {
    const downloads = downloadsRef.current;
    return () => {
      stopWorker();
      downloads.forEach((timer, url) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      });
      downloads.clear();
    };
  }, [stopWorker]);

  const startDownload = useCallback(() => {
    // 렌더링 전 연속 클릭도 차단해 대용량 API를 중복 호출하지 않는다.
    if (workerRef.current) return;
    setState({ phase: 'fetching', rows: 0, error: null });

    const fail = (message: string) => {
      stopWorker();
      setState({ phase: 'error', rows: 0, error: message });
    };

    try {
      const worker = new Worker(new URL('../utils/bom-export.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      timeoutRef.current = setTimeout(() => {
        fail('엑셀 다운로드 준비 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      }, MAX_EXPORT_DURATION_MS);

      worker.onmessage = (event: MessageEvent<BomExportWorkerMessage>) => {
        if (workerRef.current !== worker) return;
        const message = event.data;
        if (message.type === 'progress') {
          setState({ phase: message.phase, rows: message.rows, error: null });
          return;
        }
        if (message.type === 'error') {
          fail(message.message);
          return;
        }
        stopWorker();
        if (message.type === 'empty') {
          setState({ phase: 'empty', rows: 0, error: null });
          return;
        }

        let url: string | null = null;
        const anchor = document.createElement('a');
        try {
          url = URL.createObjectURL(message.blob);
          anchor.href = url;
          anchor.download = getFilename();
          document.body.appendChild(anchor);
          anchor.click();
          // 브라우저가 파일을 읽기 전에 URL을 해제하지 않는다.
          const downloadUrl = url;
          const timer = setTimeout(() => {
            URL.revokeObjectURL(downloadUrl);
            downloadsRef.current.delete(downloadUrl);
          }, 60_000);
          downloadsRef.current.set(downloadUrl, timer);
          setState({ phase: 'complete', rows: message.rows, error: null });
        } catch {
          if (url) URL.revokeObjectURL(url);
          fail('엑셀 파일을 저장하지 못했습니다. 다시 시도해주세요.');
        } finally {
          anchor.remove();
        }
      };

      worker.onerror = (event) => {
        event.preventDefault();
        if (workerRef.current === worker) {
          fail('엑셀 파일을 준비하지 못했습니다. 다시 시도해주세요.');
        }
      };
      worker.onmessageerror = () => {
        if (workerRef.current === worker) fail('엑셀 파일을 전달받지 못했습니다. 다시 시도해주세요.');
      };
      worker.postMessage({ type: 'start', url: `${API_BASE_URL.replace(/\/$/, '')}${API_ENDPOINTS.BOM_EXPORT}` });
    } catch {
      fail('엑셀 다운로드를 시작하지 못했습니다. 브라우저를 새로고침한 뒤 다시 시도해주세요.');
    }
  }, [stopWorker]);

  const cancelDownload = useCallback(() => {
    if (!workerRef.current) return;
    stopWorker();
    setState({ phase: 'cancelled', rows: 0, error: null });
  }, [stopWorker]);

  return {
    ...state,
    isDownloading: state.phase === 'fetching' || state.phase === 'converting',
    startDownload,
    cancelDownload,
    retry: startDownload,
  };
}
