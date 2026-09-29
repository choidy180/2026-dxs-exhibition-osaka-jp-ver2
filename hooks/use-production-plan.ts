'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_UPLOAD_DATE } from '@/constants/production-plan';
import { toDateKey } from '@/utils/date';
import type { PlanDataset, PlanRevision, PlanSummary, RevisionStatus } from '@/types/production-plan';
import {
  getConfirmedStatus,
  getNextRevisionNumber,
  getPlanSummary,
  parseDateKey,
  parsePlanWorkbook,
  sortRevisions,
  validateUploadFile,
} from '@/utils/production-plan';
import {
  fetchRevisionDetail,
  fetchRevisions,
  resetMockStore,
  savePlanToDatabase,
  updateRevisionStatus,
  uploadPlan,
} from '@/utils/production-plan-api';

export type NoticeTone = 'success' | 'warning' | 'info' | 'danger';

export type PlanNotice = {
  tone: NoticeTone;
  message: string;
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message && !error.message.startsWith('API ')) {
    return error.message;
  }
  return fallback;
};

export function useProductionPlan() {
  const [revisions, setRevisions] = useState<PlanRevision[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [dataset, setDataset] = useState<PlanDataset | null>(null);

  const [isRevisionsLoading, setIsRevisionsLoading] = useState(false);
  const [isDatasetLoading, setIsDatasetLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [notice, setNotice] = useState<PlanNotice | null>(null);

  const [uploadDate, setUploadDate] = useState(DEFAULT_UPLOAD_DATE);

  // 언마운트 후 상태 갱신을 막는다
  const isMountedRef = useRef(true);
  // 확정을 취소한 이력이 있는 리비전 — 다시 확정하면 '리확정' 으로 표시한다
  const reconfirmTargetsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    setUploadDate(toDateKey(new Date()));
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const activeRevision = useMemo(
    () => revisions.find(revision => revision.id === activeRevisionId) ?? null,
    [activeRevisionId, revisions],
  );

  const summary: PlanSummary = useMemo(() => getPlanSummary(dataset, activeRevision), [activeRevision, dataset]);

  /** 업로드 히스토리 조회 — 최초 진입과 재시도에서 사용 */
  const loadRevisions = useCallback(async (preferredId?: string) => {
    setIsRevisionsLoading(true);
    setRevisionsError(null);

    try {
      const list = await fetchRevisions();
      if (!isMountedRef.current) return;

      setRevisions(list);
      setActiveRevisionId(current => {
        if (preferredId && list.some(revision => revision.id === preferredId)) return preferredId;
        if (current && list.some(revision => revision.id === current)) return current;
        return list[0]?.id ?? null;
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('[production-plan] 리비전 목록 조회 실패', error);
      setRevisionsError(toErrorMessage(error, '업로드 히스토리를 불러오지 못했습니다.'));
    } finally {
      if (isMountedRef.current) setIsRevisionsLoading(false);
    }
  }, []);

  /** 선택된 리비전의 미리보기 데이터 조회 */
  const loadDataset = useCallback(async (revisionId: string) => {
    setIsDatasetLoading(true);
    setDatasetError(null);

    try {
      const detail = await fetchRevisionDetail(revisionId);
      if (!isMountedRef.current) return;
      setDataset(detail);
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('[production-plan] 리비전 상세 조회 실패', error);
      setDataset(null);
      setDatasetError(toErrorMessage(error, '생산계획 데이터를 불러오지 못했습니다.'));
    } finally {
      if (isMountedRef.current) setIsDatasetLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRevisions();
  }, [loadRevisions]);

  useEffect(() => {
    if (!activeRevisionId) {
      setDataset(null);
      return;
    }
    loadDataset(activeRevisionId);
  }, [activeRevisionId, loadDataset]);

  const selectRevision = useCallback((revisionId: string) => {
    setActiveRevisionId(revisionId);
    setNotice(null);
  }, []);

  const retryDataset = useCallback(() => {
    if (activeRevisionId) loadDataset(activeRevisionId);
  }, [activeRevisionId, loadDataset]);

  /**
   * 엑셀 업로드.
   * 검증 → 파싱 → 등록 순서로 진행하고, 실패 시 기존 미리보기를 유지한다.
   */
  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateUploadFile(file);
      if (validationError) {
        setNotice({ tone: 'danger', message: validationError });
        return false;
      }

      setIsUploading(true);
      setNotice(null);

      try {
        const buffer = await file.arrayBuffer();
        const fallbackYear = parseDateKey(uploadDate).getFullYear();
        const parsed = parsePlanWorkbook(buffer, file.name, fallbackYear);

        const nextRevision = getNextRevisionNumber(revisions, uploadDate);
        const { revision, dataset: uploaded } = await uploadPlan({
          uploadDate,
          revision: nextRevision,
          parsed,
        });

        if (!isMountedRef.current) return false;

        setRevisions(current => sortRevisions([revision, ...current.filter(item => item.id !== revision.id)]));
        setActiveRevisionId(revision.id);
        setDataset(uploaded);
        setDatasetError(null);

        const warningSuffix = parsed.warnings.length ? ` (${parsed.warnings.join(' / ')})` : '';
        setNotice({
          tone: parsed.warnings.length ? 'warning' : 'success',
          message: `${file.name} 업로드 완료 · 품목 ${parsed.rows.length}개 / 계획일 ${parsed.days.length}일 · Rev ${nextRevision} 생성${warningSuffix}`,
        });

        return true;
      } catch (error) {
        if (!isMountedRef.current) return false;
        console.error('[production-plan] 업로드 실패', error);
        setNotice({
          tone: 'danger',
          message: toErrorMessage(error, '엑셀을 읽지 못했습니다. 양식을 확인해주세요.'),
        });
        return false;
      } finally {
        if (isMountedRef.current) setIsUploading(false);
      }
    },
    [revisions, uploadDate],
  );

  /** 확정 / 확정취소 */
  const changeStatus = useCallback(
    async (next: 'confirm' | 'cancel') => {
      if (!activeRevision) return;

      const targetStatus: RevisionStatus =
        next === 'cancel'
          ? 'draft'
          : getConfirmedStatus(activeRevision.status, reconfirmTargetsRef.current.has(activeRevision.id));

      if (next === 'confirm' && activeRevision.status !== 'draft') {
        setNotice({ tone: 'info', message: '이미 확정된 리비전입니다.' });
        return;
      }
      if (next === 'cancel' && activeRevision.status === 'draft') {
        setNotice({ tone: 'info', message: '확정되지 않은 리비전입니다.' });
        return;
      }

      setIsStatusUpdating(true);
      setNotice(null);

      try {
        const updated = await updateRevisionStatus(activeRevision.id, targetStatus);
        if (!isMountedRef.current) return;

        if (next === 'cancel') {
          reconfirmTargetsRef.current.add(activeRevision.id);
        }

        setRevisions(current => current.map(revision => (revision.id === updated.id ? updated : revision)));
        setNotice({
          tone: next === 'confirm' ? 'success' : 'warning',
          message:
            next === 'confirm'
              ? `Rev ${updated.revision} 을 ${targetStatus === 'reconfirmed' ? '리확정' : '확정'} 처리했습니다.`
              : `Rev ${updated.revision} 확정을 취소했습니다.`,
        });
      } catch (error) {
        if (!isMountedRef.current) return;
        console.error('[production-plan] 확정 상태 변경 실패', error);
        setNotice({ tone: 'danger', message: toErrorMessage(error, '확정 상태를 변경하지 못했습니다.') });
      } finally {
        if (isMountedRef.current) setIsStatusUpdating(false);
      }
    },
    [activeRevision],
  );

  const confirmRevision = useCallback(() => changeStatus('confirm'), [changeStatus]);
  const cancelConfirm = useCallback(() => changeStatus('cancel'), [changeStatus]);

  /** 데모 데이터 보기 — 업로드한 내용을 버리고 기본 목업으로 되돌린다 */
  const loadDemoData = useCallback(async () => {
    reconfirmTargetsRef.current.clear();
    const demoRevisionId = resetMockStore();
    setNotice({ tone: 'info', message: '데모 데이터를 불러왔습니다.' });
    await loadRevisions(demoRevisionId);
  }, [loadRevisions]);

  /** 현재 브라우저의 전시 저장소에 저장한다. */
  const saveToDatabase = useCallback(async () => {
    if (!activeRevision) return;

    setIsSaving(true);
    try {
      const result = await savePlanToDatabase(activeRevision.id);
      if (!isMountedRef.current) return;
      setNotice({ tone: result.ok ? 'success' : 'warning', message: result.message });
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('[production-plan] DB 저장 실패', error);
      setNotice({ tone: 'danger', message: toErrorMessage(error, 'DB 저장 중 오류가 발생했습니다.') });
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  }, [activeRevision]);

  const clearNotice = useCallback(() => setNotice(null), []);

  const showNotice = useCallback((next: PlanNotice) => setNotice(next), []);

  return {
    // 데이터
    revisions,
    activeRevision,
    activeRevisionId,
    dataset,
    summary,
    uploadDate,

    // 상태
    isRevisionsLoading,
    isDatasetLoading,
    isUploading,
    isStatusUpdating,
    isSaving,
    revisionsError,
    datasetError,
    notice,

    // 동작
    setUploadDate,
    selectRevision,
    retryRevisions: loadRevisions,
    retryDataset,
    uploadFile,
    confirmRevision,
    cancelConfirm,
    loadDemoData,
    saveToDatabase,
    clearNotice,
    showNotice,
  };
}
