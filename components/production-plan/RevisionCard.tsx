'use client';

import { AlertCircle, CheckCircle2, History, Loader2, RotateCcw } from 'lucide-react';
import type { PlanRevision } from '@/types/production-plan';
import { REVISION_STATUS_LABEL, formatNumber, getRevisionTitle } from '@/utils/production-plan';
import DatePickerField from '@/components/common/date-picker/DatePickerField';
import {
  Card,
  CardHead,
  ConfirmButton,
  ConfirmGroup,
  CountPill,
  CurrentRevisionRow,
  FieldLabel,
  HistoryItem,
  HistoryScroll,
  RetryButton,
  StateBox,
  StatusBadge,
} from './styles';

type Props = {
  revisions: PlanRevision[];
  activeRevision: PlanRevision | null;
  uploadDate: string;
  isLoading: boolean;
  isStatusUpdating: boolean;
  error: string | null;
  onChangeUploadDate: (dateKey: string) => void;
  onSelectRevision: (revisionId: string) => void;
  onConfirm: () => void;
  onCancelConfirm: () => void;
  onRetry: () => void;
};

/**
 * 리비전 관리 카드.
 * 업로드 일자 선택, 현재 리비전 확정/확정취소, 업로드 히스토리 선택을 담당한다.
 */
export default function RevisionCard({
  revisions,
  activeRevision,
  uploadDate,
  isLoading,
  isStatusUpdating,
  error,
  onChangeUploadDate,
  onSelectRevision,
  onConfirm,
  onCancelConfirm,
  onRetry,
}: Props) {
  const isConfirmed = activeRevision ? activeRevision.status !== 'draft' : false;

  return (
    <Card style={{ flex: 1 }}>
      <CardHead>
        <div className="title-group">
          <History size={20} />
          <h2>리비전 관리</h2>
        </div>
        {revisions.length > 0 && <CountPill>총 {formatNumber(revisions.length)}건</CountPill>}
      </CardHead>

      <DatePickerField label="업로드 일자" value={uploadDate} onChange={onChangeUploadDate} />

      <CurrentRevisionRow>
        <span>현재 리비전</span>
        <strong>{activeRevision ? `Rev ${activeRevision.revision}` : '-'}</strong>
      </CurrentRevisionRow>

      <ConfirmGroup>
        <ConfirmButton
          type="button"
          $active={isConfirmed}
          onClick={onConfirm}
          disabled={!activeRevision || isStatusUpdating || isConfirmed}
        >
          {isStatusUpdating ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
          확정
        </ConfirmButton>
        <ConfirmButton
          type="button"
          $active={false}
          onClick={onCancelConfirm}
          disabled={!activeRevision || isStatusUpdating || !isConfirmed}
        >
          <RotateCcw size={15} />
          확정취소
        </ConfirmButton>
      </ConfirmGroup>

      <FieldLabel>업로드 히스토리</FieldLabel>

      {isLoading ? (
        <StateBox>
          <div className="icon-circle">
            <Loader2 size={24} className="spin" />
          </div>
          <strong>데이터 조회 중...</strong>
          <span>업로드 히스토리를 불러오고 있습니다.</span>
        </StateBox>
      ) : error ? (
        <StateBox $tone="danger">
          <div className="icon-circle">
            <AlertCircle size={24} />
          </div>
          <strong>불러오지 못했습니다</strong>
          <span>{error}</span>
          <RetryButton type="button" onClick={onRetry}>
            <RotateCcw size={14} /> 재시도
          </RetryButton>
        </StateBox>
      ) : revisions.length ? (
        <HistoryScroll>
          {revisions.map(revision => (
            <HistoryItem
              key={revision.id}
              type="button"
              $selected={revision.id === activeRevision?.id}
              onClick={() => onSelectRevision(revision.id)}
              aria-current={revision.id === activeRevision?.id}
              title={revision.fileName}
            >
              <div className="row-top">
                <span className="title">{getRevisionTitle(revision)}</span>
                <StatusBadge $status={revision.status}>
                  {REVISION_STATUS_LABEL[revision.status]}
                </StatusBadge>
              </div>
              <div className="row-bottom">
                <span>{formatNumber(revision.rowCount)}건</span>
                <time>{revision.uploadedAt}</time>
              </div>
            </HistoryItem>
          ))}
        </HistoryScroll>
      ) : (
        <StateBox>
          <div className="icon-circle">
            <History size={24} />
          </div>
          <strong>업로드 이력이 없습니다</strong>
          <span>엑셀 파일을 업로드하면 리비전이 생성됩니다.</span>
        </StateBox>
      )}
    </Card>
  );
}
