'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { AnimatePresence, motion as animated, useReducedMotion } from 'framer-motion';
import styled from 'styled-components';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { color, controlHeight, exhibitionDemo, focusRing, font, fontSize, motion, motionDuration, radius, shadow, space, zIndex } from '@/styles/design-tokens';
import ExhibitionSettings from './ExhibitionSettings';

/** Lab settings remain reachable on screens that intentionally have no navigation rail. */
export default function FullWidthLabSettings() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [open]);

  return <SettingsRoot ref={root} onKeyDown={event => {
    if (event.key !== 'Escape' || !open) return;
    event.stopPropagation();
    setOpen(false);
    trigger.current?.focus();
  }}>
    <LabButton ref={trigger} type="button" $open={open} aria-haspopup="dialog" aria-controls={panelId} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <FlaskConical size={17} /><span>{t('실험실')}</span>
    </LabButton>
    <AnimatePresence initial={false}>
      {open && <SettingsPanel
        id={panelId}
        role="dialog"
        aria-label={t('실험실')}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: reducedMotion ? 0 : motionDuration.fast }}
      >
        <PanelHeader><strong>{t('실험실')}</strong><CloseButton type="button" aria-label={t('닫기')} onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={16} /></CloseButton></PanelHeader>
        <ExhibitionSettings />
      </SettingsPanel>}
    </AnimatePresence>
  </SettingsRoot>;
}

const SettingsRoot = styled.div`
  position: fixed;
  top: ${space.xl}px;
  right: ${exhibitionDemo.handleWidth + space.xl * 2}px;
  z-index: ${zIndex.navPopover};
  font-family: ${font.family};
  *, *::before, *::after { font-family: inherit; }
`;

const LabButton = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: ${space.md}px;
  height: ${controlHeight.lg}px;
  margin-left: auto;
  padding: 0 ${space.xl}px;
  border: 1px solid ${({ $open }) => $open ? color.brand : color.border};
  border-radius: ${radius.control}px;
  background: ${({ $open }) => $open ? color.brandSoft : color.surface};
  color: ${color.ink2};
  box-shadow: ${shadow.card};
  font-size: ${fontSize.body};
  font-weight: 600;
  cursor: pointer;
  transition: background ${motion.hover}, border-color ${motion.hover};
  &:hover { background: ${color.brandSoft}; border-color: ${color.brand}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
`;

const SettingsPanel = styled(animated.div)`
  width: min(312px, calc(100vw - ${space.xl * 2}px));
  margin-top: ${space.md}px;
  padding: ${space.xxxl}px;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.popover};
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.md}px;
  color: ${color.ink};
  strong { font-size: ${fontSize.sectionTitle}; font-weight: 600; }
`;

const CloseButton = styled.button`
  display: grid;
  place-items: center;
  width: ${controlHeight.sm}px;
  height: ${controlHeight.sm}px;
  background: ${color.surfaceSubtle};
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  color: ${color.ink3};
  cursor: pointer;
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
`;
