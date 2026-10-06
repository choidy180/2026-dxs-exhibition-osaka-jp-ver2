import { MAX_CAMERA_COUNT } from '@/constants/material-monitoring';
import type { CameraHost } from '@/hooks/use-camera-hosts';
import { VideoGrid, VideoGridViewport } from './styles';
import CameraFrame from './CameraFrame';
import type { MaterialCameraPlayback } from '@/types/material-camera-video';

type Props = {
  hosts: CameraHost[];
  cameras: MaterialCameraPlayback[];
  onVideoEnded: (index: number, revision: number) => void;
  onVideoRetry: (index: number) => void;
  isScanning: boolean;
  onExpand: (num: number) => void;
};

export default function CameraGrid({ hosts, cameras, onVideoEnded, onVideoRetry, isScanning, onExpand }: Props) {
  return (
    <VideoGridViewport data-demo="inbound-cameras">
      <VideoGrid>
        {Array.from({ length: MAX_CAMERA_COUNT }, (_, index) => index + 1).map(num => (
          <CameraFrame
            key={num}
            num={num}
            host={hosts[num - 1] ?? undefined}
            camera={cameras[num - 1]}
            onVideoEnded={() => onVideoEnded(num - 1, cameras[num - 1].revision)}
            onVideoRetry={() => onVideoRetry(num - 1)}
            isScanning={isScanning}
            onExpand={() => onExpand(num)}
          />
        ))}
      </VideoGrid>
    </VideoGridViewport>
  );
}
