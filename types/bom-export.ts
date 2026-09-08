export type BomExportRequest = {
  type: 'start';
  url: string;
};

export type BomExportWorkerMessage =
  | { type: 'progress'; phase: 'fetching' | 'converting'; rows: number }
  | { type: 'complete'; blob: Blob; rows: number }
  | { type: 'empty' }
  | { type: 'error'; message: string };
