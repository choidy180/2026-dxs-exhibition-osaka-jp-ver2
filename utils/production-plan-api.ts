/** 전시회용 생산계획 저장소. 업로드·확정·저장을 브라우저 안에서 처리한다. */
import { MOCK_LATENCY_MS } from '@/constants/production-plan';
import { DEFAULT_REVISION_ID, DUMMY_PLAN_DATASETS, DUMMY_PLAN_REVISIONS } from '@/data/dummy-production-plan';
import type { ParsedPlanFile, PlanDataset, PlanRevision, PlanSaveResult, RevisionStatus } from '@/types/production-plan';
import { getRowCount, sortRevisions } from './production-plan';
import { toDateKey } from './date';

type PlanStore = { revisions: PlanRevision[]; datasets: Record<string, PlanDataset> };
const initialStore = (): PlanStore => structuredClone({ revisions: DUMMY_PLAN_REVISIONS, datasets: DUMMY_PLAN_DATASETS });
let store: PlanStore = initialStore();
let loaded = false;
const storageKey = () => `dxs-exhibition-plans-v1-${toDateKey(new Date())}`;
const delay = () => new Promise<void>(resolve => setTimeout(resolve, MOCK_LATENCY_MS));

const loadStore = () => {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<PlanStore>;
    if (Array.isArray(saved.revisions) && saved.datasets && saved.revisions.every(item =>
      typeof item.id === 'string' && Array.isArray(saved.datasets?.[item.id]?.rows) &&
      Array.isArray(saved.datasets?.[item.id]?.days))) store = saved as PlanStore;
  } catch { /* 브라우저 저장소가 제한되어도 메모리 데모는 계속 동작한다. */ }
};
const persist = () => {
  if (typeof window === 'undefined') return false;
  try { window.localStorage.setItem(storageKey(), JSON.stringify(store)); return true; }
  catch { return false; }
};

export const resetMockStore = () => {
  loaded = true;
  store = initialStore();
  persist();
  return DEFAULT_REVISION_ID;
};
export const fetchRevisions = async (): Promise<PlanRevision[]> => {
  loadStore();
  await delay();
  return sortRevisions(structuredClone(store.revisions));
};
export const fetchRevisionDetail = async (revisionId: string): Promise<PlanDataset> => {
  loadStore();
  await delay();
  const dataset = store.datasets[revisionId];
  if (!dataset) throw new Error('선택한 리비전 데이터를 찾을 수 없습니다.');
  return structuredClone(dataset);
};
export const uploadPlan = async (payload: {
  uploadDate: string; revision: number; parsed: ParsedPlanFile;
}): Promise<{ revision: PlanRevision; dataset: PlanDataset }> => {
  loadStore();
  await delay();
  const { uploadDate, revision, parsed } = payload;
  const id = `rev-${uploadDate.replaceAll('-', '')}-${revision}-${Date.now()}`;
  const dataset: PlanDataset = { revisionId: id, days: parsed.days, rows: parsed.rows };
  const now = new Date();
  const created: PlanRevision = {
    id, uploadDate, revision, rowCount: getRowCount(parsed.rows, parsed.days),
    uploadedAt: `${toDateKey(now)} ${now.toTimeString().slice(0, 5)}`,
    status: 'draft', fileName: parsed.fileName,
  };
  store.revisions = [created, ...store.revisions];
  store.datasets[id] = structuredClone(dataset);
  persist();
  return { revision: structuredClone(created), dataset: structuredClone(dataset) };
};
export const updateRevisionStatus = async (revisionId: string, status: RevisionStatus): Promise<PlanRevision> => {
  loadStore();
  await delay();
  const revision = store.revisions.find(item => item.id === revisionId);
  if (!revision) throw new Error('리비전을 찾을 수 없습니다.');
  revision.status = status;
  persist();
  return { ...revision };
};
export const savePlanToDatabase = async (revisionId: string): Promise<PlanSaveResult> => {
  loadStore();
  await delay();
  if (!store.datasets[revisionId]) return { ok: false, message: '저장할 생산계획이 없습니다.' };
  const saved = persist();
  return { ok: true, message: saved
    ? '생산계획을 이 브라우저에 저장했습니다.'
    : '생산계획을 현재 전시 세션에 저장했습니다.' };
};
