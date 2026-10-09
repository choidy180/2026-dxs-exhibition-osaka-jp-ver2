'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bot, ChevronDown, Play, RotateCcw, SkipForward, X } from 'lucide-react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { getDemoPageGuide } from '@/data/exhibition-demo-copy';
import { EXHIBITION_DEMO_PAGES } from '@/constants/exhibition-demo';
import { exhibitionDemo, motionDuration } from '@/styles/design-tokens';
import { useExhibitionDemo } from './ExhibitionDemoProvider';
import * as S from './styles';

const copy = {
  ko: { title: '시연 재생', open: '시연 재생 설정 열기', close: '시연 설정 닫기', toggle: '자동 시연', detail: '메인부터 페이지별 기능을 자동으로 보여줍니다. 일반 조작 3초 · 핵심 기능 5초 · 마지막 화면 후 반복', idle: '시연을 켜면 메인페이지부터 시작합니다.', loading: '화면과 기능을 준비하고 있습니다.', playing: '자동 시연 재생 중', paused: '다른 탭을 보는 동안 잠시 대기합니다.', error: '기능을 준비하지 못했습니다. 다시 시도하거나 다음 페이지로 이동하세요.', retry: '다시 재생', next: '다음 페이지' },
  ja: { title: 'デモ再生', open: 'デモ再生設定を開く', close: 'デモ設定を閉じる', toggle: '自動デモ', detail: 'メインから各画面の機能を自動で紹介します。通常操作3秒・主要機能5秒・最後の画面から繰り返します。', idle: 'ONにするとメイン画面から開始します。', loading: '画面と機能を準備しています。', playing: '自動デモ再生中', paused: '別のタブを表示中は一時停止します。', error: '機能を準備できませんでした。再試行するか次の画面へ進んでください。', retry: '再試行', next: '次の画面' },
  en: { title: 'Demo playback', open: 'Open demo controls', close: 'Close demo controls', toggle: 'Automatic demo', detail: 'Tours each page from the main dashboard. Controls: 3 seconds · Key features: 5 seconds · Repeats after the last page.', idle: 'Turn ON to start from the main dashboard.', loading: 'Preparing this screen and its controls.', playing: 'Demo playing', paused: 'Paused while this tab is hidden.', error: 'This feature could not be prepared. Retry or move to the next page.', retry: 'Retry page', next: 'Next page' },
};
const advisorCopy = {
  ko: { start: 'AI Advisor부터 시연', detail: '메인 관제센터 다음에 AI Advisor를 집중 소개합니다. 질문 목록 · 재고·발주 조회 · 생산 조건 입력 · 후속 질문을 실제 대화로 보여줍니다.' },
  ja: { start: 'AI Advisorから再生', detail: 'メイン画面の次にAI Advisorを詳しく紹介します。質問一覧・在庫と発注の確認・生産条件の入力・追加質問を実際の会話でご覧いただけます。' },
  en: { start: 'Start with AI Advisor', detail: 'AI Advisor follows the main dashboard, featuring question menus, stock and orders, production conditions and follow-ups in a live conversation.' },
};

export default function DemoControls() {
  const demo = useExhibitionDemo();
  const { locale } = useLocale();
  const labels = copy[locale];
  const advisor = advisorCopy[locale];
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus();
    };
    document.addEventListener('keydown', keydown, true);
    return () => document.removeEventListener('keydown', keydown, true);
  }, [open]);
  if (!demo) return null;
  const page = EXHIBITION_DEMO_PAGES[demo.pageIndex];
  const status = !demo.enabled ? labels.idle : !demo.visible ? labels.paused : demo.phase === 'error' ? labels.error
    : demo.phase === 'loading' ? labels.loading : labels.playing;

  return <S.PanelDock data-demo-controls data-demo-phase={demo.phase} data-demo-page={page.path} aria-label={labels.title}>
    <S.Handle ref={trigger} type="button" $active={demo.enabled} aria-label={labels.open} aria-expanded={open}
      aria-controls="exhibition-demo-panel" onClick={() => setOpen(value => !value)}>
      <Play size={15} />{demo.enabled ? 'ON' : 'OFF'}<ChevronDown size={14} />
    </S.Handle>
    <AnimatePresence>
      {open && <S.Panel as={motion.section} id="exhibition-demo-panel" aria-label={labels.title}
        initial={{ y: reducedMotion ? 0 : -exhibitionDemo.hiddenOffset, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: reducedMotion ? 0 : -exhibitionDemo.hiddenOffset, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : motionDuration.enter }}>
        <S.PanelHead><h2>{labels.title}</h2><S.Button type="button" aria-label={labels.close} onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={16} /></S.Button></S.PanelHead>
        <p>{labels.detail}</p>
        <p>{advisor.detail}</p>
        <S.Switch type="button" role="switch" aria-label={labels.toggle} aria-checked={demo.enabled} $active={demo.enabled}
          onClick={() => demo.setEnabled(!demo.enabled)}><span>{labels.toggle}</span><strong>{demo.enabled ? 'ON' : 'OFF'}</strong></S.Switch>
        <S.Status role="status" $error={demo.phase === 'error'}>
          {status}
          {demo.enabled && <span>{getDemoPageGuide(page, locale).title} · {(demo.pageIndex + 1).toLocaleString('ko-KR')} / {EXHIBITION_DEMO_PAGES.length.toLocaleString('ko-KR')}</span>}
        </S.Status>
        <S.Button type="button" onClick={() => { demo.startAdvisor(); setOpen(false); }}><Bot size={16} />{advisor.start}</S.Button>
        {demo.enabled && <S.Actions>
          <S.Button type="button" onClick={demo.retry}><RotateCcw size={15} />{labels.retry}</S.Button>
          <S.Button type="button" onClick={demo.nextPage}><SkipForward size={15} />{labels.next}</S.Button>
        </S.Actions>}
      </S.Panel>}
    </AnimatePresence>
  </S.PanelDock>;
}
