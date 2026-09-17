'use client';

import styled from 'styled-components';
import { motion as animated } from 'framer-motion';
import { color, controlHeight, focusRing, font, fontSize, fontWeight, motion, radius, scrollbar, space, tone } from '@/styles/design-tokens';

export const MobileApp = styled.div`
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: ${color.pageBg};
  color: ${color.ink};
  font-family: ${font.family};
  *, *::before, *::after { box-sizing: border-box; font-family: inherit; }
  button, input { font: inherit; }
  button, a, input { &:focus-visible { outline: ${focusRing}; outline-offset: 3px; } }
`;

export const AppContent = styled.div`
  width: min(100%, 720px);
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  padding: env(safe-area-inset-top) ${space.xxxl}px calc(${space.huge}px + env(safe-area-inset-bottom));
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  ${scrollbar}
  @media (max-width: 760px) { padding-inline: ${space.xl}px; scrollbar-gutter: auto; }
`;

export const BrandHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${space.xl}px;
  min-height: 92px;
  padding: ${space.huge}px ${space.xs}px;
`;
export const BrandIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.xl}px;
  img { object-fit: contain; }
  div { display: flex; flex-direction: column; gap: ${space.xs}px; }
  strong { font-size: ${fontSize.sectionTitle}; font-weight: ${fontWeight.semibold}; }
  span { color: ${color.ink3}; font-size: ${fontSize.caption}; }
`;
export const SoftButton = styled.button`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: ${space.sm}px;
  min-height: ${controlHeight.lg}px;
  padding: ${space.md}px ${space.xl}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink2};
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.semibold};
  cursor: pointer;
  text-decoration: none;
  transition: background ${motion.hover}, border-color ${motion.hover};
  &:hover:not(:disabled) { background: ${color.fill}; border-color: ${color.borderStrong}; }
  &:disabled { cursor: default; opacity: .58; }
  svg { flex-shrink: 0; }
`;
export const Card = styled(animated.section)`
  min-width: 0;
  margin-bottom: ${space.xxxl}px;
  padding: ${space.huge}px;
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  background: ${color.surface};
`;
export const CardHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${space.xl}px;
  h2 { margin: 0; font-size: ${fontSize.pageTitle}; font-weight: ${fontWeight.semibold}; letter-spacing: -.02em; }
`;
export const PushIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.xl}px;
  p { margin: ${space.xs}px 0 0; font-size: ${fontSize.meta}; color: ${color.ink3}; }
`;
export const BellTile = styled.div<{ $enabled: boolean }>`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border: 1px solid ${({ $enabled }) => $enabled ? tone.success.border : color.border};
  border-radius: ${radius.control}px;
  color: ${({ $enabled }) => $enabled ? tone.success.fg : color.ink3};
  background: ${({ $enabled }) => $enabled ? tone.success.bg : color.fill};
  transition: background ${motion.state}, color ${motion.state};
`;
export const PushSwitch = styled.button<{ $enabled: boolean }>`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 60px;
  min-height: ${controlHeight.lg}px;
  padding: 0;
  border: 0;
  border-radius: ${radius.control}px;
  background: transparent;
  cursor: pointer;
  > span {
    display: flex;
    align-items: center;
    justify-content: ${({ $enabled }) => $enabled ? 'flex-end' : 'flex-start'};
    width: 56px;
    height: 32px;
    padding: ${space.xs}px;
    border: 1px solid ${({ $enabled }) => $enabled ? tone.success.border : color.borderStrong};
    border-radius: ${radius.pill}px;
    background: ${({ $enabled }) => $enabled ? tone.success.bg : color.fill};
    transition: background ${motion.state}, border-color ${motion.state};
  }
  i { display: block; width: 22px; height: 22px; border-radius: ${radius.pill}px; background: ${({ $enabled }) => $enabled ? tone.success.fg : color.ink4}; }
  &:disabled { cursor: default; opacity: .58; }
`;
export const PushDetails = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${space.md}px;
  margin-top: ${space.xxxl}px;
  padding-top: ${space.xxxl}px;
  border-top: 1px solid ${color.divider};
  color: ${color.ink2};
  font-size: ${fontSize.meta};
  > span { display: inline-flex; align-items: center; gap: ${space.sm}px; }
`;
export const TestChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${space.sm}px;
  padding: ${space.xs}px ${space.md}px;
  border: 1px solid ${tone.info.border};
  border-radius: ${radius.control}px;
  background: ${tone.info.bg};
  color: ${tone.info.fg};
  font-size: ${fontSize.caption};
  font-weight: ${fontWeight.semibold};
`;
export const Hint = styled.p`
  margin: ${space.xl}px 0 0;
  color: ${color.ink3};
  font-size: ${fontSize.meta};
  line-height: 1.65;
  overflow-wrap: anywhere;
`;
export const Feedback = styled.div<{ $error?: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${space.md}px;
  margin-top: ${space.xl}px;
  padding: ${space.xl}px;
  border: 1px solid ${({ $error }) => $error ? tone.warning.border : tone.info.border};
  border-radius: ${radius.control}px;
  background: ${({ $error }) => $error ? tone.warning.bg : tone.info.bg};
  color: ${color.ink2};
  font-size: ${fontSize.meta};
  line-height: 1.6;
  > svg { flex-shrink: 0; color: ${({ $error }) => $error ? tone.warning.fg : tone.info.fg}; }
  > span { flex: 1 1 calc(100% - ${18 + space.md}px); min-width: 0; overflow-wrap: anywhere; }
`;
export const LoginCard = styled(Card)`
  margin-top: ${space.huge}px;
  padding: ${space.huge * 2}px ${space.huge}px;
  h1 { margin: ${space.huge}px 0 ${space.xl}px; font-size: calc(${fontSize.pageTitle} * 1.4); line-height: 1.4; letter-spacing: -.02em; font-weight: ${fontWeight.semibold}; }
  > p { margin: 0; color: ${color.ink3}; font-size: ${fontSize.body}; line-height: 1.7; }
`;
export const LoginFields = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${space.xxxl}px;
  margin-top: ${space.huge}px;
  label { display: flex; flex-direction: column; gap: ${space.md}px; color: ${color.ink2}; font-size: ${fontSize.meta}; font-weight: ${fontWeight.medium}; }
  input { width: 100%; height: 50px; padding: ${space.xl}px; border: 1px solid ${color.border}; border-radius: ${radius.control}px; background: ${color.surfaceSubtle}; color: ${color.ink}; font-size: ${fontSize.sectionTitle}; }
  input::placeholder { color: ${color.ink4}; }
`;
export const PasswordField = styled.div`
  position: relative;
  input { padding-right: 52px; }
  button { position: absolute; right: 3px; top: 3px; bottom: 3px; display: grid; place-items: center; width: ${controlHeight.lg}px; border: 0; border-radius: ${radius.control}px; background: transparent; color: ${color.ink3}; cursor: pointer; }
`;
export const LoginButton = styled(SoftButton)`
  height: 50px;
  margin-top: ${space.xs}px;
  background: ${color.brandSoft};
  border-color: ${color.brandBorder};
  color: ${color.brand};
  font-size: ${fontSize.body};
  &:hover:not(:disabled) { background: ${color.brandSoft}; border-color: ${color.brand}; }
`;
export const EntryState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${space.xxxl}px;
  padding: ${space.huge * 2}px 0;
  color: ${color.ink3};
  font-size: ${fontSize.body};
  text-align: center;
`;
export const AppFootnote = styled.p`
  margin: ${space.huge}px 0;
  color: ${color.ink4};
  font-size: ${fontSize.caption};
  text-align: center;
`;
export const HelpActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${space.md}px;
  margin-top: ${space.xl}px;
`;
