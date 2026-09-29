'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Languages } from 'lucide-react';
import { AnimatePresence, motion as animated, useReducedMotion } from 'framer-motion';
import styled from 'styled-components';
import SelectField from '@/components/common/select/SelectField';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { isLocale } from '@/lib/i18n/translate';
import { color, focusRing, fontSize, motion, motionDuration, radius, shadow, space } from '@/styles/design-tokens';

const options = [
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
] as const;

type LanguageSwitcherProps = { variant?: 'submenu' | 'compact' };

export default function LanguageSwitcher({ variant = 'submenu' }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      if (!shell.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [open]);

  return (
    <LanguageShell ref={shell} onKeyDown={event => {
      if (event.key !== 'Escape' || !open) return;
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    }}>
      <LanguageButton
        ref={trigger}
        type="button"
        $open={open}
        $compact={variant === 'compact'}
        aria-label={t('언어 선택')}
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <LanguageIcon $open={open}><Languages size={18} /></LanguageIcon>
        <LanguageLabel>
          <strong>{t('언어 선택')}</strong>
          <span>{options.find(option => option.value === locale)?.label}</span>
        </LanguageLabel>
        <ChevronDown size={16} aria-hidden="true" />
      </LanguageButton>
      <AnimatePresence initial={false}>
        {open && (
          <LanguagePanel
            id={panelId}
            role="region"
            aria-label={t('언어 선택')}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: reducedMotion ? 0 : motionDuration.fast }}
          >
            <SelectField label={t('표시 언어')} value={locale} options={options} onChange={value => {
              if (isLocale(value)) setLocale(value);
              setOpen(false);
            }} />
          </LanguagePanel>
        )}
      </AnimatePresence>
    </LanguageShell>
  );
}

const LanguageShell = styled.div`
  width: 100%;
  min-width: 0;
`;

const LanguageButton = styled.button<{ $open: boolean; $compact: boolean }>`
  width: 100%;
  min-height: ${({ $compact }) => $compact ? 52 : 70}px;
  padding: ${space.xl}px;
  display: flex;
  align-items: center;
  gap: ${space.lg}px;
  text-align: left;
  border: 1px solid ${({ $open }) => $open ? color.brand : color.border};
  border-radius: ${radius.card}px;
  background: ${({ $open }) => $open ? color.brandSoft : color.surface};
  color: ${color.ink2};
  box-shadow: ${shadow.card};
  cursor: pointer;
  transition: background ${motion.hover}, border-color ${motion.hover};
  > svg { flex: 0 0 auto; color: ${color.ink3}; }
  &:hover { background: ${color.brandSoft}; border-color: ${color.brand}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
`;

const LanguageIcon = styled.span<{ $open: boolean }>`
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: grid;
  place-items: center;
  border: 1px solid ${({ $open }) => $open ? color.brand : color.border};
  border-radius: ${radius.control}px;
  background: ${({ $open }) => $open ? color.brandSoft : color.surfaceSubtle};
  color: ${({ $open }) => $open ? color.brand : color.ink3};
`;

const LanguageLabel = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${space.xs}px;
  strong { color: ${color.ink2}; font-size: ${fontSize.body}; font-weight: 600; }
  span { color: ${color.ink3}; font-size: ${fontSize.caption}; font-weight: 500; }
`;

const LanguagePanel = styled(animated.div)`
  margin-top: ${space.md}px;
  padding: ${space.xl}px;
  background: ${color.surfaceSubtle};
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
`;
