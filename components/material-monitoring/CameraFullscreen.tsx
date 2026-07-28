import { motion } from 'framer-motion';
import { Minimize2, Video } from 'lucide-react';
import { PORT } from '@/constants/material-monitoring';
import { CameraFullscreenOverlay } from './styles';

type Props = {
  cameraNumber: number;
  host?: string;
  isScanning: boolean;
  onClose: () => void;
};

export default function CameraFullscreen({ cameraNumber, host, isScanning, onClose }: Props) {
  const cameraLabel = `CAM ${String(cameraNumber).padStart(2, '0')}`;
  const isLive = Boolean(host);
  const statusText = isLive ? 'LIVE' : isScanning ? '확인 중' : '대기';

  return (
    <CameraFullscreenOverlay
      key="camera-fullscreen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <motion.div
        className="fullscreen-stage"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
      >
        <div className="fullscreen-camera-surface">
          {/* 카메라 스트림 영역 */}
          {isLive ? (
            <iframe
              src={`http://${host}:${PORT}/`}
              title={`Material inspection camera ${cameraNumber} fullscreen`}
              allow="fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Video size={44} />
              </div>
              <strong>{isScanning ? '카메라 확인 중' : '카메라 연결 대기'}</strong>
              <span>{cameraLabel} 스트림을 준비하고 있습니다.</span>
            </div>
          )}

          {/* 화면 내부 컨트롤 */}
          <div className="camera-overlay">
            <div className="camera-meta">
              <span className="camera-badge">{cameraLabel}</span>
              <strong>자재검수 실시간 모니터링</strong>
              <span className={`status-chip ${isLive ? 'live' : ''}`}>{statusText}</span>
              <span className="stream-info">{host ? `${host}:${PORT}` : '연결 대기'}</span>
            </div>

            <button type="button" className="close-fullscreen" onClick={onClose} aria-label="확대 화면 닫기">
              <Minimize2 size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </CameraFullscreenOverlay>
  );
}
