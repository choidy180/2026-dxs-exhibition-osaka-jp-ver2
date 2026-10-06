'use client';

import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Info,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';

import { TYPE_OPTIONS } from '@/constants/sixPointInspection';
import type { InspectionTone, InspectionViewType, SummaryFilter } from '@/types/sixPointInspection';
import {
  CompactTypeButton,
  CompactTypeValue,
  HeaderHistoryButton,
  HeaderInfoArea,
  HeaderRow,
  HeaderSummaryCard,
  InfoTableBody,
  InfoTableCard,
  InfoTableHeader,
  InfoTd,
  InfoTh,
  InfoValue,
  ResultCard,
  ResultIconBox,
  ResultLabel,
  ResultTextBox,
  ResultValue,
  SoundToggleButton,
  SummaryChip,
  SummaryChipGrid,
  SummaryCount,
  SummaryLabel,
  TypeButtonLabel,
} from '@/styles/sixPointInspection.styles';

interface InspectionHeaderProps {
  audioAllowed: boolean;
  modelValue: string;
  normalCount: number;
  okCount: number;
  ngCount: number;
  onOpenHistory: () => void;
  onOpenTypeModal: () => void;
  onSummaryFilterChange: (filter: SummaryFilter) => void;
  onToggleSound: () => void;
  resultLabel: string;
  resultTone: InspectionTone;
  summaryFilter: SummaryFilter;
  timeValue: string;
  totalCorners: number;
  totalCount: number;
  viewType: InspectionViewType;
  woValue: string;
}

const RESULT_ICON_MAP = {
  ok: CheckCircle2,
  ng: XCircle,
  wait: Info,
};

export default function InspectionHeader({
  audioAllowed,
  modelValue,
  normalCount,
  okCount,
  ngCount,
  onOpenHistory,
  onOpenTypeModal,
  onSummaryFilterChange,
  onToggleSound,
  resultLabel,
  resultTone,
  summaryFilter,
  timeValue,
  totalCorners,
  totalCount,
  viewType,
  woValue,
}: InspectionHeaderProps) {
  const ResultIcon = RESULT_ICON_MAP[resultTone];
  const typeLabel = TYPE_OPTIONS.find((option) => option.type === viewType)?.shortName || 'Guide';

  return (
    <HeaderRow>
      <ResultCard data-demo="inspection-result" $tone={resultTone}>
        <ResultIconBox $tone={resultTone}>
          <ResultIcon size={28} strokeWidth={2.4} />
        </ResultIconBox>
        <ResultTextBox>
          <ResultLabel>
            <Clock size={13} />
            Final Judgement
          </ResultLabel>
          <ResultValue $tone={resultTone}>{resultLabel}</ResultValue>
        </ResultTextBox>
        <SoundToggleButton type="button" aria-label="알림음 전환" onClick={onToggleSound}>
          {audioAllowed ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </SoundToggleButton>
      </ResultCard>

      <HeaderInfoArea>
        <InfoTableCard>
          <InfoTableHeader>
            <InfoTh>검사시간</InfoTh>
            <InfoTh>검사수량</InfoTh>
            <InfoTh $last>파일 / COUNT</InfoTh>
          </InfoTableHeader>
          <InfoTableBody>
            <InfoTd>
              <InfoValue>{timeValue}</InfoValue>
            </InfoTd>
            <InfoTd>
              <InfoValue $accent>{normalCount}</InfoValue>
              <InfoValue> / {totalCount}</InfoValue>
            </InfoTd>
            <InfoTd $last>
              <InfoValue>{modelValue} · {woValue}</InfoValue>
            </InfoTd>
          </InfoTableBody>
        </InfoTableCard>

        <HeaderSummaryCard>
          <SummaryChipGrid>
            <SummaryChip
              type="button"
              $active={summaryFilter === 'ng'}
              $tone="ng"
              data-demo="inspection-ng" onClick={() => onSummaryFilterChange('ng')}
            >
              <SummaryLabel>NG</SummaryLabel>
              <SummaryCount>{ngCount}</SummaryCount>
            </SummaryChip>
            <SummaryChip
              type="button"
              $active={summaryFilter === 'ok'}
              $tone="ok"
              data-demo="inspection-ok" onClick={() => onSummaryFilterChange('ok')}
            >
              <SummaryLabel>OK</SummaryLabel>
              <SummaryCount>{okCount}</SummaryCount>
            </SummaryChip>
            <SummaryChip
              type="button"
              $active={summaryFilter === 'all'}
              data-demo="inspection-all" onClick={() => onSummaryFilterChange('all')}
            >
              <SummaryLabel>ALL</SummaryLabel>
              <SummaryCount>{totalCorners}</SummaryCount>
            </SummaryChip>
          </SummaryChipGrid>
        </HeaderSummaryCard>

        <CompactTypeButton type="button" onClick={onOpenTypeModal}>
          <TypeButtonLabel>TYPE</TypeButtonLabel>
          <CompactTypeValue>{typeLabel}</CompactTypeValue>
          <ChevronDown size={15} strokeWidth={2.4} />
        </CompactTypeButton>

        <HeaderHistoryButton type="button" data-demo="inspection-history" onClick={onOpenHistory}>
          <Calendar size={18} strokeWidth={2.5} />
          이전 검사기록 조회
        </HeaderHistoryButton>
      </HeaderInfoArea>
    </HeaderRow>
  );
}
