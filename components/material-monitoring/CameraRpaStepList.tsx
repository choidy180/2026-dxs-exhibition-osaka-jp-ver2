'use client';

import styled from 'styled-components';
import { MAX_CAMERA_COUNT, PORT } from '@/constants/material-monitoring';
import type { CameraHost } from '@/hooks/use-camera-hosts';

type StatusColor = {
  text: string;
  bg: string;
  border: string;
};

const CONNECTED_COLOR: StatusColor = {
  text: '#15803d',
  bg: 'rgba(21, 128, 61, 0.08)',
  border: 'rgba(21, 128, 61, 0.28)'
};

const CHECKING_COLOR: StatusColor = {
  text: '#2563eb',
  bg: 'rgba(37, 99, 235, 0.08)',
  border: 'rgba(37, 99, 235, 0.25)'
};

const DISCONNECTED_COLOR: StatusColor = {
  text: '#64748b',
  bg: '#f1f5f9',
  border: '#e2e8f0'
};

type Props = {
  hosts: CameraHost[];
  isScanning: boolean;
};

export default function CameraRpaStepList({ hosts, isScanning }: Props) {
  return (
    <RpaStepGrid>
      {Array.from({ length: MAX_CAMERA_COUNT }, (_, index) => {
        const cameraNumber = index + 1;
        const host = hosts[index];
        const isConnected = Boolean(host);
        const isChecking = !isConnected && isScanning;
        const statusText = isConnected ? '연결됨' : isChecking ? '확인 중' : '연결 안 됨';
        const detailText = host
          ? `${host}:${PORT}`
          : isChecking
            ? '카메라 신호 확인 중'
            : '카메라 신호 없음';
        const statusColor = isConnected
          ? CONNECTED_COLOR
          : isChecking
            ? CHECKING_COLOR
            : DISCONNECTED_COLOR;
        const progress = isConnected ? 100 : isChecking ? 45 : 0;

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
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
  font-family: 'Pretendard', system-ui, -apple-system, sans-serif;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const RpaStepCard = styled.article<{ $statusColor: StatusColor }>`
  min-height: 88px;
  padding: 11px 12px;
  background: #fff;
  border: 1px solid ${props => props.$statusColor.border};
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .card-head strong {
    color: #0f172a;
    font-size: 0.86rem;
    font-weight: 600;
  }

  .card-head span {
    color: ${props => props.$statusColor.text};
    background: ${props => props.$statusColor.bg};
    border: 1px solid ${props => props.$statusColor.border};
    border-radius: 10px;
    padding: 4px 8px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .step-title {
    overflow: hidden;
    margin-bottom: 9px;
    color: #334155;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
    letter-spacing: -0.02em;
  }

  .progress {
    overflow: hidden;
    height: 5px;
    background: #f1f5f9;
    border-radius: 8px;
  }

  .progress b {
    display: block;
    height: 100%;
    background: ${props => props.$statusColor.text};
    border-radius: inherit;
    transition: width 0.35s ease;
  }
`;
