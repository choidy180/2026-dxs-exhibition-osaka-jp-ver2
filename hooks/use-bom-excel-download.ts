'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BomExportWorkerMessage } from '@/types/bom-export';
import type { BomRow } from '@/types/lab';

type DownloadPhase = 'idle' | 'fetching' | 'converting' | 'complete' | 'empty' | 'error' | 'cancelled';
type DownloadScope = 'all' | 'current';
type DownloadRequest = { scope: 'all' } | { scope: 'current'; rows: BomRow[] };
type DownloadState = { phase: DownloadPhase; scope: DownloadScope; rows: number; error: string | null };

const INITIAL_STATE: DownloadState = { phase: 'idle', scope: 'all', rows: 0, error: null };
const MAX_EXPORT_DURATION_MS = 5 * 60 * 1_000;

const getFilename = (scope: DownloadScope) => {
  const timestamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(new Date()).replace(/[-:]/g, '').replace(' ', '_');
  return `MES_BOM_${scope === 'all' ? '전체' : '현재조건'}_${timestamp}.xlsx`;
};

export function useBomExcelDownload() {
  const [state, setState] = useState<DownloadState>(INITIAL_STATE);
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const lastRequestRef = useRef<DownloadRequest>({ scope: 'all' });

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

  const beginDownload = useCallback((request: DownloadRequest) => {
    // 렌더링 전 연속 클릭도 차단해 대용량 API를 중복 호출하지 않는다.
    if (workerRef.current) return;
    lastRequestRef.current = request;
    const { scope } = request;
    setState({ phase: scope === 'all' ? 'fetching' : 'converting', scope, rows: 0, error: null });

    const fail = (message: string) => {
      stopWorker();
      setState({ phase: 'error', scope, rows: 0, error: message });
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
          setState({ phase: message.phase, scope, rows: message.rows, error: null });
          return;
        }
        if (message.type === 'error') {
          fail(message.message);
          return;
        }
        stopWorker();
        if (message.type === 'empty') {
          setState({ phase: 'empty', scope, rows: 0, error: null });
          return;
        }

        let url: string | null = null;
        const anchor = document.createElement('a');
        try {
          url = URL.createObjectURL(message.blob);
          anchor.href = url;
          anchor.download = getFilename(scope);
          document.body.appendChild(anchor);
          anchor.click();
          // 브라우저가 파일을 읽기 전에 URL을 해제하지 않는다.
          const downloadUrl = url;
          const timer = setTimeout(() => {
            URL.revokeObjectURL(downloadUrl);
            downloadsRef.current.delete(downloadUrl);
          }, 60_000);
          downloadsRef.current.set(downloadUrl, timer);
          setState({ phase: 'complete', scope, rows: message.rows, error: null });
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
      worker.postMessage(request.scope === 'current'
        ? { type: 'start', scope: 'current', rows: request.rows }
        : { type: 'start', scope: 'all' });
    } catch {
      fail('엑셀 다운로드를 시작하지 못했습니다. 브라우저를 새로고침한 뒤 다시 시도해주세요.');
    }
  }, [stopWorker]);

  const startDownload = useCallback(() => beginDownload({ scope: 'all' }), [beginDownload]);
  const startCurrentDownload = useCallback((rows: BomRow[]) => {
    beginDownload({ scope: 'current', rows: [...rows] });
  }, [beginDownload]);
  const retry = useCallback(() => beginDownload(lastRequestRef.current), [beginDownload]);

  const cancelDownload = useCallback(() => {
    if (!workerRef.current) return;
    stopWorker();
    setState(current => ({ phase: 'cancelled', scope: current.scope, rows: 0, error: null }));
  }, [stopWorker]);

  return {
    ...state,
    isDownloading: state.phase === 'fetching' || state.phase === 'converting',
    startDownload,
    startCurrentDownload,
    cancelDownload,
    retry,
  };
}
