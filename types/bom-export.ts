import type { BomRow } from './lab';

export type BomExportRequest =
  | { type: 'start'; scope: 'all' }
  | { type: 'start'; scope: 'current'; rows: BomRow[] };

export type BomExportWorkerMessage =
  | { type: 'progress'; phase: 'fetching' | 'converting'; rows: number }
  | { type: 'complete'; blob: Blob; rows: number }
  | { type: 'empty' }
  | { type: 'error'; message: string };
