'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { demoDelay } from '@/utils/exhibition-playback';
import { motionDuration } from '@/styles/design-tokens';
import { TransitionCover, PageFrame } from './styles';

type Navigate = (path: string, signal?: AbortSignal) => Promise<void>;
const NavigationContext = createContext<Navigate | null>(null);

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const currentPath = useRef(pathname);
  const pending = useRef<AbortController | null>(null);
  const [covered, setCovered] = useState(false);

  useEffect(() => { currentPath.current = pathname; }, [pathname]);
  useEffect(() => () => { pending.current?.abort(); }, []);

  const navigate = useCallback<Navigate>(async (path, outerSignal) => {
    if (outerSignal?.aborted) throw outerSignal.reason;
    if (currentPath.current === path) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const abort = () => controller.abort(outerSignal?.reason);
    outerSignal?.addEventListener('abort', abort, { once: true });
    setCovered(true);
    try {
      router.prefetch(path);
      await demoDelay(reducedMotion ? 0 : motionDuration.enter * 1_000, controller.signal);
      router.push(path, { scroll: false });
      let elapsed = 0;
      while (currentPath.current !== path) {
        await demoDelay(50, controller.signal);
        elapsed += 50;
        if (elapsed >= 20_000) throw new Error('Page navigation timed out');
      }
      // 새 페이지의 레이아웃·차트가 자리잡은 후 가림막을 걷는다.
      await demoDelay(reducedMotion ? 0 : motionDuration.enter * 1_000, controller.signal);
    } finally {
      outerSignal?.removeEventListener('abort', abort);
      if (pending.current === controller) { pending.current = null; setCovered(false); }
    }
  }, [reducedMotion, router]);

  useEffect(() => {
    const handleLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target instanceof Element ? event.target : null)?.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.hash || url.search || url.pathname === currentPath.current) return;
      event.preventDefault();
      void navigate(url.pathname).catch(() => { /* 가림막은 finally에서 복원된다. */ });
    };
    // Next Link의 기본 라우팅보다 먼저 처리해 이전 화면이 사라지는 순간을 가린다.
    document.addEventListener('click', handleLink, true);
    return () => document.removeEventListener('click', handleLink, true);
  }, [navigate]);

  return <NavigationContext.Provider value={navigate}>
    {children}
    <AnimatePresence>
      {covered && <TransitionCover as={motion.div} aria-label="페이지 전환 중" role="status"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : motionDuration.enter }} />}
    </AnimatePresence>
  </NavigationContext.Provider>;
}

export function useSmoothNavigation(): Navigate {
  const navigation = useContext(NavigationContext);
  const router = useRouter();
  return useCallback((path, signal) => {
    if (navigation) return navigation(path, signal);
    router.push(path);
    return Promise.resolve();
  }, [navigation, router]);
}

/** 이전 화면을 보관하지 않아 언마운트 시 영상·WebGL·폴링 리소스가 즉시 해제된다. */
export function PageEntrance({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  return <PageFrame as={motion.div} key={pathname} initial={{ opacity: reducedMotion ? 1 : 0 }}
    animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : motionDuration.page }}>
    {children}
  </PageFrame>;
}
