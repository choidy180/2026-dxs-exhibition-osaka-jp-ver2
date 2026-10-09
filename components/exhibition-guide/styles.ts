import styled from 'styled-components';
import { color, controlHeight, exhibitionGuide, focusRing, font, fontSize, motion, radius, shadow, space, zIndex } from '@/styles/design-tokens';

export const GuideLayerRoot = styled.div`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: visible;
  pointer-events: none;
  z-index: ${zIndex.exhibitionGuide};
  /* 챗봇 이용 중에는 최상위 캐릭터 안내가 대화와 입력을 가리지 않게 한다. */
  body:has([data-ai-advisor-panel]) &:not(:has([data-demo-advisor-guide])) { visibility: hidden; }
  &::backdrop { background: transparent; pointer-events: none; }
`;

export const Dock = styled.aside<{ $fullWidth: boolean; $mobileAllowed: boolean; $mobileFullWidth: boolean }>`
  position: fixed;
  left: ${({ $fullWidth }) => $fullWidth ? `${space.xl}px` : `calc(var(--app-guide-offset, 84px) + ${space.xl}px)`};
  right: ${space.xl}px;
  bottom: ${space.xl}px;
  z-index: ${zIndex.exhibitionGuide};
  display: flex;
  align-items: center;
  gap: ${space.huge}px;
  width: auto;
  min-width: 0;
  pointer-events: none;
  font-family: ${font.family};
  transition: left ${motion.value};
  *, *::before, *::after { box-sizing: border-box; font-family: inherit; }

  @media (max-width: 1200px) { gap: ${space.xl}px; }
  @media (max-width: 760px) {
    display: ${({ $mobileAllowed }) => $mobileAllowed ? 'flex' : 'none'};
    left: ${({ $fullWidth, $mobileFullWidth }) => $fullWidth || $mobileFullWidth ? `${space.md}px` : `calc(var(--app-guide-offset, 84px) + ${space.md}px)`};
    right: ${space.md}px;
    bottom: ${space.md}px;
    width: auto;
    max-height: calc(100dvh - ${space.huge}px);
    flex-direction: column-reverse;
    align-items: flex-start;
    gap: ${space.md}px;
  }
`;

export const FocusBackdrop = styled.div`
  position: absolute;
  top: var(--guide-focus-top, calc(50% - ${exhibitionGuide.focusBackdrop.centerOffset}px));
  right: -${space.xl}px;
  bottom: -${space.xl}px;
  width: 100vw;
  pointer-events: none;
  background: color-mix(in srgb, ${color.surface} ${exhibitionGuide.focusBackdrop.surfaceOpacity}%, transparent);
  -webkit-backdrop-filter: blur(${exhibitionGuide.focusBackdrop.blur}px);
  backdrop-filter: blur(${exhibitionGuide.focusBackdrop.blur}px);
  -webkit-mask-image: linear-gradient(to bottom, transparent, ${color.surface} ${exhibitionGuide.focusBackdrop.fadeHeight}px);
  mask-image: linear-gradient(to bottom, transparent, ${color.surface} ${exhibitionGuide.focusBackdrop.fadeHeight}px);

  @media (max-width: 760px) {
    right: -${space.md}px;
    bottom: -${space.md}px;
  }
`;

export const MascotButton = styled.button`
  position: relative;
  flex: 0 0 ${exhibitionGuide.mascotWidth.desktop}px;
  width: ${exhibitionGuide.mascotWidth.desktop}px;
  display: flex;
  align-items: flex-end;
  padding: ${space.huge}px 0 ${space.huge}px;
  border: 1px solid transparent;
  border-radius: ${radius.card}px;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  img { display: block; width: 100%; height: auto; user-select: none; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
  @media (max-width: 1500px) { flex-basis: ${exhibitionGuide.mascotWidth.medium}px; width: ${exhibitionGuide.mascotWidth.medium}px; }
  @media (max-width: 1200px) { flex-basis: ${exhibitionGuide.mascotWidth.compact}px; width: ${exhibitionGuide.mascotWidth.compact}px; }
  @media (max-width: 760px) { flex: 0 0 auto; width: ${exhibitionGuide.mascotWidth.mobile}px; max-width: 100%; padding: ${space.sm}px 0 ${space.huge}px; }
`;

export const MascotArt = styled.span`
  display: block;
  width: 100%;
  transform-origin: 50% 95%;
  will-change: transform;
  @media (prefers-reduced-motion: reduce) { will-change: auto; }
`;

export const Bubble = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 0 1 auto;
  width: max-content;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  max-height: calc(100dvh - ${space.huge * 2}px);
  padding: ${space.huge}px;
  background: ${color.surface};
  color: ${color.ink2};
  border: 1px solid ${color.borderStrong};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.popover};
  pointer-events: auto;
  &::before {
    content: '';
    position: absolute;
    left: -${space.lg + 1}px;
    top: 50%;
    width: ${space.huge}px;
    height: ${space.huge}px;
    background: ${color.surface};
    border: 1px solid ${color.borderStrong};
    transform: translateY(-50%) rotate(45deg);
    clip-path: polygon(0 0, 0 100%, 100% 100%);
  }
  @media (max-width: 1200px) { padding: ${space.xxxl}px; }
  @media (max-width: 760px) {
    flex: 0 1 auto;
    &::before { left: ${space.huge * 3}px; top: auto; bottom: -${space.lg + 1}px; transform: rotate(-45deg); }
  }
`;

export const BubbleHeader = styled.div`display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: ${space.md}px; margin-bottom: ${space.xl}px;`;
export const Name = styled.span`display: inline-flex; align-items: center; gap: ${space.md}px; color: ${color.ink3}; font-size: ${fontSize.guideControl}; font-weight: 500; svg { color: ${color.brand}; }`;
export const CloseButton = styled.button`
  display: grid; place-items: center; flex-shrink: 0; width: ${controlHeight.lg}px; height: ${controlHeight.lg}px;
  margin: -${space.sm}px -${space.sm}px -${space.sm}px 0;
  border: 1px solid transparent; border-radius: ${radius.control}px;
  background: transparent; color: ${color.ink3}; cursor: pointer;
  &:hover { background: ${color.surfaceSubtle}; border-color: ${color.border}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
`;
export const Title = styled.h2`flex-shrink: 0; margin: 0 0 ${space.xl}px; font-size: ${fontSize.guideTitle}; color: ${color.ink}; font-weight: 600; line-height: 1.4; letter-spacing: -.02em; overflow-wrap: anywhere;`;
export const Speech = styled.p`min-height: 0; margin: 0; overflow-y: auto; font-size: ${fontSize.guideSpeech}; font-weight: 400; line-height: 1.65; word-break: normal; overflow-wrap: anywhere;`;
export const Unspoken = styled.span`visibility: hidden;`;
export const ScreenReaderText = styled.span`position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;`;
export const BubbleFooter = styled.div`display: flex; flex-shrink: 0; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: ${space.md}px; margin-top: ${space.huge}px;`;
export const StepCount = styled.span`display: inline-flex; align-items: center; gap: ${space.sm}px; color: ${color.ink3}; font-size: ${fontSize.guideControl}; > span:last-child { margin-left: ${space.sm}px; }`;
export const StepDot = styled.span<{ $active: boolean }>`width: ${space.md}px; height: ${space.md}px; border-radius: ${radius.bar}px; background: ${({ $active }) => $active ? color.brand : color.fill}; border: 1px solid ${({ $active }) => $active ? color.brand : color.border};`;
export const NextButton = styled.button`
  min-height: ${controlHeight.lg}px; display: inline-flex; align-items: center; justify-content: center; gap: ${space.md}px;
  padding: ${space.md}px ${space.xxxl}px; border: 1px solid ${color.border}; border-radius: ${radius.control}px;
  background: ${color.surfaceSubtle}; color: ${color.ink2}; font-size: ${fontSize.guideControl}; font-weight: 500; cursor: pointer;
  transition: background ${motion.hover}, border-color ${motion.hover};
  &:hover { background: ${color.brandSoft}; border-color: ${color.brand}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
`;
export const ReopenBadge = styled.span`
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); display: flex; align-items: center; justify-content: center;
  gap: ${space.md}px; width: max-content; max-width: 100%; padding: ${space.md}px ${space.xl}px;
  background: ${color.surface}; color: ${color.ink2}; border: 1px solid ${color.border}; border-radius: ${radius.control}px;
  box-shadow: ${shadow.card}; font-size: ${fontSize.guideControl}; font-weight: 500;
`;
export const ImageState = styled.span`
  position: absolute; inset: ${space.md}px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: ${space.md}px; padding: ${space.md}px; background: ${color.surfaceSubtle}; color: ${color.ink3};
  border: 1px solid ${color.border}; border-radius: ${radius.card}px; font-size: ${fontSize.caption};
`;
