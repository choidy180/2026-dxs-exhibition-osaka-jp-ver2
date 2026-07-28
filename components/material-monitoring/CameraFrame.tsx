import React from 'react';
import { Maximize2, Video } from 'lucide-react';
import { PORT } from '@/constants/material-monitoring';
import { CamBox } from './styles';

type Props = {
  num: number;
  host?: string;
  isScanning: boolean;
  onExpand: () => void;
};

function CameraFrame({ num, host, isScanning, onExpand }: Props) {
  const isLive = Boolean(host);

  return (
    <CamBox>
      <div className="cam-title">
        <span className={isLive ? 'live-dot' : 'wait-dot'} />
        자재검수 CAM {String(num).padStart(2, '0')}
      </div>

      {isLive ? (
        <iframe src={`http://${host}:${PORT}/`} title={`Material inspection camera ${num}`} allow="fullscreen" />
      ) : (
        <div className="empty-state">
          <Video size={42} opacity={0.18} />
          <span>{isScanning ? '카메라 확인 중' : '카메라 연결 대기'}</span>
        </div>
      )}

      <button className="fullscreen-btn" onClick={onExpand} title="전체화면 확대">
        <Maximize2 size={17} />
      </button>
    </CamBox>
  );
}

export default React.memo(CameraFrame);
