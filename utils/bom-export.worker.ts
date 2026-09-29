import { BomCsvExportError, convertBomCsvToXlsx } from './bom-csv-excel';
import { bomRowsToCsv } from './bom-row-export';
import { DUMMY_BOM_DATASET } from '../data/dummy-lab';
import type { BomExportRequest, BomExportWorkerMessage } from '../types/bom-export';

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<BomExportRequest>) => void) | null;
  postMessage: (message: BomExportWorkerMessage) => void;
};
let running = false;
workerScope.onmessage = ({ data }) => {
  if (data.type !== 'start' || running) return;
  running = true;
  const send = (message: BomExportWorkerMessage) => workerScope.postMessage(message);
  try {
    send({ type: 'progress', phase: 'converting', rows: 0 });
    const csv = bomRowsToCsv(data.scope === 'all' ? DUMMY_BOM_DATASET.rows : data.rows);
    const { blob, rowCount } = convertBomCsvToXlsx(csv, rows => {
      send({ type: 'progress', phase: 'converting', rows });
    });
    send(rowCount === 0 ? { type: 'empty' } : { type: 'complete', blob, rows: rowCount });
  } catch (error) {
    send({ type: 'error', message: error instanceof BomCsvExportError
      ? error.message : '엑셀 파일을 변환하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
  } finally { running = false; }
};
