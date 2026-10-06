'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';
import { exhibitionDemo, motionDuration } from '@/styles/design-tokens';
import * as S from './styles';

export default function DemoFocus({ target, clicking }: { target: HTMLElement | null; clicking: boolean }) {
  const reducedMotion = useReducedMotion();
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  useEffect(() => {
    if (!target) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const bounds = target.getBoundingClientRect();
      const padding = exhibitionDemo.focusPadding;
      const top = Math.max(0, bounds.top - padding);
      const left = Math.max(0, bounds.left - padding);
      setRect({ top, left, width: Math.max(0, Math.min(window.innerWidth, bounds.right + padding) - left),
        height: Math.max(0, Math.min(window.innerHeight, bounds.bottom + padding) - top) });
    };
    const update = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener('resize', update);
    document.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      document.removeEventListener('scroll', update, true);
    };
  }, [target]);

  return <AnimatePresence>
    {target && rect && rect.width > 0 && rect.height > 0 && <S.FocusRing as={motion.div} key="demo-focus" aria-hidden="true"
      initial={{ opacity: 0 }} animate={{ ...rect, opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : motionDuration.enter }} />}
    {target && rect && clicking && <S.Cursor as={motion.span} key="demo-cursor" aria-hidden="true"
      initial={{ opacity: 0 }} animate={{ left: rect.left + rect.width / 2, top: rect.top + Math.min(rect.height / 2, 30), opacity: 1 }}
      exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : motionDuration.enter }}>
      <MousePointer2 size={18} />
    </S.Cursor>}
  </AnimatePresence>;
}
