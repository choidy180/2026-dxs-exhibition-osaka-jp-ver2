import styled from 'styled-components';
import { motion as motionElement } from 'framer-motion';
import {
  color, controlHeight, focusRing, font, fontSize, fontWeight, motion,
  radius, scrollbar, shadow, space, tone, zIndex,
} from '@/styles/design-tokens';
import type { ToneName } from '@/styles/design-tokens';

export const Panel = styled.section<{ $inDialog?: boolean }>`
  min-width: 0;
  min-height: 0;
  max-height: ${({ $inDialog }) => $inDialog ? 'none' : '38vh'};
  overflow: ${({ $inDialog }) => $inDialog ? 'visible' : 'auto'};
  padding: ${({ $inDialog }) => $inDialog ? '0' : `${space.xl}px ${space.xxl}px`};
  border: ${({ $inDialog }) => $inDialog ? '0' : `1px solid ${color.borderSoft}`};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  box-shadow: ${({ $inDialog }) => $inDialog ? 'none' : shadow.card};
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
  ${scrollbar}

  @media (max-width: 760px) {
    max-height: ${({ $inDialog }) => $inDialog ? 'none' : '42vh'};
  }
`;

export const PanelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${space.md}px ${space.xl}px;
  min-width: 0;
`;

export const PanelTitle = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${space.md}px;

  h2 {
    margin: 0;
    color: ${color.ink};
    font-size: ${fontSize.sectionTitle};
    font-weight: ${fontWeight.semibold};
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  > svg { color: ${color.ink3}; }
`;

export const StatusBadge = styled.span<{ $tone: ToneName }>`
  display: inline-flex;
  align-items: center;
  padding: ${space.xs}px ${space.md}px;
  border: 1px solid ${({ $tone }) => tone[$tone].border};
  border-radius: ${radius.control}px;
  background: ${({ $tone }) => tone[$tone].bg};
  color: ${({ $tone }) => tone[$tone].fg};
  font-size: ${fontSize.caption};
  font-weight: ${fontWeight.semibold};
  white-space: nowrap;
`;

export const Copy = styled.p`
  margin: 0;
  color: ${color.ink3};
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.medium};
  line-height: 1.5;
  overflow-wrap: anywhere;
`;

export const Disclaimer = styled(Copy)`
  color: ${color.ink2};
`;

export const Actions = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${space.sm}px;
`;

export const Button = styled.button`
  min-height: ${controlHeight.sm}px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${space.sm}px;
  padding: ${space.sm}px ${space.lg}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink2};
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.semibold};
  line-height: 1.25;
  white-space: nowrap;
  cursor: pointer;
  text-decoration: none;
  transition: background ${motion.hover}, border-color ${motion.hover};

  &:hover:not(:disabled) { background: ${color.surfaceSubtle}; border-color: ${color.borderStrong}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
  &:disabled { opacity: 0.58; cursor: not-allowed; }

  @media (max-width: 760px) { min-height: ${controlHeight.lg}px; }
`;

export const StatusLine = styled.div<{ $tone?: ToneName; $empty?: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${space.md}px;
  min-width: 0;
  padding: ${space.md}px ${space.lg}px;
  border: 1px ${({ $empty }) => $empty ? 'dashed' : 'solid'} ${({ $tone = 'neutral', $empty }) => $empty ? color.borderStrong : tone[$tone].border};
  border-radius: ${radius.control}px;
  background: ${({ $tone = 'neutral' }) => tone[$tone].bg};
  color: ${color.ink2};
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.medium};
  line-height: 1.5;

  > svg { flex: 0 0 auto; color: ${({ $tone = 'neutral' }) => tone[$tone].fg}; }
  > span { min-width: 0; overflow-wrap: anywhere; }
`;

export const Spinner = styled(motionElement.span)`
  display: inline-flex;
  flex: 0 0 auto;
  color: ${color.ink3};
`;

export const Guide = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${space.md}px;
  padding: ${space.lg}px;
  border: 1px solid ${tone.info.border};
  border-radius: ${radius.control}px;
  background: ${tone.info.bg};

  p { flex: 1; }
  button { flex: 0 0 auto; }
`;

export const GuideContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
`;

export const LoginForm = styled.form<{ $stacked?: boolean }>`
  display: flex;
  align-items: ${({ $stacked }) => $stacked ? 'stretch' : 'flex-end'};
  flex-direction: ${({ $stacked }) => $stacked ? 'column' : 'row'};
  flex-wrap: wrap;
  gap: ${space.md}px;
  min-width: 0;

  label {
    display: flex;
    flex: ${({ $stacked }) => $stacked ? '0 0 auto' : '1 1 150px'};
    flex-direction: column;
    gap: ${space.xs}px;
    color: ${color.ink3};
    font-size: ${fontSize.meta};
    font-weight: ${fontWeight.medium};
  }

  input {
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
    height: ${controlHeight.sm}px;
    padding: 0 ${space.lg}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.control}px;
    background: ${color.surface};
    color: ${color.ink};
    font-size: ${fontSize.bodySm};
    font-weight: ${fontWeight.medium};

    &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
  }

  @media (max-width: 760px) {
    input { height: ${controlHeight.lg}px; }
  }
`;

export const AppScreen = styled.div`
  width: 100%;
  height: 100vh;
  height: 100dvh;
  box-sizing: border-box;
  padding: ${space.xl}px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: ${color.pageBg};
  color: ${color.ink};
  font-family: ${font.family};

  *, *::before, *::after { font-family: inherit; }
`;

export const AppEntryCard = styled.section`
  width: min(100%, 440px);
  max-height: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: ${space.xxxl}px;
  padding: ${space.huge}px;
  background: ${color.surface};
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.panel};
  ${scrollbar}

  h2 {
    margin: 0;
    font-size: ${fontSize.sectionTitle};
    font-weight: ${fontWeight.semibold};
    letter-spacing: -0.02em;
  }
`;

export const AppIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.lg}px;
  min-width: 0;

  > svg {
    flex: 0 0 auto;
    padding: ${space.md}px;
    box-sizing: content-box;
    border: 1px solid ${color.brandBorder};
    border-radius: ${radius.control}px;
    background: ${color.brandSoft};
    color: ${color.brand};
  }

  strong {
    color: ${color.ink};
    font-size: ${fontSize.sectionTitle};
    font-weight: ${fontWeight.semibold};
    letter-spacing: -0.02em;
  }
`;

export const AppHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${space.md}px;
  padding: ${space.md}px ${space.xl}px;
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  box-shadow: ${shadow.card};
`;

export const AppMonitor = styled.div`
  width: 100%;
  min-height: 0;
`;

export const SettingsBackdrop = styled(motionElement.div)`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.modalBackdrop};
  background: ${color.overlay};
`;

export const SettingsPositioner = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.modal};
  display: grid;
  align-items: center;
  justify-items: center;
  padding: ${space.xl}px;
  box-sizing: border-box;
  pointer-events: none;
`;

export const SettingsDialog = styled(motionElement.section)`
  width: min(100%, 600px);
  max-height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: ${space.xxxl}px;
  padding: ${space.xxxl}px;
  box-sizing: border-box;
  overflow: auto;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  color: ${color.ink};
  box-shadow: ${shadow.modal};
  font-family: ${font.family};
  pointer-events: auto;
  ${scrollbar}

  *, *::before, *::after { font-family: inherit; }

  h2 {
    margin: 0;
    font-size: ${fontSize.cardTitle};
    font-weight: ${fontWeight.semibold};
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
`;
