'use client';

import { useState } from 'react';
import { AlertCircle, Film, Loader2, RefreshCw } from 'lucide-react';
import styled from 'styled-components';
import { color, font, fontSize, radius, space, focusRing } from '@/styles/design-tokens';

export default function DemoVideo({ src = '/videos/dashboard-short.mp4' }: { src?: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  return <Frame>
    {src && <video key={attempt} src={src} poster="/demo/factory-floor.png" autoPlay loop muted playsInline controls
      aria-label="전시회 공정 영상" onPlaying={() => setState('ready')} onError={() => setState('error')} />}
    {(!src || state !== 'ready') && <State role="status">
      {!src ? <><Film size={20} />영상이 없습니다.</> : state === 'error' ? <>
        <AlertCircle size={20} />영상을 재생할 수 없습니다.
        <button onClick={() => { setState('loading'); setAttempt(value => value + 1); }}><RefreshCw size={14} />재시도</button>
      </> : <><Loader2 size={20} />영상을 준비하고 있습니다.</>}
    </State>}
  </Frame>;
}

const Frame = styled.div`
  position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden;
  background: ${color.surfaceSubtle}; border-radius: ${radius.row}px; font-family: ${font.family};
  video { width: 100%; height: 100%; object-fit: cover; display: block; }
`;
const State = styled.div`
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: ${space.md}px; background: ${color.surface}; color: ${color.ink3}; font-size: ${fontSize.meta};
  button { display: inline-flex; gap: ${space.sm}px; align-items: center; padding: ${space.md}px;
    border: 1px solid ${color.border}; border-radius: ${radius.control}px; background: ${color.surface}; color: ${color.ink2}; cursor: pointer; }
  button:focus-visible { outline: ${focusRing}; }
`;
