'use client';

import { useEffect, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import { FactoryScene } from '@/components/smart-factory-viewer/FactoryScene';
import { InfoPanels } from '@/components/smart-factory-viewer/InfoPanels';
import { EmergencyAlert, PreparingModal, TransitionLoader } from '@/components/smart-factory-viewer/Modals';
import { ViewerToolbar } from '@/components/smart-factory-viewer/ViewerToolbar';
import { useSmartFactoryData } from '@/hooks/useSmartFactoryData';
import type {
  ApiDataItem,
  UnitData,
  ViewerLayoutType,
  ViewerUiMode,
} from '@/types/smartFactoryViewer';
import { createErrorUnits } from '@/utils/smartFactoryViewer';
import {
  HighlightText,
  InstructionBadge,
  MainContent,
  PageContainer,
  SceneSlot,
  ViewerBody,
} from '@/styles/smartFactoryViewer.styles';

const VIEW_LAYOUT_STORAGE_KEY = 'smart-factory-view-layout';
const UI_MODE_STORAGE_KEY = 'smart-factory-view-mode';

const getInitialLayout = (): ViewerLayoutType => {
  if (typeof window === 'undefined') return 'balanced';

  const saved = window.localStorage.getItem(VIEW_LAYOUT_STORAGE_KEY);
  if (saved === 'modelOnly' || saved === 'balanced' || saved === 'detailRight') return saved;

  return 'balanced';
};

const getInitialMode = (): ViewerUiMode => {
  if (typeof window === 'undefined') return 'operator';

  const saved = window.localStorage.getItem(UI_MODE_STORAGE_KEY);
  if (saved === 'operator' || saved === 'command') return saved;

  return 'operator';
};

export default function SmartFactoryViewerClient() {
  const [activeTab, setActiveTab] = useState('GR2');
  const [targetTab, setTargetTab] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [modalTarget, setModalTarget] = useState<string | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<UnitData | null>(null);
  const [injectUnit, setInjectUnit] = useState<ApiDataItem | null>(null);
  const [dismissedAlertUnit, setDismissedAlertUnit] = useState<string | null>(null);
  const [layout, setLayout] = useState<ViewerLayoutType>(getInitialLayout);
  const [mode, setMode] = useState<ViewerUiMode>(getInitialMode);
  const { apiData, isFallback } = useSmartFactoryData();

  const errorUnits = useMemo(() => createErrorUnits(apiData), [apiData]);

  const criticalUnit = useMemo(() => {
    const criticalTargets = ['M-01', 'M-02', 'M-03', 'M-04'];
    return errorUnits.find((unit) => criticalTargets.includes(unit.name)) ?? null;
  }, [errorUnits]);

  useEffect(() => {
    window.localStorage.setItem(VIEW_LAYOUT_STORAGE_KEY, layout);
  }, [layout]);

  useEffect(() => {
    window.localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
  }, [mode]);

  const handleTabClick = (tab: string) => {
    if (tab === activeTab || isNavigating) return;

    if (tab === 'GR2') {
      setTargetTab(tab);
      setIsNavigating(true);
      return;
    }

    setModalTarget(tab);
  };

  const handleTransitionComplete = () => {
    if (targetTab) {
      setActiveTab(targetTab);
      setTargetTab(null);
    }

    setIsNavigating(false);
  };

  return (
    <PageContainer $mode={mode}>
      {criticalUnit && dismissedAlertUnit !== criticalUnit.name && (
        <EmergencyAlert unit={criticalUnit} onClose={() => setDismissedAlertUnit(criticalUnit.name)} />
      )}

      <MainContent>
        {isNavigating && <TransitionLoader onFinished={handleTransitionComplete} />}
        <PreparingModal target={modalTarget} onClose={() => setModalTarget(null)} />

        <ViewerToolbar
          activeTab={activeTab}
          layout={layout}
          mode={mode}
          isNavigating={isNavigating}
          onTabClick={handleTabClick}
          onLayoutChange={setLayout}
          onModeChange={setMode}
        />

        <ViewerBody $layout={layout}>
          <SceneSlot $layout={layout} $mode={mode}>
            <FactoryScene
              layout={layout}
              apiData={apiData}
              onHoverChange={setHoveredInfo}
              onInjectUnitChange={setInjectUnit}
            />
          </SceneSlot>

          <InfoPanels
            activeTab={activeTab}
            layout={layout}
            mode={mode}
            hoveredInfo={hoveredInfo}
            errorUnits={errorUnits}
            apiData={apiData}
            injectUnit={injectUnit}
            isFallback={isFallback}
          />
        </ViewerBody>

        {layout !== 'balanced' && (
          <InstructionBadge $mode={mode}>
            <Layers size={14} />
            <HighlightText $mode={mode}>좌클릭</HighlightText>: 회전 / <HighlightText $mode={mode}>스크롤</HighlightText>: 확대·축소
          </InstructionBadge>
        )}
      </MainContent>
    </PageContainer>
  );
}
