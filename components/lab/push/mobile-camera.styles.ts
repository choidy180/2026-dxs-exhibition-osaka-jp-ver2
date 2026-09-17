'use client';

import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  color, controlHeight, focusRing, font, fontSize, fontWeight,
  motion as motionToken, radius, scrollbar, shadow, space, tone, zIndex,
} from '@/styles/design-tokens';
import type { ToneName } from '@/styles/design-tokens';

export const CameraSection = styled.section`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${space.xl}px;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.md}px;
  min-width: 0;
  h2 { margin: 0; color: ${color.ink}; font-size: ${fontSize.cardTitle}; font-weight: ${fontWeight.semibold}; letter-spacing: -.02em; }
  .heading { display: flex; align-items: center; gap: ${space.md}px; min-width: 0; }
  .count { color: ${color.ink3}; font-size: ${fontSize.meta}; font-weight: ${fontWeight.medium}; }
`;

export const CameraIconButton = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${controlHeight.lg}px;
  height: ${controlHeight.lg}px;
  padding: 0;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink3};
  cursor: pointer;
  transition: background ${motionToken.hover}, border-color ${motionToken.hover};
  &:hover { background: ${color.surfaceSubtle}; border-color: ${color.borderStrong}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 3px; }
  &:disabled { opacity: .58; cursor: wait; }
`;

export const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.md}px;
  padding: 0 ${space.xl}px;
  min-height: ${controlHeight.lg}px;
  min-width: 0;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink3};
  &:focus-within { outline: ${focusRing}; outline-offset: 3px; }
  > svg { flex: 0 0 auto; }
  input {
    width: 100%; min-width: 0; min-height: ${controlHeight.lg}px;
    padding: 0; border: 0; background: transparent; color: ${color.ink};
    font: inherit; font-size: ${fontSize.body}; outline: none;
    &::placeholder { color: ${color.ink4}; }
  }
`;

export const CameraFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${space.md}px;
`;

export const CameraFilter = styled.button<{ $active: boolean }>`
  min-height: ${controlHeight.lg}px;
  padding: ${space.md}px ${space.xl}px;
  border: 1px solid ${({ $active }) => $active ? color.brandBorder : color.border};
  border-radius: ${radius.control}px;
  background: ${({ $active }) => $active ? color.brandSoft : color.surface};
  color: ${({ $active }) => $active ? color.brand : color.ink3};
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.semibold};
  cursor: pointer;
  transition: background ${motionToken.hover}, border-color ${motionToken.hover};
  &:focus-visible { outline: ${focusRing}; outline-offset: 3px; }
  &:disabled { opacity: .58; cursor: wait; }
`;

export const CameraRows = styled.ul`
  margin: 0;
  padding: ${space.sm}px;
  display: flex;
  flex-direction: column;
  gap: ${space.xs}px;
  list-style: none;
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  box-shadow: ${shadow.card};
  min-width: 0;
  li { min-width: 0; }
`;

export const CameraRowButton = styled.button`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 60px 16px;
  align-items: center;
  gap: ${space.lg}px;
  padding: ${space.xxl}px ${space.lg}px;
  border: 1px solid transparent;
  border-radius: ${radius.row}px;
  background: ${color.surface};
  color: ${color.ink3};
  text-align: left;
  cursor: pointer;
  transition: background ${motionToken.hover}, border-color ${motionToken.hover};
  &:hover { background: ${color.surfaceSubtle}; border-color: ${color.border}; }
  &:focus-visible { outline: ${focusRing}; outline-offset: 1px; }
`;

export const CameraIdentity = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${space.sm}px;
  .name { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${color.ink}; font-size: ${fontSize.body}; font-weight: ${fontWeight.semibold}; }
  .meta { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${color.ink3}; font-size: ${fontSize.caption}; font-weight: ${fontWeight.regular}; }
  .code { font-family: ${font.mono}; }
`;

export const CameraStatus = styled.span<{ $tone: ToneName }>`
  display: inline-flex;
  align-items: center;
  gap: ${space.xs}px;
  padding: ${space.xs}px ${space.sm}px;
  border: 1px solid ${({ $tone }) => tone[$tone].border};
  border-radius: ${radius.control}px;
  background: ${({ $tone }) => tone[$tone].bg};
  color: ${({ $tone }) => tone[$tone].fg};
  font-size: ${fontSize.caption};
  font-weight: ${fontWeight.medium};
  line-height: 1.2;
`;

export const CameraAvatar = styled.span`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  overflow: hidden;
  border: 1px solid ${color.borderSoft};
  border-radius: ${radius.card}px;
  background: ${color.fill};
  color: ${color.ink4};
  img { object-fit: contain; }
`;

export const CameraState = styled.div<{ $error?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${space.xl}px;
  min-height: 190px;
  padding: ${space.huge}px;
  border: 1px ${({ $error }) => $error ? 'solid' : 'dashed'} ${({ $error }) => $error ? tone.danger.border : color.borderStrong};
  border-radius: ${radius.card}px;
  background: ${({ $error }) => $error ? tone.danger.bg : color.surfaceSubtle};
  color: ${color.ink3};
  text-align: center;
  font-size: ${fontSize.bodySm};
  strong { color: ${color.ink}; font-weight: ${fontWeight.semibold}; }
  p { margin: 0; line-height: 1.6; }
`;

export const CameraTextButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${space.sm}px;
  min-height: ${controlHeight.lg}px;
  padding: ${space.md}px ${space.xl}px;
  border: 1px solid ${color.border};
  border-radius: ${radius.control}px;
  background: ${color.surface};
  color: ${color.ink2};
  font-size: ${fontSize.bodySm};
  font-weight: ${fontWeight.semibold};
  cursor: pointer;
  &:focus-visible { outline: ${focusRing}; outline-offset: 3px; }
  &:disabled { opacity: .58; cursor: wait; }
`;

export const RefreshNotice = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${space.md}px;
  padding: ${space.xl}px;
  border: 1px solid ${tone.warning.border};
  border-radius: ${radius.card}px;
  background: ${tone.warning.bg};
  color: ${color.ink2};
  font-size: ${fontSize.meta};
  line-height: 1.6;
`;

export const UpdateTime = styled.p`
  margin: 0;
  color: ${color.ink3};
  font-size: ${fontSize.caption};
  text-align: right;
`;

export const ViewerBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.modalBackdrop};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${space.xl}px;
  background: ${color.overlay};
  backdrop-filter: blur(4px);
  font-family: ${font.family};
  *, *::before, *::after { box-sizing: border-box; font-family: inherit; }
`;

export const CameraDialog = styled.div`
  position: relative;
  z-index: ${zIndex.modal};
  width: 100%;
  max-width: 760px;
  max-height: calc(100dvh - ${space.xl * 2}px);
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${color.border};
  border-radius: ${radius.card}px;
  background: ${color.surface};
  color: ${color.ink};
  box-shadow: ${shadow.modal};
  &:focus-visible { outline: ${focusRing}; outline-offset: 3px; }
`;

export const ViewerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  min-width: 0;
  gap: ${space.md}px;
  padding: ${space.xxl}px;
  .identity { min-width: 0; }
  h2 { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: ${fontSize.cardTitle}; font-weight: ${fontWeight.semibold}; }
  p { margin: ${space.sm}px 0 0; color: ${color.ink3}; font-size: ${fontSize.meta}; }
`;

export const ViewerBody = styled.div`
  min-height: 0;
  min-width: 0;
  padding: 0 ${space.xxl}px ${space.xxl}px;
  overflow-y: auto;
  ${scrollbar}
  .player-stage { position: relative; width: 100%; height: clamp(240px, 45dvh, 440px); min-width: 0; }
  .player-stage > div { border-radius: ${radius.card}px; overflow: hidden; }
  .player-stage button { min-height: ${controlHeight.lg}px; }
  .viewer-note { margin: ${space.xl}px 0 0; color: ${color.ink3}; font-size: ${fontSize.meta}; line-height: 1.6; }
`;
