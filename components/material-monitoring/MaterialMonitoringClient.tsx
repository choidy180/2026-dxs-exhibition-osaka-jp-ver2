'use client';

import { startVisibleInterval } from '@/utils/visible-interval';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import styled from 'styled-components';
import { color, font, radius, shadow, space } from '@/styles/design-tokens';
import { Column, DashboardContainer, VideoCard } from '@/styles/styles';
import WarehouseBoard from '@/components/wearable-warehouse-board';
import { useCameraHosts } from '@/hooks/use-camera-hosts';
import { useMaterialCameraVideos } from '@/hooks/use-material-camera-videos';
import { useMaterialData } from '@/hooks/use-material-data';
import { useVehicleEntryExitData } from '@/hooks/use-vehicle-entry-exit-data';
import { useVehicleData } from '@/hooks/use-vehicle-data';
import { useVuzixLog } from '@/hooks/use-vuzix-log';
import CameraFullscreen from './CameraFullscreen';
import MaterialListModal from './MaterialListModal';
import MonitoringSection from './MonitoringSection';
import PendingListCard from './PendingListCard';
import VehicleEntryExitCard from './VehicleEntryExitCard';
import VehicleInfoCard from './VehicleInfoCard';

const MaterialPageFontScope = styled.div`
  width: 100%;
  min-height: 100vh;
  font-family: ${font.family};

  *,
  *::before,
  *::after {
    font-family: inherit !important;
  }
`;

const MaterialDashboardContainer = styled(DashboardContainer)`
  padding: ${space.xl}px;
  background: ${color.pageBg};
  gap: ${space.xl}px;
  grid-template-columns:
    clamp(280px, 17vw, 320px)
    clamp(320px, 20vw, 380px)
    minmax(0, 1fr);

  > * { min-width: 0; }

  @media (max-width: 1500px) {
    grid-template-columns: minmax(230px, 22%) minmax(270px, 25%) minmax(0, 1fr);
  }

  @media (max-width: 1200px) {
    grid-template-columns: 230px 270px minmax(0, 1fr);
  }
`;

const MaterialColumn = styled(Column)`
  min-width: 0;
  gap: ${space.xl}px;
`;

const MonitoringCard = styled(VideoCard)`
  min-width: 0;
  overflow: hidden;
  background: ${color.surface};
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.panel};
`;

export default function MaterialMonitoringClient() {
  const { hosts, isScanning, scanMessage, retry } = useCameraHosts();
  const { cameras, finishVideo, retryVideo } = useMaterialCameraVideos();
  const { vehicleInfo, vehicleError, isVehicleDataLoaded, isVehicleLoading, dwellString, fetchVehicleData } = useVehicleData();
  const {
    vehicles: entryExitVehicles,
    isVehicleEntryExitLoading,
    vehicleEntryExitError,
    fetchVehicleEntryExitData
  } = useVehicleEntryExitData();
  const {
    materialList,
    pendingList,
    inspectionLogs,
    materialStats,
    isMaterialLoading,
    materialError,
    fetchMaterialData
  } = useMaterialData();

  const [showMapBoard, setShowMapBoard] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [maximizedCam, setMaximizedCam] = useState<number | null>(null);

  // 차량/자재 데이터 새로고침
  const refreshData = useCallback(() => {
    fetchVehicleData();
    fetchVehicleEntryExitData();
    fetchMaterialData();
  }, [fetchMaterialData, fetchVehicleData, fetchVehicleEntryExitData]);

  useVuzixLog({ onDetected: refreshData });
  const maximizedHost = maximizedCam ? hosts[maximizedCam - 1] ?? undefined : undefined;

  // 최초 진입 데이터 조회
  useEffect(() => {
    refreshData();

    const timer = startVisibleInterval(fetchVehicleEntryExitData, 30_000);
    return () => timer();
  }, [fetchVehicleEntryExitData, refreshData]);

  // 전체화면 중 배경 스크롤 잠금
  useEffect(() => {
    if (maximizedCam === null) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [maximizedCam]);

  // 단축키 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (maximizedCam !== null) setMaximizedCam(null);
        else if (showListModal) setShowListModal(false);
        else if (showMapBoard) setShowMapBoard(false);
      }
      if (event.key === 'Enter') refreshData();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximizedCam, refreshData, showListModal, showMapBoard]);

  return (
    <MaterialPageFontScope>
      <LayoutGroup>
        <MaterialDashboardContainer $show>
          <MaterialColumn>
            <VehicleInfoCard
              vehicleInfo={vehicleInfo}
              isLoaded={isVehicleDataLoaded}
              isLoading={isVehicleLoading}
              dwellString={dwellString}
              error={vehicleError}
              onRetry={fetchVehicleData}
            />
            <PendingListCard
              pendingList={pendingList}
              stats={materialStats}
              isLoading={isMaterialLoading}
              error={materialError}
              onRetry={fetchMaterialData}
              onOpenList={() => window.open('/material/inbound-inspection/status', '_blank', 'noopener,noreferrer')}
            />
          </MaterialColumn>

          <MaterialColumn>
            <VehicleEntryExitCard
              vehicles={entryExitVehicles}
              isLoading={isVehicleEntryExitLoading}
              error={vehicleEntryExitError}
              onRetry={fetchVehicleEntryExitData}
            />
          </MaterialColumn>

          <MaterialColumn>
            <MonitoringCard $isFullScreen={false}>
              <MonitoringSection
                hosts={hosts}
                cameras={cameras}
                onVideoEnded={finishVideo}
                onVideoRetry={retryVideo}
                isScanning={isScanning}
                scanMessage={scanMessage}
                logs={inspectionLogs}
                isLogLoading={isMaterialLoading}
                onRetryScan={() => { retry(); cameras.forEach((_, index) => retryVideo(index)); }}
                onOpenMap={() => setShowMapBoard(true)}
                onExpandCamera={setMaximizedCam}
              />

              <AnimatePresence />
            </MonitoringCard>
          </MaterialColumn>
        </MaterialDashboardContainer>

        <AnimatePresence>
          {maximizedCam !== null && (
            <CameraFullscreen
              cameraNumber={maximizedCam}
              host={maximizedHost}
              camera={cameras[maximizedCam - 1]}
              onVideoRetry={() => retryVideo(maximizedCam - 1)}
              isScanning={isScanning}
              onClose={() => setMaximizedCam(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showListModal && <MaterialListModal onClose={() => setShowListModal(false)} data={materialList} />}
          {showMapBoard && <WarehouseBoard onClose={() => setShowMapBoard(false)} />}
        </AnimatePresence>
      </LayoutGroup>
    </MaterialPageFontScope>
  );
}
