import styled from 'styled-components';
import { motion as animate } from 'framer-motion';
import { color, tone, font, fontSize, fontWeight, space, radius, shadow, controlHeight, motion, zIndex, focusRing, scrollbar } from '@/styles/design-tokens';

export const LauncherMark = styled.span`
  width: ${controlHeight.lg}px;
  height: ${controlHeight.lg}px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1px solid ${color.brand};
  border-radius: ${radius.control}px;
  background: ${color.brand};
  color: ${color.surface};
  box-shadow: ${shadow.card};
  transition: background ${motion.hover}, border-color ${motion.hover};
`;

export const LauncherCopy = styled.span<{ $corner: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $corner }) => $corner ? 'flex-start' : 'center'};
  gap: ${space.xs}px;
  min-width: 0;
`;

export const LauncherTitle = styled.span<{ $corner: boolean }>`
  color: ${color.ink2};
  font-size: ${({ $corner }) => $corner ? fontSize.body : fontSize.caption};
  font-weight: ${fontWeight.semibold};
  letter-spacing: -.02em;
  line-height: 1.25;
  white-space: nowrap;
`;

export const LauncherHint = styled.span`
  color: ${color.ink3};
  font-size: ${fontSize.caption};
  font-weight: ${fontWeight.regular};
  line-height: 1.25;
  white-space: nowrap;
`;

export const LauncherArrow = styled.span`
  display: grid;
  place-items: center;
  margin-left: ${space.sm}px;
  color: ${color.ink3};
`;

export const Launcher = styled(animate.button)<{ $corner: boolean }>`
  position: fixed;
  left: ${({ $corner }) => $corner ? 'auto' : `${space.xl}px`};
  right: ${({ $corner }) => $corner ? `${space.huge}px` : 'auto'};
  bottom: ${({ $corner }) => $corner ? space.huge : space.xl}px;
  z-index: ${zIndex.advisorLauncher};
  width: ${({ $corner }) => $corner ? 'auto' : '60px'};
  min-height: ${({ $corner }) => $corner ? 66 : 80}px;
  padding: ${({ $corner }) => $corner ? `${space.lg}px ${space.xxl}px ${space.lg}px ${space.lg}px` : `${space.sm}px 0`};
  display: flex;
  flex-direction: ${({ $corner }) => $corner ? 'row' : 'column'};
  align-items: center;
  justify-content: center;
  gap: ${({ $corner }) => $corner ? space.xl : space.sm}px;
  border: 1px solid ${({ $corner }) => $corner ? color.border : 'transparent'};
  border-radius: ${radius.card}px;
  background: ${({ $corner }) => $corner ? color.surface : 'transparent'};
  box-shadow: ${({ $corner }) => $corner ? shadow.popover : 'none'};
  color: ${color.ink2};
  font-family: ${font.family};
  font-size: ${fontSize.caption};
  font-weight: ${fontWeight.semibold};
  cursor: pointer;
  text-align: left;
  &, * { box-sizing: border-box; }
  * { font-family: inherit; }
  transition: background ${motion.hover}, border-color ${motion.hover}, box-shadow ${motion.hover};
  &:hover, &[aria-expanded='true'] {
    background: ${color.brandSoft};
    border-color: ${color.brandBorder};
    ${LauncherMark} { background: ${color.brandStrong}; border-color: ${color.brandStrong}; }
    ${LauncherArrow} { color: ${color.brand}; }
  }
  &:focus-visible { outline: ${focusRing}; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    &, ${LauncherMark} { transition: none; }
  }
`;

export const Overlay = styled(animate.div)`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.advisorBackdrop};
  display: flex;
  justify-content: flex-end;
  padding: ${space.xl}px;
  background: ${color.overlay};
  font-family: ${font.family};
  &, *, *::before, *::after { box-sizing: border-box; }
  * { font-family: inherit; }
  button:focus-visible, textarea:focus-visible, [tabindex]:focus-visible {
    outline: ${focusRing};
    outline-offset: 2px;
  }
`;

export const Panel = styled(animate.section)`
  position: relative;
  z-index: ${zIndex.advisorPanel};
  width: min(1040px, 100%);
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.modal};
  color: ${color.ink2};
`;

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.xl}px;
  padding: ${space.xxxl}px ${space.huge}px;
  border-bottom: 1px solid ${color.border};
  h2 { margin: 0; font-size: ${fontSize.pageTitle}; font-weight: ${fontWeight.semibold}; color: ${color.ink}; }
  p { margin: ${space.xs}px 0 0; font-size: ${fontSize.meta}; color: ${color.ink3}; }
`;

export const HeaderTitle = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${space.xl}px;
`;

export const Avatar = styled.div`
  width: ${controlHeight.lg}px;
  height: ${controlHeight.lg}px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: ${radius.control}px;
  border: 1px solid ${color.brandBorder};
  background: ${color.brandSoft};
  color: ${color.brand};
`;

export const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.md}px;
  flex-shrink: 0;
`;

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${space.sm}px;
  min-height: ${controlHeight.sm}px;
  padding: ${space.sm}px ${space.lg}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink2};
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.medium};
  cursor: pointer;
  transition: background ${motion.hover}, border-color ${motion.hover};
  &:hover:not(:disabled) { background: ${color.surfaceSubtle}; border-color: ${color.borderStrong}; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

export const IconButton = styled(Button)`
  width: ${controlHeight.md}px;
  height: ${controlHeight.md}px;
  padding: 0;
`;

export const Workspace = styled.div`
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: clamp(230px, 23vw, 260px) minmax(0, 1fr);
  @media (max-width: 1200px) { grid-template-columns: 230px minmax(0, 1fr); }
  @media (max-width: 760px) { grid-template-columns: minmax(0, 1fr); }
`;

export const Sidebar = styled.aside`
  min-height: 0;
  overflow-y: auto;
  padding: ${space.xxxl}px;
  background: ${color.surfaceSubtle};
  border-right: 1px solid ${color.border};
  display: flex;
  flex-direction: column;
  gap: ${space.huge}px;
  ${scrollbar}
  h3 { margin: 0 0 ${space.lg}px; display: flex; align-items: center; gap: ${space.md}px; font-size: ${fontSize.body}; font-weight: ${fontWeight.semibold}; color: ${color.ink}; }
  p { margin: 0; font-size: ${fontSize.meta}; color: ${color.ink3}; line-height: 1.6; }
  @media (max-width: 760px) { display: none; }
`;

export const ExampleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
  ${Button} { justify-content: flex-start; text-align: left; line-height: 1.5; }
`;

export const HistoryButton = styled(Button)`
  width: 100%;
  justify-content: flex-start;
  margin-bottom: ${space.md}px;
  text-align: left;
  span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

export const Chat = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
`;

export const DataStatus = styled.div<{ $error?: boolean }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${space.md}px;
  margin: ${space.xl}px ${space.xxxl}px 0;
  padding: ${space.md}px ${space.lg}px;
  border: 1px solid ${({ $error }) => $error ? tone.warning.border : tone.info.border};
  border-radius: ${radius.row}px;
  background: ${({ $error }) => $error ? tone.warning.bg : tone.info.bg};
  color: ${({ $error }) => $error ? tone.warning.fg : tone.info.fg};
  font-size: ${fontSize.caption};
  line-height: 1.5;
`;

export const MessageList = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: ${space.xxxl}px;
  ${scrollbar}
`;

export const Welcome = styled.div`
  min-height: 220px;
  padding: ${space.huge}px;
  border: 1px dashed ${color.borderStrong};
  border-radius: ${radius.card}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: ${space.xl}px;
  background: ${color.surfaceSubtle};
  > svg { color: ${color.brand}; }
  h3 { margin: 0; font-size: ${fontSize.cardTitle}; color: ${color.ink}; font-weight: ${fontWeight.semibold}; }
  p { margin: 0; font-size: ${fontSize.body}; line-height: 1.7; color: ${color.ink3}; }
`;

export const Message = styled.article<{ $user: boolean }>`
  min-width: 0;
  margin: 0 0 ${space.xxxl}px;
  padding: ${space.xl}px;
  border: 1px solid ${({ $user }) => $user ? color.brandBorder : color.border};
  border-radius: ${radius.card}px;
  background: ${({ $user }) => $user ? color.brandSoft : color.surface};
  > strong { display: block; margin-bottom: ${space.md}px; font-size: ${fontSize.caption}; color: ${color.ink3}; font-weight: ${fontWeight.semibold}; }
  > p { margin: 0; color: ${color.ink2}; white-space: pre-wrap; overflow-wrap: anywhere; font-size: ${fontSize.body}; line-height: 1.7; }
  > section { margin-top: ${space.xl}px; }
`;

export const StateCard = styled.div<{ $error?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${space.lg}px;
  padding: ${space.xl}px;
  margin-bottom: ${space.xxxl}px;
  background: ${({ $error }) => $error ? tone.danger.bg : tone.info.bg};
  border: 1px solid ${({ $error }) => $error ? tone.danger.border : tone.info.border};
  border-radius: ${radius.card}px;
  font-size: ${fontSize.bodySm};
  line-height: 1.6;
  > svg { flex-shrink: 0; margin-top: ${space.xs}px; color: ${({ $error }) => $error ? tone.danger.fg : tone.info.fg}; }
  > div { min-width: 0; flex: 1; }
  p { margin: 0 0 ${space.md}px; overflow-wrap: anywhere; }
  small { display: block; color: ${color.ink3}; margin-bottom: ${space.md}px; }
`;

export const BottomBar = styled.div`
  flex-shrink: 0;
  padding: 0 ${space.xxxl}px ${space.md}px;
  display: flex;
  flex-wrap: wrap;
  gap: ${space.md}px;
`;

export const Composer = styled.form`
  flex-shrink: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: ${space.lg}px;
  margin: 0 ${space.xxxl}px;
  padding: ${space.lg}px;
  border: 1px solid ${color.borderStrong};
  border-radius: ${radius.control}px;
  background: ${color.surface};
`;

export const Input = styled.textarea`
  width: 100%;
  min-width: 0;
  height: 54px;
  padding: ${space.sm}px;
  resize: none;
  border: 0;
  border-radius: ${radius.row}px;
  background: ${color.surface};
  color: ${color.ink};
  font-size: ${fontSize.body};
  line-height: 1.5;
  &::placeholder { color: ${color.ink4}; }
`;

export const SendButton = styled(Button)`
  height: ${controlHeight.lg}px;
  background: ${color.brandSoft};
  border-color: ${color.brandBorder};
  color: ${color.brand};
  font-weight: ${fontWeight.semibold};
  &:hover:not(:disabled) { background: ${color.brandSoft}; border-color: ${color.brand}; }
`;

export const Footnote = styled.div`
  padding: ${space.md}px ${space.xxxl}px ${space.xl}px;
  display: flex;
  justify-content: space-between;
  gap: ${space.md}px;
  color: ${color.ink3};
  font-size: ${fontSize.caption};
  line-height: 1.5;
`;
