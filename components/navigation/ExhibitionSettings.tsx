'use client';

import { MessageCircle } from 'lucide-react';
import styled from 'styled-components';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { useExhibitionGuidePreference } from '@/hooks/use-exhibition-guide-preference';
import { color, focusRing, fontSize, motion, radius, shadow, space, tone } from '@/styles/design-tokens';
import LanguageSwitcher from './LanguageSwitcher';

const copy = {
  ko: { title: '전시 설정', guide: '마스코트 안내', detail: '페이지별 설명 보기' },
  ja: { title: '展示設定', guide: 'マスコット案内', detail: 'ページごとの説明を表示' },
  en: { title: 'Exhibition settings', guide: 'Mascot guide', detail: 'Show page explanations' },
} as const;

/** The Lab submenu and full-width dashboard use the same persisted exhibition controls. */
export default function ExhibitionSettings() {
  const { locale } = useLocale();
  const { enabled, setEnabled } = useExhibitionGuidePreference();
  const text = copy[locale];

  return (
    <SettingsGroup aria-label={text.title}>
      <SettingsTitle>{text.title}</SettingsTitle>
      <LanguageSwitcher variant="submenu" />
      <GuideButton type="button" role="switch" aria-checked={enabled} aria-label={text.guide} $enabled={enabled} onClick={() => setEnabled(!enabled)}>
        <GuideIcon><MessageCircle size={18} /></GuideIcon>
        <GuideLabel><strong>{text.guide}</strong><span>{text.detail}</span></GuideLabel>
        <GuideState $enabled={enabled} aria-hidden="true">{enabled ? 'ON' : 'OFF'}</GuideState>
      </GuideButton>
    </SettingsGroup>
  );
}

const SettingsGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
  min-width: 0;
`;

const SettingsTitle = styled.h3`
  margin: ${space.md}px 0 ${space.xs}px;
  color: ${color.ink3};
  font-size: ${fontSize.meta};
  font-weight: 600;
`;

const GuideButton = styled.button<{ $enabled: boolean }>`
  display: flex;
  align-items: center;
  gap: ${space.lg}px;
  width: 100%;
  min-height: 70px;
  padding: ${space.xl}px;
  text-align: left;
  border: 1px solid ${({ $enabled }) => $enabled ? color.brand : color.border};
  border-radius: ${radius.card}px;
  background: ${({ $enabled }) => $enabled ? color.brandSoft : color.surface};
  color: ${color.ink2};
  box-shadow: ${shadow.card};
  cursor: pointer;
  transition: background ${motion.hover}, border-color ${motion.hover};
  &:hover { border-color: ${color.brand}; background: ${color.brandSoft}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
`;

const GuideIcon = styled.span`
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: grid;
  place-items: center;
  background: ${color.surfaceSubtle};
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  color: ${color.ink3};
`;

const GuideLabel = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${space.xs}px;
  strong { font-size: ${fontSize.body}; font-weight: 600; }
  span { color: ${color.ink3}; font-size: ${fontSize.caption}; font-weight: 500; line-height: 1.45; }
`;

const GuideState = styled.span<{ $enabled: boolean }>`
  flex: 0 0 auto;
  padding: ${space.xs}px ${space.sm}px;
  border: 1px solid ${({ $enabled }) => $enabled ? tone.success.border : tone.neutral.border};
  border-radius: ${radius.row}px;
  background: ${({ $enabled }) => $enabled ? tone.success.bg : tone.neutral.bg};
  color: ${({ $enabled }) => $enabled ? tone.success.fg : tone.neutral.fg};
  font-size: ${fontSize.caption};
  font-weight: 600;
`;
