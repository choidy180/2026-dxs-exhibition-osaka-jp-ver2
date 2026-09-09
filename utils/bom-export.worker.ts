import { BomCsvExportError, convertBomCsvToXlsx } from './bom-csv-excel';
import { bomRowsToCsv } from './bom-row-export';
import type { BomExportRequest, BomExportWorkerMessage } from '../types/bom-export';

const FETCH_TIMEOUT_MS = 180_000;

// 앱의 공용 TypeScript 환경에 WebWorker DOM 선언을 추가하지 않고
// 이 워커에서 필요한 전역 함수만 명시한다.
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<BomExportRequest>) => void) | null;
  postMessage: (message: BomExportWorkerMessage) => void;
};

let running = false;
workerScope.onmessage = async ({ data }) => {
  if (data.type !== 'start' || running) return;
  running = true;
  const controller = new AbortController();
  const timeout = data.scope === 'all' ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : undefined;
  let phase: 'fetching' | 'converting' = 'fetching';
  const send = (message: BomExportWorkerMessage) => workerScope.postMessage(message);

  try {
    let csv: string;
    if (data.scope === 'all') {
      send({ type: 'progress', phase: 'fetching', rows: 0 });
      const response = await fetch(data.url, {
        method: 'GET',
        credentials: 'omit',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new BomCsvExportError(`BOM 데이터를 불러오지 못했습니다. (HTTP ${response.status})`);
      }
      const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (contentType !== 'text/csv' && contentType !== 'application/csv') {
        throw new BomCsvExportError('서버에서 CSV 파일을 받지 못했습니다. 다시 시도해 주세요.');
      }
      csv = await response.text();
    } else {
      phase = 'converting';
      send({ type: 'progress', phase, rows: 0 });
      csv = bomRowsToCsv(data.rows);
    }
    clearTimeout(timeout);

    phase = 'converting';
    send({ type: 'progress', phase, rows: 0 });
    const { blob, rowCount } = convertBomCsvToXlsx(csv, (rows) => {
      send({ type: 'progress', phase: 'converting', rows });
    });
    send(rowCount === 0 ? { type: 'empty' } : { type: 'complete', blob, rows: rowCount });
  } catch (error) {
    const message = controller.signal.aborted
      ? 'BOM 데이터 응답 시간이 3분을 초과했습니다. 잠시 후 다시 시도해 주세요.'
      : error instanceof BomCsvExportError
        ? error.message
        : phase === 'fetching'
          ? 'BOM 데이터를 불러오지 못했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.'
          : '엑셀 파일을 변환하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    send({ type: 'error', message });
  } finally {
    clearTimeout(timeout);
    running = false;
  }
};
