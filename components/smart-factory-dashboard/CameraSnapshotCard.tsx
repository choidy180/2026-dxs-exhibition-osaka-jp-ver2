'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Camera, ImageOff, Loader2, RefreshCw } from 'lucide-react';
import styled from 'styled-components';
import { useLocale } from '@/components/i18n/LocaleProvider';
import {
  color, controlHeight, focusRing, font, fontSize, fontWeight,
  motionDuration, radius, shadow, space, tone,
} from '@/styles/design-tokens';

type Props = {
  title: string;
  src?: string;
  occupied: number;
  total: number;
};

export default function CameraSnapshotCard({ title, src, occupied, total }: Props) {
  const { t } = useLocale();
  const reducedMotion = useReducedMotion();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const percent = total > 0 ? Math.min(100, Math.round(occupied / total * 100)) : 0;
  const retry = () => { setStatus('loading'); setAttempt(value => value + 1); };

  return (
    <SnapshotCard aria-label={t(title)} data-camera-snapshot>
      {src && <Image key={attempt} src={src} alt={t(title)} fill
        sizes="(max-width: 1200px) 33vw, 40vw"
        onLoad={() => setStatus('ready')} onError={() => setStatus('error')} />}

      <AnimatePresence>
        {(!src || status !== 'ready') && (
          <ImageState key={!src ? 'empty' : status} $error={status === 'error'}
            role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : motionDuration.fast }}>
            {src && status === 'loading' ? (
              <motion.span animate={{ rotate: reducedMotion ? 0 : 360 }}
                transition={{ duration: motionDuration.spin, repeat: reducedMotion ? 0 : Infinity, ease: 'linear' }}>
                <Loader2 size={28} />
              </motion.span>
            ) : <ImageOff size={28} />}
            <strong>{t(!src ? '등록된 이미지가 없습니다.' : status === 'error' ? '이미지를 불러오지 못했습니다.' : '이미지를 불러오는 중...')}</strong>
            {!src && <span>{t('카메라 이미지를 추가해 주세요.')}</span>}
            {src && status === 'error' && <button type="button" onClick={retry}><RefreshCw size={15} />{t('재시도')}</button>}
          </ImageState>
        )}
      </AnimatePresence>

      {src && status === 'ready' && <>
        <CameraTitle><Camera size={18} aria-hidden="true" /><span>{t(title)}</span></CameraTitle>
        <SnapshotSummary>
          <span className="label">{t('실시간 적재 현황')}</span>
          <strong>{t(title)}</strong>
          <div className="values">
            <span className="percentage">{percent.toLocaleString('ko-KR')}%</span>
            <span>{occupied.toLocaleString('ko-KR')} / {total.toLocaleString('ko-KR')} EA</span>
          </div>
          <SnapshotProgress role="progressbar" aria-label={t('적재율')}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <motion.div initial={false} animate={{ scaleX: percent / 100 }} />
          </SnapshotProgress>
        </SnapshotSummary>
      </>}
    </SnapshotCard>
  );
}

const SnapshotCard = styled.figure`
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  margin: 0;
  overflow: hidden;
  background: ${color.surfaceSubtle};
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.card};
  font-family: ${font.family};

  > img { object-fit: contain; }
`;

const CameraTitle = styled.div`
  position: absolute;
  top: ${space.xxxl}px;
  left: ${space.xxxl}px;
  right: ${space.xxxl}px;
  width: fit-content;
  max-width: calc(100% - ${space.xxxl * 2}px);
  display: flex;
  align-items: center;
  gap: ${space.md}px;
  padding: ${space.md}px ${space.xl}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink};
  box-shadow: ${shadow.card};
  font-size: ${fontSize.body};
  font-weight: ${fontWeight.semibold};
  svg { flex-shrink: 0; color: ${color.ink3}; }
  span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const SnapshotSummary = styled.figcaption`
  position: absolute;
  bottom: ${space.xxxl}px;
  left: ${space.xxxl}px;
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
  width: min(240px, calc(100% - ${space.xxxl * 2}px));
  padding: ${space.xxl}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  box-shadow: ${shadow.popover};
  color: ${color.ink2};
  font-size: ${fontSize.body};
  font-weight: ${fontWeight.semibold};
  .label { color: ${color.ink3}; font-size: ${fontSize.meta}; }
  strong { font-size: ${fontSize.body}; font-weight: ${fontWeight.semibold}; }
  .values { display: flex; align-items: baseline; justify-content: space-between; gap: ${space.md}px; }
  .percentage { color: ${tone.success.fg}; font-size: ${fontSize.guideTitle}; }

  @media (max-width: 1200px) {
    gap: ${space.xs}px;
    padding: ${space.lg}px;
    .percentage { font-size: ${fontSize.pageTitle}; }
  }
`;

const SnapshotProgress = styled.div`
  height: ${space.sm}px;
  overflow: hidden;
  border-radius: ${radius.bar}px;
  background: ${color.fill};
  > div { height: 100%; background: ${tone.success.fg}; transform-origin: left; }
`;

const ImageState = styled(motion.div)<{ $error: boolean }>`
  position: absolute;
  inset: ${space.xl}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${space.xl}px;
  padding: ${space.xxxl}px;
  border: 1px dashed ${({ $error }) => $error ? tone.danger.border : color.borderStrong};
  border-radius: ${radius.card}px;
  background: ${({ $error }) => $error ? tone.danger.bg : color.surfaceSubtle};
  color: ${color.ink3};
  font-size: ${fontSize.body};
  text-align: center;
  strong { color: ${color.ink2}; font-weight: ${fontWeight.semibold}; }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${space.sm}px;
    height: ${controlHeight.sm}px;
    padding: 0 ${space.xl}px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.control}px;
    color: ${color.ink2};
    cursor: pointer;
    &:hover { background: ${color.fill}; }
    &:focus-visible { outline: ${focusRing}; outline-offset: ${space.xs}px; }
  }
`;
