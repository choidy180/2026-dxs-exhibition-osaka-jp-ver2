'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CircleAlert, Loader2, RotateCcw, Truck } from 'lucide-react';
import styled from 'styled-components';
import type { MapLoadStatus } from '@/components/transport-map/MapTileStatus';
import {
  color, controlHeight, focusRing, font, fontSize, fontWeight, gridLayer,
  motion as transition, motionDuration, radius, shadow, space, tone,
} from '@/styles/design-tokens';

export default function TruckModelStatus({ status, onRetry }: { status: MapLoadStatus; onRetry: () => void }) {
  const reduceMotion = useReducedMotion();
  if (status === 'ready') return null;

  return (
    <Notice $status={status} role={status === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true">
        {status === 'loading' ? (
          <motion.span animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: motionDuration.spin, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={16} />
          </motion.span>
        ) : status === 'error' ? <CircleAlert size={16} /> : <Truck size={16} />}
      </Icon>
      <Copy>
        <strong>{status === 'loading' ? '차량 모델을 불러오고 있습니다.' : status === 'error' ? '차량 모델을 불러오지 못했습니다.' : '표시할 차량 모델이 없습니다.'}</strong>
        <span>간소화된 트럭을 표시하고 있습니다.</span>
      </Copy>
      {status !== 'loading' && <Retry type="button" onClick={onRetry}><RotateCcw size={14} aria-hidden="true" />모델 재시도</Retry>}
    </Notice>
  );
}

const Notice = styled.div<{ $status: Exclude<MapLoadStatus, 'ready'> }>`
  position: absolute;
  left: ${space.xl}px;
  bottom: ${space.huge * 4}px;
  z-index: ${gridLayer.corner};
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${space.md}px;
  width: max-content;
  max-width: min(360px, calc(100% - ${space.xl * 2}px));
  box-sizing: border-box;
  padding: ${space.lg}px ${space.xl}px;
  border: 1px ${({ $status }) => $status === 'empty' ? 'dashed' : 'solid'} ${({ $status }) => $status === 'error' ? tone.warning.border : color.borderStrong};
  border-radius: ${radius.control}px;
  background: ${({ $status }) => $status === 'error' ? tone.warning.bg : color.surface};
  color: ${color.ink2};
  box-shadow: ${shadow.card};
  font-family: ${font.family};
  font-size: ${fontSize.caption};
  line-height: 1.5;
  pointer-events: auto;
  *, *::before, *::after { font-family: inherit; }
`;

const Icon = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  color: ${color.ink3};
  > span { display: inline-flex; }
`;

const Copy = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 160px;
  strong { font-weight: ${fontWeight.medium}; }
  > span { color: ${color.ink3}; }
`;

const Retry = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${space.sm}px;
  min-height: ${controlHeight.sm}px;
  padding: ${space.xs}px ${space.md}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.row}px;
  background: ${color.surface};
  color: ${color.ink2};
  font-family: inherit;
  font-size: inherit;
  font-weight: ${fontWeight.medium};
  cursor: pointer;
  transition: background ${transition.hover}, border-color ${transition.hover};
  &:hover { background: ${color.surfaceSubtle}; border-color: ${color.borderStrong}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
`;
