'use client';

import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import styled from 'styled-components';
import { color, focusRing, fontSize, radius, space } from '@/styles/design-tokens';
import { DEMO_CAMERA_VIDEO, DEMO_FACTORY_IMAGE } from '@/data/exhibition-inspection';

export default function LocalCameraVideo({ label, controls = false }: { label: string; controls?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const retry = () => { setStatus('loading'); setAttempt(value => value + 1); };
  return <Frame>
    <video key={attempt} src={DEMO_CAMERA_VIDEO} poster={DEMO_FACTORY_IMAGE}
      autoPlay loop muted playsInline controls={controls} aria-label={label}
      onCanPlay={() => setStatus('ready')} onError={() => setStatus('error')} />
    {status !== 'ready' && <State role="status">
      {status === 'error' ? <AlertCircle size={22} /> : <Loader2 size={22} />}
      <span>{status === 'error' ? '영상을 불러오지 못했습니다.' : '영상 준비 중...'}</span>
      {status === 'error' && <button type="button" onClick={retry}>다시 시도</button>}
    </State>}
  </Frame>;
}

const Frame = styled.div`
  width: 100%; height: 100%; position: relative; min-height: 0;
  video { width: 100%; height: 100%; object-fit: cover; background: ${color.surfaceSubtle}; }
`;
const State = styled.div`
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: ${space.md}px; background: ${color.surfaceSubtle}; color: ${color.ink3};
  font-size: ${fontSize.micro};
  button { padding: ${space.sm}px ${space.lg}px; color: ${color.ink2}; background: ${color.surface};
    border: 1px solid ${color.border}; border-radius: ${radius.control}px; cursor: pointer;
    &:focus-visible { outline: ${focusRing}; outline-offset: 3px; } }
`;
