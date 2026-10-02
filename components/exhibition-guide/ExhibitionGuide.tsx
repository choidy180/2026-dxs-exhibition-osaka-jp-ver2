'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Cat, MessageCircle, RefreshCw, Sparkles, X } from 'lucide-react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { useExhibitionGuidePreference } from '@/hooks/use-exhibition-guide-preference';
import { getPageGuide, type PageGuide } from '@/data/exhibition-page-guides';
import { exhibitionGuide, motionDuration } from '@/styles/design-tokens';
import * as S from './styles';

const copy = {
  ko: { name: 'DX 길잡이', open: '이 페이지 안내 다시 보기', close: '말풍선 닫기', next: '다음 안내', done: '알겠어요', hint: '눌러서 안내 보기', mascot: '웃으며 손을 든 DX 고양이 길잡이', loading: '길잡이 준비 중', retry: '캐릭터 다시 불러오기' },
  en: { name: 'DX Guide', open: 'Replay this page guide', close: 'Close speech bubble', next: 'Next tip', done: 'Got it!', hint: 'Tap for a tour', mascot: 'Smiling DX cat guide with a raised paw', loading: 'Getting ready', retry: 'Reload character' },
  ja: { name: 'DXガイド', open: 'このページの案内をもう一度見る', close: '吹き出しを閉じる', next: '次のヒント', done: 'わかりました', hint: 'タップして案内を見る', mascot: '手を上げて笑うDX猫ガイド', loading: 'ガイドを準備中', retry: 'キャラクターを再読み込み' },
} as const;

type GuideCopy = (typeof copy)[keyof typeof copy];
type GuideProps = { fullWidth?: boolean; mobileAllowed?: boolean; mobileFullWidth?: boolean };

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
const getReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;
const getServerReducedMotion = () => true;
function subscribeReducedMotion(onChange: () => void) {
  const preference = window.matchMedia(reducedMotionQuery);
  preference.addEventListener('change', onChange);
  return () => preference.removeEventListener('change', onChange);
}

/** A route-scoped, non-modal guide. It never intercepts clicks outside its own controls. */
export default function ExhibitionGuide(props: GuideProps) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const { enabled } = useExhibitionGuidePreference();
  if (!enabled) return null;
  const guide = getPageGuide(pathname ?? '/', locale);
  return <PageGuideEvent key={`${pathname}:${locale}`} guide={guide} labels={copy[locale]} {...props} />;
}

function PageGuideEvent({ guide, labels, fullWidth = false, mobileAllowed = false, mobileFullWidth = false }: GuideProps & { guide: PageGuide; labels: GuideCopy }) {
  // 페이지를 연 상태에서 접근성 설정을 변경해도 반복 모션을 즉시 멈춥니다.
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getServerReducedMotion);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const dock = useRef<HTMLElement>(null);
  const bubble = useRef<HTMLElement>(null);
  const currentText = guide.steps[step] ?? guide.steps[0] ?? guide.title;

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const dockElement = dock.current;
    const bubbleElement = bubble.current;
    if (!visible || !open || !dockElement || !bubbleElement) return;

    // 문안 길이와 모바일 배치가 달라져도 블러 경계는 말풍선 중앙 바로 위를 따릅니다.
    const updateFocusBoundary = () => {
      const top = bubbleElement.offsetTop + bubbleElement.offsetHeight / 2 - exhibitionGuide.focusBackdrop.centerOffset;
      dockElement.style.setProperty('--guide-focus-top', `${Math.max(0, top)}px`);
    };
    updateFocusBoundary();
    const observer = new ResizeObserver(updateFocusBoundary);
    observer.observe(dockElement);
    observer.observe(bubbleElement);
    return () => observer.disconnect();
  }, [visible, open]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const target = event.target instanceof Element ? event.target : null;
      // Leave Escape to a dialog/menu when focus is outside this non-modal guide.
      if (!target?.closest('[data-exhibition-guide]')) return;
      setOpen(false);
      trigger.current?.focus();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [open]);

  const dismiss = () => { setOpen(false); trigger.current?.focus(); };
  const reopen = () => {
    if (imageState === 'error') { setAttempt(value => value + 1); setImageState('loading'); }
    setStep(0);
    setOpen(true);
  };

  return <AnimatePresence>
    {visible && <S.Dock
      as={motion.aside}
      ref={dock}
      aria-label={labels.name}
      data-exhibition-guide={guide.id}
      $fullWidth={fullWidth}
      $mobileAllowed={mobileAllowed}
      $mobileFullWidth={mobileFullWidth}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      transition={{ duration: motionDuration.enter }}
    >
      <AnimatePresence initial={false}>
        {open && <S.FocusBackdrop
          as={motion.div}
          key="focus-backdrop"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : motionDuration.fast }}
        />}
      </AnimatePresence>
      <S.MascotButton
        ref={trigger}
        type="button"
        onClick={reopen}
        aria-label={imageState === 'error' ? labels.retry : labels.open}
        aria-expanded={open}
        title={labels.open}
      >
        <S.MascotArt
          as={motion.span}
          animate={reduceMotion || imageState !== 'ready'
            ? { y: 0, rotate: 0, scaleY: 1 }
            : {
              y: [...exhibitionGuide.motion.float],
              rotate: [...exhibitionGuide.motion.sway],
              scaleY: [...exhibitionGuide.motion.breathe],
            }}
          transition={reduceMotion || imageState !== 'ready' ? { duration: 0 } : {
            y: { duration: exhibitionGuide.motion.floatDuration, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: exhibitionGuide.motion.swayDuration, repeat: Infinity, ease: 'easeInOut' },
            scaleY: { duration: exhibitionGuide.motion.breatheDuration, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <Image
            key={attempt}
            src="/demo/exhibition-guide-cat.png"
            width={1218}
            height={1292}
            alt={labels.mascot}
            unoptimized
            draggable={false}
            onLoad={() => setImageState('ready')}
            onError={() => setImageState('error')}
            style={{ opacity: imageState === 'ready' ? 1 : 0 }}
          />
        </S.MascotArt>
        {imageState !== 'ready' && <S.ImageState role="status">
          {imageState === 'error' ? <RefreshCw size={28} /> : <Cat size={32} />}
          <span>{imageState === 'error' ? labels.retry : labels.loading}</span>
        </S.ImageState>}
        {!open && <S.ReopenBadge><MessageCircle size={18} /><span>{labels.hint}</span></S.ReopenBadge>}
      </S.MascotButton>

      <AnimatePresence initial={false}>
        {open && <S.Bubble
          as={motion.section}
          ref={bubble}
          key="speech"
          aria-label={guide.title}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          transition={{ duration: motionDuration.fast }}
        >
          <S.BubbleHeader>
            <S.Name><Sparkles size={19} />{labels.name}</S.Name>
            <S.CloseButton type="button" onClick={dismiss} aria-label={labels.close} title={labels.close}><X size={22} /></S.CloseButton>
          </S.BubbleHeader>
          <S.Title>{guide.title}</S.Title>
          <SpeechText key={`${step}:${currentText}`} text={currentText} instant={!!reduceMotion} />
          <S.BubbleFooter>
            <S.StepCount aria-label={`${step + 1} / ${guide.steps.length}`}>
              {guide.steps.map((_, index) => <S.StepDot key={index} $active={index === step} />)}
              <span>{(step + 1).toLocaleString('ko-KR')} / {guide.steps.length.toLocaleString('ko-KR')}</span>
            </S.StepCount>
            <S.NextButton type="button" onClick={() => step + 1 < guide.steps.length ? setStep(value => value + 1) : dismiss()}>
              {step + 1 < guide.steps.length ? labels.next : labels.done}
              {step + 1 < guide.steps.length && <ArrowRight size={19} />}
            </S.NextButton>
          </S.BubbleFooter>
        </S.Bubble>}
      </AnimatePresence>
    </S.Dock>}
  </AnimatePresence>;
}

function SpeechText({ text, instant }: { text: string; instant: boolean }) {
  const [length, setLength] = useState(0);
  useEffect(() => {
    if (instant) return;
    let count = 0;
    const timer = window.setInterval(() => {
      count = Math.min(text.length, count + 2);
      setLength(count);
      if (count === text.length) window.clearInterval(timer);
    }, 28);
    return () => window.clearInterval(timer);
  }, [text, instant]);
  const visibleLength = instant ? text.length : length;
  return <S.Speech>
    <S.ScreenReaderText role="status" aria-live="polite" aria-atomic="true">{text}</S.ScreenReaderText>
    <span aria-hidden="true">{text.slice(0, visibleLength)}<S.Unspoken>{text.slice(visibleLength)}</S.Unspoken></span>
  </S.Speech>;
}
