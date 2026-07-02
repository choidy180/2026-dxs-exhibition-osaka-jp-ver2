'use client';

import { useEffect, useState } from 'react';
import styled from 'styled-components';

const CAMERA_COUNT = 6;

const RPA_STEPS = [
  '이미지 수집',
  '자재 인식',
  '송장 매칭',
  '수량 검증',
  '결과 전송'
];

type StepColor = {
  text: string;
  bg: string;
  border: string;
};

const DEFAULT_STEP_COLOR: StepColor = {
  text: '#64748b',
  bg: '#f1f5f9',
  border: '#e2e8f0'
};

const RPA_STEP_COLORS: StepColor[] = [
  {
    text: '#15803d',
    bg: 'rgba(21, 128, 61, 0.08)',
    border: 'rgba(21, 128, 61, 0.28)'
  },
  {
    text: '#65a30d',
    bg: 'rgba(101, 163, 13, 0.08)',
    border: 'rgba(101, 163, 13, 0.28)'
  },
  {
    text: '#ca8a04',
    bg: 'rgba(202, 138, 4, 0.1)',
    border: 'rgba(202, 138, 4, 0.32)'
  },
  {
    text: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.09)',
    border: 'rgba(234, 88, 12, 0.3)'
  },
  {
    text: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.09)',
    border: 'rgba(220, 38, 38, 0.32)'
  }
];
type Props = {
  intervalMs?: number;
};

export default function CameraRpaStepList({ intervalMs = 5000 }: Props) {
  const [tick, setTick] = useState(0);

  // 더미 RPA 진행 상태 갱신
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick(prev => prev + 1);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return (
    <RpaStepGrid>
      {Array.from({ length: CAMERA_COUNT }, (_, index) => {
        const cameraNumber = index + 1;
        const stepIndex = (tick + index) % RPA_STEPS.length;
        const stepName = RPA_STEPS[stepIndex] ?? '';
        const stepColor = RPA_STEP_COLORS[stepIndex] ?? DEFAULT_STEP_COLOR;
        const progress = ((stepIndex + 1) / RPA_STEPS.length) * 100;
        const isDone = stepIndex === RPA_STEPS.length - 1;

        return (
          <RpaStepCard key={cameraNumber} $stepColor={stepColor}>
            <div className="card-head">
              <strong>CAM {String(cameraNumber).padStart(2, '0')}</strong>
              <span>{isDone ? '완료' : '진행중'}</span>
            </div>

            <div className="step-title">
              STEP {stepIndex + 1}. {stepName}
            </div>

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

const RpaStepCard = styled.article<{ $stepColor: StepColor }>`
  min-height: 88px;
  padding: 11px 12px;
  background: #fff;
  border: 1px solid ${props => props.$stepColor.border};
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
    color: ${props => props.$stepColor.text};
    background: ${props => props.$stepColor.bg};
    border: 1px solid ${props => props.$stepColor.border};
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
    background: ${props => props.$stepColor.text};
    border-radius: inherit;
    transition: width 0.35s ease;
  }
`;