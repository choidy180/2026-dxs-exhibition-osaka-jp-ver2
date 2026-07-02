import { RefreshCw } from 'lucide-react';
import { PinkButton } from '@/styles/styles';
import { CameraStage, MonitorShell, VideoHeader } from './styles';
import CameraGrid from './CameraGrid';
import { MaterialListItem } from '@/types/material-monitoring';
import CameraRpaStepList from './CameraRpaStepList';

type Props = {
  hosts: string[];
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
  isScanning,
  scanMessage,
  logs,
  isLogLoading,
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
          <PinkButton onClick={onOpenMap} style={{ background: '#0f172a', borderRadius: 10, padding: '8px 16px', fontWeight: 600 }}>
            D동 현황 &gt;
          </PinkButton>
        </div>
      </VideoHeader>
      <MonitorShell>
        <CameraStage>
          <CameraRpaStepList />
          <CameraGrid hosts={hosts} isScanning={isScanning} onExpand={onExpandCamera} />
        </CameraStage>
      </MonitorShell>
    </>
  );
}
