'use client';

import { useEffect, useState } from 'react';
import { Octagon, XCircle } from 'lucide-react';
import type { UnitData } from '@/types/smartFactoryViewer';
import {
  AlertBox,
  AlertConfirmButton,
  AlertDescription,
  AlertOverlay,
  AlertSub,
  AlertTitle,
  Fill,
  LoaderOverlay,
  LoadingBarContainer,
  LoadingText,
  ModalBackdrop,
  ModalBox,
  ModalButton,
  ModalText,
  ModalTitle,
  Track,
} from '@/styles/smartFactoryViewer.styles';

interface EmergencyAlertProps {
  unit: UnitData;
  onClose: () => void;
}

export function EmergencyAlert({ unit, onClose }: EmergencyAlertProps) {
  return (
    <AlertOverlay>
      <AlertBox role="alert" aria-live="assertive">
        <AlertTitle>
          <Octagon size={22} strokeWidth={2.4} />
          Emergency Hold
        </AlertTitle>

        <AlertSub>라인 긴급 정지 요망</AlertSub>

        <AlertDescription>
          <strong>{unit.name}</strong>
          초기 투입 구간에서 기준값을 벗어난 결함 데이터가 감지되었습니다.
          <span>라인 정지 후 설비 상태와 투입 조건을 확인하세요.</span>
        </AlertDescription>

        <AlertConfirmButton type="button" onClick={onClose}>
          확인 완료
        </AlertConfirmButton>
      </AlertBox>
    </AlertOverlay>
  );
}

interface TransitionLoaderProps {
  onFinished: () => void;
}

export function TransitionLoader({ onFinished }: TransitionLoaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let frameId = 0;
    const duration = 1500;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;

      const elapsed = timestamp - start;
      const nextProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(nextProgress);

      if (elapsed < duration) {
        frameId = requestAnimationFrame(animate);
        return;
      }

      window.setTimeout(onFinished, 200);
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [onFinished]);

  return (
    <LoaderOverlay>
      <LoadingBarContainer>
        <LoadingText>
          <span>요청 처리 중...</span>
          <strong>{progress.toFixed(0)}%</strong>
        </LoadingText>
        <Track>
          <Fill $progress={progress} />
        </Track>
      </LoadingBarContainer>
    </LoaderOverlay>
  );
}

interface PreparingModalProps {
  target: string | null;
  onClose: () => void;
}

export function PreparingModal({ target, onClose }: PreparingModalProps) {
  if (!target) return null;

  return (
    <ModalBackdrop>
      <ModalBox>
        <XCircle size={44} color="#be123c" />
        <ModalTitle>{target} 공정 준비 중</ModalTitle>
        <ModalText>현재 화면은 GR2 기준으로 구성되어 있습니다. 다른 공정은 추후 같은 구조로 확장하면 됩니다.</ModalText>
        <ModalButton type="button" onClick={onClose}>
          닫기
        </ModalButton>
      </ModalBox>
    </ModalBackdrop>
  );
}
