'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import EmptyStateModal from '@/components/six-point-inspection/EmptyStateModal';
import HistoryModal from '@/components/six-point-inspection/HistoryModal';
import ImageModal from '@/components/six-point-inspection/ImageModal';
import InspectionHeader from '@/components/six-point-inspection/InspectionHeader';
import MainInspectionPanel from '@/components/six-point-inspection/MainInspectionPanel';
import SoundPermissionModal from '@/components/six-point-inspection/SoundPermissionModal';
import TypeSelectionModal from '@/components/six-point-inspection/TypeSelectionModal';
import { GUIDE_IMAGE_PATH } from '@/constants/sixPointInspection';
import { useBoxConnectors } from '@/hooks/six-point-inspection/useBoxConnectors';
import { useDefectAlarm } from '@/hooks/six-point-inspection/useDefectAlarm';
import { useHotspotAnchors } from '@/hooks/six-point-inspection/useHotspotAnchors';
import { useInspectionPolling } from '@/hooks/six-point-inspection/useInspectionPolling';
import type {
  AnchorPoint,
  CornerKey,
  ImageModalState,
  InspectionViewType,
  SummaryFilter,
} from '@/types/sixPointInspection';
import {
  createCornerItems,
  getInspectionTone,
  getResultState,
} from '@/utils/sixPointInspection';
import {
  SixPointGlobalStyles,
  PageShell,
} from '@/styles/sixPointInspection.styles';

export default function SixPointInspectionClient() {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hotspotRefs = useRef<Record<CornerKey, HTMLButtonElement | null>>({
    a1: null,
    a2: null,
    a3: null,
    a4: null,
    a5: null,
    a6: null,
  });
  const cameraTileRefs = useRef<Record<CornerKey, HTMLButtonElement | null>>({
    a1: null,
    a2: null,
    a3: null,
    a4: null,
    a5: null,
    a6: null,
  });

  const [activeCorner, setActiveCorner] = useState<CornerKey | null>(null);
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all');
  const [viewType, setViewType] = useState<InspectionViewType>('split');
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEmptyStateClosed, setIsEmptyStateClosed] = useState(false);
  const [imageModal, setImageModal] = useState<ImageModalState | null>(null);

  const {
    apiData,
    hasFetched,
    isDefectMode,
    totalStats,
  } = useInspectionPolling();
  const {
    audioAllowed,
    confirmPermission,
    showPermissionModal,
    toggleAudio,
  } = useDefectAlarm(isDefectMode);
  const {
    anchors,
    setAnchor,
  } = useHotspotAnchors();

  const cornerItems = useMemo(() => {
    return createCornerItems(apiData, anchors);
  }, [anchors, apiData]);

  const {
    lines: connectorLines,
    recalculate: recalculateConnectors,
  } = useBoxConnectors({
    cameraTileRefs,
    cornerItems,
    hotspotRefs,
    stageRef,
    viewType,
  });

  const resultState = getResultState(apiData?.RESULT);
  const normalCount = totalStats?.normal_count ?? 0;
  const totalCount = totalStats?.total_count ?? 0;
  const ngCount = cornerItems.filter((item) => getInspectionTone(item.status) === 'ng').length;
  const okCount = cornerItems.filter((item) => getInspectionTone(item.status) === 'ok').length;

  const handleImageClick = (title: string, url: string) => {
    // if (!url) {
    //   return;
    // }

    setImageModal({
      imgUrl: url,
      isOpen: true,
      title,
    });
  };

  const handleSummaryFilterChange = (filter: SummaryFilter) => {
    setSummaryFilter(filter);

    if (filter === 'all') {
      setActiveCorner(null);
      return;
    }

    const matchedCorner = cornerItems.find((item) => getInspectionTone(item.status) === filter);
    setActiveCorner(matchedCorner?.key ?? null);
  };

  const handleTypeSelect = (nextViewType: InspectionViewType) => {
    setViewType(nextViewType);
    setIsTypeModalOpen(false);
    window.requestAnimationFrame(recalculateConnectors);
  };

  const handleAnchorChange = (key: CornerKey, anchor: AnchorPoint) => {
    setAnchor(key, anchor);
  };

  return (
    <PageShell>
      <SixPointGlobalStyles />
      <InspectionHeader
        audioAllowed={audioAllowed}
        modelValue={apiData?.FILENAME1 || 'VISION-6P'}
        normalCount={normalCount}
        okCount={okCount}
        ngCount={ngCount}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenTypeModal={() => setIsTypeModalOpen(true)}
        onSummaryFilterChange={handleSummaryFilterChange}
        onToggleSound={toggleAudio}
        resultLabel={resultState.label}
        resultTone={resultState.tone}
        summaryFilter={summaryFilter}
        timeValue={apiData?.TIMEVALUE || '00:00:00'}
        totalCorners={cornerItems.length}
        totalCount={totalCount}
        viewType={viewType}
        woValue={apiData?.COUNT_NUM || '-'}
      />

      <MainInspectionPanel
        activeCorner={activeCorner}
        cameraTileRefs={cameraTileRefs}
        connectorLines={connectorLines}
        cornerItems={cornerItems}
        guideImgUrl={GUIDE_IMAGE_PATH}
        hotspotRefs={hotspotRefs}
        isFail={resultState.isFail}
        onAnchorChange={handleAnchorChange}
        onImageClick={handleImageClick}
        onRequestConnectorUpdate={recalculateConnectors}
        onSetActiveCorner={setActiveCorner}
        stageRef={stageRef}
        viewType={viewType}
      />

      <TypeSelectionModal
        currentType={viewType}
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        onSelect={handleTypeSelect}
      />
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onImageClick={handleImageClick}
      />
      {showPermissionModal && <SoundPermissionModal onConfirm={confirmPermission} />}
      {hasFetched && !apiData && !isEmptyStateClosed && (
        <EmptyStateModal
          onClose={() => setIsEmptyStateClosed(true)}
          onNavigateHome={() => router.push('/')}
        />
      )}
      {imageModal && (
        <ImageModal
          imgUrl={imageModal.imgUrl}
          isOpen={imageModal.isOpen}
          title={imageModal.title}
          onClose={() => setImageModal(null)}
        />
      )}
    </PageShell>
  );
}
