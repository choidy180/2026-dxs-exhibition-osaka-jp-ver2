"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import styled, { createGlobalStyle, css, keyframes } from 'styled-components';
import { Check, ChevronDown, Info, Maximize, Minimize, Search, MapPin, X, ZoomIn, ZoomOut } from 'lucide-react';

// =============================================================================
// 0. GLOBAL STYLE & THEME
// =============================================================================

const GlobalStyle = createGlobalStyle`
  @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");

  body {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    background-color: #F5F7FA;
    color: #1E293B;
    overflow: hidden;
  }
  * { box-sizing: border-box; }

  @media (max-width: 1024px) {
    html,
    body {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
      overflow-y: auto;
    }
  }
`;

const THEME_COLOR = "#00B87C"; 

// =============================================================================
// 1. DATA DEFINITIONS
// =============================================================================
const JIG_1_L = ['GJ01', 'GJ03', 'GJ05', 'GJ07', 'GJ09', 'GJ11', 'GJ13', 'GJ15', 'GJ17'];
const JIG_1_R = ['GJ19', 'GJ21', 'GJ23', 'GJ25', 'GJ27', 'GJ29', 'GJ31'];
const JIG_BTM = ['GJ33', 'GJ35', 'GJ37', 'GJ39', 'GJ41', 'GJ43', 'GJ45', 'GJ47', 'GJ49', 'GJ51', 'GJ53', 'GJ55', 'GJ57', 'GJ59'];

const GF_LEFT_COL = ['24','18','12','06'];
const GF_RIGHT_COL = ['23','17','11','05'];
const GF_GRID = [
  ['22','21','20','19'], ['16','15','14','13'], ['10','09','08','07'], ['04','03','02','01']
];

const GA_TOP_1 = ['10','09','08','07','06','05','04','03','02','01'];
const GA_TOP_2 = ['20','19','18','17','16','15','14','13','12','11'];

const GA_ROWS = [
  { l:['30','29','28'], r:['27','26','25','24','23','22','21'] },
  { l:['40','39','38'], r:['37','36','35','34','33','32','31'] },
  { l:['50','49','48'], r:['47','46','45','44','43','42','41'] },
  { l:['60','59','58'], r:['57','56','55','54','53','52','51'] },
  { l:['70','69','68'], r:['67','66','65','64','63','62','61'] }
];

const GB_34_L = ['34','33','32'];
const GB_34_R = ['31','30','29','28','27','26','25','24','23','22','21','20','19','18'];
const GB_17_L = ['17','16','15'];
const GB_17_R = ['14','13','12','11','10','09','08','07','06','05','04','03','02','01'];

const GC_L_TOP = ['26','25','24','23','22','21','20','19','18'];
const GC_L_BTM = ['13','12','11','10','09','08','07','06','05'];
const GC_R_TOP = ['17','16','15','14'];
const GC_R_BTM = ['04','03','02','01'];

const GE_L = ['28'];
const GE_BODY = [{l:'27',r:'26'}, {l:'25',r:'24'}, {l:'23',r:'22'}];
const GE_GRID = [
  ['21','20','19'],['18','17','16'],['15','14','13'],['12','11','10'],['09','08','07'],['06','05','04']
];

const GD_STRIP = [
  {l:'45',r:'44'}, {l:'43',r:'42'}, {l:'41',r:'40'}, {l:'39',r:'38'}, {l:'37',r:'36'}, {l:'35',r:'34'}, {l:'33',r:'32'}, {l:'31',r:'30'}, {l:'29',r:'28'}
];
const GD_GRID_H = ['GE03','GE02','GE01'];
const GD_GRID = [
  ['27','26','25'],['24','23','22'],['21','20','19'],['18','17','16'],['15','14','13'],['12','11','10'],['09','08','07'],['06','05','04'],['03','02','01']
];

type MapViewKey = 'all' | 'GJ' | 'GA' | 'GB' | 'GC' | 'GD' | 'GE' | 'GF';

const MAP_VIEW_OPTIONS: Array<{ key: MapViewKey; label: string; description: string }> = [
  { key: 'all', label: '전체보기', description: '제품창고의 모든 구역을 한 화면에서 확인' },
  { key: 'GJ', label: 'JIG ZONE', description: 'JIG 적재 구역만 확대해서 확인' },
  { key: 'GA', label: 'GA 구역', description: 'GA 적재 슬롯만 확대해서 확인' },
  { key: 'GB', label: 'GB 구역', description: 'GB 적재 슬롯만 확대해서 확인' },
  { key: 'GC', label: 'GC 구역', description: 'GC 적재 슬롯만 확대해서 확인' },
  { key: 'GD', label: 'GD 구역', description: 'GD 적재 슬롯만 확대해서 확인' },
  { key: 'GE', label: 'GE 구역', description: 'GE 적재 슬롯만 확대해서 확인' },
  { key: 'GF', label: 'GF 구역', description: 'GF 적재 슬롯만 확대해서 확인' },
];

// =============================================================================
// 2. STYLED COMPONENTS 
// =============================================================================

const W_JIG = '58px';
const W_NARROW = '48px';
const W_WIDE = '96px';
const CELL_HEIGHT = '36px';

const pulse = keyframes`
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
`;

const Layout = styled.div`
  display: flex;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 100vh;
  height: 100dvh;
  padding: 16px;
  gap: 16px;
  overflow: hidden;
  background-color: #F1F5F9;

  @media (max-width: 1500px) {
    padding: 12px;
    gap: 12px;
  }

  @media (max-width: 1024px) {
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 12px;
    overflow: visible;
    flex-direction: column;
  }

  @media (max-width: 640px) {
    padding: 8px;
    gap: 8px;
  }
`;

const LeftColumn = styled.div`
  width: clamp(250px, 16vw, 300px);
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;

  @media (max-width: 1500px) {
    width: 250px;
    gap: 12px;
  }

  @media (max-width: 1024px) {
    order: 2;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;

    > :last-child {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 8px;

    > :last-child {
      grid-column: auto;
    }
  }
`;

const PanelBlock = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  padding: 20px;
  display: flex;
  flex-direction: column;

  @media (max-width: 1500px) {
    padding: 16px;
  }

  @media (max-width: 640px) {
    padding: 16px;
    border-radius: 12px;
  }
`;

const PanelTitle = styled.h2<{ flex?: boolean }>`
  font-size: 16px;
  font-weight: 600;
  color: #0F172A;
  margin: 0 0 16px 0;
  display: ${props => props.flex ? 'flex' : 'block'};
  justify-content: ${props => props.flex ? 'space-between' : 'flex-start'};
  align-items: center;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  .lbl { font-size: 12px; color: #64748B; font-weight: 600; }
  .val { font-size: 28px; font-weight: 600; color: #0F172A; display: flex; align-items: baseline; gap: 2px;}
  .val.big { font-size: 28px; }
  .val.red { color: #E11D48; }
  small { font-size: 20px; font-weight: 600; color: #94A3B8; margin-left: 2px; }
`;

const ZoneStatList = styled.div`
  display: flex; flex-direction: column; gap: 12px;
`;

const ZoneStatItem = styled.div`
  display: flex; flex-direction: column; gap: 6px;
  .header { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #475569; }
  .bar-bg { width: 100%; height: 4px; background: #F1F5F9; border-radius: 2px; overflow: hidden; }
  .bar-fill { height: 100%; background: ${THEME_COLOR}; border-radius: 2px; }
`;

const VideoWrapper = styled.div`
  width: 100%; aspect-ratio: 16 / 9; background: #1E293B; border-radius: 8px; overflow: hidden; margin-bottom: 12px; position: relative;
`;

const VideoInfoRow = styled.div`
  display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0;
  .lbl { color: #64748B; font-weight: 600; }
  .val { color: #0F172A; font-weight: 800; }
`;

const CenterColumn = styled.div<{ $fullscreen: boolean }>`
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 1024px) {
    order: 1;
    width: 100%;
    height: 68dvh;
    min-height: 520px;
    max-height: 720px;
    flex: none;
    border-radius: 14px;
  }

  @media (max-width: 640px) {
    height: 66dvh;
    min-height: 480px;
    border-radius: 12px;
  }

  ${(props) => props.$fullscreen && css`
    position: fixed;
    inset: 0;
    z-index: 100000;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    min-height: 0;
    max-height: none;
    border-radius: 0;
    box-shadow: none;
  `}

  &:fullscreen,
  &:-webkit-full-screen {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    min-height: 0;
    max-height: none;
    border-radius: 0;
    background: #ffffff;
  }
`;

const CenterHeader = styled.div`
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #F1F5F9;

  @media (max-width: 640px) {
    padding: 14px 16px;
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;

  @media (max-width: 640px) {
    width: 100%;
    justify-content: space-between;
    gap: 10px;
  }
`;

const MapTitleGroup = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const MobileViewButton = styled.button`
  display: none;

  @media (max-width: 1024px) {
    min-width: 0;
    height: 34px;
    padding: 0 11px;
    border: 1px solid #d8dee8;
    border-radius: 9px;
    background: #ffffff;
    color: #334155;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
  }
`;

const Legend = styled.div`
  display: flex; gap: 12px; font-size: 13px; font-weight: 700; color: #475569;
  .item { display: flex; align-items: center; gap: 6px; }
  .box { width: 14px; height: 14px; border-radius: 4px; }
  .box.empty { border: 1px solid #CBD5E1; background: white; }
  .box.full { background: ${THEME_COLOR}; }

  @media (max-width: 640px) {
    gap: 10px;
    font-size: 11px;
  }
`;

const ZoomButtonGroup = styled.div`
  display: flex; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;
  button {
    background: white; border: none; padding: 6px 12px; cursor: pointer; color: #475569;
    display: flex; align-items: center; justify-content: center; transition: background 0.2s;
    &:hover { background: #F8FAFC; color: #0F172A; }
    &:not(:last-child) { border-right: 1px solid #E2E8F0; }
  }
  .zoom-value {
    min-width: 50px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid #E2E8F0;
    color: #475569;
    background: #F8FAFC;
    font-size: 11px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 640px) {
    button {
      padding: 7px 10px;
    }
    .zoom-value {
      min-width: 44px;
      padding: 0 6px;
    }
  }
`;

const MapScrollArea = styled.div<{ $isDragging: boolean }>`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  touch-action: pan-x pan-y;
  position: relative;
  background: #F8FAFC;
  cursor: ${(props) => (props.$isDragging ? 'grabbing' : 'grab')};
  &::-webkit-scrollbar { width: 8px; height: 8px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background-color: #CBD5E1; border-radius: 4px; }
`;

const RightColumn = styled.div`
  width: clamp(260px, 16vw, 300px);
  min-width: 0;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  @media (max-width: 1500px) {
    width: 270px;
  }

  @media (max-width: 1024px) {
    order: 3;
    width: 100%;
    height: min(620px, 70dvh);
    min-height: 460px;
    border-radius: 14px;
  }

  @media (max-width: 640px) {
    height: 62dvh;
    min-height: 440px;
    border-radius: 12px;
  }
`;

const RightHeader = styled.div`
  padding: 20px 20px 16px 20px;
  border-bottom: 1px solid #F1F5F9;
`;

const LiveBadge = styled.span`
  font-size: 11px; background: #FEF2F2; color: #E11D48; padding: 2px 8px; border-radius: 99px; font-weight: 800;
  display: flex; align-items: center; gap: 4px;
  &::before { content: ''; width: 4px; height: 4px; background: #E11D48; border-radius: 50%; animation: ${pulse} 1.5s infinite; }
`;

const SearchBox = styled.div`
  display: flex; align-items: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 12px; margin-top: 16px;
  input { border: none; background: transparent; outline: none; margin-left: 8px; font-size: 13px; font-family: inherit; width: 100%; color: #0F172A; }
  input::placeholder { color: #94A3B8; }
`;

const InventoryListContainer = styled.div`
  flex: 1; overflow-y: auto; padding: 12px 20px; display: flex; flex-direction: column; gap: 10px;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background-color: #E2E8F0; border-radius: 4px; }
`;

const InventoryCard = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #F1F5F9;
  .left { display: flex; flex-direction: column; gap: 4px; }
  .code { font-size: 14px; font-weight: 800; color: #1E293B; }
  .loc { font-size: 11px; font-weight: 600; color: #64748B; display: flex; align-items: center; gap: 4px; }
  .right-qty { font-size: 12px; font-weight: 800; color: ${THEME_COLOR}; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 4px 10px; border-radius: 6px; }
`;

// --- 스마트 맵 구성요소 ---
const MapStage = styled.div`
  width: max-content;
  min-width: 100%;
  min-height: 100%;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: center;

  @media (max-width: 1024px) {
    padding: 16px;
  }

  @media (max-width: 640px) {
    padding: 12px;
  }
`;

const MapCanvas = styled.div`
  width: max-content;
  transform-origin: top left;
`;

const MapContentWrapper = styled.div<{ $focused?: boolean }>`
  display: flex;
  gap: ${(props) => props.$focused ? '0' : '40px'};
  width: max-content;
`;
const ColLeftMap = styled.div` display: flex; flex-direction: column; gap: 25px; width: fit-content; `;
const ColRightMap = styled.div` display: flex; flex-direction: column; gap: 25px; padding-top: 5px; `;

const GridContainer = styled.div`
  display: flex; flex-direction: column; width: fit-content; border-top: 1px solid #CBD5E1; border-left: 1px solid #CBD5E1; background: white;
`;
const Row = styled.div` display: flex; `;

const CellBox = styled.div<{ w: string; $related: boolean; $origin: boolean }>`
  width: ${props => props.w}; height: ${CELL_HEIGHT}; display: flex; flex-direction: column; border-right: 1px solid #CBD5E1; border-bottom: 1px solid #CBD5E1; background: white; position: relative;
  z-index: ${(props) => props.$origin ? 14 : props.$related ? 12 : 1};
  outline: ${(props) => props.$origin ? '3px solid #F43F5E' : props.$related ? '3px solid #F59E0B' : 'none'};
  outline-offset: -1px;
  box-shadow: ${(props) => props.$origin
    ? '0 0 0 4px rgba(244, 63, 94, 0.18), 0 7px 16px rgba(15, 23, 42, 0.18)'
    : props.$related
      ? '0 0 0 3px rgba(245, 158, 11, 0.16)'
      : 'none'};
  transition: outline-color 0.15s ease, box-shadow 0.15s ease;
  &:hover { z-index: 15; box-shadow: inset 0 0 0 2px #3B82F6, 0 7px 16px rgba(15, 23, 42, 0.18); }
`;

const CellHeader = styled.div<{ $related: boolean }>`
  height: 14px; width: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: ${(props) => props.$related ? '#B45309' : '#475569'}; background: ${(props) => props.$related ? '#FFF7ED' : '#F8FAFC'}; border-bottom: 1px solid #E2E8F0;
`;

const CellValue = styled.div<{ $active?: boolean; $related: boolean }>`
  flex: 1; width: 100%; min-width: 0; display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; letter-spacing: -0.3px;
  background-color: ${props => props.$related ? '#047857' : props.$active ? THEME_COLOR : 'white'};
  color: ${props => props.$active ? 'white' : 'transparent'};
  transition: background-color 0.2s; cursor: pointer;

  /* 제품번호가 길면 말줄임 처리 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
`;

const MapSectionTitle = styled.div<{ $isActive: boolean }>`
  font-size: 14px; font-weight: 800; color: ${props => props.$isActive ? '#3B82F6' : '#64748B'}; margin-bottom: 8px; margin-left: 2px; display: flex; align-items: center; gap: 6px;
`;

const JigZoneBox = styled.div` background: rgba(243, 232, 255, 0.5); border: 1px solid #E9D5FF; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; `;
const ActiveZoneBox = styled.div` background: rgba(239, 246, 255, 0.5); border: 1px solid #BFDBFE; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 30px; `;
const InactiveZoneBox = styled.div` background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 30px; `;

const TooltipBox = styled.div`
  position: fixed; z-index: 100010; background: rgba(255, 255, 255, 0.98); border: 1px solid #E2E8F0; border-radius: 12px; box-shadow: 0 18px 42px rgba(15,23,42,0.18); padding: 14px; width: 340px; max-width: calc(100vw - 24px); pointer-events: auto; display: flex; flex-direction: column; gap: 7px; backdrop-filter: blur(8px);
  .tooltip-header { font-size: 14px; font-weight: 800; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
  .tooltip-row { display: flex; justify-content: space-between; font-size: 12px; .label { color: #64748B; font-weight: 600; } .value { color: #0F172A; font-weight: 800; } }
  .status-badge { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; &.occupied { background: #F0FDF4; color: ${THEME_COLOR}; border: 1px solid #BBF7D0; } &.empty { background: #F1F5F9; color: #64748B; } }
  .product-summary { margin-top: 6px; padding-top: 10px; border-top: 1px solid #E2E8F0; }
  .product-summary-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #334155; font-size: 12px; font-weight: 800; }
  .product-summary-title span { display: inline-flex; align-items: center; gap: 6px; }
  .product-count { color: #D31145; font-size: 16px; font-weight: 900; }
  .product-code { margin-top: 7px; color: #047857; font-size: 13px; font-weight: 900; word-break: break-all; }
  .location-list { margin-top: 8px; padding-right: 3px; display: flex; flex-wrap: wrap; gap: 5px; max-height: 112px; overflow-y: auto; }
  .location-chip { padding: 4px 7px; border-radius: 6px; background: #FFF7ED; border: 1px solid #FED7AA; color: #9A3412; font-size: 10px; font-weight: 850; }

  @media (max-width: 640px) {
    top: auto !important;
    right: 12px;
    bottom: 12px;
    left: 12px !important;
    width: auto;
    max-width: none;
  }
`;

const ViewPickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100020;
  padding: 20px;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ViewPickerModal = styled.div`
  width: min(460px, 100%);
  max-height: min(720px, calc(100dvh - 40px));
  overflow: hidden;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.28);
  display: flex;
  flex-direction: column;
`;

const ViewPickerHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #E2E8F0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  strong { display: block; color: #0F172A; font-size: 18px; font-weight: 900; }
  span { display: block; margin-top: 5px; color: #64748B; font-size: 12px; line-height: 1.45; }
  button { width: 34px; height: 34px; flex: 0 0 auto; border: 0; border-radius: 9px; background: #F1F5F9; color: #475569; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
`;

const ViewPickerList = styled.div`
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ViewPickerOption = styled.button<{ $active: boolean }>`
  min-height: 78px;
  padding: 13px;
  border: 1px solid ${(props) => props.$active ? 'rgba(0, 184, 124, 0.45)' : '#E2E8F0'};
  border-radius: 12px;
  background: ${(props) => props.$active ? '#ECFDF5' : '#ffffff'};
  color: ${(props) => props.$active ? '#047857' : '#334155'};
  display: flex;
  align-items: flex-start;
  gap: 10px;
  text-align: left;
  cursor: pointer;

  .check { width: 22px; height: 22px; flex: 0 0 auto; margin-top: 1px; border-radius: 7px; background: ${(props) => props.$active ? THEME_COLOR : '#F1F5F9'}; color: ${(props) => props.$active ? '#ffffff' : '#94A3B8'}; display: inline-flex; align-items: center; justify-content: center; }
  strong { display: block; color: inherit; font-size: 13px; font-weight: 900; }
  .option-copy > span { display: block; margin-top: 4px; color: #64748B; font-size: 11px; line-height: 1.4; word-break: keep-all; }
`;

// =============================================================================
// 3. TYPES & SUB-COMPONENTS
// =============================================================================

interface ApiSlotDetail { slot_id: number; occupied: boolean; loc_code: string; label001: string | null; vehicle_id: string | null; cdgitem: string | null; entry_time: string | null; }
interface ApiZoneData { total: number; occupied: number; slots_detail: ApiSlotDetail[]; }
type ApiResponse = Record<string, ApiZoneData>;
interface SlotDataMap { [locCode: string]: ApiSlotDetail; }
interface InventoryItem { code: string; loc: string; zone: string; qty: number; }
interface ZoneStat { name: string; total: number; used: number; }
interface TooltipState { x: number; y: number; data: ApiSlotDetail | null; locCode: string; }

interface CellItemProps {
  id: string;
  w: string;
  data: ApiSlotDetail | undefined;
  related: boolean;
  origin: boolean;
  onHover: (e: React.MouseEvent, id: string, data: ApiSlotDetail | undefined) => void;
}

const CellItem = React.memo(({ id, w, data, related, origin, onHover }: CellItemProps) => {
  const isOccupied = data?.occupied;

  // 차량번호(vehicle_id)는 표시하지 않고 제품번호(cdgitem)의 뒤 4자리만 표시
  const displayVal = isOccupied ? (data?.cdgitem ? data.cdgitem.slice(-4) : '----') : '';

  return (
    <CellBox
      w={w}
      $related={related}
      $origin={origin}
      onMouseEnter={(e) => onHover(e, id, data)}
      onMouseLeave={(e) => onHover(e, id, undefined)}
      onClick={(e) => {
        e.stopPropagation();
        onHover(e, id, data);
      }}
    >
      <CellHeader $related={related}>{id}</CellHeader>
      <CellValue $active={isOccupied} $related={related} title={data?.cdgitem || ''}>{displayVal}</CellValue>
    </CellBox>
  );
}, (prev, next) =>
  prev.id === next.id &&
  prev.w === next.w &&
  prev.data === next.data &&
  prev.related === next.related &&
  prev.origin === next.origin
);
CellItem.displayName = "CellItem";

const JigStrip = ({ ids, renderCell }: { ids: string[]; renderCell: (id: string, w: string) => React.ReactNode }) => (
  <Row>{ids.map(id => renderCell(id, W_JIG))}</Row>
);

const WarehouseLayout = React.memo(({ renderCell, view }: { renderCell: (id: string, w: string) => React.ReactNode; view: MapViewKey }) => {
  const jigZone = (
    <JigZoneBox>
      <MapSectionTitle $isActive={false} style={{color:'#A855F7'}}>JIG ZONE</MapSectionTitle>
      <div style={{display:'flex', gap:'20px', alignItems:'flex-end'}}>
        <GridContainer><JigStrip ids={JIG_1_L} renderCell={renderCell} /><JigStrip ids={JIG_1_L} renderCell={renderCell} /></GridContainer>
        <GridContainer><JigStrip ids={JIG_1_R} renderCell={renderCell} /><JigStrip ids={JIG_1_R} renderCell={renderCell} /></GridContainer>
      </div>
      <div style={{marginTop:'10px', marginLeft:'60px'}}><GridContainer><JigStrip ids={JIG_BTM} renderCell={renderCell} /><JigStrip ids={JIG_BTM} renderCell={renderCell} /></GridContainer></div>
    </JigZoneBox>
  );

  const gaZone = (
    <>
      <div>
        <MapSectionTitle $isActive={true}>GA</MapSectionTitle>
        <GridContainer>
          <Row>{GA_TOP_1.slice(0,3).map((n) => renderCell(`GA${n}`, W_NARROW))}{GA_TOP_1.slice(3).map((n) => renderCell(`GA${n}`, W_WIDE))}</Row>
          <Row>{GA_TOP_2.slice(0,3).map((n) => renderCell(`GA${n}`, W_NARROW))}{GA_TOP_2.slice(3).map((n) => renderCell(`GA${n}`, W_WIDE))}</Row>
        </GridContainer>
      </div>
      <div>
        <MapSectionTitle $isActive={true}>GA 상세</MapSectionTitle>
        <GridContainer>
          {GA_ROWS.map((row, i) => (
            <Row key={i}>{row.l.map(n => renderCell(`GA${n}`, W_NARROW))}{row.r.map(n => renderCell(`GA${n}`, W_WIDE))}</Row>
          ))}
        </GridContainer>
      </div>
    </>
  );

  const gbZone = (
    <div>
      <MapSectionTitle $isActive={true}>GB</MapSectionTitle>
      <GridContainer>
        <Row>{GB_34_L.map(n => renderCell(`GB${n}`, W_NARROW))}{GB_34_R.map(n => renderCell(`GB${n}`, W_NARROW))}</Row>
        <Row>{GB_17_L.map(n => renderCell(`GB${n}`, W_NARROW))}{GB_17_R.map(n => renderCell(`GB${n}`, W_NARROW))}</Row>
      </GridContainer>
    </div>
  );

  const gcZone = (
    <div>
      <MapSectionTitle $isActive={true}>GC</MapSectionTitle>
      <div style={{display:'flex', gap:'20px'}}>
        <GridContainer><Row>{GC_L_TOP.map(n => renderCell(`GC${n}`, W_NARROW))}</Row><Row>{GC_L_BTM.map(n => renderCell(`GC${n}`, W_NARROW))}</Row></GridContainer>
        <GridContainer><Row>{GC_R_TOP.map(n => renderCell(`GC${n}`, W_NARROW))}</Row><Row>{GC_R_BTM.map(n => renderCell(`GC${n}`, W_NARROW))}</Row></GridContainer>
      </div>
    </div>
  );

  const gfZone = (
    <div>
      <MapSectionTitle $isActive={false}>GF</MapSectionTitle>
      <div style={{display:'flex', gap:'15px'}}>
        <GridContainer>
          <Row>
            <div style={{display:'flex', flexDirection:'column'}}>{GF_LEFT_COL.map(n => renderCell(`GF${n}`, W_NARROW))}</div>
            <div style={{display:'flex', flexDirection:'column'}}>{GF_RIGHT_COL.map(n => renderCell(`GF${n}`, W_NARROW))}</div>
          </Row>
        </GridContainer>
        <GridContainer>{GF_GRID.map((row, i) => (<Row key={i}>{row.map(n => renderCell(`GF${n}`, W_NARROW))}</Row>))}</GridContainer>
      </div>
    </div>
  );

  const geZone = (
    <div>
      <MapSectionTitle $isActive={false}>GE</MapSectionTitle>
      <div style={{display:'flex', gap:'20px', alignItems:'flex-start'}}>
        <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
          <GridContainer style={{marginRight: W_NARROW}}>{renderCell(`GE${GE_L[0]}`, W_NARROW)}</GridContainer>
          <GridContainer>{GE_BODY.map((p,i) => (<Row key={i}>{renderCell(`GE${p.l}`, W_NARROW)}{renderCell(`GE${p.r}`, W_NARROW)}</Row>))}</GridContainer>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
          <GridContainer>{GE_GRID.map((row,i) => (<Row key={i}>{row.map(n => renderCell(`GE${n}`, W_NARROW))}</Row>))}</GridContainer>
          <GridContainer><Row>{GD_GRID_H.map(id => renderCell(id, W_NARROW))}</Row></GridContainer>
        </div>
      </div>
    </div>
  );

  const gdZone = (
    <div>
      <MapSectionTitle $isActive={false}>GD</MapSectionTitle>
      <div style={{display:'flex', gap:'20px'}}>
        <GridContainer>{GD_STRIP.map((p,i) => (<Row key={i}>{renderCell(`GD${p.l}`, W_NARROW)}{renderCell(`GD${p.r}`, W_NARROW)}</Row>))}</GridContainer>
        <GridContainer>{GD_GRID.map((row,i) => (<Row key={i}>{row.map(n => renderCell(`GD${n}`, W_NARROW))}</Row>))}</GridContainer>
      </div>
    </div>
  );

  if (view !== 'all') {
    let focusedZone: React.ReactNode;
    if (view === 'GJ') focusedZone = jigZone;
    else if (view === 'GA') focusedZone = <ActiveZoneBox>{gaZone}</ActiveZoneBox>;
    else if (view === 'GB') focusedZone = <ActiveZoneBox>{gbZone}</ActiveZoneBox>;
    else if (view === 'GC') focusedZone = <ActiveZoneBox>{gcZone}</ActiveZoneBox>;
    else if (view === 'GF') focusedZone = <InactiveZoneBox>{gfZone}</InactiveZoneBox>;
    else if (view === 'GE') focusedZone = <InactiveZoneBox>{geZone}</InactiveZoneBox>;
    else focusedZone = <InactiveZoneBox>{gdZone}</InactiveZoneBox>;

    return <MapContentWrapper $focused>{focusedZone}</MapContentWrapper>;
  }

  return (
    <MapContentWrapper>
      <ColLeftMap>
        {jigZone}
        <ActiveZoneBox>
          {gaZone}
          {gbZone}
          {gcZone}
        </ActiveZoneBox>
      </ColLeftMap>

      <ColRightMap>
        <InactiveZoneBox>
          {gfZone}
          {geZone}
          {gdZone}
        </InactiveZoneBox>
      </ColRightMap>
    </MapContentWrapper>
  );
});
WarehouseLayout.displayName = "WarehouseLayout";

// =============================================================================
// 웹소켓 실시간 비디오 플레이어 컴포넌트 추가
// =============================================================================
const WsVideoPlayer = ({ wsUrl }: { wsUrl: string }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!wsUrl) return;
    
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'blob'; // Blob 형태로 이미지 프레임 수신 가정

    ws.onopen = () => console.log(`[Video WS] Connected to camera: ${wsUrl}`);
    
    ws.onmessage = (event) => {
      // 전달받은 프레임을 Object URL로 변환하여 img에 렌더링
      if (event.data instanceof Blob) {
        const url = URL.createObjectURL(event.data);
        setImgSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev); // 이전 메모리 해제
          return url;
        });
      }
    };

    ws.onerror = (err) => console.error(`[Video WS] Error:`, err);
    
    return () => {
      ws.close();
      setImgSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [wsUrl]);

  if (!imgSrc) {
    return <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8', fontSize:'13px'}}>실시간 카메라 연결 중...</div>;
  }

  // WebSocket Blob 프레임은 Next Image 최적화 대상이 아니므로 일반 img를 사용합니다.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imgSrc} alt="Live Stream" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
};

// =============================================================================
// 4. MAIN COMPONENT
// =============================================================================

export default function FinalDashboard() {
  const [mapData, setMapData] = useState<SlotDataMap>({});
  const [hoverInfo, setHoverInfo] = useState<TooltipState | null>(null);
  
  const [zoomLevel, setZoomLevel] = useState(0.85); // 화면 맞춤용 초기 배율
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMapView, setSelectedMapView] = useState<MapViewKey>('all');
  const [isViewPickerOpen, setIsViewPickerOpen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const centerPanelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContentRef = useRef<HTMLDivElement>(null);
  const hoverHideTimerRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const fitMapToViewport = useCallback(() => {
    const viewport = containerRef.current;
    const content = mapContentRef.current;
    if (!viewport || !content || content.offsetWidth === 0 || content.offsetHeight === 0) return;

    const isMobile = window.innerWidth <= 1024;
    const stagePadding = window.innerWidth <= 640 ? 24 : isMobile ? 32 : 48;
    const availableWidth = Math.max(1, viewport.clientWidth - stagePadding);
    const availableHeight = Math.max(1, viewport.clientHeight - stagePadding);
    const widthScale = availableWidth / content.offsetWidth;
    const heightScale = availableHeight / content.offsetHeight;
    const isFocusedView = selectedMapView !== 'all';
    const minimumScale = isMobile ? (isFocusedView ? 0.8 : 0.55) : 0.45;
    const maximumScale = isFocusedView ? 1.4 : 1.15;
    const fittedScale = Math.max(minimumScale, Math.min(maximumScale, widthScale, heightScale));

    setZoomLevel(Number(fittedScale.toFixed(2)));

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!containerRef.current) return;
        containerRef.current.scrollLeft = Math.max(0, (containerRef.current.scrollWidth - containerRef.current.clientWidth) / 2);
        containerRef.current.scrollTop = 0;
      });
    });
  }, [selectedMapView]);

  useEffect(() => {
    const viewport = containerRef.current;
    if (!viewport) return;

    const frame = window.requestAnimationFrame(fitMapToViewport);
    const resizeObserver = new ResizeObserver(fitMapToViewport);
    resizeObserver.observe(viewport);
    window.addEventListener('resize', fitMapToViewport);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', fitMapToViewport);
    };
  }, [fitMapToViewport]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFullscreen = document.fullscreenElement === centerPanelRef.current;
      setIsMapFullscreen(isNativeFullscreen);
      window.setTimeout(fitMapToViewport, 80);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [fitMapToViewport]);

  useEffect(() => {
    const timer = window.setTimeout(fitMapToViewport, 60);
    return () => window.clearTimeout(timer);
  }, [selectedMapView, isMapFullscreen, fitMapToViewport]);

  useEffect(() => {
    if (!isMapFullscreen || document.fullscreenElement) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMapFullscreen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMapFullscreen]);

  useEffect(() => () => {
    if (hoverHideTimerRef.current !== null) window.clearTimeout(hoverHideTimerRef.current);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const handleViewportMode = () => {
      if (!mediaQuery.matches) {
        setSelectedMapView('all');
        setIsViewPickerOpen(false);
      }
    };
    mediaQuery.addEventListener('change', handleViewportMode);
    return () => mediaQuery.removeEventListener('change', handleViewportMode);
  }, []);

  const toggleMapFullscreen = useCallback(async () => {
    const panel = centerPanelRef.current;
    if (!panel) return;

    if (isMapFullscreen) {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        setIsMapFullscreen(false);
      }
      return;
    }

    try {
      if (panel.requestFullscreen) {
        await panel.requestFullscreen();
        setIsMapFullscreen(true);
      } else {
        setIsMapFullscreen(true);
      }
    } catch {
      setIsMapFullscreen(true);
    }
  }, [isMapFullscreen]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://gapi.dxsplatform.com/api/DX_API000014');
        const json: ApiResponse = await res.json();
        const newMap: SlotDataMap = {};
        Object.values(json).forEach((zone) => {
          if (zone.slots_detail) {
            zone.slots_detail.forEach((slot) => {
              if (slot.loc_code) newMap[slot.loc_code] = slot;
            });
          }
        });
        setMapData(newMap);
      } catch (error) {
        console.error("API Fetch Error:", error);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo<ZoneStat[]>(() => {
    const zones = ['GA', 'GB', 'GC', 'GD', 'GE', 'GF'];
    const result = zones.map(zoneName => ({ name: zoneName, total: 0, used: 0 }));
    Object.values(mapData).forEach(slot => {
      const prefix = slot.loc_code.substring(0, 2); 
      const zoneIdx = zones.indexOf(prefix);
      if (zoneIdx !== -1) {
        result[zoneIdx].total += 1;
        if (slot.occupied) result[zoneIdx].used += 1;
      }
    });
    return result;
  }, [mapData]);

  // 재고 목록 출력 기준도 vehicle_id로 매핑
  const inventoryList = useMemo<InventoryItem[]>(() => {
    const list: InventoryItem[] = [];
    Object.values(mapData).forEach(slot => {
      if (slot.occupied && slot.vehicle_id) {
        const zone = slot.loc_code.substring(0, 2);
        list.push({ code: slot.vehicle_id, loc: slot.loc_code, zone: zone, qty: 1 });
      }
    });
    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [mapData]);

  const filteredInventory = inventoryList.filter(item => 
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.loc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const recentEntry = useMemo<ApiSlotDetail | null>(() => {
    let latest: ApiSlotDetail | null = null;
    let maxTime = 0;
    Object.values(mapData).forEach(slot => {
      if (slot.occupied && slot.entry_time) {
        const time = new Date(slot.entry_time).getTime();
        if (time > maxTime) {
          maxTime = time;
          latest = slot;
        }
      }
    });
    return latest;
  }, [mapData]);

  // 최근 입고된 위치를 기반으로 웹소켓 카메라 주소 할당 (192.168.2.147:8121~8131)
  const activeCameraUrl = useMemo(() => {
    const baseIp = "192.168.2.147";
    if (!recentEntry || !recentEntry.loc_code) return `ws://${baseIp}:8121`;
    
    const prefix = recentEntry.loc_code.substring(0, 2);
    switch (prefix) {
      case 'GA': return `ws://${baseIp}:8121`;
      case 'GB': return `ws://${baseIp}:8122`;
      case 'GC': return `ws://${baseIp}:8123`;
      case 'GD': return `ws://${baseIp}:8124`;
      case 'GE': return `ws://${baseIp}:8125`;
      case 'GF': return `ws://${baseIp}:8126`;
      case 'GJ': return `ws://${baseIp}:8127`; // JIG ZONE
      // 필요에 따라 8128 ~ 8131 추가 구성
      default: return `ws://${baseIp}:8121`;
    }
  }, [recentEntry]);

  const totalCap = stats.reduce((a, b) => a + b.total, 0);
  const totalUsed = stats.reduce((a, b) => a + b.used, 0);
  const totalPercent = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0;
  const hoveredProductCode = hoverInfo?.data?.occupied ? hoverInfo.data.cdgitem?.trim() || null : null;
  const selectedMapViewLabel = MAP_VIEW_OPTIONS.find((option) => option.key === selectedMapView)?.label ?? '전체보기';

  const matchingProductSlots = useMemo(() => {
    if (!hoveredProductCode) return [];
    return Object.values(mapData)
      .filter((slot) => slot.occupied && slot.cdgitem?.trim() === hoveredProductCode)
      .sort((a, b) => a.loc_code.localeCompare(b.loc_code));
  }, [hoveredProductCode, mapData]);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    } catch { return isoString; }
  };

  const handleCellHover = useCallback((e: React.MouseEvent, id: string, data: ApiSlotDetail | undefined) => {
    if (hoverHideTimerRef.current !== null) {
      window.clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }

    if (!data) {
      hoverHideTimerRef.current = window.setTimeout(() => setHoverInfo(null), 140);
      return;
    }

    const x = Math.min(e.clientX, Math.max(0, window.innerWidth - 380));
    const y = Math.min(e.clientY, Math.max(0, window.innerHeight - 340));
    setHoverInfo({ x, y, data, locCode: id });
  }, []);

  const renderCell = useCallback((id: string, w: string) => {
    const data = mapData[id];
    const related = !!hoveredProductCode && data?.occupied === true && data.cdgitem?.trim() === hoveredProductCode;
    const origin = related && hoverInfo?.locCode === id;
    return (
      <CellItem
        key={id}
        id={id}
        w={w}
        data={data}
        related={related}
        origin={origin}
        onHover={handleCellHover}
      />
    );
  }, [mapData, hoveredProductCode, hoverInfo?.locCode, handleCellHover]);

  // Drag to scroll logic for map
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setStartY(e.pageY - containerRef.current.offsetTop);
    setScrollLeft(containerRef.current.scrollLeft);
    setScrollTop(containerRef.current.scrollTop);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5; 
    const walkY = (y - startY) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walkX;
    containerRef.current.scrollTop = scrollTop - walkY;
  };

  const productInfoOverlay = hoverInfo ? (
    <TooltipBox
      style={{ top: hoverInfo.y + 15, left: hoverInfo.x + 15 }}
      onMouseEnter={() => {
        if (hoverHideTimerRef.current !== null) window.clearTimeout(hoverHideTimerRef.current);
      }}
      onMouseLeave={() => setHoverInfo(null)}
    >
      <div className="tooltip-header">
        <span>{hoverInfo.locCode}</span>
        <span className={`status-badge ${hoverInfo.data?.occupied ? 'occupied' : 'empty'}`}>
          {hoverInfo.data?.occupied ? '적재 완료' : '빈 슬롯'}
        </span>
      </div>
      {hoverInfo.data?.occupied ? (
        <>
          <div className="tooltip-row"><span className="label">차량식별ID</span><span className="value">{hoverInfo.data.vehicle_id || '-'}</span></div>
          <div className="tooltip-row"><span className="label">제품번호</span><span className="value">{hoverInfo.data.cdgitem || '-'}</span></div>
          <div className="tooltip-row"><span className="label">바코드(라벨)</span><span className="value" style={{fontWeight: 600, fontSize: '11px'}}>{hoverInfo.data.label001 || '-'}</span></div>
          <div className="tooltip-row"><span className="label">입고 시간</span><span className="value">{formatTime(hoverInfo.data.entry_time)}</span></div>
          {hoveredProductCode && (
            <div className="product-summary">
              <div className="product-summary-title">
                <span><Info size={14} /> 동일 제품 적재 현황</span>
                <strong className="product-count">총 {matchingProductSlots.length}대</strong>
              </div>
              <div className="product-code">
                {hoveredProductCode} · 표시번호 {hoveredProductCode.slice(-4)}
              </div>
              <div className="location-list">
                {matchingProductSlots.map((slot) => (
                  <span className="location-chip" key={slot.loc_code}>
                    {slot.loc_code}{slot.loc_code === hoverInfo.locCode ? ' · 현재' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="tooltip-row" style={{justifyContent: 'center', color: '#94A3B8', padding: '10px 0'}}>데이터 없음</div>
      )}
    </TooltipBox>
  ) : null;

  const viewPickerOverlay = isViewPickerOpen ? (
    <ViewPickerOverlay role="presentation" onClick={() => setIsViewPickerOpen(false)}>
      <ViewPickerModal role="dialog" aria-modal="true" aria-label="스마트맵 보기 선택" onClick={(event) => event.stopPropagation()}>
        <ViewPickerHeader>
          <div>
            <strong>스마트맵 보기 선택</strong>
            <span>전체 지도를 보거나 필요한 구역만 확대해서 확인하세요.</span>
          </div>
          <button type="button" aria-label="보기 선택 닫기" onClick={() => setIsViewPickerOpen(false)}>
            <X size={18} />
          </button>
        </ViewPickerHeader>
        <ViewPickerList>
          {MAP_VIEW_OPTIONS.map((option) => (
            <ViewPickerOption
              type="button"
              key={option.key}
              $active={selectedMapView === option.key}
              onClick={() => {
                setSelectedMapView(option.key);
                setHoverInfo(null);
                setIsViewPickerOpen(false);
              }}
            >
              <span className="check"><Check size={14} /></span>
              <span className="option-copy">
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </span>
            </ViewPickerOption>
          ))}
        </ViewPickerList>
      </ViewPickerModal>
    </ViewPickerOverlay>
  ) : null;

  return (
    <>
      <GlobalStyle />
      
      {!isMapFullscreen && productInfoOverlay}
      {!isMapFullscreen && viewPickerOverlay}

      <Layout>
        {/* 🟢 왼쪽 패널: 전체 운영 요약, 구역별 현황, 영상 모니터링 */}
        <LeftColumn>
          <PanelBlock>
            <PanelTitle>전체 운영 요약</PanelTitle>
            <SummaryGrid>
              <SummaryItem>
                <span className="lbl">전체 적재율</span>
                <span className="val big">{totalPercent}<small>%</small></span>
              </SummaryItem>
              <SummaryItem>
                <span className="lbl">점유 슬롯</span>
                <span className="val">{totalUsed} <small>/ {totalCap}</small></span>
              </SummaryItem>
              <SummaryItem>
                <span className="lbl">금일 입고</span>
                <span className="val red">{totalUsed} <small>건</small></span>
              </SummaryItem>
              <SummaryItem>
                <span className="lbl">잔여 슬롯</span>
                <span className="val">{totalCap - totalUsed} <small>개</small></span>
              </SummaryItem>
            </SummaryGrid>
          </PanelBlock>

          <PanelBlock style={{ flex: 1, minHeight: 0 }}>
            <PanelTitle>구역별 현황</PanelTitle>
            <ZoneStatList style={{ overflowY: 'auto', paddingRight: '4px' }}>
              {stats.map(s => {
                const pct = s.total > 0 ? Math.round((s.used / s.total) * 100) : 0;
                return (
                  <ZoneStatItem key={s.name}>
                    <div className="header"><span>{s.name} 구역</span><span>{s.used} / {s.total} ({pct}%)</span></div>
                    <div className="bar-bg"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                  </ZoneStatItem>
                );
              })}
            </ZoneStatList>
          </PanelBlock>

          <PanelBlock>
            <PanelTitle>영상 모니터링</PanelTitle>
            <VideoWrapper>
              {/* 기존 정적 비디오 대신 실시간 웹소켓 플레이어 연동 */}
              <WsVideoPlayer wsUrl={activeCameraUrl} />
            </VideoWrapper>
            {recentEntry ? (
              <>
                <VideoInfoRow><span className="lbl">최근차량</span><span className="value">{recentEntry.vehicle_id || '-'}</span></VideoInfoRow>
                <VideoInfoRow><span className="lbl">입고구역</span><span className="value">{recentEntry.loc_code || '-'}</span></VideoInfoRow>
                <VideoInfoRow><span className="lbl">연결카메라</span><span className="value">{activeCameraUrl.split(':').pop()}번 포트</span></VideoInfoRow>
              </>
            ) : (
              <div style={{fontSize:'13px', color:'#94A3B8', textAlign:'center', padding:'10px 0'}}>대기 중...</div>
            )}
          </PanelBlock>
        </LeftColumn>

        {/* 🟢 중앙 패널: 스마트 맵 */}
        <CenterColumn ref={centerPanelRef} $fullscreen={isMapFullscreen}>
          {isMapFullscreen && productInfoOverlay}
          {isMapFullscreen && viewPickerOverlay}
          <CenterHeader>
            <MapTitleGroup>
              <PanelTitle style={{ margin: 0 }}>제품창고 스마트 맵</PanelTitle>
              <MobileViewButton type="button" onClick={() => setIsViewPickerOpen(true)} aria-haspopup="dialog">
                {selectedMapViewLabel}
                <ChevronDown size={14} />
              </MobileViewButton>
            </MapTitleGroup>
            <HeaderControls>
              <Legend>
                <div className="item"><div className="box empty" /> 빈 슬롯</div>
                <div className="item"><div className="box full" /> 적재 완료</div>
              </Legend>
              <ZoomButtonGroup>
                <button type="button" aria-label="지도 축소" onClick={() => setZoomLevel(prev => Math.max(0.4, prev - 0.1))}><ZoomOut size={16}/></button>
                <span className="zoom-value">{Math.round(zoomLevel * 100)}%</span>
                <button type="button" aria-label="지도 확대" onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.1))}><ZoomIn size={16}/></button>
                <button
                  type="button"
                  aria-label={isMapFullscreen ? '전체화면 종료' : '지도 전체화면'}
                  aria-pressed={isMapFullscreen}
                  onClick={toggleMapFullscreen}
                >
                  {isMapFullscreen ? <Minimize size={16}/> : <Maximize size={16}/>}
                </button>
              </ZoomButtonGroup>
            </HeaderControls>
          </CenterHeader>
          <MapScrollArea 
            ref={containerRef} $isDragging={isDragging}
            onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}
            onClick={() => setHoverInfo(null)}
          >
            <MapStage>
              <MapCanvas style={{ zoom: zoomLevel }}>
                <div ref={mapContentRef} style={{ width: 'max-content' }}>
                  <WarehouseLayout renderCell={renderCell} view={selectedMapView} />
                </div>
              </MapCanvas>
            </MapStage>
          </MapScrollArea>
        </CenterColumn>

        {/* 🟢 우측 패널: 실시간 재고 목록 */}
        <RightColumn>
          <RightHeader>
            <PanelTitle flex style={{ margin: 0 }}>실시간 재고 목록 <LiveBadge>LIVE</LiveBadge></PanelTitle>
            <SearchBox>
              <Search size={16} color="#94A3B8" />
              <input placeholder="차량번호 / 위치 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </SearchBox>
          </RightHeader>
          <InventoryListContainer>
            {filteredInventory.length > 0 ? filteredInventory.map((item, idx) => (
              <InventoryCard key={`${item.code}-${idx}`}>
                <div className="left">
                  <div className="code">{item.code}</div>
                  <div className="loc"><MapPin size={12} color="#94A3B8" /> {item.zone} 구역 ({item.loc})</div>
                </div>
                <div className="right-qty">수량 : {item.qty}</div>
              </InventoryCard>
            )) : <div style={{padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:'13px'}}>검색 결과가 없습니다.</div>}
          </InventoryListContainer>
        </RightColumn>
      </Layout>
    </>
  );
}
