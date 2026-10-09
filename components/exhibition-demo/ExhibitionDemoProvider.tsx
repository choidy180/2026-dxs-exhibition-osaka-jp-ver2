'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { createExhibitionGuidePreferenceStore } from '@/hooks/use-exhibition-guide-preference';
import { usePageVisible } from '@/hooks/use-page-visible';
import { ADVISOR_DEMO_PAGE_INDEX, DEMO_TIMING, EXHIBITION_DEMO_PAGES, getNextDemoPage } from '@/constants/exhibition-demo';
import { getDemoFeatureText, getDemoPageGuide } from '@/data/exhibition-demo-copy';
import { demoVisibleDelay, dismissDemoTargets, findDemoTarget, typeDemoInput, waitForDemoTarget, withDemoCleanup } from '@/utils/exhibition-playback';
import { useSmoothNavigation } from './PageTransition';
import DemoFocus from './DemoFocus';
import DemoControls from './DemoControls';
import ExhibitionResourceGuard from './ExhibitionResourceGuard';

const preference = createExhibitionGuidePreferenceStore(undefined, { storageKey: 'dxs-exhibition-autoplay-v1', initialEnabled: false });
type Phase = 'idle' | 'loading' | 'intro' | 'playing' | 'error';
type DemoState = {
  enabled: boolean; phase: Phase; pageIndex: number; stepIndex: number; visible: boolean;
  guide: { title: string; text: string; step: number; total: number } | null;
  setEnabled: (enabled: boolean) => void; retry: () => void; nextPage: () => void; startAdvisor: () => void;
};
const DemoContext = createContext<DemoState | null>(null);

export function useExhibitionDemo() { return useContext(DemoContext); }

const actionCopy = {
  ko: { click: (name: string) => `「${name}」 버튼을 눌러 기능을 보여드릴게요.`, focus: '강조한 영역을 천천히 살펴보세요.' },
  ja: { click: (name: string) => `「${name}」を操作して機能をご紹介します。`, focus: '強調したエリアをゆっくりご覧ください。' },
  en: { click: (name: string) => `Let's try “${name}” and see what it does.`, focus: 'Take a closer look at the highlighted area.' },
};

export default function ExhibitionDemoProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(preference.subscribe, preference.getSnapshot, preference.getServerSnapshot);
  const visible = usePageVisible();
  const { locale } = useLocale();
  const router = useRouter();
  const navigate = useSmoothNavigation();
  const reducedMotion = useReducedMotion();
  const [pageIndex, setPageIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [run, setRun] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [clicking, setClicking] = useState(false);
  const [guide, setGuide] = useState<DemoState['guide']>(null);

  const setEnabled = useCallback((value: boolean) => {
    if (value) { setPageIndex(0); setRun(value => value + 1); }
    preference.setEnabled(value);
    if (!value) { setTarget(null); setGuide(null); setPhase('idle'); }
  }, []);
  const retry = useCallback(() => setRun(value => value + 1), []);
  const nextPage = useCallback(() => setPageIndex(getNextDemoPage), []);
  const startAdvisor = useCallback(() => {
    setPageIndex(ADVISOR_DEMO_PAGE_INDEX); setRun(value => value + 1); preference.setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const signal = controller.signal;
    const page = EXHIBITION_DEMO_PAGES[pageIndex];
    const pageGuide = getDemoPageGuide(page, locale);
    const labels = actionCopy[locale];
    const play = async () => withDemoCleanup(async () => {
      setPhase('loading'); setTarget(null); setStepIndex(-1); setGuide(null);
      await navigate(page.path, signal);
      await waitForDemoTarget(page.steps[0].target, signal, DEMO_TIMING.readyTimeout, page.steps[0].action === 'click');
      await dismissDemoTargets(page.dismissBeforeIntro ?? [], signal, DEMO_TIMING.readyTimeout);
      setGuide({ title: pageGuide.title, text: pageGuide.steps[0], step: 1, total: page.steps.length + 1 });
      setPhase('intro');
      // 다음 한 화면만 예열해 전시 전체를 메모리에 쌓지 않는다.
      router.prefetch(EXHIBITION_DEMO_PAGES[getNextDemoPage(pageIndex)].path);
      await demoVisibleDelay(DEMO_TIMING.intro, signal);
      for (const [index, step] of page.steps.entries()) {
        setStepIndex(index); setPhase('loading'); setTarget(null);
        const element = await waitForDemoTarget(step.target, signal, DEMO_TIMING.readyTimeout, step.action === 'click');
        element.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'nearest', inline: 'nearest' });
        setTarget(element); setClicking(step.action === 'click');
        const name = element.getAttribute('aria-label') || element.textContent?.replace(/\s+/g, ' ').trim() || pageGuide.title;
        const explanation = getDemoFeatureText(step.feature ?? step.target, locale);
        setGuide({ title: pageGuide.title, text: page.section === 'advisor' && explanation ? explanation : step.action === 'click'
          ? `${labels.click(name)}${explanation ? ` ${explanation}` : ''}`
          : explanation ?? `${labels.focus} ${pageGuide.steps[1]}`,
          step: index + 2, total: page.steps.length + 1 });
        await withDemoCleanup(async () => {
          // 커서가 먼저 도착한 뒤 실제 버튼의 React 이벤트를 실행한다.
          await demoVisibleDelay(DEMO_TIMING.settle, signal);
          const previousResult = step.freshResult && step.result ? findDemoTarget(step.result) : undefined;
          if (step.action === 'input') await typeDemoInput(element, step.value[locale], signal);
          if (step.action === 'click') element.click();
          if (step.result) {
            const result = await waitForDemoTarget(step.result, signal, DEMO_TIMING.readyTimeout, false, previousResult);
            result.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'nearest', inline: 'nearest' });
            setTarget(result);
            setClicking(false);
          }
          setPhase('playing');
          await demoVisibleDelay(step.duration, signal);
        }, () => { if (step.close) findDemoTarget(step.close)?.click(); });
      }
      setTarget(null); setGuide(null);
      setPageIndex(getNextDemoPage);
    }, () => { for (const id of page.cleanup ?? []) findDemoTarget(id)?.click(); });
    void play().catch(async () => {
      if (signal.aborted) return;
      setPhase('error'); setTarget(null);
      // 한 기능이 준비되지 않아도 하루 종일 재생이 멈추지 않게 복구한다.
      try { await demoVisibleDelay(DEMO_TIMING.focus, signal); setPageIndex(getNextDemoPage); } catch { /* OFF */ }
    });
    return () => controller.abort();
  }, [enabled, locale, navigate, pageIndex, reducedMotion, router, run]);

  useEffect(() => {
    if (!enabled || !visible || !('wakeLock' in navigator)) return;
    let disposed = false;
    let lock: WakeLockSentinel | undefined;
    void navigator.wakeLock.request('screen').then(value => {
      if (disposed) void value.release(); else lock = value;
    }).catch(() => { /* 화면 잠금 제한 환경에서도 시연은 계속된다. */ });
    return () => { disposed = true; void lock?.release(); };
  }, [enabled, visible]);

  const state = useMemo<DemoState>(() => ({ enabled, phase, pageIndex, stepIndex, visible, guide, setEnabled, retry, nextPage, startAdvisor }),
    [enabled, phase, pageIndex, stepIndex, visible, guide, setEnabled, retry, nextPage, startAdvisor]);
  return <DemoContext.Provider value={state}>
    {children}
    <ExhibitionResourceGuard />
    <DemoFocus target={enabled && visible ? target : null} clicking={clicking} />
    <DemoControls />
  </DemoContext.Provider>;
}
