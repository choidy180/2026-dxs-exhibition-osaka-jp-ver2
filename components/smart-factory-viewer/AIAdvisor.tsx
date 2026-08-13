'use client';

import React, { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import type { UnitData, ViewerUiMode } from '@/types/smartFactoryViewer';
import {
  AdvisorBody,
  AdvisorCard,
  AdvisorEyebrow,
  AdvisorHeader,
  AdvisorIcon,
  AdvisorMessage,
  AdvisorMeta,
  AdvisorTitle,
  BlinkingCursor,
  WaveBar,
  WaveStack,
} from '@/styles/smartFactoryViewer.styles';

interface AIAdvisorProps {
  errors: UnitData[];
  mode: ViewerUiMode;
  compact?: boolean;
}

function TypewriterMessage({
  message,
  mode,
  tone,
}: {
  message: string;
  mode: ViewerUiMode;
  tone: 'normal' | 'error';
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= message.length) return;

    const timeoutId = window.setTimeout(() => {
      setIndex((prev) => prev + 1);
    }, 28);

    return () => window.clearTimeout(timeoutId);
  }, [index, message.length]);

  return (
    <AdvisorMessage $mode={mode}>
      {message.slice(0, index)}
      <BlinkingCursor $mode={mode} $tone={tone} />
    </AdvisorMessage>
  );
}

export const AIAdvisor = React.memo(({ errors, mode, compact }: AIAdvisorProps) => {
  const target = errors[0];
  const tone = target ? 'error' as const : 'normal' as const;
  const message = target
    ? `${target.name} 이상 감지 (${target.problem}). ${target.solution ?? '담당자 확인 필요.'}`
    : '모든 시스템 정상 가동 중. 특이사항 없습니다.';

  return (
    <AdvisorCard $mode={mode} $compact={compact}>
      <AdvisorHeader $mode={mode}>
        <AdvisorIcon $mode={mode} $tone={tone}>
          <Bot size={22} />
        </AdvisorIcon>
        <AdvisorMeta>
          <AdvisorEyebrow $mode={mode}>SYSTEM ADVISOR</AdvisorEyebrow>
          <AdvisorTitle $mode={mode}>Factory AI</AdvisorTitle>
        </AdvisorMeta>
        <WaveStack>
          {[0, 0.2, 0.4, 0.1].map((delay) => (
            <WaveBar key={delay} $mode={mode} $tone={tone} $delay={delay} />
          ))}
        </WaveStack>
      </AdvisorHeader>
      <AdvisorBody $mode={mode}>
        <TypewriterMessage key={message} message={message} mode={mode} tone={tone} />
      </AdvisorBody>
    </AdvisorCard>
  );
});

AIAdvisor.displayName = 'AIAdvisor';
