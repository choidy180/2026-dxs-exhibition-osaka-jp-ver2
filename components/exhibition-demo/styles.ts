import styled from 'styled-components';
import { color, controlHeight, exhibitionDemo, focusRing, font, fontSize, motion, radius, shadow, space, tone, zIndex } from '@/styles/design-tokens';

export const PageFrame = styled.div`width: 100%; min-height: 100vh;`;
export const TransitionCover = styled.div`
  position: fixed; inset: 0; z-index: ${zIndex.pageTransition}; background: ${color.pageBg}; pointer-events: auto;
`;
export const PanelDock = styled.aside`
  position: fixed; top: ${space.md}px; right: ${space.xl}px; z-index: ${zIndex.demoControls};
  font-family: ${font.family}; color: ${color.ink2};
  *, *::before, *::after { box-sizing: border-box; font-family: inherit; }
`;
export const Handle = styled.button<{ $active: boolean }>`
  position: absolute; top: 0; right: 0; width: ${exhibitionDemo.handleWidth}px; height: ${controlHeight.md}px;
  display: flex; align-items: center; gap: ${space.sm}px; padding: 0 ${space.lg}px;
  border: 1px solid ${({ $active }) => $active ? tone.success.border : color.border};
  background: ${({ $active }) => $active ? tone.success.bg : color.surface};
  border-radius: ${radius.control}px; color: ${color.ink2}; font-size: ${fontSize.meta};
  box-shadow: ${shadow.card}; cursor: pointer; font-weight: 600;
  &:focus-visible { outline: ${focusRing}; outline-offset: ${space.xs}px; }
`;
export const Panel = styled.section`
  position: absolute; top: ${controlHeight.lg}px; right: 0; width: ${exhibitionDemo.panelWidth}px;
  max-height: calc(100dvh - ${controlHeight.lg + space.huge * 2}px); overflow-y: auto;
  padding: ${space.xxxl}px; border: 1px solid ${color.border}; border-radius: ${radius.card}px;
  background: ${color.surface}; box-shadow: ${shadow.popover}; display: flex; flex-direction: column; gap: ${space.xl}px;
  h2 { margin: 0; font-size: ${fontSize.sectionTitle}; font-weight: 600; color: ${color.ink}; }
  p { margin: 0; font-size: ${fontSize.bodySm}; line-height: 1.6; }
`;
export const PanelHead = styled.div`display: flex; align-items: center; justify-content: space-between; gap: ${space.md}px;`;
export const Button = styled.button`
  min-height: ${controlHeight.sm}px; padding: ${space.sm}px ${space.lg}px; display: inline-flex;
  align-items: center; justify-content: center; gap: ${space.sm}px;
  border: 1px solid ${color.border}; border-radius: ${radius.control}px;
  background: ${color.surface}; color: ${color.ink2}; font-size: ${fontSize.bodySm}; font-weight: 500; cursor: pointer;
  transition: background ${motion.hover}, border-color ${motion.hover};
  &:hover { background: ${color.surfaceSubtle}; border-color: ${color.borderStrong}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: ${space.xs}px; }
  &:disabled { opacity: .58; cursor: wait; }
`;
export const Switch = styled(Button)<{ $active: boolean }>`
  justify-content: space-between; min-height: ${controlHeight.lg}px; width: 100%;
  border-color: ${({ $active }) => $active ? tone.success.border : color.border};
  background: ${({ $active }) => $active ? tone.success.bg : color.surfaceSubtle};
  strong { color: ${({ $active }) => $active ? tone.success.fg : color.ink3}; font-weight: 600; }
`;
export const Status = styled.div<{ $error?: boolean }>`
  display: flex; flex-direction: column; gap: ${space.sm}px; padding: ${space.xl}px;
  border: 1px solid ${({ $error }) => $error ? tone.danger.border : color.border}; border-radius: ${radius.control}px;
  background: ${({ $error }) => $error ? tone.danger.bg : color.surfaceSubtle};
  font-size: ${fontSize.bodySm}; line-height: 1.5;
  span { color: ${color.ink3}; font-size: ${fontSize.meta}; }
`;
export const Actions = styled.div`display: flex; gap: ${space.md}px; > button { flex: 1; }`;
export const FocusRing = styled.div`
  position: fixed; z-index: ${zIndex.demoFocus}; pointer-events: none;
  border: 1px solid ${color.brand}; border-radius: ${radius.card}px;
  background: color-mix(in srgb, ${color.brandSoft} 16%, transparent);
`;
export const Cursor = styled.span`
  position: fixed; z-index: ${zIndex.demoFocus}; pointer-events: none; display: grid; place-items: center;
  width: ${exhibitionDemo.cursorSize}px; height: ${exhibitionDemo.cursorSize}px; color: ${color.brand};
  border: 1px solid ${color.brandBorder}; border-radius: ${radius.control}px; background: ${color.surface}; box-shadow: ${shadow.card};
`;
export const DemoGuideScope = styled.div`
  [data-demo-speech] { width: min(${exhibitionDemo.guideWidth}px, 100%); }
  [data-demo-mascot] { width: ${controlHeight.lg * 4}px; flex-basis: ${controlHeight.lg * 4}px; }
`;
