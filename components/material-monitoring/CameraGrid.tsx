import { MAX_CAMERA_COUNT } from '@/constants/material-monitoring';
import type { CameraHost } from '@/hooks/use-camera-hosts';
import { VideoGrid, VideoGridViewport } from './styles';
import CameraFrame from './CameraFrame';

type Props = {
  hosts: CameraHost[];
  isScanning: boolean;
  onExpand: (num: number) => void;
};

export default function CameraGrid({ hosts, isScanning, onExpand }: Props) {
  return (
    <VideoGridViewport>
      <VideoGrid>
        {Array.from({ length: MAX_CAMERA_COUNT }, (_, index) => index + 1).map(num => (
          <CameraFrame
            key={num}
            num={num}
            host={hosts[num - 1] ?? undefined}
            isScanning={isScanning}
            onExpand={() => onExpand(num)}
          />
        ))}
      </VideoGrid>
    </VideoGridViewport>
  );
}
