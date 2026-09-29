'use client';

import type { MutableRefObject } from 'react';
import { Monitor } from 'lucide-react';

import type {
  AnchorPoint,
  ConnectorLine,
  CornerItem,
  CornerKey,
  InspectionViewType,
} from '@/types/sixPointInspection';
import CameraTile from '@/components/six-point-inspection/CameraTile';
import { BOTTOM_POINT_KEYS, TOP_POINT_KEYS } from '@/constants/sixPointInspection';
import GuideViewport from '@/components/six-point-inspection/GuideViewport';
import BoxConnectors from '@/components/six-point-inspection/BoxConnectors';
import {
  CameraRail,
  CameraStackGrid,
  InspectionWorkspace,
  LegendDot,
  LegendGroup,
  LegendItem,
  LiveBadge,
  LiveDot,
  MainImageStage,
  MainInspectionPanel as MainInspectionPanelShell,
  MainPanelEyebrow,
  MainPanelFooter,
  MainPanelHeader,
  StageRightStackGrid,
  StageSplitGrid,
} from '@/styles/sixPointInspection.styles';

interface MainInspectionPanelProps {
  activeCorner: CornerKey | null;
  registerCameraRef: (key: CornerKey, node: HTMLButtonElement | null) => void;
  connectorLines: Partial<Record<CornerKey, ConnectorLine>>;
  cornerItems: CornerItem[];
  guideImgUrl: string;
  registerHotspotRef: (key: CornerKey, node: HTMLButtonElement | null) => void;
  isFail: boolean;
  onAnchorChange: (key: CornerKey, anchor: AnchorPoint) => void;
  onImageClick: (title: string, url: string) => void;
  onRequestConnectorUpdate: () => void;
  onSetActiveCorner: (key: CornerKey | null) => void;
  stageRef: MutableRefObject<HTMLDivElement | null>;
  viewType: InspectionViewType;
}

export default function MainInspectionPanel({
  activeCorner,
  registerCameraRef,
  connectorLines,
  cornerItems,
  guideImgUrl,
  registerHotspotRef,
  isFail,
  onAnchorChange,
  onImageClick,
  onRequestConnectorUpdate,
  onSetActiveCorner,
  stageRef,
  viewType,
}: MainInspectionPanelProps) {
  const topCameraItems = cornerItems.filter((item) => TOP_POINT_KEYS.includes(item.key));
  const bottomCameraItems = cornerItems.filter((item) => BOTTOM_POINT_KEYS.includes(item.key));

  const renderGuideViewport = (solo = false) => (
    <GuideViewport
      activeCorner={activeCorner}
      cornerItems={cornerItems}
      guideImgUrl={guideImgUrl}
      onAnchorChange={onAnchorChange}
      onImageClick={onImageClick}
      onRequestConnectorUpdate={onRequestConnectorUpdate}
      onSetActive={onSetActiveCorner}
      registerRef={registerHotspotRef}
      solo={solo}
    />
  );

  const renderCameraTile = (item: CornerItem) => (
    <CameraTile
      key={item.key}
      active={activeCorner === item.key}
      item={item}
      onImageClick={onImageClick}
      onSetActive={onSetActiveCorner}
      registerRef={registerCameraRef}
    />
  );

  return (
    <InspectionWorkspace>
      <MainInspectionPanelShell>
        <MainPanelHeader>
          <MainPanelEyebrow>
            <Monitor size={15} strokeWidth={2.5} />
            Live Inspection Map
          </MainPanelEyebrow>
          <LiveBadge $isDefect={isFail}>
            <LiveDot $isDefect={isFail} />
            {isFail ? 'Defect Focus' : 'Nominal Flow'}
          </LiveBadge>
        </MainPanelHeader>

        <MainImageStage ref={stageRef}>
          {viewType === 'split' && (
            <>
              <StageSplitGrid>
                <CameraRail>{topCameraItems.map(renderCameraTile)}</CameraRail>
                {renderGuideViewport(false)}
                <CameraRail>{bottomCameraItems.map(renderCameraTile)}</CameraRail>
              </StageSplitGrid>
              <BoxConnectors
                activeCorner={activeCorner}
                cornerItems={cornerItems}
                lines={connectorLines}
              />
            </>
          )}

          {viewType === 'rightStack' && (
            <>
              <StageRightStackGrid>
                {renderGuideViewport(false)}
                <CameraStackGrid>{cornerItems.map(renderCameraTile)}</CameraStackGrid>
              </StageRightStackGrid>
              <BoxConnectors
                activeCorner={activeCorner}
                cornerItems={cornerItems}
                lines={connectorLines}
              />
            </>
          )}

          {viewType === 'guide' && renderGuideViewport(true)}
        </MainImageStage>

        <MainPanelFooter>
          <LegendGroup>
            <LegendItem>
              <LegendDot $tone="ok" />
              정상
            </LegendItem>
            <LegendItem>
              <LegendDot $tone="ng" />
              불량
            </LegendItem>
            <LegendItem>
              <LegendDot $tone="wait" />
              대기
            </LegendItem>
          </LegendGroup>
          <span>A1~A6 버튼을 드래그하면 확대 위치와 카메라 확대 초점이 함께 변경됩니다.</span>
        </MainPanelFooter>
      </MainInspectionPanelShell>
    </InspectionWorkspace>
  );
}
