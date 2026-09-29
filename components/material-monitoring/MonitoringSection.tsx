import { RefreshCw } from 'lucide-react';
import styled from 'styled-components';
import { PinkButton } from '@/styles/styles';
import { CameraStage, MonitorShell, VideoHeader } from './styles';
import CameraGrid from './CameraGrid';
import type { CameraHost } from '@/hooks/use-camera-hosts';
import { MaterialListItem } from '@/types/material-monitoring';
import CameraRpaStepList from './CameraRpaStepList';
import type { MaterialCameraPlayback } from '@/types/material-camera-video';
import { color, radius, space } from '@/styles/design-tokens';

type Props = {
  hosts: CameraHost[];
  cameras: MaterialCameraPlayback[];
  onVideoEnded: (index: number, revision: number) => void;
  onVideoRetry: (index: number) => void;
  isScanning: boolean;
  scanMessage: string;
  logs: MaterialListItem[];
  isLogLoading: boolean;
  onRetryScan: () => void;
  onOpenMap: () => void;
  onExpandCamera: (num: number) => void;
};

export default function MonitoringSection({
  hosts,
  cameras,
  onVideoEnded,
  onVideoRetry,
  isScanning,
  onRetryScan,
  onOpenMap,
  onExpandCamera
}: Props) {
  return (
    <>
      <VideoHeader>
        <div className="title-area">
          {/* <span className="eyebrow"><Signal size={14} /> MATERIAL INSPECTION</span> */}
          <h3>자재검수 실시간 모니터링</h3>
          {/* <p>{scanMessage || `카메라 ${hosts.length}/${MAX_CAMERA_COUNT} 연결 · 검수 로그 ${logs.length}건`}</p> */}
        </div>
        <div className="header-actions">
          <button className="soft-btn" onClick={onRetryScan} disabled={isScanning}>
            <RefreshCw size={15} /> 재연결
          </button>
          <WarehouseButton onClick={onOpenMap}>
            D동 현황 &gt;
          </WarehouseButton>
        </div>
      </VideoHeader>
      <MonitorShell>
        <CameraStage>
          <CameraRpaStepList hosts={hosts} cameras={cameras} isScanning={isScanning} />
          <CameraGrid hosts={hosts} cameras={cameras} onVideoEnded={onVideoEnded} onVideoRetry={onVideoRetry} isScanning={isScanning} onExpand={onExpandCamera} />
        </CameraStage>
      </MonitorShell>
    </>
  );
}

const WarehouseButton = styled(PinkButton)`
  background: ${color.ink};
  border-radius: ${radius.control}px;
  padding: ${space.md}px ${space.xxxl}px;
  font-weight: 600;
`;
