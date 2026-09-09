'use client';

import { resolveDxResourceUrl } from '@/utils/dx-api';

import { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, FileText, X, XCircle, ZoomIn } from 'lucide-react';
import { createPortal } from 'react-dom';

import CustomDatePicker from '@/components/glass-gap-inspection/CustomDatePicker';
import { GLASS_GAP_HISTORY_LOGS } from '@/data/glassGapInspectionHistory';
import type { HistoryLog, InspectionTone } from '@/types/glassGapInspection';
import {
  CornerImageGrid,
  HistoryBody,
  HistoryCard,
  HistoryContent,
  HistoryDetailBox,
  HistoryDetailStack,
  HistoryDetailText,
  HistoryDetailTitle,
  HistoryEmptyCard,
  HistoryEmptyIcon,
  HistoryEmptyPanel,
  HistoryEmptyText,
  HistoryEmptyTitle,
  HistoryEyebrow,
  HistoryHeader,
  HistoryHeaderRight,
  HistoryIconBox,
  HistoryImageButton,
  HistoryLogBadge,
  HistoryLogButton,
  HistoryLogDetail,
  HistoryLogList,
  HistoryLogMeta,
  HistoryLogTime,
  HistoryLogTop,
  HistoryMetaCell,
  HistoryMetaGrid,
  HistoryMetaLabel,
  HistoryMetaValue,
  HistoryModalShell,
  HistoryResultIcon,
  HistoryResultPill,
  HistorySelectedHeader,
  HistorySelectedInfo,
  HistorySelectedMeta,
  HistorySelectedTitle,
  HistorySidebar,
  HistorySidebarBlock,
  HistoryStatCard,
  HistoryStatGrid,
  HistoryStatLabel,
  HistoryStatPill,
  HistoryStatValue,
  HistoryTitle,
  HistoryTitleGroup,
  ImageChip,
  ImageChipCode,
  ImageSectionEyebrow,
  ImageSectionHint,
  ImageSectionTitle,
  ImageSectionTitleRow,
  ImageZoomChip,
  ModalBackdrop,
  ModalCloseButton,
  SectionLabel,
} from '@/styles/glassGapInspection.styles';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageClick: (title: string, url: string) => void;
}

const getTodayValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getLogTone = (log: HistoryLog): InspectionTone => {
  return log.result === 'ok' ? 'ok' : 'ng';
};

export default function HistoryModal({
  isOpen,
  onClose,
  onImageClick,
}: HistoryModalProps) {
  const [selectedDate, setSelectedDate] = useState(getTodayValue);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const logs = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return GLASS_GAP_HISTORY_LOGS;
  }, [selectedDate]);

  const selectedLog = useMemo(() => {
    return logs.find((log) => log.id === selectedLogId) || null;
  }, [logs, selectedLogId]);

  const stats = useMemo(() => {
    const ok = logs.filter((log) => log.result === 'ok').length;
    const ng = logs.filter((log) => log.result === 'ng').length;

    return {
      total: logs.length,
      ok,
      ng,
    };
  }, [logs]);

  const cornerPreviewItems = selectedLog
    ? [
        {
          key: 'a1',
          code: 'A1',
          title: '좌측 상단',
          url: selectedLog.images.a1,
        },
        {
          key: 'a2',
          code: 'A2',
          title: '우측 상단',
          url: selectedLog.images.a2,
        },
        {
          key: 'a3',
          code: 'A3',
          title: '좌측 하단',
          url: selectedLog.images.a3,
        },
        {
          key: 'a4',
          code: 'A4',
          title: '우측 하단',
          url: selectedLog.images.a4,
        },
      ]
    : [];

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <ModalBackdrop onClick={onClose}>
      <HistoryModalShell onClick={(event) => event.stopPropagation()}>
        <HistoryHeader>
          <HistoryTitleGroup>
            <HistoryIconBox>
              <Calendar size={24} strokeWidth={2.5} />
            </HistoryIconBox>
            <div>
              <HistoryEyebrow>Inspection Archive</HistoryEyebrow>
              <HistoryTitle>이전 검사기록 조회</HistoryTitle>
            </div>
          </HistoryTitleGroup>

          <HistoryHeaderRight>
            <HistoryStatPill>
              ALL <strong>{stats.total}</strong>
            </HistoryStatPill>
            <HistoryStatPill $tone="ok">
              OK <strong>{stats.ok}</strong>
            </HistoryStatPill>
            <HistoryStatPill $tone="ng">
              NG <strong>{stats.ng}</strong>
            </HistoryStatPill>
            <ModalCloseButton type="button" aria-label="이전 검사기록 닫기" onClick={onClose}>
              <X size={22} />
            </ModalCloseButton>
          </HistoryHeaderRight>
        </HistoryHeader>

        <HistoryBody>
          <HistorySidebar>
            <HistorySidebarBlock>
              <SectionLabel>Search Date</SectionLabel>
              <CustomDatePicker
                value={selectedDate}
                onChange={(value) => {
                  setSelectedDate(value);
                  setSelectedLogId(null);
                }}
              />
            </HistorySidebarBlock>

            <HistorySidebarBlock>
              <HistoryStatGrid>
                <HistoryStatCard>
                  <HistoryStatLabel>TOTAL</HistoryStatLabel>
                  <HistoryStatValue>{stats.total}</HistoryStatValue>
                </HistoryStatCard>
                <HistoryStatCard $tone="ok">
                  <HistoryStatLabel $tone="ok">OK</HistoryStatLabel>
                  <HistoryStatValue $tone="ok">{stats.ok}</HistoryStatValue>
                </HistoryStatCard>
                <HistoryStatCard $tone="ng">
                  <HistoryStatLabel $tone="ng">NG</HistoryStatLabel>
                  <HistoryStatValue $tone="ng">{stats.ng}</HistoryStatValue>
                </HistoryStatCard>
              </HistoryStatGrid>
            </HistorySidebarBlock>

            <HistoryLogList className="glass-gap-scrollbar">
              {logs.length > 0 ? logs.map((log) => {
                const tone = getLogTone(log);

                return (
                  <HistoryLogButton
                    key={log.id}
                    type="button"
                    $active={selectedLogId === log.id}
                    $tone={tone}
                    onClick={() => setSelectedLogId(log.id)}
                  >
                    <HistoryLogTop>
                      <HistoryLogTime>{log.time}</HistoryLogTime>
                      <HistoryLogBadge $tone={tone}>{log.result.toUpperCase()}</HistoryLogBadge>
                    </HistoryLogTop>
                    <HistoryLogMeta>{log.model} · {log.wo}</HistoryLogMeta>
                    <HistoryLogDetail>{log.detail}</HistoryLogDetail>
                  </HistoryLogButton>
                );
              }) : (
                <HistoryEmptyText>해당 날짜의 기록이 없습니다.</HistoryEmptyText>
              )}
            </HistoryLogList>
          </HistorySidebar>

          <HistoryContent className="glass-gap-scrollbar">
            {selectedLog ? (
              <HistoryDetailStack>
                <HistoryCard>
                  <HistorySelectedHeader>
                    <HistorySelectedInfo>
                      <HistoryResultIcon $tone={getLogTone(selectedLog)}>
                        {selectedLog.result === 'ok' ? (
                          <CheckCircle2 size={30} strokeWidth={2.5} />
                        ) : (
                          <XCircle size={30} strokeWidth={2.5} />
                        )}
                      </HistoryResultIcon>
                      <div>
                        <SectionLabel>Selected Log</SectionLabel>
                        <HistorySelectedTitle>{selectedLog.model}</HistorySelectedTitle>
                        <HistorySelectedMeta>작업지시서 {selectedLog.wo}</HistorySelectedMeta>
                      </div>
                    </HistorySelectedInfo>
                    <HistoryResultPill $tone={getLogTone(selectedLog)}>
                      {selectedLog.result === 'ok' ? '정상 (OK)' : '불량 (NG)'}
                    </HistoryResultPill>
                  </HistorySelectedHeader>

                  <HistoryMetaGrid>
                    <HistoryMetaCell>
                      <HistoryMetaLabel>DATE</HistoryMetaLabel>
                      <HistoryMetaValue>{selectedDate}</HistoryMetaValue>
                    </HistoryMetaCell>
                    <HistoryMetaCell>
                      <HistoryMetaLabel>TIME</HistoryMetaLabel>
                      <HistoryMetaValue>{selectedLog.time}</HistoryMetaValue>
                    </HistoryMetaCell>
                    <HistoryMetaCell>
                      <HistoryMetaLabel>RESULT</HistoryMetaLabel>
                      <HistoryMetaValue $tone={getLogTone(selectedLog)}>
                        {selectedLog.result.toUpperCase()}
                      </HistoryMetaValue>
                    </HistoryMetaCell>
                  </HistoryMetaGrid>

                  <HistoryDetailBox $tone={getLogTone(selectedLog)}>
                    <HistoryDetailTitle>상세 내용</HistoryDetailTitle>
                    <HistoryDetailText>{selectedLog.detail}</HistoryDetailText>
                  </HistoryDetailBox>
                </HistoryCard>

                <HistoryCard>
                  <ImageSectionTitleRow>
                    <div>
                      <ImageSectionEyebrow>Captured Images</ImageSectionEyebrow>
                      <ImageSectionTitle>검사 이미지</ImageSectionTitle>
                    </div>
                    <ImageSectionHint>이미지를 클릭하면 크게 볼 수 있습니다.</ImageSectionHint>
                  </ImageSectionTitleRow>

                  <HistoryImageButton
                    type="button"
                    $contain
                    $imgUrl={resolveDxResourceUrl(selectedLog.images.main)}
                    onClick={() => onImageClick('메인 검사 이미지', selectedLog.images.main)}
                  >
                    <ImageChip>MAIN</ImageChip>
                    <ImageZoomChip>
                      <ZoomIn size={17} />
                    </ImageZoomChip>
                  </HistoryImageButton>

                  <CornerImageGrid>
                    {cornerPreviewItems.map((corner) => (
                      <HistoryImageButton
                        key={corner.key}
                        type="button"
                        $imgUrl={corner.url}
                        onClick={() => onImageClick(`${corner.title} (${corner.code})`, corner.url)}
                      >
                        <ImageChip>
                          <ImageChipCode>{corner.code}</ImageChipCode>
                          {corner.title}
                        </ImageChip>
                        <ImageZoomChip>
                          <ZoomIn size={15} />
                        </ImageZoomChip>
                      </HistoryImageButton>
                    ))}
                  </CornerImageGrid>
                </HistoryCard>
              </HistoryDetailStack>
            ) : (
              <HistoryEmptyPanel>
                <HistoryEmptyCard>
                  <HistoryEmptyIcon>
                    <FileText size={34} strokeWidth={1.8} />
                  </HistoryEmptyIcon>
                  <HistoryEmptyTitle>검사 로그를 선택해주세요</HistoryEmptyTitle>
                  <HistoryEmptyText>
                    좌측 목록에서 기록을 선택하면 판정 정보와 모서리별 검사 이미지를 확인할 수 있습니다.
                  </HistoryEmptyText>
                </HistoryEmptyCard>
              </HistoryEmptyPanel>
            )}
          </HistoryContent>
        </HistoryBody>
      </HistoryModalShell>
    </ModalBackdrop>,
    document.body,
  );
}
