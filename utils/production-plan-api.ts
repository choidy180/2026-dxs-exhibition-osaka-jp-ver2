/**
 * 생산계획 API 클라이언트
 *
 * `USE_MOCK_DATA` 가 true 인 동안은 메모리 목업 저장소로 동작하고,
 * false 로 바꾸면 같은 함수 시그니처로 실제 엔드포인트를 호출한다.
 * 화면·훅 코드는 이 모듈만 사용하므로 API 연결 시 수정할 곳은 이 파일뿐이다.
 */

import {
  API_BASE_URL,
  API_ENDPOINTS,
  ENABLE_DB_SAVE,
  MOCK_LATENCY_MS,
  USE_MOCK_DATA,
} from '@/constants/production-plan';
import {
  DEFAULT_REVISION_ID,
  DUMMY_PLAN_DATASETS,
  DUMMY_PLAN_REVISIONS,
} from '@/data/dummy-production-plan';
import type {
  ParsedPlanFile,
  PlanDataset,
  PlanRevision,
  PlanRevisionResponse,
  PlanRow,
  PlanRowResponse,
  PlanSaveResult,
  RevisionStatus,
} from '@/types/production-plan';
import { buildPlanDay, getRowCount, parseDateKey, sortRevisions } from './production-plan';

/* ───────────────────────── 공통 ───────────────────────── */

const buildUrl = (endpoint: string, params?: Record<string, string>) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }

  return (await response.json()) as T;
};

const delay = (ms: number) => new Promise<void>(resolve => { setTimeout(resolve, ms); });

/* ───────────────────────── 응답 매핑 ───────────────────────── */

const CONFIRM_CODE: Record<RevisionStatus, string> = {
  confirmed: 'Y',
  reconfirmed: 'R',
  draft: 'N',
};

const toRevisionStatus = (code: string): RevisionStatus => {
  const normalized = (code ?? '').trim().toUpperCase();
  if (normalized === 'R') return 'reconfirmed';
  if (normalized === 'Y') return 'confirmed';
  return 'draft';
};

const mapRevision = (item: PlanRevisionResponse): PlanRevision => ({
  id: String(item.REV_ID),
  uploadDate: String(item.UPLOAD_YMD).slice(0, 10),
  revision: Number(item.REV_NO) || 0,
  rowCount: Number(item.ROW_CNT) || 0,
  uploadedAt: String(item.UPLOAD_DT).replace('T', ' ').slice(0, 16),
  status: toRevisionStatus(item.CONF_GB),
  fileName: item.FILE_NM,
});

/** 일자별 평면 응답(품목 × 일자 1행)을 그리드용 피벗 구조로 변환 */
const mapDataset = (revisionId: string, items: PlanRowResponse[]): PlanDataset => {
  const dayMap = new Map<string, ReturnType<typeof buildPlanDay>>();
  const rowMap = new Map<string, PlanRow>();

  items.forEach(item => {
    const dateKey = String(item.PLAN_YMD).replace(/[./]/g, '-').slice(0, 10);
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, buildPlanDay(parseDateKey(dateKey)));
    }

    const partNo = String(item.PART_NO ?? '').trim();
    const rowKey = item.ROW_ID ? String(item.ROW_ID) : `${partNo}-${item.PJT_NM ?? ''}`;

    const existing = rowMap.get(rowKey);
    const qty = Number(item.PLAN_QTY) || 0;

    if (existing) {
      if (qty > 0) existing.quantities[dateKey] = (existing.quantities[dateKey] ?? 0) + qty;
      return;
    }

    rowMap.set(rowKey, {
      id: rowKey,
      line: String(item.LINE_NM ?? '').trim(),
      pjt: String(item.PJT_NM ?? '').trim(),
      partNo,
      partNm: String(item.PART_NM ?? '').trim(),
      quantities: qty > 0 ? { [dateKey]: qty } : {},
    });
  });

  return {
    revisionId,
    days: [...dayMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1)),
    rows: [...rowMap.values()],
  };
};

/* ───────────────────────── 목업 저장소 ───────────────────────── */

/**
 * 목업 모드에서 업로드·확정 결과를 세션 동안 유지하기 위한 메모리 저장소.
 * 실제 API 연결 시에는 사용되지 않는다.
 */
const mockStore = {
  revisions: [...DUMMY_PLAN_REVISIONS],
  datasets: { ...DUMMY_PLAN_DATASETS },
};

/** 데모 데이터 보기 — 목업 저장소를 초기 상태로 되돌린다 */
export const resetMockStore = () => {
  mockStore.revisions = [...DUMMY_PLAN_REVISIONS];
  mockStore.datasets = { ...DUMMY_PLAN_DATASETS };
  return DEFAULT_REVISION_ID;
};

/* ───────────────────────── API ───────────────────────── */

/** 업로드 히스토리(리비전 목록) 조회 */
export const fetchRevisions = async (): Promise<PlanRevision[]> => {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY_MS);
    return sortRevisions(mockStore.revisions);
  }

  const data = await requestJson<PlanRevisionResponse[]>(buildUrl(API_ENDPOINTS.REVISIONS));
  return sortRevisions((Array.isArray(data) ? data : []).map(mapRevision));
};

/** 리비전 상세(미리보기 데이터) 조회 */
export const fetchRevisionDetail = async (revisionId: string): Promise<PlanDataset> => {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY_MS);
    const dataset = mockStore.datasets[revisionId];
    if (!dataset) throw new Error('선택한 리비전 데이터를 찾을 수 없습니다.');
    return dataset;
  }

  const data = await requestJson<PlanRowResponse[]>(
    buildUrl(API_ENDPOINTS.REVISION_DETAIL, { revId: revisionId }),
  );
  return mapDataset(revisionId, Array.isArray(data) ? data : []);
};

/** 엑셀 업로드 등록 — 새 리비전을 만들고 그 리비전을 반환한다 */
export const uploadPlan = async (payload: {
  uploadDate: string;
  revision: number;
  parsed: ParsedPlanFile;
}): Promise<{ revision: PlanRevision; dataset: PlanDataset }> => {
  const { uploadDate, revision, parsed } = payload;

  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY_MS);

    const id = `rev-${uploadDate.replace(/-/g, '')}-${revision}-${mockStore.revisions.length}`;
    const dataset: PlanDataset = { revisionId: id, days: parsed.days, rows: parsed.rows };
    const created: PlanRevision = {
      id,
      uploadDate,
      revision,
      rowCount: getRowCount(parsed.rows, parsed.days),
      // 업로드 시각은 실제 업로드 시점을 사용한다 (목업이라도 사용자 행동 시각이 맞다)
      uploadedAt: formatUploadedAt(new Date()),
      status: 'draft',
      fileName: parsed.fileName,
    };

    mockStore.revisions = [created, ...mockStore.revisions];
    mockStore.datasets = { ...mockStore.datasets, [id]: dataset };

    return { revision: created, dataset };
  }

  // 실제 API: 품목 × 일자 평면 구조로 전송한다
  const rows = parsed.rows.flatMap(row =>
    parsed.days
      .filter(day => (row.quantities[day.date] ?? 0) > 0)
      .map(day => ({
        LINE_NM: row.line,
        PJT_NM: row.pjt,
        PART_NO: row.partNo,
        PART_NM: row.partNm,
        PLAN_YMD: day.date,
        PLAN_QTY: row.quantities[day.date],
      })),
  );

  const data = await requestJson<{ revision: PlanRevisionResponse; rows: PlanRowResponse[] }>(
    buildUrl(API_ENDPOINTS.UPLOAD),
    {
      method: 'POST',
      body: JSON.stringify({
        UPLOAD_YMD: uploadDate,
        REV_NO: revision,
        FILE_NM: parsed.fileName,
        ROWS: rows,
      }),
    },
  );

  const mapped = mapRevision(data.revision);
  return { revision: mapped, dataset: mapDataset(mapped.id, data.rows ?? []) };
};

/** 확정 / 확정취소 */
export const updateRevisionStatus = async (
  revisionId: string,
  status: RevisionStatus,
): Promise<PlanRevision> => {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY_MS);

    let updated: PlanRevision | null = null;
    mockStore.revisions = mockStore.revisions.map(revision => {
      if (revision.id !== revisionId) return revision;
      updated = { ...revision, status };
      return updated;
    });

    if (!updated) throw new Error('리비전을 찾을 수 없습니다.');
    return updated;
  }

  const data = await requestJson<PlanRevisionResponse>(buildUrl(API_ENDPOINTS.CONFIRM), {
    method: 'POST',
    body: JSON.stringify({ REV_ID: revisionId, CONF_GB: CONFIRM_CODE[status] }),
  });

  return mapRevision(data);
};

/**
 * DB 저장 — 현재 미연결 기능.
 * `ENABLE_DB_SAVE` 를 true 로 바꾸면 아래 실제 호출이 동작한다.
 */
export const savePlanToDatabase = async (revisionId: string): Promise<PlanSaveResult> => {
  if (!ENABLE_DB_SAVE) {
    return {
      ok: false,
      message: 'DB 저장은 API 연결 후 사용할 수 있습니다. 현재는 미리보기까지만 지원합니다.',
    };
  }

  const data = await requestJson<{ RESULT: string; MESSAGE?: string }>(buildUrl(API_ENDPOINTS.SAVE), {
    method: 'POST',
    body: JSON.stringify({ REV_ID: revisionId }),
  });

  const ok = String(data.RESULT ?? '').toUpperCase() === 'Y';
  return { ok, message: data.MESSAGE ?? (ok ? 'DB 저장이 완료되었습니다.' : 'DB 저장에 실패했습니다.') };
};

/* ───────────────────────── 내부 ───────────────────────── */

const formatUploadedAt = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
