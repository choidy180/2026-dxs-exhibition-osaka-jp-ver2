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
import { GRID_ROW_HEIGHT } from '@/constants/lab';
import type { ToneName } from '@/styles/design-tokens';
import type { OrderNeed } from '@/types/lab';

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

/** 헤더 / 안내 / 지표 / 필터 / 그리드 순서로 쌓는다 */
export const LabShell = styled.main`
  width: 100%;
  height: 100vh;
  min-height: 760px;
  padding: 14px;
  box-sizing: border-box;
  overflow: hidden;
  background: ${color.pageBg};
  color: ${color.ink};
  display: grid;
  grid-template-rows: auto auto auto auto minmax(0, 1fr);
  gap: 12px;
`;

export const Header = styled.header`
  min-height: 74px;
  padding: 14px 20px;
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
  width: 46px;
  height: 46px;
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

export const ActionButton = styled.button<{ $variant: ActionVariant; $compact?: boolean }>`
  height: ${({ $compact }) => ($compact ? 36 : 42)}px;
  padding: 0 ${({ $compact }) => ($compact ? 12 : 15)}px;
  border-radius: ${radius.control}px;
  border: 1px solid ${({ $variant }) => ACTION_STYLE[$variant].border};
  background: ${({ $variant }) => ACTION_STYLE[$variant].bg};
  color: ${({ $variant }) => ACTION_STYLE[$variant].fg};
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: ${({ $compact }) => ($compact ? fontSize.meta : fontSize.body)};
  font-weight: 600;
  white-space: nowrap;
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

/* ───────────────────────── 안내 배너 ───────────────────────── */

export const NoticeBar = styled(motion.div)<{ $tone: ToneName }>`
  min-height: 40px;
  padding: 10px 14px;
  border-radius: ${radius.control}px;
  background: ${({ $tone }) => tone[$tone].bg};
  border: 1px solid ${({ $tone }) => tone[$tone].border};
  color: ${({ $tone }) => tone[$tone].fg};
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: ${fontSize.meta};
  font-weight: 600;

  p {
    flex: 1;
    min-width: 0;
    margin: 0;
    line-height: 1.4;
    word-break: keep-all;
  }

  strong {
    font-weight: 600;
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

/* ───────────────────────── 지표 카드 ───────────────────────── */

export const StatsGrid = styled.section<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, minmax(0, 1fr));
  gap: 12px;
`;

export const MetricCard = styled.article<{ $tone: ToneName }>`
  min-height: 96px;
  padding: 14px 18px;
  background: ${color.surface};
  border: 1px solid ${({ $tone }) => tone[$tone].border};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.card};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;

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
    font-size: 1.75rem;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.02em;
  }
`;

/* ───────────────────────── 조건 카드 / 필터 ───────────────────────── */

/** 적용 조건 강조 카드 — 강조는 배경과 사방 테두리로만 한다 */
export const ConditionCard = styled.section`
  padding: 12px 16px;
  background: ${tone.warning.bg};
  border: 1px solid ${tone.warning.border};
  border-radius: ${radius.card}px;
  display: flex;
  align-items: flex-end;
  gap: 18px;
  flex-wrap: wrap;

  .condition-title {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 42px;
    color: ${tone.warning.fg};
    font-size: ${fontSize.meta};
    font-weight: 600;
    white-space: nowrap;
  }
`;

export const FilterCard = styled.section`
  padding: 12px 16px;
  background: ${color.surface};
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  box-shadow: ${shadow.card};
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
`;

export const Field = styled.label<{ $width?: number }>`
  min-width: 0;
  ${({ $width }) => ($width ? `width: ${$width}px;` : 'flex: 1 1 140px;')}
  display: flex;
  flex-direction: column;
  gap: 6px;

  > span {
    color: ${color.ink3};
    font-size: ${fontSize.meta};
    font-weight: 600;
  }

  /* 셀렉트는 공용 커스텀 컴포넌트를 쓰므로 여기서는 텍스트 입력만 다룬다 */
  input {
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.control}px;
    background: ${color.surfaceSubtle};
    color: ${color.ink};
    font-size: ${fontSize.meta};
    font-weight: 600;

    &::placeholder {
      color: ${color.ink4};
      font-weight: 500;
    }

    &:hover {
      border-color: ${color.borderStrong};
    }

    &:focus-visible {
      outline: ${focusRing};
      outline-offset: 2px;
    }
  }
`;

export const FilterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 0;
`;

/* ───────────────────────── 데이터 카드 ───────────────────────── */

export const DataCard = styled.section`
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

  > .title-group > svg {
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

/** 그리드 하단 상태 바 */
export const GridFooter = styled.div`
  flex-shrink: 0;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: ${color.ink3};
  font-size: ${fontSize.caption};
  font-weight: 600;
`;

/* ───────────────────────── 그리드 ───────────────────────── */

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
  /* 스크롤 영역과 같은 높이를 명시해야 본문 행 트랙이 남는 높이를 계산할 수 있다 */
  height: 100%;
  display: flex;
  flex-direction: column;
`;

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
  flex: 0 0 auto;
`;

/** 그룹 헤더 (발주예정일 — 2026년 08월) */
export const GroupRow = styled.div<{ $template: string }>`
  ${rowBase}
  grid-template-columns: ${({ $template }) => $template};
  position: sticky;
  top: 0;
  z-index: ${gridLayer.stickyRow};
  min-height: 28px;
  background: ${color.fill};
  border-bottom: 1px solid ${color.border};
`;

export const HeadRow = styled.div<{ $template: string; $top?: number }>`
  ${rowBase}
  grid-template-columns: ${({ $template }) => $template};
  position: sticky;
  top: ${({ $top }) => $top ?? 0}px;
  z-index: ${gridLayer.stickyRow};
  min-height: 34px;
  background: ${color.surfaceSubtle};
  border-bottom: 1px solid ${color.border};
`;

export const BodyRow = styled.div<{ $template: string; $even: boolean }>`
  ${rowBase}
  grid-template-columns: ${({ $template }) => $template};
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

type CellAlign = 'left' | 'center' | 'right';
type CellVariant = 'head' | 'group' | 'body';

const CELL_BACKGROUND: Record<CellVariant, string> = {
  head: color.surfaceSubtle,
  group: color.fill,
  body: 'inherit',
};

const alignToJustify = (align: CellAlign) =>
  align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

/** 일반 셀 */
export const Cell = styled.div<{
  $align: CellAlign;
  $variant: CellVariant;
  $accent?: boolean;
  $muted?: boolean;
  $weekend?: boolean;
}>`
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) => alignToJustify($align)};
  padding: 0 8px;
  border-left: 1px solid ${color.divider};
  background: ${({ $variant, $weekend }) =>
    $weekend && $variant === 'body' ? color.surfaceSubtle : CELL_BACKGROUND[$variant]};
  color: ${({ $variant, $accent, $muted, $weekend }) => {
    if ($accent) return tone.info.fg;
    if ($weekend && $variant !== 'body') return color.brand;
    if ($variant === 'head') return color.ink3;
    if ($variant === 'group') return color.ink;
    if ($muted) return color.ink4;
    return color.ink2;
  }};
  font-size: ${fontSize.caption};
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

/** 좌측 고정 셀 */
export const StickyCell = styled(Cell)<{ $left: number }>`
  position: sticky;
  left: ${({ $left }) => $left}px;
  z-index: ${gridLayer.stickyColumn};
`;

/** 상단 고정 행 안의 좌측 고정 셀 — 두 방향이 겹치므로 모서리 레이어를 쓴다 */
export const StickyCornerCell = styled(StickyCell)`
  z-index: ${gridLayer.corner};
`;

/** 그룹 헤더에서 고정 컬럼 구간을 덮는 빈 셀 */
export const GroupSpacer = styled.div<{ $span: number }>`
  grid-column: span ${({ $span }) => $span};
  position: sticky;
  left: 0;
  z-index: ${gridLayer.corner};
  background: ${color.fill};
`;

export const GroupCell = styled.div<{ $span: number }>`
  grid-column: span ${({ $span }) => $span};
  display: grid;
  place-items: center;
  border-left: 1px solid ${color.border};
  color: ${color.ink};
  font-size: ${fontSize.micro};
  font-weight: 600;
`;

/** 발주예정일 헤더 셀 — 좁은 열에 맞춰 일자와 요일을 두 줄로 쌓는다 */
export const DayHeadCell = styled(Cell)`
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  padding: 0 4px;
  line-height: 1.1;

  .day {
    font-size: ${fontSize.caption};
    font-weight: 600;
  }

  .weekday {
    font-size: 0.66rem;
    font-weight: 600;
    opacity: 0.85;
  }
`;

/** BOM Level 열 — 레벨만큼 들여쓴다 */
export const LevelCell = styled(StickyCell)<{ $level: number }>`
  padding-left: ${({ $level }) => 8 + $level * 9}px;
  color: ${({ $level }) => ($level === 0 ? color.ink : color.ink3)};
`;

export const OrderNeedBadge = styled.span<{ $need: OrderNeed }>`
  min-width: 44px;
  height: 22px;
  padding: 0 8px;
  border-radius: ${radius.row}px;
  background: ${({ $need }) =>
    $need === 'urgent' ? tone.warning.bg : $need === 'required' ? tone.success.bg : tone.neutral.bg};
  color: ${({ $need }) =>
    $need === 'urgent' ? tone.warning.fg : $need === 'required' ? tone.success.fg : tone.neutral.fg};
  border: 1px solid
    ${({ $need }) =>
      $need === 'urgent' ? tone.warning.border : $need === 'required' ? tone.success.border : tone.neutral.border};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: ${fontSize.caption};
  font-weight: 600;
`;

/* ───────────────────────── 상태 표시 ───────────────────────── */

export const StateBox = styled.div<{ $tone?: ToneName }>`
  flex: 1;
  min-height: 200px;
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
