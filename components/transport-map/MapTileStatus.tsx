'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CircleAlert, Loader2, MapPinOff, RotateCcw } from 'lucide-react';
import styled from 'styled-components';
import { color, controlHeight, focusRing, font, fontSize, fontWeight, gridLayer, motionDuration, radius, shadow, space, tone } from '@/styles/design-tokens';

export type MapLoadStatus = 'loading' | 'ready' | 'error' | 'empty';

export default function MapTileStatus({ status, onRetry }: { status: MapLoadStatus; onRetry: () => void }) {
  const reduceMotion = useReducedMotion();
  if (status === 'ready') return null;
  return <Notice $error={status === 'error'} role={status === 'error' ? 'alert' : 'status'}>
    {status === 'loading'
      ? <motion.span aria-hidden="true" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: motionDuration.spin, repeat: Infinity, ease: 'linear' }}><Loader2 size={16} /></motion.span>
      : status === 'error' ? <CircleAlert size={16} aria-hidden="true" /> : <MapPinOff size={16} aria-hidden="true" />}
    <span>{status === 'loading' ? '배경지도를 불러오고 있습니다.' : status === 'error' ? '배경지도를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.' : '표시할 배경지도가 없습니다.'}</span>
    {status !== 'loading' && <Retry type="button" onClick={onRetry}><RotateCcw size={14} aria-hidden="true" />지도 재시도</Retry>}
  </Notice>;
}

const Notice = styled.div<{ $error: boolean }>`
  position: absolute;
  right: ${space.xl}px;
  bottom: ${controlHeight.lg}px;
  z-index: ${gridLayer.corner};
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${space.md}px;
  width: max-content;
  max-width: min(340px, calc(100% - ${space.xl * 2}px));
  padding: ${space.lg}px ${space.xl}px;
  border: 1px solid ${({ $error }) => $error ? tone.warning.border : color.border};
  border-radius: ${radius.control}px;
  background: ${({ $error }) => $error ? tone.warning.bg : color.surface};
  color: ${({ $error }) => $error ? tone.warning.fg : color.ink3};
  box-shadow: ${shadow.card};
  font-family: ${font.family};
  font-size: ${fontSize.caption};
  line-height: 1.5;
  box-sizing: border-box;
  > span:first-child { display: inline-flex; }
  > span:nth-child(2) { flex: 1; min-width: 160px; }
  > svg { flex-shrink: 0; }
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
  &:hover { background: ${color.surfaceSubtle}; border-color: ${color.borderStrong}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
`;
