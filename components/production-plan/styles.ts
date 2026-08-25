import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import {
  color,
  focusRing,
  font,
  fontSize,
  gridLayer,
  radius,
  scrollbar,
  shadow,
  tone,
} from '@/styles/design-tokens';
import { FIXED_COLUMNS, GRID_COLUMN_WIDTH, GRID_ROW_HEIGHT } from '@/constants/production-plan';
import type { ToneName } from '@/styles/design-tokens';
import type { RevisionStatus } from '@/types/production-plan';

/** 헤더와 본문이 공유하는 단일 컬럼 정의 — 값을 두 번 쓰지 않는다 */
export const gridTemplate = (dayCount: number) =>
  `${FIXED_COLUMNS.map(column => `${column.width}px`).join(' ')} repeat(${dayCount}, ${GRID_COLUMN_WIDTH.day}px)`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

/* ───────────────────────── 페이지 셸 ───────────────────────── */

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

export const PlanShell = styled.main<{ $labMode?: boolean }>`
  width: 100%;
  height: 100vh;
  min-height: 720px;
  padding: 14px;
  box-sizing: border-box;
  overflow: hidden;
  background: ${color.pageBg};
  color: ${color.ink};
  display: grid;
  grid-template-rows: ${({ $labMode }) =>
    $labMode ? 'auto auto auto minmax(0, 1fr)' : 'auto auto minmax(0, 1fr)'};
  gap: 12px;
`;

export const LabInfoBar = styled.div`
  min-height: 40px;
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

/* ───────────────────────── 헤더 ───────────────────────── */

export const Header = styled.header`
  min-height: 82px;
  padding: 17px 20px;
  background: ${color.surface};
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.panel};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
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
    white-space: nowrap;
  }

  p {
    margin: 0;
    color: ${color.ink3};
    font-size: ${fontSize.meta};
    font-weight: 500;
    line-height: 1.2;
  }
`;

export const TitleIcon = styled.div`
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border-radius: ${radius.card}px;
  background: ${color.brand};
  color: ${color.surface};
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
`;

type ActionVariant = 'soft' | 'success' | 'dark';

const ACTION_STYLE: Record<ActionVariant, { bg: string; fg: string; border: string; hoverBg: string }> = {
  soft: { bg: color.surface, fg: color.ink2, border: color.border, hoverBg: color.surfaceSubtle },
  // 성공 톤 버튼의 hover 는 새 색을 만들지 않고 명도만 낮춘다
  success: { bg: tone.success.fg, fg: color.surface, border: tone.success.fg, hoverBg: tone.success.fg },
  dark: { bg: color.ink, fg: color.surface, border: color.ink, hoverBg: color.brand },
};

export const ActionButton = styled.button<{ $variant: ActionVariant }>`
  height: 44px;
  padding: 0 15px;
  border-radius: ${radius.control}px;
  border: 1px solid ${({ $variant }) => ACTION_STYLE[$variant].border};
  background: ${({ $variant }) => ACTION_STYLE[$variant].bg};
  color: ${({ $variant }) => ACTION_STYLE[$variant].fg};
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: ${fontSize.body};
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;

  &:hover:not(:disabled) {
    background: ${({ $variant }) => ACTION_STYLE[$variant].hoverBg};
    border-color: ${({ $variant }) => ($variant === 'soft' ? color.borderStrong : ACTION_STYLE[$variant].hoverBg)};
    color: ${({ $variant }) => ($variant === 'soft' ? color.ink : color.surface)};
    filter: ${({ $variant }) => ($variant === 'success' ? 'brightness(0.92)' : 'none')};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  .spin {
    animation: ${spin} 0.9s linear infinite;
  }
`;

/* ───────────────────────── 지표 카드 ───────────────────────── */

export const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
`;

export const MetricCard = styled.article<{ $tone: ToneName }>`
  min-height: 118px;
  padding: 16px 20px;
  background: ${color.surface};
  border: 1px solid ${({ $tone }) => tone[$tone].border};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.card};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;

  .metric-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;

    span {
      color: ${color.ink3};
      font-size: ${fontSize.meta};
      font-weight: 600;
      line-height: 1.2;
    }

    svg {
      flex: 0 0 auto;
      color: ${({ $tone }) => tone[$tone].fg};
    }
  }

  strong {
    color: ${({ $tone }) => tone[$tone].fg};
    font-size: 2rem;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: ${color.ink3};
    font-size: ${fontSize.caption};
    font-weight: 500;
    line-height: 1.25;
  }
`;

/* ───────────────────────── 작업 영역 ───────────────────────── */

export const Workspace = styled.section`
  min-height: 0;
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 12px;

  @media (max-width: 1500px) {
    grid-template-columns: 300px minmax(0, 1fr);
  }
`;

export const SideColumn = styled.div`
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const Card = styled.section`
  min-height: 0;
  padding: 14px;
  background: ${color.surface};
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.card};
  display: flex;
  flex-direction: column;
`;

export const CardHead = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;

  .title-group {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h2 {
    margin: 0;
    color: ${color.ink};
    font-size: ${fontSize.cardTitle};
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.02em;
    white-space: nowrap;
  }

  svg {
    flex: 0 0 auto;
    color: ${color.brand};
  }
`;

export const CountPill = styled.span`
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: ${radius.control}px;
  background: ${color.brandSoft};
  color: ${color.brand};
  font-size: ${fontSize.meta};
  font-weight: 600;
  white-space: nowrap;
`;

/* ───────────────────────── 파일 업로드 ───────────────────────── */

export const Dropzone = styled.div<{ $dragging: boolean; $hasFile: boolean }>`
  flex: 1;
  min-height: 168px;
  padding: 18px;
  border-radius: ${radius.card}px;
  border: 1px dashed ${({ $dragging, $hasFile }) => ($dragging ? color.brand : $hasFile ? tone.success.border : color.borderStrong)};
  background: ${({ $dragging, $hasFile }) => ($dragging ? color.brandSoft : $hasFile ? tone.success.bg : color.surfaceSubtle)};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;

  &:hover {
    border-color: ${color.brand};
    background: ${color.brandSoft};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }

  .drop-icon {
    width: 56px;
    height: 56px;
    border-radius: ${radius.card}px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    display: grid;
    place-items: center;
    color: ${({ $hasFile }) => ($hasFile ? tone.success.fg : color.brand)};
  }

  strong {
    color: ${color.ink2};
    font-size: ${fontSize.body};
    font-weight: 600;
    line-height: 1.3;
    word-break: keep-all;
  }

  span {
    color: ${color.ink4};
    font-size: ${fontSize.caption};
    font-weight: 500;
    line-height: 1.4;
  }

  .file-name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${tone.success.fg};
    font-size: ${fontSize.meta};
    font-weight: 600;
  }
`;

export const PrimaryButton = styled.button`
  flex-shrink: 0;
  width: 100%;
  height: 44px;
  margin-top: 12px;
  border: 0;
  border-radius: ${radius.control}px;
  background: ${color.brand};
  color: ${color.surface};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: ${fontSize.body};
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms ease;

  &:hover:not(:disabled) {
    background: ${color.brandStrong};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  .spin {
    animation: ${spin} 0.9s linear infinite;
  }
`;

export const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`;

/* ───────────────────────── 리비전 관리 ───────────────────────── */

export const FieldLabel = styled.span`
  display: block;
  margin-bottom: 6px;
  color: ${color.ink3};
  font-size: ${fontSize.meta};
  font-weight: 600;
`;

export const CurrentRevisionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;

  span {
    color: ${color.ink3};
    font-size: ${fontSize.meta};
    font-weight: 600;
  }

  strong {
    color: ${color.ink};
    font-size: ${fontSize.cardTitle};
    font-weight: 600;
  }
`;

export const ConfirmGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
`;

export const ConfirmButton = styled.button<{ $active: boolean }>`
  height: 40px;
  border-radius: ${radius.control}px;
  border: 1px solid ${({ $active }) => ($active ? color.brand : color.border)};
  background: ${({ $active }) => ($active ? color.brand : color.surface)};
  color: ${({ $active }) => ($active ? color.surface : color.ink3)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: ${fontSize.body};
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;

  &:hover:not(:disabled) {
    background: ${({ $active }) => ($active ? color.brandStrong : color.brandSoft)};
    border-color: ${color.brand};
    color: ${({ $active }) => ($active ? color.surface : color.brand)};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
`;

export const HistoryScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
  background: ${color.surfaceSubtle};
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  ${scrollbar}
`;

export const HistoryItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  padding: 10px 12px;
  border-radius: ${radius.row}px;
  /* 선택 표시는 사방 테두리와 배경으로만 한다 (한쪽 변만 강조하는 패턴 금지) */
  border: 1px solid ${({ $selected }) => ($selected ? color.brand : color.divider)};
  background: ${({ $selected }) => ($selected ? color.brandSoft : color.surface)};
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;

  &:hover {
    border-color: ${color.borderStrong};
    transform: translateX(2px);
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 2px;
  }

  .row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${color.ink};
    font-size: ${fontSize.meta};
    font-weight: 600;
  }

  .row-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: ${color.ink3};
    font-size: ${fontSize.caption};
    font-weight: 500;
  }

  .row-bottom time {
    color: ${color.ink4};
  }
`;

const STATUS_TONE: Record<RevisionStatus, ToneName> = {
  confirmed: 'success',
  reconfirmed: 'info',
  draft: 'neutral',
};

export const StatusBadge = styled.span<{ $status: RevisionStatus }>`
  flex-shrink: 0;
  min-width: 48px;
  height: 24px;
  padding: 0 8px;
  border-radius: ${radius.control}px;
  background: ${({ $status }) => tone[STATUS_TONE[$status]].bg};
  color: ${({ $status }) => tone[STATUS_TONE[$status]].fg};
  border: 1px solid ${({ $status }) => tone[STATUS_TONE[$status]].border};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: ${fontSize.caption};
  font-weight: 600;
  white-space: nowrap;
`;

/* ───────────────────────── 미리보기 패널 ───────────────────────── */

export const PreviewPanel = styled.section`
  min-width: 0;
  min-height: 0;
  padding: 14px;
  background: ${color.surface};
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.panel};
  display: flex;
  flex-direction: column;
`;

export const NoticeBar = styled(motion.div)<{ $tone: ToneName }>`
  flex-shrink: 0;
  min-height: 38px;
  margin-bottom: 10px;
  padding: 9px 12px;
  border-radius: ${radius.control}px;
  background: ${({ $tone }) => tone[$tone].bg};
  border: 1px solid ${({ $tone }) => tone[$tone].border};
  color: ${({ $tone }) => tone[$tone].fg};
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${fontSize.meta};
  font-weight: 600;

  p {
    flex: 1;
    min-width: 0;
    margin: 0;
    line-height: 1.35;
    word-break: keep-all;
  }

  button {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: ${radius.row}px;
    background: transparent;
    color: inherit;
    display: grid;
    place-items: center;
    cursor: pointer;

    &:focus-visible {
      outline: ${focusRing};
      outline-offset: 2px;
    }
  }
`;

/* ───────────────────────── 데이터 그리드 ───────────────────────── */

export const GridShell = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  overflow: hidden;
  background: ${color.surface};
`;

export const GridScroller = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;

  ${scrollbar}
`;

export const GridInner = styled.div<{ $width: number }>`
  min-width: ${({ $width }) => $width}px;
  /*
   * 스크롤 영역과 같은 높이를 명시해야 본문 행 트랙이 남는 높이를 계산할 수 있다.
   * (min-height 로 두면 컨테이너가 내용 높이까지 늘어나 행이 줄어들지 않는다.)
   * 품목이 많아 본문이 넘치면 그 넘침이 스크롤 영역으로 전달되고,
   * 헤더와 합계 행은 sticky 로 계속 고정된다.
   */
  height: 100%;
  display: flex;
  flex-direction: column;
`;

/**
 * 본문 행 영역.
 * 행 트랙을 `minmax(min, max)` 로 두면 남는 높이만큼 행이 늘어나 그리드가 세로로 채워지고,
 * 품목이 적을 때는 `max` 에서 멈춰 행이 과도하게 벌어지지 않는다.
 */
export const GridBody = styled.div<{ $rows: number }>`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: repeat(
    ${({ $rows }) => $rows},
    minmax(${GRID_ROW_HEIGHT.min}px, ${GRID_ROW_HEIGHT.max}px)
  );
  align-content: start;
`;

const rowBase = `
  display: grid;
  align-items: stretch;
  /* 헤더·합계 행은 GridInner 의 flex 항목이라 줄어들지 않게 고정한다 (본문 행에서는 무시됨) */
  flex: 0 0 auto;
`;

/** 월 그룹 헤더 (2026년 06월) */
export const MonthRow = styled.div<{ $days: number }>`
  ${rowBase}
  grid-template-columns: ${({ $days }) => gridTemplate($days)};
  position: sticky;
  top: 0;
  z-index: ${gridLayer.stickyRow};
  min-height: 30px;
  background: ${color.fill};
  border-bottom: 1px solid ${color.border};
`;

/** 컬럼 헤더 (NO / LINE / ... / 6/1) */
export const HeadRow = styled.div<{ $days: number }>`
  ${rowBase}
  grid-template-columns: ${({ $days }) => gridTemplate($days)};
  position: sticky;
  top: 30px;
  z-index: ${gridLayer.stickyRow};
  min-height: 34px;
  background: ${color.surfaceSubtle};
`;

/** 보조 헤더 (# / SUM / 요일) */
export const SubRow = styled.div<{ $days: number }>`
  ${rowBase}
  grid-template-columns: ${({ $days }) => gridTemplate($days)};
  position: sticky;
  top: 64px;
  z-index: ${gridLayer.stickyRow};
  min-height: 26px;
  background: ${color.surfaceSubtle};
  border-bottom: 1px solid ${color.border};
`;

export const BodyRow = styled.div<{ $days: number; $even: boolean }>`
  ${rowBase}
  grid-template-columns: ${({ $days }) => gridTemplate($days)};
  /* 높이는 GridBody 의 행 트랙이 결정한다 */
  min-height: 0;
  background: ${({ $even }) => ($even ? color.surfaceZebra : color.surface)};
  border-bottom: 1px solid ${color.divider};

  &:hover {
    background: ${color.brandSoft};
  }

  /* 행 hover 시 좌측 고정 셀도 같은 배경을 유지한다 */
  &:hover > * {
    background: ${color.brandSoft};
  }
`;

export const FooterRow = styled.div<{ $days: number }>`
  ${rowBase}
  grid-template-columns: ${({ $days }) => gridTemplate($days)};
  position: sticky;
  bottom: 0;
  z-index: ${gridLayer.stickyRow};
  min-height: 36px;
  background: ${color.surfaceSubtle};
  border-top: 1px solid ${color.border};
`;

/** 월 그룹 행에서 고정 컬럼 구간을 덮는 빈 셀 */
export const MonthSpacer = styled.div<{ $span: number }>`
  grid-column: span ${({ $span }) => $span};
  position: sticky;
  left: 0;
  z-index: ${gridLayer.corner};
  background: ${color.fill};
`;

export const MonthCell = styled.div<{ $span: number }>`
  grid-column: span ${({ $span }) => $span};
  display: grid;
  place-items: center;
  border-left: 1px solid ${color.border};
  color: ${color.ink};
  font-size: ${fontSize.micro};
  font-weight: 600;
  letter-spacing: -0.01em;
`;

type CellAlign = 'left' | 'center' | 'right';
type CellVariant = 'head' | 'sub' | 'body' | 'foot';

const CELL_BACKGROUND: Record<CellVariant, string> = {
  head: color.surfaceSubtle,
  sub: color.surfaceSubtle,
  body: 'inherit',
  foot: color.surfaceSubtle,
};

/** 좌측 고정 셀 — 헤더/본문/합계에서 공통 사용 */
export const FixedCell = styled.div<{
  $left: number;
  $align: CellAlign;
  $variant: CellVariant;
  $accent?: boolean;
}>`
  position: sticky;
  left: ${({ $left }) => $left}px;
  z-index: ${gridLayer.stickyColumn};
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) => ($align === 'left' ? 'flex-start' : $align === 'right' ? 'flex-end' : 'center')};
  padding: 0 8px;
  background: ${({ $variant }) => CELL_BACKGROUND[$variant]};
  color: ${({ $variant, $accent }) => {
    if ($accent) return color.brand;
    if ($variant === 'head' || $variant === 'sub') return color.ink3;
    if ($variant === 'foot') return color.ink;
    return color.ink2;
  }};
  font-size: ${({ $variant }) => ($variant === 'head' ? fontSize.micro : fontSize.caption)};
  font-weight: ${({ $variant }) => ($variant === 'body' ? 500 : 600)};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;

  > span,
  > strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

/** 상·하단 고정 행 안의 좌측 고정 셀 — 두 방향이 겹치므로 모서리 레이어를 쓴다 */
export const FixedCornerCell = styled(FixedCell)`
  z-index: ${gridLayer.corner};
`;

export const DayCell = styled.div<{
  $variant: CellVariant;
  $weekend?: boolean;
  $empty?: boolean;
}>`
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: ${({ $variant }) => ($variant === 'body' || $variant === 'foot' ? 'flex-end' : 'center')};
  padding: 0 6px;
  border-left: 1px solid ${color.divider};
  color: ${({ $variant, $weekend, $empty }) => {
    if ($weekend) return color.brand;
    if ($variant === 'head') return color.ink;
    if ($variant === 'sub') return color.ink4;
    if ($empty) return color.ink4;
    if ($variant === 'foot') return color.ink;
    return color.ink2;
  }};
  font-size: ${fontSize.caption};
  font-weight: ${({ $variant }) => ($variant === 'body' ? 500 : 600)};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

/* ───────────────────────── 상태 표시 ───────────────────────── */

export const StateBox = styled.div<{ $tone?: ToneName }>`
  flex: 1;
  min-height: 180px;
  padding: 20px;
  border-radius: ${radius.card}px;
  border: 1px dashed ${({ $tone }) => ($tone ? tone[$tone].border : color.borderStrong)};
  background: ${({ $tone }) => ($tone ? tone[$tone].bg : color.surfaceSubtle)};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;

  .icon-circle {
    width: 56px;
    height: 56px;
    border-radius: ${radius.card}px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    display: grid;
    place-items: center;
    color: ${({ $tone }) => ($tone ? tone[$tone].fg : color.ink4)};
  }

  strong {
    color: ${({ $tone }) => ($tone ? tone[$tone].fg : color.ink2)};
    font-size: ${fontSize.body};
    font-weight: 600;
  }

  span {
    color: ${color.ink4};
    font-size: ${fontSize.caption};
    font-weight: 500;
    line-height: 1.45;
    word-break: keep-all;
  }

  .spin {
    animation: ${spin} 0.9s linear infinite;
  }
`;

export const RetryButton = styled.button`
  height: 34px;
  padding: 0 14px;
  margin-top: 4px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink2};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: ${fontSize.meta};
  font-weight: 600;
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease;

  &:hover {
    border-color: ${color.brand};
    color: ${color.brand};
  }

  &:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }
`;
