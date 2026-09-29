'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import InspectionDataState from '@/components/common/inspection-data-state/InspectionDataState';

import EmptyStateModal from '@/components/glass-gap-inspection/EmptyStateModal';
import HistoryModal from '@/components/glass-gap-inspection/HistoryModal';
import ImageModal from '@/components/glass-gap-inspection/ImageModal';
import InspectionHeader from '@/components/glass-gap-inspection/InspectionHeader';
import MainInspectionPanel from '@/components/glass-gap-inspection/MainInspectionPanel';
import SoundPermissionModal from '@/components/glass-gap-inspection/SoundPermissionModal';
import TypeSelectionModal from '@/components/glass-gap-inspection/TypeSelectionModal';
import { GUIDE_IMAGE_PATH } from '@/constants/glassGapInspection';
import { useBoxConnectors } from '@/hooks/glass-gap-inspection/useBoxConnectors';
import { useDefectAlarm } from '@/hooks/glass-gap-inspection/useDefectAlarm';
import { useHotspotAnchors } from '@/hooks/glass-gap-inspection/useHotspotAnchors';
import { useInspectionPolling } from '@/hooks/glass-gap-inspection/useInspectionPolling';
import type {
  AnchorPoint,
  CornerKey,
  ImageModalState,
  InspectionViewType,
  SummaryFilter,
} from '@/types/glassGapInspection';
import {
  createCornerItems,
  getInspectionTone,
  getResultState,
} from '@/utils/glassGapInspection';
import {
  GlassGapGlobalStyles,
  PageShell,
} from '@/styles/glassGapInspection.styles';

export default function GlassGapInspectionClient() {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hotspotRefs = useRef<Record<CornerKey, HTMLButtonElement | null>>({
    tl: null,
    tr: null,
    bl: null,
    br: null,
  });
  const cameraTileRefs = useRef<Record<CornerKey, HTMLButtonElement | null>>({
    tl: null,
    tr: null,
    bl: null,
    br: null,
  });

  const registerHotspotRef = useCallback((key: CornerKey, node: HTMLButtonElement | null) => {
    hotspotRefs.current[key] = node;
  }, []);
  const registerCameraRef = useCallback((key: CornerKey, node: HTMLButtonElement | null) => {
    cameraTileRefs.current[key] = node;
  }, []);

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
    isLoading, error, retry,
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
    if (!url) {
      return;
    }

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

  if (isLoading || error) return <PageShell><InspectionDataState isLoading={isLoading} error={error} onRetry={retry} /></PageShell>;

  return (
    <PageShell>
      <GlassGapGlobalStyles />
      <InspectionHeader
        audioAllowed={audioAllowed}
        modelValue={apiData?.CDGITEM || '-'}
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
        woValue={apiData?.WO || '-'}
      />

      <MainInspectionPanel
        activeCorner={activeCorner}
        registerCameraRef={registerCameraRef}
        connectorLines={connectorLines}
        cornerItems={cornerItems}
        guideImgUrl={GUIDE_IMAGE_PATH}
        registerHotspotRef={registerHotspotRef}
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
