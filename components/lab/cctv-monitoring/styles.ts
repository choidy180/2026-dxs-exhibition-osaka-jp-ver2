import styled, { keyframes } from 'styled-components';
import { motion as motionElement } from 'framer-motion';
import Image from 'next/image';
import {
  color,
  controlHeight,
  focusRing,
  font,
  fontSize,
  motion,
  radius,
  scrollbar,
  shadow,
  tone,
  zIndex,
} from '@/styles/design-tokens';
import type { ToneName } from '@/styles/design-tokens';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const thumbnailPulse = keyframes`
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.85; }
`;

export const PageFontScope = styled.div`
  width: 100%;
  min-height: 100vh;
  font-family: ${font.family};

  *,
  *::before,
  *::after {
    font-family: inherit;
  }
`;

export const Shell = styled.main`
  width: 100%;
  height: 100vh;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden;
  background: ${color.pageBg};
  color: ${color.ink};
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
`;

export const Header = styled.header`
  min-height: 82px;
  padding: 16px 20px;
  background: ${color.surface};
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.panel};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  @media (max-width: 1200px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const TitleGroup = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;

  .eyebrow {
    display: block;
    color: ${color.brand};
    font-size: ${fontSize.micro};
    font-weight: 600;
    line-height: 1.1;
    text-transform: uppercase;
  }

  h1 {
    margin: 3px 0 4px;
    color: ${color.ink};
    font-size: ${fontSize.pageTitle};
    font-weight: 600;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: ${color.ink3};
    font-size: ${fontSize.meta};
    font-weight: 500;
    line-height: 1.35;
  }
`;

export const TitleIcon = styled.div`
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border-radius: ${radius.card}px;
  background: ${color.brand};
  color: ${color.surface};
  display: grid;
  place-items: center;
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
`;

export const SummaryChip = styled.span<{ $tone: ToneName }>`
  height: 32px;
  padding: 0 10px;
  border-radius: ${radius.control}px;
  border: 1px solid ${({ $tone }) => tone[$tone].border};
  background: ${({ $tone }) => tone[$tone].bg};
  color: ${({ $tone }) => tone[$tone].fg};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: ${fontSize.caption};
  font-weight: 600;
  white-space: nowrap;
`;

export const NoticeBar = styled(motionElement.div)`
  min-height: 42px;
  padding: 10px 14px;
  border-radius: ${radius.control}px;
  background: ${tone.info.bg};
  border: 1px solid ${tone.info.border};
  color: ${tone.info.fg};
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: ${fontSize.meta};
  font-weight: 600;

  svg {
    flex: 0 0 auto;
  }

  p {
    min-width: 0;
    margin: 0;
    line-height: 1.4;
    word-break: keep-all;
  }
`;

export const Workspace = styled.section`
  min-width: 0;
  min-height: 0;
  padding: 12px;
  background: ${color.surface};
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.panel};
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
`;

export const Toolbar = styled.div`
  min-width: 0;
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  @media (max-width: 1200px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const ToolbarLeft = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
`;

export const SearchField = styled.label`
  width: min(360px, 100%);
  height: 42px;
  padding: 0 10px 0 12px;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surfaceSubtle};
  color: ${color.ink4};
  display: flex;
  align-items: center;
  gap: 8px;
  transition: border-color ${motion.hover}, background ${motion.hover};

  &:focus-within {
    border-color: ${color.brand};
    background: ${color.surface};
    outline: ${focusRing};
    outline-offset: 2px;
  }

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: ${color.ink};
    font-size: ${fontSize.body};
    font-weight: 500;

    &::placeholder {
      color: ${color.ink4};
    }
  }
`;

export const ClearSearchButton = styled.button`
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: ${radius.row}px;
  background: ${color.fill};
  color: ${color.ink3};
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    color: ${color.ink};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 2px;
  }
`;

export const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
`;

export const RefreshStatus = styled.div<{ $delayed?: boolean }>`
  height: 42px;
  padding: 0 11px;
  border: 1px solid ${({ $delayed }) => ($delayed ? tone.warning.border : color.border)};
  border-radius: ${radius.control}px;
  background: ${({ $delayed }) => ($delayed ? tone.warning.bg : color.surfaceSubtle)};
  color: ${({ $delayed }) => ($delayed ? tone.warning.fg : color.ink3)};
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: ${fontSize.caption};
  font-weight: 600;
  white-space: nowrap;

  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: ${radius.pill}px;
    background: ${({ $delayed }) => ($delayed ? tone.warning.fg : color.live)};
  }
`;

export const SoftButton = styled.button`
  height: 42px;
  padding: 0 12px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink2};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: ${fontSize.meta};
  font-weight: 600;
  cursor: pointer;
  transition: background ${motion.hover}, border-color ${motion.hover}, color ${motion.hover};

  &:hover:not(:disabled) {
    background: ${color.surfaceSubtle};
    border-color: ${color.borderStrong};
    color: ${color.ink};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }

  &:disabled {
    opacity: 0.58;
    cursor: wait;
  }

  .spin {
    animation: ${spin} 0.9s linear infinite;
  }
`;

export const ViewModeControl = styled.div`
  height: ${controlHeight.lg}px;
  padding: 4px;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surfaceSubtle};
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

export const ViewModeButton = styled.button<{ $active: boolean }>`
  height: 34px;
  padding: 0 11px;
  border: 1px solid ${({ $active }) => ($active ? color.brand : 'transparent')};
  border-radius: ${radius.control}px;
  background: ${({ $active }) => ($active ? color.brand : 'transparent')};
  color: ${({ $active }) => ($active ? color.surface : color.ink3)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: ${fontSize.caption};
  font-weight: 600;
  cursor: pointer;
  transition: background ${motion.state}, border-color ${motion.state}, color ${motion.state};

  &:hover {
    background: ${({ $active }) => ($active ? color.brandStrong : color.brandSoft)};
    border-color: ${({ $active }) => ($active ? color.brandStrong : color.brandBorder)};
    color: ${({ $active }) => ($active ? color.surface : color.brand)};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }
`;

export const ListLayout = styled.div`
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: clamp(300px, 22vw, 360px) minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;

  @media (max-width: 1500px) {
    grid-template-columns: 288px minmax(0, 1fr);
  }

  @media (max-width: 1200px) {
    grid-template-columns: 260px minmax(0, 1fr);
  }
`;

export const Panel = styled.section`
  min-width: 0;
  min-height: 0;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  overflow: hidden;
`;

export const CameraListPanel = styled(Panel)`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
`;

export const PanelHeader = styled.div`
  min-height: 56px;
  padding: 10px 12px;
  border-bottom: 1px solid ${color.border};
  background: ${color.surfaceSubtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  .title {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title > svg {
    flex: 0 0 auto;
    color: ${color.brand};
  }

  h2 {
    margin: 0;
    color: ${color.ink};
    font-size: ${fontSize.sectionTitle};
    font-weight: 600;
    letter-spacing: -0.02em;
  }
`;

export const CountBadge = styled.span`
  padding: 3px 8px;
  border-radius: ${radius.control}px;
  border: 1px solid ${color.brandBorder};
  background: ${color.brandSoft};
  color: ${color.brand};
  font-size: ${fontSize.caption};
  font-weight: 600;
  white-space: nowrap;
`;

export const BuildingScroller = styled.div`
  min-height: 0;
  padding: 8px;
  overflow-y: auto;
  background: ${color.surfaceSubtle};
  ${scrollbar}
`;

export const BuildingBlock = styled.section`
  & + & {
    margin-top: 8px;
  }
`;

export const BuildingHeader = styled.button`
  width: 100%;
  min-height: 44px;
  padding: 7px 9px;
  border: 1px solid ${color.border};
  border-radius: ${radius.row}px;
  background: ${color.surface};
  color: ${color.ink2};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  transition: background ${motion.hover}, border-color ${motion.hover};

  &:hover {
    border-color: ${color.borderStrong};
    background: ${color.fill};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 2px;
  }
`;

export const BuildingIdentity = styled.span`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  svg {
    flex: 0 0 auto;
    color: ${color.ink3};
  }

  strong {
    color: ${color.ink};
    font-size: ${fontSize.bodySm};
    font-weight: 600;
  }
`;

export const BuildingCounts = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${color.ink3};
  font-size: ${fontSize.caption};
  font-weight: 600;
  white-space: nowrap;

  .online {
    color: ${tone.success.fg};
  }
`;

export const CameraRowList = styled(motionElement.div)`
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow: hidden;
`;

export const CameraRowButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  min-height: 66px;
  padding: 7px;
  border: 1px solid ${({ $selected }) => ($selected ? color.brandBorder : color.borderSoft)};
  border-radius: ${radius.row}px;
  background: ${({ $selected }) => ($selected ? color.brandSoft : color.surface)};
  color: ${color.ink2};
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  text-align: left;
  cursor: pointer;
  transition: background ${motion.hover}, border-color ${motion.hover}, transform ${motion.hover};

  &:hover {
    transform: translateX(2px);
    border-color: ${({ $selected }) => ($selected ? color.brand : color.borderStrong)};
    background: ${({ $selected }) => ($selected ? color.brandSoft : color.surfaceSubtle)};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 2px;
  }
`;

export const ThumbnailFrame = styled.div<{ $large?: boolean; $offline?: boolean }>`
  position: relative;
  width: 100%;
  height: ${({ $large }) => ($large ? '100%' : '46px')};
  min-height: ${({ $large }) => ($large ? 0 : '46px')};
  border-radius: ${({ $large }) => ($large ? radius.card : radius.row)}px;
  overflow: hidden;
  background: ${color.ink};

  .camera-image {
    object-fit: cover;
    opacity: ${({ $offline }) => ($offline ? 0.5 : 1)};
    transition: opacity ${motion.value};
  }
`;

export const CameraImage = styled(Image)<{ $position: string }>`
  object-fit: cover;
  object-position: ${({ $position }) => $position};
  transform: scale(1.14);
  transform-origin: ${({ $position }) => $position};
`;

export const ThumbnailLoading = styled.div`
  position: absolute;
  inset: 0;
  background: ${color.ink2};
  color: ${color.ink4};
  display: grid;
  place-items: center;
  animation: ${thumbnailPulse} 1.2s ease-in-out infinite;

  svg {
    animation: ${spin} 0.9s linear infinite;
  }
`;

export const ThumbnailFailure = styled.div<{ $large?: boolean }>`
  position: absolute;
  inset: 0;
  padding: ${({ $large }) => ($large ? 8 : 4)}px;
  background: ${color.ink};
  color: ${color.surface};
  display: flex;
  flex-direction: ${({ $large }) => ($large ? 'column' : 'row')};
  align-items: center;
  justify-content: center;
  gap: ${({ $large }) => ($large ? 7 : 4)}px;
  text-align: center;

  span {
    font-size: ${({ $large }) => ($large ? fontSize.bodySm : fontSize.caption)};
    font-weight: 600;
  }

  button {
    height: 28px;
    padding: 0 9px;
    border: 1px solid ${color.borderStrong};
    border-radius: ${radius.row}px;
    background: ${color.surface};
    color: ${color.ink2};
    font-size: ${fontSize.caption};
    font-weight: 600;
    cursor: pointer;

    &:focus-visible {
      outline: ${focusRing};
      outline-offset: 2px;
    }
  }
`;

export const CameraUnavailable = styled.span<{ $tone: 'warning' | 'danger' }>`
  position: absolute;
  inset: auto auto 5px 5px;
  min-height: 20px;
  padding: 2px 4px;
  border: 1px solid ${({ $tone }) => tone[$tone].border};
  border-radius: ${radius.row}px;
  background: ${({ $tone }) => tone[$tone].bg};
  color: ${({ $tone }) => tone[$tone].fg};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: ${fontSize.caption};
  font-weight: 600;
`;

export const CameraRowText = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: ${color.ink};
    font-size: ${fontSize.meta};
    font-weight: 600;
  }

  small {
    color: ${color.ink3};
    font-size: ${fontSize.caption};
    font-weight: 500;
  }
`;

export const CameraCode = styled.span`
  color: ${color.ink3};
  font-family: ${font.mono};
  font-size: ${fontSize.caption};
  font-weight: 600;
`;

export const ViewerPanel = styled(Panel)`
  padding: 14px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
`;

export const ViewerHeader = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const ViewerTitle = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;

  > svg {
    flex: 0 0 auto;
    color: ${color.brand};
  }

  div {
    min-width: 0;
  }

  h2,
  p {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  h2 {
    margin: 0;
    color: ${color.ink};
    font-size: ${fontSize.cardTitle};
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  p {
    margin: 3px 0 0;
    color: ${color.ink3};
    font-size: ${fontSize.caption};
    font-weight: 500;
  }
`;

export const ViewerActions = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const StatusBadge = styled.span<{ $tone: ToneName }>`
  height: 30px;
  padding: 0 9px;
  border: 1px solid ${({ $tone }) => tone[$tone].border};
  border-radius: ${radius.control}px;
  background: ${({ $tone }) => tone[$tone].bg};
  color: ${({ $tone }) => tone[$tone].fg};
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: ${fontSize.caption};
  font-weight: 600;
  white-space: nowrap;

  .dot {
    width: 7px;
    height: 7px;
    border-radius: ${radius.pill}px;
    background: currentColor;
  }
`;

export const ViewerStage = styled.div`
  position: relative;
  min-width: 0;
  min-height: 260px;
  overflow: hidden;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.ink};
`;

export const StageLabel = styled.span`
  position: absolute;
  z-index: ${zIndex.stickyHead};
  top: 12px;
  left: 12px;
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid ${color.borderStrong};
  border-radius: ${radius.control}px;
  background: ${color.ink};
  color: ${color.surface};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ${font.mono};
  font-size: ${fontSize.caption};
  font-weight: 600;
  box-shadow: ${shadow.popover};
`;

export const StageTime = styled(StageLabel)`
  right: 12px;
  left: auto;
`;

export const StageHint = styled.div`
  position: absolute;
  z-index: ${zIndex.stickyHead};
  right: 12px;
  bottom: 12px;
  max-width: calc(100% - 24px);
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid ${tone.info.border};
  border-radius: ${radius.control}px;
  background: ${tone.info.bg};
  color: ${tone.info.fg};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: ${fontSize.caption};
  font-weight: 600;
  box-shadow: ${shadow.popover};
`;

export const ViewerFooter = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const MetaItem = styled.div`
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surfaceSubtle};
  display: flex;
  flex-direction: column;
  gap: 4px;

  span,
  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: ${color.ink3};
    font-size: ${fontSize.caption};
    font-weight: 500;
  }

  strong {
    color: ${color.ink2};
    font-size: ${fontSize.meta};
    font-weight: 600;
  }
`;

export const CardViewPanel = styled(Panel)`
  min-height: 0;
  background: ${color.surfaceSubtle};
`;

export const CardScroller = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 10px;
  overflow-y: auto;
  ${scrollbar}
`;

export const BuildingCardSection = styled.section`
  padding: 12px;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  box-shadow: ${shadow.card};

  & + & {
    margin-top: 10px;
  }
`;

export const CardSectionHeader = styled(BuildingHeader)`
  min-height: 42px;
  padding: 6px 8px;
  border-color: transparent;
  background: ${color.surface};

  &:hover {
    border-color: ${color.border};
  }
`;

export const CameraCardGrid = styled(motionElement.div)`
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  grid-auto-rows: max-content;
  align-content: start;
  gap: 10px;
  overflow: hidden;

  @media (max-width: 1500px) {
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  }

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const CameraCardButton = styled.button<{ $selected: boolean }>`
  min-width: 0;
  padding: 0;
  border: 1px solid ${({ $selected }) => ($selected ? color.brand : color.border)};
  border-radius: ${radius.card}px;
  background: ${({ $selected }) => ($selected ? color.brandSoft : color.surface)};
  color: ${color.ink2};
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  box-shadow: ${shadow.card};
  transition: transform ${motion.hover}, border-color ${motion.hover}, background ${motion.hover};

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ $selected }) => ($selected ? color.brand : color.borderStrong)};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }
`;

export const CardThumbnail = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: ${color.ink};
`;

export const CameraCardBody = styled.div`
  padding: 10px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 8px;

  .copy {
    min-width: 0;
  }

  strong,
  small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: ${color.ink};
    font-size: ${fontSize.bodySm};
    font-weight: 600;
  }

  small {
    margin-top: 4px;
    color: ${color.ink3};
    font-size: ${fontSize.caption};
    font-weight: 500;
  }
`;

export const CardCode = styled.span`
  min-height: 22px;
  padding: 2px 7px;
  border: 1px solid ${color.border};
  border-radius: ${radius.row}px;
  background: ${color.surfaceSubtle};
  color: ${color.ink3};
  display: inline-flex;
  align-items: center;
  font-family: ${font.mono};
  font-size: ${fontSize.caption};
  font-weight: 600;
`;

export const StateBox = styled.div<{ $tone?: ToneName; $compact?: boolean }>`
  min-width: 0;
  min-height: ${({ $compact }) => ($compact ? 150 : 220)}px;
  height: 100%;
  padding: 20px;
  border: 1px dashed ${({ $tone }) => ($tone ? tone[$tone].border : color.borderStrong)};
  border-radius: ${radius.card}px;
  background: ${({ $tone }) => ($tone ? tone[$tone].bg : color.surfaceSubtle)};
  color: ${({ $tone }) => ($tone ? tone[$tone].fg : color.ink3)};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  text-align: center;

  .icon-circle {
    width: 54px;
    height: 54px;
    border: 1px solid ${color.border};
    border-radius: ${radius.card}px;
    background: ${color.surface};
    display: grid;
    place-items: center;
  }

  strong {
    color: ${({ $tone }) => ($tone ? tone[$tone].fg : color.ink2)};
    font-size: ${fontSize.body};
    font-weight: 600;
  }

  p {
    max-width: 360px;
    margin: 0;
    color: ${color.ink3};
    font-size: ${fontSize.caption};
    font-weight: 500;
    line-height: 1.45;
    word-break: keep-all;
  }

  .spin {
    animation: ${spin} 0.9s linear infinite;
  }
`;

export const StateActions = styled.div`
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ModalBackdrop = styled(motionElement.div)`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.modalBackdrop};
  background: ${color.ink};
`;

export const ModalDialog = styled(motionElement.section)`
  position: fixed;
  inset: 5vh 4%;
  z-index: ${zIndex.modal};
  min-width: 0;
  min-height: 0;
  padding: 14px;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  box-shadow: ${shadow.modal};
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  overflow: hidden;
`;

export const ModalHeader = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const ModalTitle = styled.div`
  min-width: 0;

  .eyebrow {
    display: block;
    color: ${color.brand};
    font-size: ${fontSize.caption};
    font-weight: 600;
    text-transform: uppercase;
  }

  h2 {
    margin: 3px 0 0;
    overflow: hidden;
    color: ${color.ink};
    font-size: ${fontSize.cardTitle};
    font-weight: 600;
    letter-spacing: -0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const CloseButton = styled.button`
  width: ${controlHeight.md}px;
  height: ${controlHeight.md}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.fill};
  color: ${color.ink3};
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background ${motion.hover}, color ${motion.hover};

  &:hover {
    background: ${color.brandSoft};
    color: ${color.brand};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }
`;

export const ModalStage = styled(ViewerStage)`
  min-height: 0;
`;

export const ModalFooter = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: ${color.ink3};
  font-size: ${fontSize.caption};
  font-weight: 600;

  .meta {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
