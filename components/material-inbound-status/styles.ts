import styled, { css } from 'styled-components';
import { motion as motionElement } from 'framer-motion';
import {
  color, controlHeight, focusRing, font, fontSize, fontWeight, gridLayer,
  motion, radius, scrollbar, shadow, space, tone, zIndex,
} from '@/styles/design-tokens';
import type { ToneName } from '@/styles/design-tokens';

export type StatTone = 'red' | 'green' | 'blue' | 'orange';

const tonePalette = {
  red: { fg: color.brand, bg: color.brandSoft, border: color.brandBorder },
  green: tone.success,
  blue: tone.info,
  orange: tone.warning,
} as const;

const buttonInteraction = css`
  cursor: pointer;
  font-weight: ${fontWeight.semibold};
  transition: background ${motion.hover}, color ${motion.hover}, border-color ${motion.hover};
  &:focus-visible { outline: ${focusRing}; outline-offset: ${space.xs}px; }
  &:disabled { opacity: 0.58; cursor: not-allowed; }
`;

export const StatusShell = styled.main`
  width: 100%;
  height: 100vh;
  min-height: 0;
  box-sizing: border-box;
  padding: ${space.xxl}px;
  overflow: hidden;
  background: ${color.pageBg};
  color: ${color.ink};
  font-family: ${font.family};
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: ${space.xxl}px;

  *, *::before, *::after { box-sizing: border-box; font-family: inherit; }

  @media (max-width: 1200px) { padding: ${space.xl}px; gap: ${space.xl}px; }
  @media (max-width: 760px) { padding: ${space.md}px; gap: ${space.md}px; }
`;

export const Header = styled.header`
  min-width: 0;
  min-height: 82px;
  padding: ${space.xxxl}px ${space.huge}px;
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.xxxl}px;
  box-shadow: ${shadow.panel};

  @media (max-width: 1500px) { flex-wrap: wrap; }
  @media (max-width: 1200px) { padding: ${space.xl}px; }
`;

export const TitleGroup = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${space.xxl}px;
  > div { min-width: 0; }
  span {
    display: block;
    color: ${color.brand};
    font-size: ${fontSize.micro};
    font-weight: ${fontWeight.semibold};
    line-height: 1.1;
    text-transform: uppercase;
  }
  h1 {
    margin: ${space.xs}px 0;
    color: ${color.ink};
    font-size: ${fontSize.pageTitle};
    font-weight: ${fontWeight.semibold};
    line-height: 1.15;
    letter-spacing: -0.02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  p {
    margin: 0;
    color: ${color.ink3};
    font-size: ${fontSize.meta};
    font-weight: ${fontWeight.medium};
    line-height: 1.2;
  }
`;

export const TitleIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${radius.card}px;
  background: ${color.brand};
  color: ${color.surface};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
`;

export const HeaderActions = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${space.lg}px;
  flex-wrap: wrap;
  @media (max-width: 1200px) { width: 100%; justify-content: flex-start; }
`;

export const SegmentedControl = styled.div`
  height: ${controlHeight.lg}px;
  padding: ${space.xs}px;
  border-radius: ${radius.control}px;
  border: 1px solid ${color.border};
  background: ${color.surfaceSubtle};
  display: inline-flex;
  align-items: center;
  gap: ${space.xs}px;
`;

export const SegmentButton = styled.button<{ $active: boolean }>`
  ${buttonInteraction}
  min-width: 56px;
  height: ${controlHeight.md}px;
  padding: 0 ${space.xl}px;
  border-radius: ${radius.control}px;
  border: 1px solid ${({ $active }) => $active ? color.brandBorder : 'transparent'};
  background: ${({ $active }) => $active ? color.brandSoft : 'transparent'};
  color: ${({ $active }) => $active ? color.brand : color.ink3};
  font-size: ${fontSize.meta};
  &:hover:not(:disabled) { background: ${color.brandSoft}; border-color: ${color.brandBorder}; color: ${color.brand}; }
`;

export const DateRangeControl = styled.div`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: ${space.md}px;
  @media (max-width: 760px) { flex-wrap: wrap; }
`;
export const DatePicker = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${space.sm}px;
`;
export const RangeCaption = styled.span`
  color: ${color.ink3};
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.semibold};
  white-space: nowrap;
`;
export const RangeTilde = styled.span`
  color: ${color.ink4};
  font-size: ${fontSize.body};
  font-weight: ${fontWeight.medium};
`;
export const DateTrigger = styled.button`
  ${buttonInteraction}
  height: ${controlHeight.lg}px;
  min-width: 150px;
  padding: 0 ${space.xl}px;
  border-radius: ${radius.control}px;
  border: 1px solid ${color.border};
  background: ${color.surface};
  color: ${color.ink2};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${space.sm}px;
  strong { font-size: ${fontSize.meta}; font-weight: ${fontWeight.semibold}; line-height: 1; }
  svg { color: ${color.ink3}; transition: transform ${motion.state}, color ${motion.state}; }
  svg.is-open { transform: rotate(180deg); }
  &[aria-expanded='true'], &:hover:not(:disabled) {
    border-color: ${color.brandBorder}; background: ${color.brandSoft}; color: ${color.brand};
  }
  &[aria-expanded='true'] svg, &:hover:not(:disabled) svg { color: ${color.brand}; }
  @media (max-width: 1200px) { min-width: 138px; }
`;

export const CalendarBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.popover - 1};
`;
export const CalendarPopover = styled.div<{ $align: 'start' | 'end' }>`
  position: absolute;
  top: calc(100% + ${space.md}px);
  ${({ $align }) => $align === 'end' ? 'right: 0;' : 'left: 0;'}
  z-index: ${zIndex.popover};
  width: 296px;
  max-width: calc(100vw - ${space.huge}px);
  padding: ${space.xxl}px;
  border-radius: ${radius.card}px;
  border: 1px solid ${color.border};
  background: ${color.surface};
  box-shadow: ${shadow.popover};
`;
export const CalendarHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${space.xl}px;
  strong { color: ${color.ink}; font-size: ${fontSize.body}; font-weight: ${fontWeight.semibold}; }
  button {
    ${buttonInteraction}
    width: ${controlHeight.sm}px;
    height: ${controlHeight.sm}px;
    border-radius: ${radius.row}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.ink3};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    &:hover { background: ${color.brandSoft}; border-color: ${color.brandBorder}; color: ${color.brand}; }
  }
`;
export const CalendarWeekdays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: ${space.xs}px;
  margin-bottom: ${space.sm}px;
  span {
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${color.ink3};
    font-size: ${fontSize.meta};
    font-weight: ${fontWeight.semibold};
  }
  span[data-weekend] { color: ${color.brand}; }
`;
export const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: ${space.xs}px;
`;
export const CalendarDay = styled.button<{ $selected: boolean; $today: boolean; $inRange: boolean }>`
  ${buttonInteraction}
  height: ${controlHeight.md}px;
  border-radius: ${radius.row}px;
  border: 1px solid ${({ $today, $selected, $inRange }) => $today || $selected || $inRange ? color.brandBorder : 'transparent'};
  background: ${({ $selected, $inRange }) => $selected || $inRange ? color.brandSoft : 'transparent'};
  color: ${({ $selected, $today }) => $selected || $today ? color.brand : color.ink2};
  font-size: ${fontSize.meta};
  &:hover { background: ${color.brandSoft}; color: ${color.brand}; border-color: ${color.brandBorder}; }
`;
export const CalendarFooter = styled.div`
  margin-top: ${space.xl}px;
  padding-top: ${space.xl}px;
  border-top: 1px solid ${color.divider};
  display: flex;
  justify-content: flex-end;
  button {
    ${buttonInteraction}
    height: ${controlHeight.sm}px;
    padding: 0 ${space.xxl}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.control}px;
    background: ${color.surface};
    color: ${color.ink2};
    font-size: ${fontSize.meta};
    &:hover { background: ${color.brandSoft}; color: ${color.brand}; border-color: ${color.brandBorder}; }
  }
`;

export const RefreshButton = styled.button`
  ${buttonInteraction}
  height: ${controlHeight.lg}px;
  padding: 0 ${space.xxxl}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink2};
  display: inline-flex;
  align-items: center;
  gap: ${space.md}px;
  font-size: ${fontSize.meta};
  &:hover:not(:disabled) { background: ${color.brandSoft}; border-color: ${color.brandBorder}; color: ${color.brand}; }
`;

export const StatsGrid = styled.section`
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${space.xxl}px;
  @media (max-width: 760px) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: ${space.md}px; }
`;
export const MetricCard = styled.article<{ $tone: StatTone }>`
  min-width: 0;
  min-height: 150px;
  padding: ${space.huge}px;
  border-radius: ${radius.card}px;
  border: 1px solid ${({ $tone }) => tonePalette[$tone].border};
  background: ${color.surface};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: ${space.sm}px;
  box-shadow: ${shadow.card};
  strong { color: ${({ $tone }) => tonePalette[$tone].fg}; font-size: ${fontSize.metric}; font-weight: ${fontWeight.semibold}; line-height: 1; letter-spacing: -0.02em; }
  p { margin: 0; color: ${color.ink2}; font-size: ${fontSize.bodySm}; font-weight: ${fontWeight.medium}; line-height: 1.25; }
  @media (max-width: 1500px) { min-height: 130px; padding: ${space.xxl}px; }
  @media (max-width: 760px) {
    min-height: 100px;
    padding: ${space.lg}px;
    strong { font-size: ${fontSize.cardTitle}; }
    p { font-size: ${fontSize.caption}; }
  }
`;
export const MetricTop = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.lg}px;
  span { color: ${color.ink}; font-size: ${fontSize.bodySm}; font-weight: ${fontWeight.semibold}; line-height: 1.2; }
  svg { color: ${color.brand}; flex: 0 0 auto; }
`;

export const Workspace = styled.section`
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: clamp(280px, 20vw, 340px) minmax(0, 1fr);
  gap: ${space.xxl}px;
  @media (max-width: 1500px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 180px) minmax(0, 1fr);
  }
  @media (max-width: 760px) { grid-template-rows: minmax(0, 120px) minmax(0, 1fr); gap: ${space.md}px; }
`;
export const InsightPanel = styled.aside`
  min-width: 0;
  min-height: 0;
  padding: ${space.xxxl}px;
  border-radius: ${radius.card}px;
  border: 1px solid ${color.borderSoft};
  background: ${color.surface};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: ${shadow.card};
  @media (max-width: 1500px) {
    max-height: 180px;
    overflow-y: auto;
    > * { flex-shrink: 0; }
    ${scrollbar}
  }
  @media (max-width: 760px) { max-height: 120px; padding: ${space.xl}px; }
`;
export const PanelHeader = styled.div`
  min-width: 0;
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${space.xl}px;
  span { display: block; color: ${color.brand}; font-size: ${fontSize.micro}; font-weight: ${fontWeight.semibold}; text-transform: uppercase; }
  h2 { margin: ${space.xs}px 0 0; color: ${color.ink}; font-size: ${fontSize.sectionTitle}; font-weight: ${fontWeight.semibold}; line-height: 1.15; letter-spacing: -0.02em; }
`;
export const CompletionBadge = styled.strong`
  flex: 0 0 auto;
  min-width: 70px;
  height: 38px;
  padding: 0 ${space.xl}px;
  border-radius: ${radius.control}px;
  border: 1px solid ${tone.success.border};
  background: ${tone.success.bg};
  color: ${tone.success.fg};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: ${fontSize.sectionTitle};
  font-weight: ${fontWeight.semibold};
`;
export const ProgressStack = styled.div`
  flex: 0 0 auto;
  height: 18px;
  margin: ${space.huge}px 0 ${space.xxxl}px;
  border-radius: ${radius.bar}px;
  background: ${color.fill};
  overflow: hidden;
`;
export const ProgressFill = styled.div<{ $tone: StatTone; $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  border-radius: ${radius.bar}px;
  background: ${({ $tone }) => tonePalette[$tone].fg};
  transition: width ${motion.value};
`;
export const Divider = styled.div`
  flex: 0 0 auto;
  height: 1px;
  margin: ${space.huge}px 0;
  background: ${color.divider};
`;
export const VendorList = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  margin-top: ${space.xxl}px;
  padding-right: ${space.xs}px;
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
  overflow-y: auto;
  ${scrollbar}
  @media (max-width: 1500px) { flex: 0 0 auto; max-height: 180px; }
`;
export const VendorRow = styled.div`
  flex: 0 0 auto;
  min-width: 0;
  min-height: 46px;
  padding: ${space.lg}px ${space.xl}px;
  border-radius: ${radius.row}px;
  border: 1px solid ${color.border};
  background: ${color.surface};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.xl}px;
  span { min-width: 0; color: ${color.ink2}; font-size: ${fontSize.bodySm}; font-weight: ${fontWeight.medium}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  strong { color: ${color.brand}; font-size: ${fontSize.sectionTitle}; font-weight: ${fontWeight.semibold}; }
`;
export const EmptySmall = styled.div`
  min-height: 90px;
  padding: ${space.xxxl}px;
  border: 1px dashed ${color.borderStrong};
  border-radius: ${radius.card}px;
  background: ${color.surfaceSubtle};
  color: ${color.ink3};
  display: grid;
  place-items: center;
  text-align: center;
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.medium};
`;

export const DetailPanel = styled.section`
  min-width: 0;
  min-height: 0;
  padding: ${space.xxxl}px;
  border-radius: ${radius.card}px;
  border: 1px solid ${color.borderSoft};
  background: ${color.surface};
  display: flex;
  flex-direction: column;
  gap: ${space.xl}px;
  overflow: hidden;
  box-shadow: ${shadow.panel};
  @media (max-width: 760px) { padding: ${space.xl}px; }
`;
export const DetailHeader = styled.div`
  min-width: 0;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.xxxl}px;
  span { display: block; color: ${color.brand}; font-size: ${fontSize.micro}; font-weight: ${fontWeight.semibold}; text-transform: uppercase; }
  h2 { margin: ${space.xs}px 0 0; color: ${color.ink}; font-size: ${fontSize.sectionTitle}; font-weight: ${fontWeight.semibold}; line-height: 1.15; letter-spacing: -0.02em; }
  @media (max-width: 760px) { flex-wrap: wrap; gap: ${space.md}px; }
`;
export const DetailTools = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${space.lg}px;
  @media (max-width: 760px) { width: 100%; justify-content: flex-start; }
`;
export const SearchBox = styled.label`
  width: 310px;
  max-width: 100%;
  min-width: 0;
  height: ${controlHeight.lg}px;
  padding: 0 ${space.xl}px;
  border-radius: ${radius.control}px;
  border: 1px solid ${color.border};
  background: ${color.surfaceSubtle};
  color: ${color.ink4};
  display: flex;
  align-items: center;
  gap: ${space.md}px;
  &:focus-within { outline: ${focusRing}; outline-offset: ${space.xs}px; }
  svg { flex: 0 0 auto; }
  input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: ${color.ink}; font-size: ${fontSize.body}; font-weight: ${fontWeight.medium}; }
  input::placeholder { color: ${color.ink4}; }
`;
export const CountPill = styled.div`
  flex: 0 0 auto;
  height: ${controlHeight.lg}px;
  padding: 0 ${space.xl}px;
  border: 1px solid ${color.brandBorder};
  border-radius: ${radius.control}px;
  background: ${color.brandSoft};
  color: ${color.brand};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.semibold};
`;
export const ErrorNotice = styled.div`
  flex: 0 0 auto;
  min-width: 0;
  min-height: 38px;
  padding: ${space.md}px ${space.xl}px;
  border-radius: ${radius.control}px;
  border: 1px solid ${tone.danger.border};
  background: ${tone.danger.bg};
  color: ${tone.danger.fg};
  display: flex;
  align-items: center;
  gap: ${space.md}px;
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.medium};
  > svg { flex: 0 0 auto; }
  > span { min-width: 0; flex: 1; }
`;

// 헤더와 본문은 같은 열 정의를 공유한다. 품번이 긴 경우 상세 패널 안에서만 가로 스크롤한다.
const gridColumns = 'minmax(130px,1.15fr) minmax(120px,1.05fr) minmax(140px,1.25fr) minmax(84px,.8fr) minmax(86px,.72fr) minmax(92px,.82fr) minmax(126px,1fr)';
export const DetailGrid = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  border-radius: ${radius.card}px;
  border: 1px solid ${color.border};
  overflow-x: auto;
  overflow-y: hidden;
  display: grid;
  grid-template-columns: minmax(890px, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  ${scrollbar}
`;
export const GridHead = styled.div`
  position: sticky;
  top: 0;
  z-index: ${gridLayer.stickyRow};
  min-height: 52px;
  padding: 0 ${space.xxxl}px;
  background: ${color.surfaceSubtle};
  border-bottom: 1px solid ${color.border};
  display: grid;
  grid-template-columns: ${gridColumns};
  align-items: center;
  gap: ${space.xl}px;
  span { min-width: 0; color: ${color.ink3}; font-size: ${fontSize.micro}; font-weight: ${fontWeight.semibold}; line-height: 1.2; }
  > :nth-child(4) { text-align: right; }
`;
export const GridBody = styled.div`
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  background: ${color.surface};
  ${scrollbar}
`;
export const GridRow = styled.div`
  min-height: 64px;
  padding: 0 ${space.xxxl}px;
  border-bottom: 1px solid ${color.divider};
  display: grid;
  grid-template-columns: ${gridColumns};
  align-items: center;
  gap: ${space.xl}px;
  &:nth-child(even) { background: ${color.surfaceZebra}; }
  &:hover { background: ${color.brandSoft}; }
  > span, > strong, > time {
    min-width: 0;
    color: ${color.ink2};
    font-size: ${fontSize.bodySm};
    font-weight: ${fontWeight.medium};
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  > strong { color: ${color.ink}; font-weight: ${fontWeight.semibold}; }
  > time { color: ${color.ink3}; }
  > :nth-child(1), > :nth-child(2) { font-family: ${font.mono}; }
  > :nth-child(4) { text-align: right; }
`;
const badgeTone = { done: 'success', pending: 'warning', tablet: 'info', none: 'neutral' } as const;
export const StatusBadge = styled.span<{ $state: keyof typeof badgeTone }>`
  && {
    width: fit-content;
    min-width: 76px;
    height: 30px;
    padding: 0 ${space.lg}px;
    border-radius: ${radius.control}px;
    border: 1px solid ${({ $state }) => tone[badgeTone[$state]].border};
    background: ${({ $state }) => tone[badgeTone[$state]].bg};
    color: ${({ $state }) => tone[badgeTone[$state]].fg};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${space.sm}px;
    font-size: ${fontSize.caption};
    font-weight: ${fontWeight.semibold};
    line-height: 1;
  }
  svg { flex: 0 0 auto; }
`;

export const EmptyState = styled.div`
  height: 100%;
  min-height: 0;
  padding: ${space.huge}px;
  border: 1px dashed ${color.borderStrong};
  border-radius: ${radius.card}px;
  background: ${color.surfaceSubtle};
  color: ${color.ink4};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${space.md}px;
  text-align: center;
  strong { color: ${color.ink2}; font-size: ${fontSize.sectionTitle}; font-weight: ${fontWeight.semibold}; }
  > span, > p { margin: 0; font-size: ${fontSize.meta}; font-weight: ${fontWeight.medium}; line-height: 1.4; }
  > svg { flex: 0 0 auto; }
`;
export const StateMessage = styled(EmptyState)<{ $tone?: ToneName; $compact?: boolean }>`
  min-height: ${({ $compact }) => $compact ? '90px' : 'min(180px, 100%)'};
  padding: ${({ $compact }) => $compact ? space.xl : space.huge}px;
  ${({ $tone }) => $tone && css`
    border-color: ${tone[$tone].border};
    background: ${tone[$tone].bg};
    color: ${tone[$tone].fg};
  `}
`;
export const StateSpinner = styled(motionElement.span)`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${color.brand};
`;
export const RetryButton = styled.button`
  ${buttonInteraction}
  flex: 0 0 auto;
  height: ${controlHeight.sm}px;
  padding: 0 ${space.xl}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink2};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${space.sm}px;
  font-size: ${fontSize.meta};
  &:hover:not(:disabled) { border-color: ${color.borderStrong}; background: ${color.fill}; }
`;
