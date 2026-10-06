'use client';

import styled from 'styled-components';
import { MAX_CAMERA_COUNT } from '@/constants/material-monitoring';
import { color, font, fontSize, motion, radius, shadow, space, tone } from '@/styles/design-tokens';
import type { CameraHost } from '@/hooks/use-camera-hosts';
import type { MaterialCameraPlayback } from '@/types/material-camera-video';
import { MATERIAL_CAMERA_RESET_MS } from '@/constants/material-camera-videos';

type StatusColor = {
  text: string;
  bg: string;
  border: string;
};

const CONNECTED_COLOR: StatusColor = {
  text: tone.success.fg,
  bg: tone.success.bg,
  border: tone.success.border
};

const CHECKING_COLOR: StatusColor = {
  text: tone.info.fg,
  bg: tone.info.bg,
  border: tone.info.border
};

const DISCONNECTED_COLOR: StatusColor = {
  text: tone.neutral.fg,
  bg: tone.neutral.bg,
  border: tone.neutral.border
};

type Props = {
  hosts: CameraHost[];
  cameras: MaterialCameraPlayback[];
  isScanning: boolean;
};

export default function CameraRpaStepList({ hosts, cameras, isScanning }: Props) {
  return (
    <RpaStepGrid>
      {Array.from({ length: MAX_CAMERA_COUNT }, (_, index) => {
        const cameraNumber = index + 1;
        const host = hosts[index];
        const isConnected = Boolean(host);
        const isChecking = !isConnected && isScanning;
        const camera = cameras[index];
        const isResetting = camera.resetUntil !== null;
        const statusText = isResetting ? '초기화 중' : isConnected ? '연결됨' : isChecking ? '확인 중' : '연결 안 됨';
        const detailText = isResetting ? '카메라 초기화 중' : host
          ? '영상 재생 중'
          : isChecking
            ? '카메라 신호 확인 중'
            : '카메라 신호 없음';
        const statusColor = isResetting ? CHECKING_COLOR : isConnected
          ? CONNECTED_COLOR
          : isChecking
            ? CHECKING_COLOR
            : DISCONNECTED_COLOR;
        const progress = isResetting ? (1 - camera.remainingSeconds / (MATERIAL_CAMERA_RESET_MS / 1000)) * 100 : isConnected ? 100 : isChecking ? 45 : 0;

        return (
          <RpaStepCard
            key={cameraNumber}
            $statusColor={statusColor}
            aria-label={`CAM ${String(cameraNumber).padStart(2, '0')} ${statusText}`}
          >
            <div className="card-head">
              <strong>CAM {String(cameraNumber).padStart(2, '0')}</strong>
              <span>{statusText}</span>
            </div>

            <div className="step-title">{detailText}</div>

            <div className="progress">
              <b style={{ width: `${progress}%` }} />
            </div>
          </RpaStepCard>
        );
      })}
    </RpaStepGrid>
  );
}

const RpaStepGrid = styled.div`
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: ${space.md}px;
  margin-bottom: ${space.md}px;
  font-family: ${font.family};

  @media (max-width: 1500px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const RpaStepCard = styled.article<{ $statusColor: StatusColor }>`
  min-height: 88px;
  min-width: 0;
  padding: ${space.lg}px ${space.md}px;
  background: ${color.surface};
  border: 1px solid ${props => props.$statusColor.border};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.raised};

  .card-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: ${space.xs}px;
    margin-bottom: ${space.md}px;
  }

  .card-head strong {
    color: ${color.ink};
    font-size: ${fontSize.bodySm};
    font-weight: 600;
    white-space: nowrap;
  }

  .card-head span {
    color: ${props => props.$statusColor.text};
    background: ${props => props.$statusColor.bg};
    border: 1px solid ${props => props.$statusColor.border};
    border-radius: ${radius.control}px;
    padding: ${space.xs}px ${space.sm}px;
    font-size: ${fontSize.caption};
    font-weight: 600;
    white-space: nowrap;
  }

  .step-title {
    overflow: hidden;
    margin-bottom: ${space.md}px;
    color: ${color.ink2};
    font-size: ${fontSize.meta};
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
    letter-spacing: -0.02em;
  }

  .progress {
    overflow: hidden;
    height: 5px;
    background: ${color.fill};
    border-radius: ${radius.bar}px;
  }

  .progress b {
    display: block;
    height: 100%;
    background: ${props => props.$statusColor.text};
    border-radius: inherit;
    transition: width ${motion.value};
  }
`;
