'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Clock3, Loader2, Square } from 'lucide-react';
import styled from 'styled-components';
import { ADVISOR_WAIT_STEPS, formatAdvisorElapsed, getAdvisorWaitProfile, getAdvisorWaitStage } from '@/utils/ai-advisor-progress';
import { color, controlHeight, focusRing, fontSize, fontWeight, motion as motionToken, motionDuration, radius, shadow, space, tone } from '@/styles/design-tokens';

interface AdvisorWaitingCardProps {
  startedAt: number;
  durationSamplesMs: readonly number[];
  onCancel: () => void;
}

export default function AdvisorWaitingCard({ startedAt, durationSamplesMs, onCancel }: AdvisorWaitingCardProps) {
  const [now, setNow] = useState(() => performance.now());
  const reduceMotion = useReducedMotion();
  const profile = useMemo(() => getAdvisorWaitProfile(durationSamplesMs), [durationSamplesMs]);
  const elapsedMs = Math.max(0, now - startedAt);
  const activeStep = getAdvisorWaitStage(elapsedMs, profile.thresholdsMs);
  const isSlow = elapsedMs >= profile.slowAfterMs;
  const isLongWait = elapsedMs >= profile.longWaitAfterMs;
  const [lower, upper] = [profile.lowerSeconds, profile.upperSeconds].map(value => value.toLocaleString('ko-KR'));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(performance.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Card aria-label="답변 대기 안내">
      <Heading>
        <div>
          <Title>데이터를 분석하고 있습니다</Title>
          <Estimate>최근 응답 기준 약 {lower}~{upper}초</Estimate>
        </div>
        <Elapsed aria-live="off" aria-label={`대기 시간 ${Math.floor(elapsedMs / 1000).toLocaleString('ko-KR')}초`}>
          <Clock3 size={13} aria-hidden="true" />{formatAdvisorElapsed(elapsedMs)}
        </Elapsed>
      </Heading>
      <StageCaption>예상 진행 단계</StageCaption>
      <StepList aria-label="예상 처리 흐름">
        {ADVISOR_WAIT_STEPS.map((step, index) => {
          const active = index === activeStep;
          const passed = index < activeStep;
          return (
            <StepRow key={step.label} $active={active} $passed={passed} aria-current={active ? 'step' : undefined} aria-label={`${step.label}, ${active ? '현재 예상 단계' : passed ? '지난 예상 단계' : '대기'}`}>
              <DotSlot aria-hidden="true">
                {active && <Pulse animate={reduceMotion ? undefined : { opacity: [0.65, 0.15, 0.65], scale: [1, 1.35, 1] }} transition={{ duration: motionDuration.spin * 2, repeat: Infinity, ease: 'easeInOut' }} />}
                <Dot $active={active} $passed={passed}>{passed ? <Check size={12} strokeWidth={2.5} /> : active && <motion.span animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: motionDuration.spin * 2, repeat: Infinity, ease: 'linear' }}><Loader2 size={12} /></motion.span>}</Dot>
              </DotSlot>
              <span>{step.label}{active ? ' 중' : ''}</span>
            </StepRow>
          );
        })}
      </StepList>
      <Feedback role="status" aria-live="polite" aria-atomic="true" $slow={isSlow}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={isLongWait ? 'long' : isSlow ? 'slow' : activeStep} initial={{ opacity: reduceMotion ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: reduceMotion ? 1 : 0 }} transition={{ duration: reduceMotion ? 0 : motionDuration.fast }}>
            {isLongWait ? '응답이 많이 늦어지고 있습니다. 계속 기다리거나 요청을 취소할 수 있습니다.' : isSlow ? '평소보다 시간이 걸리고 있습니다. 응답이 도착하면 바로 보여드릴게요.' : activeStep === 0 ? '질문을 보냈습니다. 잠시만 기다려 주세요.' : activeStep === 1 ? '질문에 맞는 답변을 준비하고 있습니다.' : activeStep === 2 ? '답변과 표가 준비되면 한 번에 보여드릴게요.' : '답변을 기다리고 있습니다. 이 창을 닫아도 기다림은 계속됩니다.'}
          </motion.span>
        </AnimatePresence>
      </Feedback>
      <Footer>
        <small>응답 시간을 바탕으로 한 예상 안내입니다.</small>
        <CancelButton type="button" onClick={onCancel}><Square size={12} aria-hidden="true" />요청 취소</CancelButton>
      </Footer>
    </Card>
  );
}

const Card = styled.section`
  width: min(420px, 100%);
  min-width: 0;
  margin-bottom: ${space.xxxl}px;
  padding: ${space.xxxl}px;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.card};
`;

const Heading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${space.md}px;
`;
const Title = styled.h3`
  margin: 0;
  color: ${color.ink2};
  font-size: ${fontSize.body};
  font-weight: ${fontWeight.semibold};
  line-height: 1.5;
`;
const Estimate = styled.p`
  margin: ${space.xs}px 0 0;
  color: ${color.ink3};
  font-size: ${fontSize.caption};
  line-height: 1.5;
`;
const Elapsed = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: ${space.xs}px;
  padding: ${space.xs}px ${space.sm}px;
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.row}px;
  background: ${color.surfaceSubtle};
  color: ${color.ink3};
  font-size: ${fontSize.caption};
  font-variant-numeric: tabular-nums;
`;
const StageCaption = styled.div`
  margin-top: ${space.xxxl}px;
  margin-bottom: ${space.sm}px;
  color: ${color.ink3};
  font-size: ${fontSize.caption};
`;
const StepList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${space.xs}px;
`;
const StepRow = styled.li<{ $active: boolean; $passed: boolean }>`
  width: 100%;
  min-height: ${controlHeight.sm}px;
  padding: ${space.sm}px ${space.md}px;
  display: flex;
  align-items: center;
  gap: ${space.md}px;
  border: 1px solid ${({ $active }) => $active ? color.brandBorder : 'transparent'};
  border-radius: ${radius.row}px;
  background: ${({ $active }) => $active ? color.brandSoft : 'transparent'};
  color: ${({ $active, $passed }) => $active ? color.brand : $passed ? color.ink3 : color.ink4};
  font-size: ${fontSize.meta};
  font-weight: ${({ $active }) => $active ? fontWeight.semibold : fontWeight.regular};
  text-align: left;
  transition: background ${motionToken.state}, border-color ${motionToken.state}, color ${motionToken.state};
  > span:nth-child(2) { flex: 1; }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
const DotSlot = styled.span`
  position: relative;
  width: ${space.xxxl}px;
  height: ${space.xxxl}px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
`;
const Pulse = styled(motion.span)`
  position: absolute;
  inset: 0;
  border: 1px solid ${color.brandBorder};
  border-radius: ${radius.pill}px;
  background: ${color.brandBorder};
`;
const Dot = styled.span<{ $active: boolean; $passed: boolean }>`
  position: relative;
  display: grid;
  place-items: center;
  width: ${space.xxxl}px;
  height: ${space.xxxl}px;
  border-radius: ${radius.pill}px;
  border: 1px solid ${({ $active, $passed }) => $active ? color.brand : $passed ? tone.success.border : color.border};
  background: ${({ $active, $passed }) => $active ? color.brand : $passed ? tone.success.bg : color.surface};
  color: ${({ $passed }) => $passed ? tone.success.fg : color.surface};
  > span { display: grid; place-items: center; }
`;
const Feedback = styled.div<{ $slow: boolean }>`
  min-height: ${controlHeight.lg}px;
  display: flex;
  align-items: center;
  margin-top: ${space.xl}px;
  padding: ${space.md}px ${space.lg}px;
  border: 1px solid ${({ $slow }) => $slow ? tone.warning.border : color.borderSoft};
  border-radius: ${radius.row}px;
  background: ${({ $slow }) => $slow ? tone.warning.bg : color.surfaceSubtle};
  color: ${({ $slow }) => $slow ? tone.warning.fg : color.ink3};
  font-size: ${fontSize.caption};
  line-height: 1.6;
`;
const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${space.md}px;
  margin-top: ${space.lg}px;
  small { color: ${color.ink3}; font-size: ${fontSize.caption}; line-height: 1.5; }
`;
const CancelButton = styled.button`
  min-height: ${controlHeight.sm}px;
  padding: ${space.xs}px ${space.md}px;
  display: inline-flex;
  align-items: center;
  gap: ${space.sm}px;
  background: ${color.surface};
  color: ${color.ink3};
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  font-size: ${fontSize.caption};
  cursor: pointer;
  transition: background ${motionToken.hover}, border-color ${motionToken.hover};
  &:hover { background: ${color.surfaceSubtle}; border-color: ${color.borderStrong}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
`;
