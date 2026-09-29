import React from 'react';
import { Maximize2, Video } from 'lucide-react';
import type { MaterialCameraPlayback } from '@/types/material-camera-video';
import MaterialCameraVideo from './MaterialCameraVideo';
import { CamBox } from './styles';

type Props = {
  num: number;
  host?: string;
  camera: MaterialCameraPlayback;
  onVideoEnded: () => void;
  onVideoRetry: () => void;
  isScanning: boolean;
  onExpand: () => void;
};

function CameraFrame({ num, host, camera, onVideoEnded, onVideoRetry, isScanning, onExpand }: Props) {
  const isLive = Boolean(host);

  return (
    <CamBox>
      <div className="cam-title">
        <span className={isLive && camera.resetUntil === null ? 'live-dot' : 'wait-dot'} />
        자재검수 CAM {String(num).padStart(2, '0')}
      </div>

      {isLive ? (
        <MaterialCameraVideo camera={camera} label={`자재검수 카메라 ${num}`} onEnded={onVideoEnded} onRetry={onVideoRetry} />
      ) : (
        <div className="empty-state">
          <Video size={42} opacity={0.18} />
          <span>{isScanning ? '카메라 확인 중' : '카메라 연결 대기'}</span>
        </div>
      )}

      <button className="fullscreen-btn" onClick={onExpand} title="전체화면 확대" aria-label={`CAM ${num} 전체화면 확대`}>
        <Maximize2 size={17} />
      </button>
    </CamBox>
  );
}

export default React.memo(CameraFrame);
