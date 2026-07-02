'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { Column, DashboardContainer, VideoCard } from '@/styles/styles';
import AIDashboardModal from '@/components/ai-dashboard-modal';
import WarehouseBoard from '@/components/wearable-warehouse-board';
import { PORT } from '@/constants/material-monitoring';
import { useCameraHosts } from '@/hooks/use-camera-hosts';
import { useMaterialData } from '@/hooks/use-material-data';
import { useVehicleData } from '@/hooks/use-vehicle-data';
import { useVuzixLog } from '@/hooks/use-vuzix-log';
import CameraFullscreen from './CameraFullscreen';
import MaterialListModal from './MaterialListModal';
import MonitoringSection from './MonitoringSection';
import PendingListCard from './PendingListCard';
import VehicleInfoCard from './VehicleInfoCard';

export default function MaterialMonitoringClient() {
  const { hosts, connectedIp, isScanning, scanMessage, retry } = useCameraHosts();
  const { vehicleInfo, isVehicleDataLoaded, isVehicleLoading, dwellString, fetchVehicleData } = useVehicleData();
  const {
    materialList,
    pendingList,
    inspectionLogs,
    materialStats,
    isMaterialLoading,
    materialError,
    fetchMaterialData
  } = useMaterialData();

  const [showDashboard, setShowDashboard] = useState(false);
  const [showMapBoard, setShowMapBoard] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [maximizedCam, setMaximizedCam] = useState<number | null>(null);

  // 차량/자재 데이터 새로고침
  const refreshData = useCallback(() => {
    fetchVehicleData();
    fetchMaterialData();
    setShowDashboard(true);
  }, [fetchMaterialData, fetchVehicleData]);

  const scannedInvoiceData = useVuzixLog({ onDetected: refreshData });
  const maximizedHost = maximizedCam ? hosts[maximizedCam - 1] : undefined;

  // 최초 진입 데이터 조회
  useEffect(() => {
    refreshData();
  }, [refreshData]);

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
        else if (showDashboard) setShowDashboard(false);
      }
      if (event.key === 'Enter') refreshData();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximizedCam, refreshData, showDashboard, showListModal, showMapBoard]);

  return (
    <LayoutGroup>
      <DashboardContainer $show style={{ padding: 12, background: '#f8fafc', gap: 12, gridTemplateColumns: '320px 1fr', fontFamily: "'Pretendard', system-ui, -apple-system, sans-serif" }}>
        <Column style={{ flex: '0 0 340px', gap: 12 }}>
          <VehicleInfoCard
            vehicleInfo={vehicleInfo}
            isLoaded={isVehicleDataLoaded}
            isLoading={isVehicleLoading}
            dwellString={dwellString}
          />
          <PendingListCard
            pendingList={pendingList}
            stats={materialStats}
            isLoading={isMaterialLoading}
            error={materialError}
            onRetry={fetchMaterialData}
            onOpenList={() => window.open('/material/inbound-inspection/status', '_blank', 'noopener,noreferrer')}
          />
        </Column>

        <Column style={{ flex: 1 }}>
          <VideoCard $isFullScreen={false} style={{ overflow: 'hidden', background: '#fff', border: '1px solid #edf2f7', borderRadius: 12, boxShadow: '0 8px 24px rgba(15, 23, 42, .06)' }}>
            <MonitoringSection
              hosts={hosts}
              isScanning={isScanning}
              scanMessage={scanMessage}
              logs={inspectionLogs}
              isLogLoading={isMaterialLoading}
              onRetryScan={retry}
              onOpenMap={() => setShowMapBoard(true)}
              onExpandCamera={setMaximizedCam}
            />

            <AnimatePresence>
              {/* {showDashboard && (
                <AIDashboardModal
                  onClose={() => setShowDashboard(false)}
                  streamUrl={connectedIp ? `http://${connectedIp}:${PORT}/` : ''}
                  streamStatus={connectedIp ? 'ok' : 'error'}
                  externalData={scannedInvoiceData}
                />
              )} */}
            </AnimatePresence>
          </VideoCard>
        </Column>
      </DashboardContainer>

      <AnimatePresence>
        {maximizedCam !== null && (
          <CameraFullscreen
            cameraNumber={maximizedCam}
            host={maximizedHost}
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
  );
}
