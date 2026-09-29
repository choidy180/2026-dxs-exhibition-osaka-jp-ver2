'use client';

import { AlertCircle, Loader2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { color, focusRing, font, fontSize, radius, space } from '@/styles/design-tokens';

export default function InspectionDataState({ isLoading, error, onRetry }: {
  isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  return <Panel role="status">
    {isLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 size={28} /></motion.div>
      : error ? <AlertCircle size={28} /> : <Search size={28} />}
    <strong>{isLoading ? '데이터 조회 중...' : error ? '데이터를 불러오지 못했습니다.' : '검사 데이터가 없습니다.'}</strong>
    {!isLoading && <button type="button" onClick={onRetry}>다시 시도</button>}
  </Panel>;
}

const Panel = styled.div`
  flex: 1; min-height: 200px; width: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: ${space.xl}px;
  background: ${color.surfaceSubtle}; color: ${color.ink3};
  border: 1px dashed ${color.borderStrong}; border-radius: ${radius.card}px;
  font-family: ${font.family}; font-size: ${fontSize.body};
  strong { font-weight: 600; }
  button { cursor: pointer; padding: ${space.md}px ${space.xl}px; font: inherit;
    color: ${color.ink2}; background: ${color.surface}; border: 1px solid ${color.border};
    border-radius: ${radius.control}px; &:focus-visible { outline: ${focusRing}; outline-offset: 3px; } }
`;
