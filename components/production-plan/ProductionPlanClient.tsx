'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Database,
  FileDown,
  GitBranch,
  Info,
  Loader2,
  Package,
  PlayCircle,
  Sigma,
  X,
} from 'lucide-react';
import { ENABLE_DB_SAVE, USE_MOCK_DATA } from '@/constants/production-plan';
import { useProductionPlan, type NoticeTone } from '@/hooks/use-production-plan';
import { downloadPlanWorkbook, formatNumber } from '@/utils/production-plan';
import type { ToneName } from '@/styles/design-tokens';
import PlanPreviewGrid from './PlanPreviewGrid';
import PlanUploadCard from './PlanUploadCard';
import RevisionCard from './RevisionCard';
import {
  ActionButton,
  HeaderActions,
  Header,
  LabInfoBar,
  MetricCard,
  NoticeBar,
  PageFontScope,
  PlanShell,
  SideColumn,
  StatsGrid,
  TitleGroup,
  TitleIcon,
  Workspace,
} from './styles';

interface ProductionPlanClientProps {
  labMode?: boolean;
}

const NOTICE_TONE: Record<NoticeTone, ToneName> = {
  success: 'success',
  warning: 'warning',
  info: 'info',
  danger: 'danger',
};

const NOTICE_ICON: Record<NoticeTone, typeof Info> = {
  success: CheckCircle2,
  warning: AlertCircle,
  info: Info,
  danger: AlertCircle,
};

export default function ProductionPlanClient({ labMode = false }: ProductionPlanClientProps) {
  const {
    revisions,
    activeRevision,
    dataset,
    summary,
    uploadDate,
    isRevisionsLoading,
    isDatasetLoading,
    isUploading,
    isStatusUpdating,
    isSaving,
    revisionsError,
    datasetError,
    notice,
    setUploadDate,
    selectRevision,
    retryRevisions,
    retryDataset,
    uploadFile,
    confirmRevision,
    cancelConfirm,
    loadDemoData,
    saveToDatabase,
    clearNotice,
    showNotice,
  } = useProductionPlan();

  const canDownload = Boolean(dataset?.rows.length);

  /** 현재 미리보기를 엑셀로 내려받는다 */
  const handleDownload = useCallback(() => {
    if (!dataset || !dataset.rows.length) {
      showNotice({ tone: 'warning', message: '내려받을 데이터가 없습니다.' });
      return;
    }

    try {
      downloadPlanWorkbook(dataset, activeRevision);
      showNotice({ tone: 'success', message: '엑셀 파일을 내려받았습니다.' });
    } catch (error) {
      console.error('[production-plan] 엑셀 다운로드 실패', error);
      showNotice({ tone: 'danger', message: '엑셀 파일을 만들지 못했습니다.' });
    }
  }, [activeRevision, dataset, showNotice]);

  const handleInvalidDrop = useCallback(
    (message: string) => showNotice({ tone: 'danger', message }),
    [showNotice],
  );

  // 단축키: Esc 로 안내 배너 닫기
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && notice) clearNotice();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearNotice, notice]);

  const rangeLabel = useMemo(() => {
    if (!dataset?.days.length) return 'Excel 생산계획표를 업로드하여 DB에 등록하고 리비전을 관리합니다.';
    const first = dataset.days[0];
    const last = dataset.days[dataset.days.length - 1];
    return `계획기간 ${first.date} ~ ${last.date} · Excel 생산계획표를 업로드하여 리비전을 관리합니다.`;
  }, [dataset]);

  const NoticeIcon = notice ? NOTICE_ICON[notice.tone] : Info;

  return (
    <PageFontScope>
      <PlanShell $labMode={labMode}>
        <Header>
          <TitleGroup>
            <TitleIcon>
              <ClipboardList size={24} />
            </TitleIcon>
            <div>
              {/* API 미연결 상태를 화면에서 바로 확인할 수 있게 표기한다 */}
              <span className="eyebrow">
                {labMode ? 'Lab · ' : ''}Production Plan{USE_MOCK_DATA ? ' · MOCK DATA' : ''}
              </span>
              <h1>생산계획 업로드</h1>
              <p>{rangeLabel}</p>
            </div>
          </TitleGroup>

          <HeaderActions>
            <ActionButton
              type="button"
              $variant="soft"
              onClick={loadDemoData}
              disabled={isRevisionsLoading || isUploading}
            >
              {isRevisionsLoading ? <Loader2 size={16} className="spin" /> : <PlayCircle size={16} />}
              데모 데이터 보기
            </ActionButton>

            <ActionButton type="button" $variant="success" onClick={handleDownload} disabled={!canDownload}>
              <FileDown size={16} />
              엑셀 다운로드
            </ActionButton>

            <ActionButton
              type="button"
              $variant="dark"
              onClick={saveToDatabase}
              disabled={!activeRevision || isSaving}
              title={ENABLE_DB_SAVE ? undefined : 'DB 저장은 API 연결 후 사용할 수 있습니다.'}
            >
              {isSaving ? <Loader2 size={16} className="spin" /> : <Database size={16} />}
              DB 저장
            </ActionButton>
          </HeaderActions>
        </Header>

        {labMode && (
          <LabInfoBar role="status">
            <Info size={17} aria-hidden="true" />
            <p>개발 진행 중인 실험실 화면으로 실제 생산계획 데이터는 아직 연결되지 않았습니다.</p>
          </LabInfoBar>
        )}

        <StatsGrid>
          <MetricCard $tone="danger">
            <div className="metric-top">
              <span>총 품목수</span>
              <Package size={20} />
            </div>
            <strong>{formatNumber(summary.itemCount)}</strong>
            <p>미리보기에 포함된 품목 수</p>
          </MetricCard>

          <MetricCard $tone="info">
            <div className="metric-top">
              <span>계획일수</span>
              <CalendarRange size={20} />
            </div>
            <strong>{formatNumber(summary.dayCount)}</strong>
            <p>주말을 제외한 계획 일자 수</p>
          </MetricCard>

          <MetricCard $tone="success">
            <div className="metric-top">
              <span>총 계획수량</span>
              <Sigma size={20} />
            </div>
            <strong>{formatNumber(summary.totalQty)}</strong>
            <p>전체 품목의 계획수량 합계</p>
          </MetricCard>

          <MetricCard $tone="warning">
            <div className="metric-top">
              <span>현재 리비전</span>
              <GitBranch size={20} />
            </div>
            <strong>{summary.revisionLabel}</strong>
            <p>
              {activeRevision
                ? `${activeRevision.uploadDate} 업로드 · ${formatNumber(activeRevision.rowCount)}건`
                : '선택된 리비전이 없습니다'}
            </p>
          </MetricCard>
        </StatsGrid>

        <Workspace>
          <SideColumn>
            <PlanUploadCard
              isUploading={isUploading}
              onUpload={uploadFile}
              onInvalidDrop={handleInvalidDrop}
            />

            <RevisionCard
              revisions={revisions}
              activeRevision={activeRevision}
              uploadDate={uploadDate}
              isLoading={isRevisionsLoading}
              isStatusUpdating={isStatusUpdating}
              error={revisionsError}
              onChangeUploadDate={setUploadDate}
              onSelectRevision={selectRevision}
              onConfirm={confirmRevision}
              onCancelConfirm={cancelConfirm}
              onRetry={() => retryRevisions()}
            />
          </SideColumn>

          <PlanPreviewGrid
            dataset={dataset}
            isLoading={isDatasetLoading}
            error={datasetError}
            onRetry={retryDataset}
            notice={
              // mode="wait" 로 이전 안내가 사라진 뒤 새 안내를 띄워 배너가 겹치지 않게 한다
              <AnimatePresence initial={false} mode="wait">
                {notice && (
                  <NoticeBar
                    key={notice.message}
                    $tone={NOTICE_TONE[notice.tone]}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    role="status"
                  >
                    <NoticeIcon size={16} />
                    <p>{notice.message}</p>
                    <button type="button" onClick={clearNotice} aria-label="안내 닫기">
                      <X size={14} />
                    </button>
                  </NoticeBar>
                )}
              </AnimatePresence>
            }
          />
        </Workspace>
      </PlanShell>
    </PageFontScope>
  );
}
