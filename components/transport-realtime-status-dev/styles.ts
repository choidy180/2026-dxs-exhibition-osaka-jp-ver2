'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { color, controlHeight, focusRing, font, fontSize, fontWeight, motion, radius, scrollbar, shadow, space, tone, zIndex, type ToneName } from '@/styles/design-tokens';

export const Shell = styled.div`
  width: 100%;
  height: 100vh;
  padding: ${space.xl}px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: ${space.xl}px;
  overflow: hidden;
  background: ${color.pageBg};
  color: ${color.ink2};
  font-family: ${font.family};
  font-size: ${fontSize.body};
  font-weight: ${fontWeight.medium};
  &, *, *::before, *::after { box-sizing: border-box; }
  *, *::before, *::after { font-family: inherit; }
  h1, h2, h3, p { margin: 0; }
  h1, h2, h3, strong { font-weight: ${fontWeight.semibold}; }
  button, input { font: inherit; }
  button, a, input { &:focus-visible { outline: ${focusRing}; outline-offset: 3px; } }
`;

export const Topbar = styled.header`
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.xl}px;
  padding: 0 ${space.md}px;
  .identity, .actions { display: flex; align-items: center; gap: ${space.xl}px; }
  .identity > svg { color: ${color.brand}; }
  h1 { color: ${color.ink}; font-size: ${fontSize.pageTitle}; letter-spacing: -.02em; }
  .eyebrow { color: ${color.ink3}; font-size: ${fontSize.caption}; letter-spacing: .08em; }
`;

export const Badge = styled.span<{ $tone?: ToneName }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${space.sm}px;
  flex-shrink: 0;
  padding: ${space.xs}px ${space.md}px;
  border: 1px solid ${({ $tone = 'neutral' }) => tone[$tone].border};
  border-radius: ${radius.control}px;
  background: ${({ $tone = 'neutral' }) => tone[$tone].bg};
  color: ${({ $tone = 'neutral' }) => tone[$tone].fg};
  font-size: ${fontSize.caption};
  font-weight: ${fontWeight.semibold};
  white-space: nowrap;
`;

export const OriginalLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${space.sm}px;
  color: ${color.ink3};
  text-decoration: none;
  font-size: ${fontSize.meta};
  &:hover { color: ${color.ink}; }
`;

export const Workspace = styled.div`
  display: grid;
  grid-template-columns: clamp(480px, 38vw, 680px) minmax(0, 1fr);
  gap: ${space.xl}px;
  min-height: 0;
  min-width: 0;
  @media (max-width: 1500px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, .9fr) minmax(0, 1fr);
  }
`;

export const InformationPanel = styled.aside`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  box-shadow: ${shadow.card};
  @media (max-width: 1500px) { max-height: 46vh; overflow-y: auto; ${scrollbar} }
`;

export const PanelIntro = styled.div`
  padding: ${space.huge}px;
  display: flex;
  flex-direction: column;
  gap: ${space.xxxl}px;
  flex-shrink: 0;
  .heading { display: flex; align-items: center; justify-content: space-between; gap: ${space.md}px; }
  h2 { color: ${color.ink}; font-size: ${fontSize.cardTitle}; letter-spacing: -.02em; }
  .caption { color: ${color.ink3}; font-size: ${fontSize.meta}; line-height: 1.5; }
  @media (max-width: 1500px) {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    column-gap: ${space.huge}px;
    row-gap: ${space.md}px;
    .heading { grid-column: 1; grid-row: 1; }
    .caption { grid-column: 1; grid-row: 2; }
    .summary { grid-column: 2; grid-row: 1 / span 2; }
  }
`;

export const Button = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${space.sm}px;
  min-height: ${controlHeight.sm}px;
  padding: ${space.sm}px ${space.lg}px;
  border: 1px solid ${({ $active }) => $active ? color.brandBorder : color.border};
  border-radius: ${radius.control}px;
  color: ${({ $active }) => $active ? color.brand : color.ink2};
  background: ${({ $active }) => $active ? color.brandSoft : color.surface};
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.semibold};
  white-space: nowrap;
  cursor: pointer;
  transition: background ${motion.hover}, border-color ${motion.hover};
  &:hover { background: ${({ $active }) => $active ? color.brandSoft : color.surfaceSubtle}; border-color: ${color.borderStrong}; }
  &:disabled { opacity: .58; cursor: wait; }
`;

export const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${space.md}px;
  > div {
    display: flex;
    flex-direction: column;
    gap: ${space.lg}px;
    padding: ${space.xl}px;
    border: 1px solid ${color.borderSoft};
    border-radius: ${radius.card}px;
    background: ${color.surfaceSubtle};
  }
  .label { display: flex; align-items: center; gap: ${space.sm}px; color: ${color.ink3}; font-size: ${fontSize.meta}; }
  strong { color: ${color.ink}; font-size: ${fontSize.metric}; font-family: ${font.numeric}; line-height: .9; }
  small { margin-left: ${space.xs}px; color: ${color.ink3}; font-size: ${fontSize.meta}; }
`;

export const FilterArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.xl}px;
  flex-shrink: 0;
  padding: 0 ${space.huge}px ${space.xxxl}px;
  .search-row { display: flex; gap: ${space.md}px; min-width: 0; }
  .filters { display: flex; align-items: center; flex-wrap: wrap; gap: ${space.sm}px; }
  .filters > span { margin-left: auto; color: ${color.ink3}; font-size: ${fontSize.caption}; }
`;

export const SearchBox = styled.label`
  display: flex;
  align-items: center;
  gap: ${space.md}px;
  flex: 1;
  min-width: 0;
  height: 42px;
  padding: 0 ${space.xl}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surfaceSubtle};
  color: ${color.ink3};
  &:focus-within { outline: ${focusRing}; outline-offset: 2px; }
  input { width: 100%; min-width: 0; border: 0; background: transparent; color: ${color.ink}; font-size: ${fontSize.bodySm}; outline: none; }
  input:focus-visible { outline: none; }
  input::placeholder { color: ${color.ink4}; }
`;

export const VehicleList = styled.div`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  padding: ${space.xxxl}px ${space.huge}px;
  background: ${color.surfaceSubtle};
  border-top: 1px solid ${color.border};
  ${scrollbar}
  .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: ${space.md}px; align-content: start; }
  @media (max-width: 1500px) { flex: none; overflow: visible; .cards { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  @media (max-width: 1200px) { .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
`;

export const VehicleCard = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${space.xl}px;
  min-width: 0;
  padding: ${space.xxl}px;
  text-align: left;
  background: ${({ $selected }) => $selected ? color.brandSoft : color.surface};
  border: 1px solid ${({ $selected }) => $selected ? color.brandBorder : color.border};
  border-radius: ${radius.card}px;
  color: ${color.ink2};
  cursor: pointer;
  transition: border-color ${motion.hover}, background ${motion.hover};
  &:hover { border-color: ${({ $selected }) => $selected ? color.brand : color.borderStrong}; }
  .card-head, .card-foot { display: flex; align-items: center; justify-content: space-between; gap: ${space.sm}px; }
  .vehicle-no { font-size: ${fontSize.body}; font-weight: ${fontWeight.semibold}; color: ${color.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .route { display: flex; flex-direction: column; gap: ${space.sm}px; color: ${color.ink3}; font-size: ${fontSize.meta}; }
  .route > span { display: flex; align-items: center; gap: ${space.sm}px; min-width: 0; }
  .route svg { flex-shrink: 0; }
  .route b { font-weight: ${fontWeight.medium}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-foot { color: ${color.ink3}; font-size: ${fontSize.caption}; }
  .card-foot strong { color: ${color.ink2}; }
`;

export const ProgressTrack = styled.div.attrs<{ $progress: number; $arrived?: boolean }>(({ $progress }) => ({
  style: { '--transport-progress': `${Math.max(0, Math.min(100, $progress * 100))}%` },
}))`
  height: 6px;
  overflow: hidden;
  border-radius: ${radius.bar}px;
  background: ${color.fill};
  &::after { content: ''; display: block; width: var(--transport-progress); height: 100%; border-radius: inherit; background: ${({ $arrived }) => $arrived ? tone.success.fg : color.brand}; transition: width ${motion.value}; }
`;

export const StateBox = styled.div<{ $error?: boolean }>`
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${space.xl}px;
  padding: ${space.huge}px;
  text-align: center;
  border: 1px dashed ${({ $error }) => $error ? tone.danger.border : color.borderStrong};
  border-radius: ${radius.card}px;
  background: ${({ $error }) => $error ? tone.danger.bg : color.surfaceSubtle};
  color: ${color.ink3};
  h3 { color: ${color.ink}; font-size: ${fontSize.body}; }
  p { max-width: 320px; font-size: ${fontSize.meta}; line-height: 1.6; }
  .state-icon { width: 48px; height: 48px; border-radius: ${radius.pill}px; display: grid; place-items: center; background: ${color.fill}; }
`;

export const Detail = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${space.xl}px;
  flex-shrink: 0;
  max-height: 34%;
  min-height: 0;
  overflow-y: auto;
  padding: ${space.xxxl}px ${space.huge}px;
  border-top: 1px solid ${color.border};
  background: ${color.surface};
  ${scrollbar}
  .detail-head { display: flex; align-items: center; justify-content: space-between; gap: ${space.md}px; }
  .detail-heading { display: flex; align-items: center; gap: ${space.md}px; }
  h3 { color: ${color.ink}; font-size: ${fontSize.sectionTitle}; }
  .detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: ${space.md}px; }
  .detail-grid div { display: flex; flex-direction: column; gap: ${space.sm}px; min-width: 0; }
  .detail-grid span { color: ${color.ink3}; font-size: ${fontSize.caption}; }
  .detail-grid strong { font-size: ${fontSize.meta}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .journey { display: flex; align-items: center; justify-content: space-between; gap: ${space.xl}px; padding: ${space.lg}px; background: ${color.surfaceSubtle}; border: 1px solid ${color.borderSoft}; border-radius: ${radius.row}px; }
  .journey div { min-width: 0; display: flex; flex-direction: column; gap: ${space.xs}px; }
  .journey strong { color: ${color.ink2}; font-size: ${fontSize.meta}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .journey span { color: ${color.ink3}; font-size: ${fontSize.caption}; }
  .journey svg { flex-shrink: 0; color: ${color.ink4}; }
  @media (max-width: 1500px) { max-height: none; }
`;

export const PanelFooter = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.md}px;
  padding: ${space.xl}px ${space.huge}px;
  border-top: 1px solid ${color.border};
  color: ${color.ink3};
  font-size: ${fontSize.caption};
  flex-shrink: 0;
  .connection { display: flex; align-items: center; gap: ${space.sm}px; }
`;

export const MapPanel = styled.section`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  overflow: hidden;
  box-shadow: ${shadow.panel};
`;

export const MapToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${space.md}px;
  padding: ${space.xl}px ${space.xxxl}px;
  border-bottom: 1px solid ${color.border};
  h2 { display: flex; align-items: center; gap: ${space.md}px; color: ${color.ink}; font-size: ${fontSize.body}; }
  .map-actions, .view-modes { display: flex; align-items: center; gap: ${space.sm}px; }
  .view-modes { padding: ${space.xs}px; border: 1px solid ${color.borderSoft}; background: ${color.surfaceSubtle}; border-radius: ${radius.card}px; }
`;

export const MapStage = styled.div`
  position: relative;
  min-width: 0;
  min-height: 0;
  isolation: isolate;
  overflow: hidden;
  background: ${color.pageBg};
`;

export const MapCanvas = styled.div`
  position: absolute;
  inset: 0;
  isolation: isolate;
  z-index: ${zIndex.stickyHead};
`;

export const MapNotice = styled.div`
  position: absolute;
  inset: ${space.huge}px auto auto 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100% - ${space.huge * 2}px);
  z-index: ${zIndex.popover};
  display: flex;
  align-items: center;
  gap: ${space.md}px;
  padding: ${space.lg}px ${space.xxl}px;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  box-shadow: ${shadow.card};
  font-size: ${fontSize.meta};
  color: ${color.ink3};
  pointer-events: none;
`;

export const MapFooter = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${space.md}px;
  padding: ${space.xl}px ${space.xxxl}px;
  border-top: 1px solid ${color.border};
  color: ${color.ink3};
  font-size: ${fontSize.caption};
  span { display: flex; align-items: center; gap: ${space.sm}px; }
`;
