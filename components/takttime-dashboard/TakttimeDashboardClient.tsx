"use client";


import ConveyorVisionVideo from './ConveyorVisionVideo';
import { TAKTTIME_PART_NAMES, TAKTTIME_PLAYBACK_RATE } from '@/constants/takttime-camera-videos';
import { TAKTTIME_TRACKING } from '@/data/takttime-tracking';
import type { TakttimeLine, VisionRecognition } from '@/types/takttime-vision';
import React, { useState, useEffect, useMemo, memo, useCallback, useId } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  ComposedChart,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  Bell,
  TrendingUp,
  Maximize2,
  FileText,
  X,
  Refrigerator, 
  Cpu,
  ClipboardList,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  Check,
  Wine,
  GlassWater
} from "lucide-react";

// --- [1. 설정 및 데이터 상수] ---

const TARGET_TAKT = 60.0;

const KPI_DATA = {
  1: { target: 36, rate: "98.7%", production: 19 },   // 꼬모냉장고
  2: { target: 108, rate: "98.3%", production: 60 },  // 와인셀러
  3: { target: 450, rate: "97.4%", production: 296 }  // 얼음정수기
};

const MOCK_CSV_DATA = `timestamp,message,type
14:25:30,#4번 공정 텍타임 지연 (15.2초) 발생하여 조치 요망,error
14:24:12,2호기 자재 공급 요청 (잔량 10% 미만),warning
14:20:00,라인 2 가동 시작 (작업자 4명 투입 완료),success
13:55:40,#1번 공정 일시 정지 (센서 오류 감지됨),error
13:00:00,오후 작업조 투입 완료 및 작업 인계 사항 전달,success
12:55:10,오전 작업조 작업 종료 및 현장 정리 정돈,success
12:40:05,품질 검사 데이터 전송 완료 (서버 동기화 성공),success
11:30:22,3호기 유압 모터 온도 상승 주의 (임계치 근접),warning
11:15:00,#2번 라인 자재 부족 알림 - 즉시 보충 필요,warning
10:00:00,설비 정기 점검 완료 및 재가동 승인,success`;

// 화이트 & 레드 포인트 테마 색상 팔레트
const COLORS = {
  bgPage: "#F8F9FA",
  bgCard: "#FFFFFF",
  primary: "#DA291C",
  primaryDark: "#B91C1C",
  target: "#343A40",
  alert: "#DA291C",
  warning: "#F59E0B",
  success: "#10B981",
  textMain: "#212529",
  textSub: "#6C757D",
  grid: "#E9ECEF",
  videoBg: "#111827",
  hoverBg: "#FFF1F1",
  borderRed: "#DA291C",
  borderDark: "#495057",
  borderGray: "#CED4DA",
  normal: "#74B9FF",
  normalLight: "#DBECFF",
  delay: "#FF5A6A",
  delayLight: "#FFE7EA",
  chartLine: "#FF7A00",
};

// --- [타입 정의] ---
interface CycleData { id: string; name: string; cycleTime: number; visualCycleTime: number; target: number; isOver: boolean; production: number; timeLabel: string; }
interface LogData { time: string; msg: string; type: 'error' | 'success' | 'warning'; }

// --- [스타일] ---
const GlobalStyle = createGlobalStyle`
  /* 폰트 로딩(Pretendard·Rajdhani)은 globals.css에서 일괄 처리한다.
     createGlobalStyle은 CSSOM insertRule로 주입되는데 @import는 그 방식으로
     삽입할 수 없어 무시된다. 여기에 @font-face/@import를 두면 안 된다. */
  body {
    background-color: ${COLORS.bgPage}; 
    margin: 0; 
    font-family: 'Pretendard', sans-serif; 
    overflow: hidden; 
    color: ${COLORS.textMain}; 
  }
  * { box-sizing: border-box; font-family: 'Pretendard', sans-serif; }
  ::-webkit-scrollbar { width: 6px; } 
  ::-webkit-scrollbar-track { background: transparent; } 
  ::-webkit-scrollbar-thumb { background: #CED4DA; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #ADB5BD; }
`;

const LayoutContainer = styled.div`
  display: flex;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 100vh;
  height: 100dvh;
  background-color: ${COLORS.bgPage};
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 110px; 
  flex: 0 0 110px;
  background: ${COLORS.bgCard}; border-right: 1px solid ${COLORS.grid}; 
  display: flex; flex-direction: column; align-items: center; padding-top: 32px; gap: 24px; z-index: 20;
  box-shadow: 4px 0 24px rgba(0,0,0,0.02);
`;

const NavItem = styled.button<{ $active: boolean }>`
  width: 80px; height: 80px; 
  border-radius: 16px; 
  border: 2px solid ${(props) => (props.$active ? COLORS.primary : "transparent")};
  background: ${(props) => (props.$active ? COLORS.hoverBg : "#FFFFFF")};
  color: ${(props) => (props.$active ? COLORS.primaryDark : COLORS.textSub)};
  cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; 
  transition: all 0.2s ease-in-out;
  position: relative; overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);

  &:hover { 
    transform: translateY(-2px);
    background: ${COLORS.hoverBg};
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
    color: ${COLORS.primary};
  }
  
  &:active {
    transform: scale(0.98);
  }

  span { 
    font-size: 12px; 
    font-weight: 700; 
    letter-spacing: -0.5px; 
    text-align: center; 
    line-height: 1.3;
    color: ${(props) => (props.$active ? COLORS.primaryDark : COLORS.textMain)};
  }

  svg {
    transition: all 0.2s ease;
    color: ${(props) => (props.$active ? COLORS.primary : COLORS.textSub)};
  }
  &:hover svg {
    transform: scale(1.1);
    color: ${COLORS.primary};
  }
`;

const MainContent = styled.div`
  flex: 1;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
`;

const DashboardBody = styled.div`
  flex: 1;
  min-width: 0;
  max-width: 100%;
  display: flex;
  padding: 24px;
  gap: 24px;
  height: 100%;
  overflow: hidden;
`;
const ChartSection = styled.div`
  flex: 3;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: hidden;
`;
const InfoSection = styled.div`flex: 1; min-width: 320px; max-width: 400px; display: flex; flex-direction: column; gap: 16px; height: 100%; overflow: hidden;`;
const ViewContainer = styled(motion.div)`flex: 1; display: flex; flex-direction: column; gap: 16px; height: 100%; overflow: hidden;`;

const MultiChartCard = styled.div`
  flex: 1; background: ${COLORS.bgCard}; border-radius: 16px; padding: 16px; 
  display: flex; align-items: center; gap: 24px; min-height: 0; 
  border: 1px solid ${COLORS.grid};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
`;

const VideoBox = styled.div<{ $isLarge?: boolean }>`
  width: ${(props) => props.$isLarge ? "48%" : "400px"}; 
  height: 100%; background: ${COLORS.videoBg}; border-radius: 12px; 
  display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; flex-shrink: 0;

  .label { 
    position: absolute; 
    bottom: 12px; 
    left: 12px; 
    background: rgba(255, 255, 255, 0.9);
    color: ${COLORS.primary}; 
    font-size: 0.85rem; 
    padding: 6px 14px; 
    font-weight: 700; 
    border-radius: 6px;
    white-space: nowrap; 
    max-width: calc(100% - 24px);
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }
`;

const ChartWrapper = styled.div`
  flex: 1;
  height: 100%;
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const ChartCanvas = styled.div`
  flex: 1;
  min-height: 0;
`;

const ChartFooter = styled.div`
  position: relative;
  height: 34px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ChartLegend = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  color: ${COLORS.textMain};
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
`;

const LegendItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const LegendSwatch = styled.span<{ $type: 'normal' | 'delay' }>`
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: ${(props) => props.$type === 'normal' ? COLORS.normalLight : COLORS.delay};
  border: 2px solid ${(props) => props.$type === 'normal' ? COLORS.normal : COLORS.delay};
  display: inline-block;
`;

const ChartActionButton = styled.button`
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 28px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${COLORS.grid};
  background: white;
  color: ${COLORS.textMain};
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: all 0.2s ease;

  &:hover {
    border-color: ${COLORS.primary};
    color: ${COLORS.primary};
    background: ${COLORS.hoverBg};
  }
`;

const KpiStack = styled.div`display: flex; flex-direction: column; gap: 12px; flex-shrink: 0;`;

const KpiCard = styled.div<{ $borderColor: string, $isPrimary?: boolean }>`
  height: 90px; width: 100%;
  background: ${COLORS.bgCard}; 
  border: 1px solid ${COLORS.grid}; 
  border-radius: 12px; 
  display: flex; align-items: center; justify-content: space-between; padding: 0 24px;
  position: relative; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  transition: transform 0.2s;
  
  &:hover { border-color: ${(props) => props.$borderColor}; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.04); }

  .text-group { display: flex; flex-direction: column; gap: 4px; }
  .label { font-size: 0.9rem; color: ${COLORS.textSub}; font-weight: 600; } 
  .value { font-family: 'Rajdhani'; font-size: 2rem; font-weight: 800; color: ${(props) => props.$isPrimary ? COLORS.primary : COLORS.textMain}; line-height: 1; letter-spacing: -1px; }
  .icon-box { 
    width: 40px; height: 40px; border-radius: 10px; 
    background: ${(props) => props.$isPrimary ? COLORS.hoverBg : '#F8F9FA'}; 
    color: ${(props) => props.$borderColor};
    display: flex; align-items: center; justify-content: center;
  }
`;

const WideKpiCard = styled.div<{ $height?: number }>`
  height: ${(props) => props.$height || 140}px; width: 100%; 
  background: ${COLORS.bgCard}; border: 1px solid ${COLORS.grid}; 
  border-radius: 12px; flex-shrink: 0; 
  display: flex; flex-direction: column; justify-content: center; 
  transition: height 0.3s ease; overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
`;

const TaktGrid = styled.div<{ $rows: number }>`display: grid; grid-template-rows: repeat(${(props) => props.$rows}, 1fr); grid-template-columns: 1fr; gap: 1px; width: 100%; height: 100%; background: ${COLORS.grid}; border-radius: 10px; overflow: hidden; border: 1px solid ${COLORS.grid};`;
const TaktBox = styled.div<{ $isSingle?: boolean }>`
  display: flex; flex-direction: ${(props) => props.$isSingle ? 'column' : 'row'}; justify-content: ${(props) => props.$isSingle ? 'center' : 'space-between'}; align-items: center; 
  background: white; padding: 0 24px;
  .line-name { font-size: 0.9rem; font-weight: 700; color: ${COLORS.textMain}; display: flex; align-items: center; gap: 8px; } 
  .val-group { display: flex; flex-direction: ${(props) => props.$isSingle ? 'column' : 'row'}; align-items: center; gap: 12px; }
  .takt-val { 
    display: inline-flex;
    align-items: baseline;
    justify-content: center;
    align-items: center;
    gap: 6px;
    line-height: 1;
    white-space: nowrap;
  }
  .prediction-label {
    font-family: 'Pretendard', sans-serif;
    font-size: 0.72rem;
    font-weight: 800;
    color: #6B7280;
    margin-top: 6px;
    letter-spacing: -0.2px;
    padding: 4px 8px;
    border-radius: 999px;
    background: #F6F7F9;
    border: 1px solid #EAECF0;
    transform: translateY(-2px);
    margin-right: 10px;
  }
  .prediction-number {
    font-family: 'Rajdhani';
    font-size: 1.86rem;
    font-weight: 800;
    color: ${COLORS.primary};
    letter-spacing: -0.8px;
    min-width: 60px;
    display: flex;
    justify-content: end;
  }
  .prediction-unit {
    font-family: 'Rajdhani';
    font-size: 1.12rem;
    font-weight: 800;
    color: ${COLORS.primary};
    margin-left: -5px;
    margin-top: 8px;
  }
`;

const AlertSection = styled.div`
    flex: 1; background: ${COLORS.bgCard}; border-radius: 12px; border: 1px solid ${COLORS.grid}; padding: 0; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    .header { 
      padding: 16px 20px; border-bottom: 1px solid ${COLORS.grid}; display: flex; align-items: center; justify-content: space-between; font-weight: 700; background: #FFFFFF;
    } 
    .view-all { 
      display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: ${COLORS.primary}; cursor: pointer; font-weight: 700; 
      padding: 6px 10px; border-radius: 6px; transition: all 0.2s; background: white; border: 1px solid ${COLORS.grid};
      &:hover { background: ${COLORS.hoverBg}; border-color: ${COLORS.primary}; } 
    }
    .list-wrapper { flex: 1; overflow-y: auto; padding: 12px; }
`;

const AlertItem = styled.div<{ $type: string }>`
  display: flex; gap: 10px; margin-bottom: 8px; padding: 10px 12px; border-radius: 8px; 
  background: white; border: 1px solid ${COLORS.grid};
  transition: transform 0.2s;
  align-items: center;
  
  &:hover { transform: translateX(2px); border-color: ${(props) => props.$type === 'error' ? COLORS.primary : props.$type === 'warning' ? COLORS.warning : COLORS.success}; }
  
  .icon-wrapper { 
    flex-shrink: 0; display: flex; align-items: center;
    color: ${(props) => props.$type === 'error' ? COLORS.primary : props.$type === 'warning' ? COLORS.warning : COLORS.success};
  } 
  .content { 
    flex: 1; min-width: 0; 
    display: flex; align-items: center; gap: 8px; justify-content: space-between;
    
    .msg { 
      font-size: 0.85rem; font-weight: 700; color: ${COLORS.textMain};
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
    } 
    .time { 
      flex-shrink: 0; font-size: 0.75rem; color: ${COLORS.textSub}; 
      font-family: 'Rajdhani'; font-weight: 600; white-space: nowrap;
    } 
  }
`;

const ModalOverlay = styled(motion.div)`position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(33, 37, 41, 0.5); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center;`;
const ModalContent = styled(motion.div)`
    width: 70%; max-width: 900px; height: 85%; background: white; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
    
    .modal-header { 
      padding: 20px 24px; border-bottom: 1px solid ${COLORS.grid}; display: flex; justify-content: space-between; align-items: center; 
      background: #FFFFFF;
      h2 { margin: 0; font-size: 1.2rem; font-weight: 800; display: flex; align-items: center; gap: 10px; color: ${COLORS.textMain}; } 
    } 
    .modal-toolbar {
      padding: 12px 24px; border-bottom: 1px solid ${COLORS.grid}; display: flex; gap: 12px; background: white; position: relative;
    }
    .search-box {
      flex: 1; display: flex; align-items: center; gap: 8px; background: ${COLORS.bgPage}; padding: 8px 12px; border-radius: 8px; color: ${COLORS.textSub}; font-size: 0.9rem;
      border: 1px solid transparent;
      &:focus-within { background: white; border-color: ${COLORS.primary}; box-shadow: 0 0 0 2px ${COLORS.hoverBg}; }
      input { border: none; background: transparent; outline: none; width: 100%; color: ${COLORS.textMain}; }
    }
    .filter-wrapper { position: relative; }
    .filter-btn {
      padding: 8px 16px; background: white; border: 1px solid ${COLORS.grid}; border-radius: 8px; display: flex; align-items: center; gap: 8px; fontSize: 0.85rem; cursor: pointer; fontWeight: 600; color: ${COLORS.textMain}; transition: all 0.2s;
      &:hover { border-color: ${COLORS.primary}; background: ${COLORS.hoverBg}; }
      &.active { border-color: ${COLORS.primary}; background: ${COLORS.hoverBg}; color: ${COLORS.primary}; }
    }
    .close-btn { 
      width: 32px; height: 32px; border-radius: 50%; border: 1px solid ${COLORS.grid}; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: ${COLORS.textSub}; transition: all 0.2s;
      &:hover { background: ${COLORS.primary}; border-color: ${COLORS.primary}; color: white; transform: rotate(90deg); } 
    }
    .modal-body { flex: 1; overflow-y: auto; background: ${COLORS.bgPage}; padding: 20px; }
`;

const FilterMenu = styled(motion.div)`
  position: absolute; top: 110%; right: 0; width: 160px;
  background: white; border: 1px solid ${COLORS.grid}; border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden; z-index: 50; padding: 4px;
`;

const FilterOption = styled.div<{ $selected: boolean }>`
  padding: 10px 12px; display: flex; align-items: center; justify-content: space-between;
  font-size: 0.85rem; font-weight: 600; color: ${(props) => props.$selected ? COLORS.primary : COLORS.textMain};
  border-radius: 6px; cursor: pointer;
  background: ${(props) => props.$selected ? COLORS.hoverBg : "transparent"};
  &:hover { background: ${COLORS.bgPage}; }
`;

const LogTableWrapper = styled.div`
  background: white; border-radius: 8px; border: 1px solid ${COLORS.grid}; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.02);
`;

const LogTable = styled.table`
  width: 100%; border-collapse: collapse; 
  thead { 
    background: ${COLORS.bgPage}; 
    th { text-align: left; padding: 14px 20px; border-bottom: 1px solid ${COLORS.grid}; color: ${COLORS.textSub}; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; } 
  } 
  tbody { 
    tr { 
      border-bottom: 1px solid ${COLORS.grid}; transition: background 0.1s; cursor: default;
      &:last-child { border-bottom: none; }
      &:hover { background: ${COLORS.bgPage}; } 
    } 
    td { padding: 14px 20px; color: ${COLORS.textMain}; font-size: 0.9rem; vertical-align: middle; } 
  } 
  
  .type-badge { 
    display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; border: 1px solid transparent;
    &.error { background: ${COLORS.hoverBg}; color: ${COLORS.primary}; border-color: #FECACA; } 
    &.warning { background: #FFFBEB; color: ${COLORS.warning}; border-color: #FDE68A; } 
    &.success { background: #F0FDF4; color: ${COLORS.success}; border-color: #BBF7D0; } 
  }
`;

const LoadingOverlay = styled(motion.div)`
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(4px);
  z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center;
`;
const Spinner = styled.div`
  width: 48px; height: 48px; border: 4px solid ${COLORS.grid}; border-top-color: ${COLORS.primary};
  border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px;
  @keyframes spin { to { transform: rotate(360deg); } }
`;
const LoadingText = styled.div`
  font-family: 'Rajdhani'; font-weight: 700; font-size: 1.2rem; color: ${COLORS.textMain}; display: flex; align-items: center; gap: 8px;
`;
const SubText = styled.div`font-size: 0.85rem; color: ${COLORS.textSub}; margin-top: 4px; font-weight: 500;`;

const BottleneckAlertOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background:
    radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.46) 0%, rgba(255, 255, 255, 0.22) 28%, rgba(15, 23, 42, 0.30) 100%);
  backdrop-filter: blur(18px) saturate(1.08);
  -webkit-backdrop-filter: blur(18px) saturate(1.08);
`;

const BottleneckAlertBox = styled(motion.div)`
  width: min(420px, calc(100vw - 48px));
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 28px 24px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.74);
  box-shadow:
    0 34px 90px rgba(15, 23, 42, 0.24),
    0 12px 28px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(24px) saturate(1.12);
  -webkit-backdrop-filter: blur(24px) saturate(1.12);
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.62) 34%, rgba(248, 250, 252, 0.12) 68%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0%, rgba(248, 250, 252, 0.52) 100%);
  }

  &::after {
    content: "";
    position: absolute;
    left: 28px;
    right: 28px;
    top: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent);
  }
`;

const BottleneckAlertIcon = styled.div`
  width: 58px;
  height: 58px;
  border-radius: 19px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #B45309;
  background: linear-gradient(180deg, #FFF7D6 0%, #FFE9A8 100%);
  border: 1px solid rgba(245, 158, 11, 0.22);
  box-shadow:
    0 14px 28px rgba(245, 158, 11, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  margin-bottom: 18px;
`;

const BottleneckAlertTitle = styled.div`
  color: #0F172A;
  text-align: center;
  font-size: 1.28rem;
  font-weight: 900;
  line-height: 1.25;
  letter-spacing: -0.7px;
  margin-bottom: 10px;
`;

const BottleneckAlertMessage = styled.div`
  width: 100%;
  text-align: center;
  letter-spacing: -0.36px;
  margin-bottom: 24px;

  strong {
    display: block;
    color: #111827;
    font-size: 1.02rem;
    font-weight: 800;
    line-height: 1.55;
  }

  span {
    display: block;
    margin-top: 5px;
    color: #667085;
    font-size: 0.94rem;
    font-weight: 650;
    line-height: 1.5;
  }
`;

const BottleneckConfirmButton = styled.button`
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(180deg, #1C8CFF 0%, #007AFF 100%);
  color: white;
  font-size: 0.98rem;
  font-weight: 850;
  letter-spacing: -0.2px;
  cursor: pointer;
  box-shadow:
    0 12px 24px rgba(0, 122, 255, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
  transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.03);
    box-shadow:
      0 16px 30px rgba(0, 122, 255, 0.34),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  &:active {
    transform: translateY(0);
    box-shadow:
      0 8px 18px rgba(0, 122, 255, 0.24),
      inset 0 1px 0 rgba(255, 255, 255, 0.22);
  }
`;

const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.98, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.15 } },
};

// --- [Helper Components] ---
const CustomCycleLabel = memo((props: { x?: number; y?: number; value?: string | number }) => {
  const { x, y, value } = props;
  const valNum = Number(value);
  if (x === undefined || y === undefined || Number.isNaN(valNum)) return null;

  const isOver = valNum > TARGET_TAKT;
  return (
    <text
      x={x}
      y={y - 14}
      fill={isOver ? COLORS.delay : COLORS.textMain}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{
        fontFamily: 'Rajdhani',
        fontWeight: 800,
        fontSize: '14px',
        filter: 'drop-shadow(0px 0px 3px rgba(255,255,255, 1))'
      }}
    >
      {valNum.toFixed(1)}
    </text>
  );
});
CustomCycleLabel.displayName = "CustomCycleLabel";

const MonitorChart = memo(({ data }: { data: CycleData[] }) => {
  const chartId = useId().replace(/:/g, "");
  const normalGradientId = `${chartId}-normal-gradient`;
  const delayGradientId = `${chartId}-delay-gradient`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 40, right: 16, left: 4, bottom: 8 }}>
        <defs>
          <linearGradient id={normalGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.normal} stopOpacity={1} />
            <stop offset="100%" stopColor={COLORS.normalLight} stopOpacity={0.96} />
          </linearGradient>
          <linearGradient id={delayGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.delay} stopOpacity={0.92} />
            <stop offset="100%" stopColor={COLORS.delayLight} stopOpacity={0.92} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={COLORS.grid} />
        <XAxis
          dataKey="timeLabel"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 11, fontWeight: 600 }}
          dy={10}
          interval="preserveStartEnd"
        />
        <YAxis
          hide
          domain={[
            0,
            (dataMax: number) => Math.ceil((Math.max(dataMax || 0, TARGET_TAKT) * 1.22) / 10) * 10
          ]}
        />
        <Bar dataKey="cycleTime" maxBarSize={48} radius={[10, 10, 0, 0]} isAnimationActive={false}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${entry.id}-${index}`}
              fill={`url(#${entry.isOver ? delayGradientId : normalGradientId})`}
            />
          ))}
        </Bar>
        <Line
          type="linear"
          dataKey="cycleTime"
          stroke={COLORS.chartLine}
          strokeWidth={2}
          dot={{ r: 5, fill: 'white', stroke: COLORS.chartLine, strokeWidth: 2 }}
          activeDot={{ r: 6, fill: 'white', stroke: COLORS.chartLine, strokeWidth: 2 }}
          isAnimationActive={false}
        >
          <LabelList dataKey="cycleTime" content={<CustomCycleLabel />} />
        </Line>
      </ComposedChart>
    </ResponsiveContainer>
  );
});
MonitorChart.displayName = "MonitorChart";

const ProcessChart = memo(({ data, line }: { data: CycleData[]; line: TakttimeLine }) => {
  return (
    <ChartWrapper data-chart-line={line} data-production={data.at(-1)?.production ?? 0}>
      <ChartCanvas>
        <MonitorChart data={data} />
      </ChartCanvas>
      <ChartFooter>
        <ChartLegend>
          <LegendItem><LegendSwatch $type="normal" />정상 (60초 이내)</LegendItem>
          <LegendItem><LegendSwatch $type="delay" />지연 (60초 초과)</LegendItem>
        </ChartLegend>
        <ChartActionButton type="button">공정 CT 분석</ChartActionButton>
      </ChartFooter>
    </ChartWrapper>
  );
});
ProcessChart.displayName = "ProcessChart";

const PredictionTime = ({ value }: { value: string }) => (
  <span className="takt-val" aria-label={`예측시간 ${value}초`}>
    <span className="prediction-label">예측시간</span>
    <span className="prediction-number">{value}</span>
    <span className="prediction-unit">s</span>
  </span>
);

// --- [더미 데이터 생성 함수] ---
const DUMMY_CYCLE_PATTERNS: Record<string, number[]> = {
  A: [42.3, 176.0, 125.0, 125.0, 180.0, 98.0, 101.0, 101.0, 37.7, 77.7],
  B: [42.3, 150.0, 161.0, 60.0, 151.0, 40.2, 178.0, 48.0, 215.0, 70.0],
  C: [48.3, 41.3, 42.7, 149.4, 145.6, 40.3, 41.0, 44.7, 43.8, 147.7],
};

const createMockCycleTime = (line: string, index?: number) => {
  const pattern = DUMMY_CYCLE_PATTERNS[line] ?? DUMMY_CYCLE_PATTERNS.A;
  if (typeof index === 'number') return pattern[index % pattern.length];

  const shouldBeNormal = Math.random() < 0.3;
  const value = shouldBeNormal
    ? 37 + Math.random() * 22
    : 70 + Math.random() * 150;

  return parseFloat(value.toFixed(1));
};

const generateInitialDummyData = (line: TakttimeLine): CycleData[] => {
  const baseTime = new Date();
  return Array.from({ length: 10 }).map((_, i) => {
      const ct = createMockCycleTime(line, i);
      const timeObj = new Date(baseTime.getTime() - (9 - i) * TAKTTIME_TRACKING[line].partIntervalSeconds / TAKTTIME_PLAYBACK_RATE * 1000);
      const timeLabel = timeObj.toTimeString().split(' ')[0]; 
      return {
          id: `${line}-${i}`,
          name: `Dummy-${i}`,
          timeLabel: timeLabel,
          cycleTime: ct,
          visualCycleTime: ct,
          target: TARGET_TAKT,
          isOver: ct > TARGET_TAKT,
          production: 50 + i,
      };
  });
};

// --- [Main Component] ---

export default function ProcessDashboard() {
  const [viewMode, setViewMode] = useState<1 | 2 | 3>(3); 
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Initializing System...");

  // [수정] 통신 실패 시에도 자연스럽게 차트가 렌더링되도록 초기값을 더미 데이터로 세팅
  const [data, setData] = useState<{A: CycleData[], B: CycleData[], C: CycleData[]}>({ 
    A: generateInitialDummyData('A'), 
    B: generateInitialDummyData('B'), 
    C: generateInitialDummyData('C') 
  });
  const [alertLogs, setAlertLogs] = useState<LogData[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showBottleneckAlert, setShowBottleneckAlert] = useState(false);
  
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'error' | 'warning' | 'success'>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping = tagName === 'input' || tagName === 'textarea' || target?.isContentEditable;

      if (event.key === 'Escape') {
        setShowBottleneckAlert(false);
        return;
      }

      if (event.key !== 'Enter' || isTyping || target?.closest('button, a, [role="button"]')) return;
      event.preventDefault();
      setShowBottleneckAlert(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleViewChange = useCallback((newMode: 1 | 2 | 3) => {
    if (newMode === viewMode) return;
    setIsTransitioning(true);
    setLoadingMsg("Synchronizing Data Streams...");
    setTimeout(() => {
        setViewMode(newMode);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 800);
    }, 50);
  }, [viewMode]);

  const filteredLogs = useMemo(() => {
      return alertLogs.filter(log => {
          const matchesSearch = log.msg.toLowerCase().includes(searchText.toLowerCase()) || log.type.includes(searchText.toLowerCase());
          const matchesType = filterType === 'all' ? true : log.type === filterType;
          return matchesSearch && matchesType;
      });
  }, [alertLogs, searchText, filterType]);

  const handleRecognition = useCallback((line: TakttimeLine, event: VisionRecognition) => {
    const timestamp = new Date();
    const cycleTime = createMockCycleTime(line);
    // 시연 CT 값은 유지하고, 해당 영상의 부품 통과 프레임에만 그래프를 추가한다.
    setData(previous => {
      const history = previous[line];
      const next: CycleData = {
        id: `${line}-${timestamp.getTime()}-${event.sequence}`,
        name: TAKTTIME_PART_NAMES[line][event.kind],
        timeLabel: timestamp.toTimeString().split(' ')[0],
        cycleTime,
        visualCycleTime: cycleTime,
        target: TARGET_TAKT,
        isOver: cycleTime > TARGET_TAKT,
        production: (history.at(-1)?.production ?? 0) + 1,
      };
      return { ...previous, [line]: [...history.slice(-9), next] };
    });
  }, []);

  useEffect(() => {
    // 로그 데이터는 목업 유지
    const logs = MOCK_CSV_DATA.trim().split('\n').slice(1).map(line => {
      const [time, msg, type] = line.split(','); return { time, msg, type: type.trim() as LogData['type'] };
    });
    const logsTimer = window.setTimeout(() => setAlertLogs(logs), 0);
    
    return () => { window.clearTimeout(logsTimer); };
  }, []); // 의존성 배열 비움

  const getSlicedData = (lineData: CycleData[]) => {
      return lineData.slice(-10);
  };

  const displayData = useMemo(() => ({
    A: getSlicedData(data.A),
    B: getSlicedData(data.B),
    C: getSlicedData(data.C),
  }), [data]);

  const avgTakts = useMemo(() => {
    const calcAvg = (arr: CycleData[]) => {
      const validData = arr.filter(d => d.cycleTime < 300); 
      if(validData.length === 0) return "0";
      return Math.round(validData.reduce((acc, cur) => acc + cur.cycleTime, 0) / validData.length).toString();
    };
    return { A: calcAvg(data.A), B: calcAvg(data.B), C: calcAvg(data.C) };
  }, [data]);

  const getFilterLabel = () => {
      switch(filterType) {
          case 'error': return '오류 (Error)';
          case 'warning': return '경고 (Warn)';
          case 'success': return '정보 (Info)';
          default: return '전체 보기';
      }
  };

  const currentKpi = KPI_DATA[viewMode];

  return (
    <>
      <GlobalStyle />
      <LayoutContainer>
        <Sidebar>
          <NavItem $active={viewMode === 1} onClick={() => handleViewChange(1)}>
            <Refrigerator size={24} strokeWidth={2} /><span>꼬모<br/>냉장고</span>
          </NavItem>
          <NavItem $active={viewMode === 2} onClick={() => handleViewChange(2)}>
            <Wine size={24} strokeWidth={2} /><span>와인<br/>셀러</span>
          </NavItem>
          <NavItem $active={viewMode === 3} onClick={() => handleViewChange(3)}>
            <GlassWater size={24} strokeWidth={2} /><span>얼음<br/>정수기</span>
          </NavItem>
        </Sidebar>

        <MainContent>
            <AnimatePresence>
                {isTransitioning && (
                    <LoadingOverlay
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Spinner />
                        <LoadingText><Cpu size={20} color={COLORS.primary} /> {loadingMsg}</LoadingText>
                        <SubText>Connecting to Smart Factory Grid...</SubText>
                    </LoadingOverlay>
                )}
            </AnimatePresence>

          <DashboardBody>
            <ChartSection>
                {/* View 1: 꼬모냉장고(A) 및 총조립2라인(C) */}
                {viewMode === 1 && (
                  <ViewContainer key="view-1">
                      <MultiChartCard>
                        <VideoBox $isLarge={true}>
                          <ConveyorVisionVideo line="A" onRecognition={handleRecognition} />
                          <div className="label">발포라인</div>
                        </VideoBox>
                        <ProcessChart line="A" data={displayData.A} />
                      </MultiChartCard>
                      <MultiChartCard>
                        <VideoBox $isLarge={true}>
                          <ConveyorVisionVideo line="C" onRecognition={handleRecognition} />
                          <div className="label">총조립2라인</div>
                        </VideoBox>
                        <ProcessChart line="C" data={displayData.C} />
                      </MultiChartCard>
                  </ViewContainer>
                )}

                {/* View 2: 와인셀러 (발포라인(A)과 총조립2라인(C)) */}
                {viewMode === 2 && (
                  <ViewContainer key="view-2">
                      <MultiChartCard>
                        <VideoBox $isLarge={true}>
                          <ConveyorVisionVideo line="A" onRecognition={handleRecognition} />
                          <div className="label">발포라인2</div>
                        </VideoBox>
                        <ProcessChart line="A" data={displayData.A} />
                      </MultiChartCard>
                      <MultiChartCard>
                        <VideoBox $isLarge={true}>
                          <ConveyorVisionVideo line="C" onRecognition={handleRecognition} />
                          <div className="label">총조립2라인</div>
                        </VideoBox>
                        <ProcessChart line="C" data={displayData.C} />
                      </MultiChartCard>
                  </ViewContainer>
                )}

                {/* View 3: 얼음정수기 전체 보기 (A, B, C) */}
                {viewMode === 3 && (
                  <ViewContainer key="view-3">
                      <MultiChartCard>
                        <VideoBox $isLarge={false}>
                          <ConveyorVisionVideo line="A" onRecognition={handleRecognition} />
                          <div className="label">발포라인</div>
                        </VideoBox>
                        <ProcessChart line="A" data={displayData.A} />
                      </MultiChartCard>
                      <MultiChartCard>
                        <VideoBox $isLarge={false}>
                          <ConveyorVisionVideo line="B" onRecognition={handleRecognition} />
                          <div className="label">총조립1라인</div>
                        </VideoBox>
                        <ProcessChart line="B" data={displayData.B} />
                      </MultiChartCard>
                      <MultiChartCard>
                        <VideoBox $isLarge={false}>
                          <ConveyorVisionVideo line="C" onRecognition={handleRecognition} />
                          <div className="label">총조립2라인</div>
                        </VideoBox>
                        <ProcessChart line="C" data={displayData.C} />
                      </MultiChartCard>
                  </ViewContainer>
                )}
            </ChartSection>

            <InfoSection>
              <KpiStack>
                <KpiCard $borderColor={COLORS.borderDark}>
                  <div className="text-group">
                      <div className="label">금일 작업지시 수량</div>
                      <div className="value">{currentKpi.target.toLocaleString()}</div>
                  </div>
                  <div className="icon-box"><ClipboardList size={22} strokeWidth={2.5} /></div>
                </KpiCard>
                <KpiCard $borderColor={COLORS.primary} $isPrimary={true}>
                  <div className="text-group">
                      <div className="label">종합 가동률</div>
                      <div className="value">{currentKpi.rate}</div>
                  </div>
                  <div className="icon-box"><TrendingUp size={22} strokeWidth={2.5} /></div>
                </KpiCard>
                <KpiCard $borderColor={COLORS.borderGray}>
                  <div className="text-group">
                      <div className="label">현재 총 생산량</div>
                      <div className="value" style={{ color: COLORS.textMain }}>{currentKpi.production}</div>
                  </div>
                  <div className="icon-box"><Cpu size={22} strokeWidth={2.5} /></div>
                </KpiCard>
              </KpiStack>

              <WideKpiCard $height={viewMode === 3 ? 200 : 160}>
                  {/* View 1: 꼬모냉장고 (발포/총조립2) */}
                  {viewMode === 1 && (
                    <TaktGrid $rows={2}>
                      <TaktBox $isSingle={false}>
                        <span className="line-name"><div style={{width:8,height:8,borderRadius:'50%',background:COLORS.primary}}/> 발포라인</span>
                        <div className="val-group"><PredictionTime value={avgTakts.A} /></div>
                      </TaktBox>
                      <TaktBox $isSingle={false}>
                        <span className="line-name"><div style={{width:8,height:8,borderRadius:'50%',background:COLORS.borderDark}}/> 총조립2라인</span>
                        <div className="val-group"><PredictionTime value={avgTakts.C} /></div>
                      </TaktBox>
                    </TaktGrid>
                  )}
                  {/* View 2: 와인셀러 (발포/총조립2) */}
                  {viewMode === 2 && (
                    <TaktGrid $rows={2}>
                      <TaktBox $isSingle={false}>
                        <span className="line-name"><div style={{width:8,height:8,borderRadius:'50%',background:COLORS.primary}}/> 발포라인</span>
                        <div className="val-group"><PredictionTime value={avgTakts.A} /></div>
                      </TaktBox>
                      <TaktBox $isSingle={false}>
                        <span className="line-name"><div style={{width:8,height:8,borderRadius:'50%',background:COLORS.borderDark}}/> 총조립2라인</span>
                        <div className="val-group"><PredictionTime value={avgTakts.C} /></div>
                      </TaktBox>
                    </TaktGrid>
                  )}
                  {/* View 3: 얼음정수기 전체 보기 (3행) */}
                  {viewMode === 3 && (
                    <TaktGrid $rows={3}>
                      <TaktBox $isSingle={false}>
                        <span className="line-name"><div style={{width:8,height:8,borderRadius:'50%',background:COLORS.primary}}/> 발포라인</span>
                        <div className="val-group"><PredictionTime value={avgTakts.A} /></div>
                      </TaktBox>
                      <TaktBox $isSingle={false}>
                        <span className="line-name"><div style={{width:8,height:8,borderRadius:'50%',background:COLORS.borderDark}}/> 총조립1라인</span>
                        <div className="val-group"><PredictionTime value={avgTakts.B} /></div>
                      </TaktBox>
                      <TaktBox $isSingle={false}>
                        <span className="line-name"><div style={{width:8,height:8,borderRadius:'50%',background:COLORS.borderGray}}/> 총조립2라인</span>
                        <div className="val-group"><PredictionTime value={avgTakts.C} /></div>
                      </TaktBox>
                    </TaktGrid>
                  )}
              </WideKpiCard>

              <AlertSection>
                <div className="header">
                  <div style={{display:'flex', alignItems:'center', gap:8, fontSize: '0.9rem'}}>
                    <Bell color={COLORS.primary} size={16} /> 알림 로그
                  </div>
                  <div className="view-all" onClick={() => setShowLogModal(true)}>
                      전체 보기 <Maximize2 size={10} />
                  </div>
                </div>
                <div className="list-wrapper">
                  {alertLogs.slice(0, 4).map((log, idx) => (
                      <AlertItem key={idx} $type={log.type}>
                        <div className="icon-wrapper">
                            {log.type === 'error' ? <AlertCircle size={16}/> : log.type === 'warning' ? <AlertTriangle size={16}/> : <Info size={16} color={COLORS.textSub} />}
                        </div>
                        <div className="content">
                          <span className="msg">{log.msg}</span>
                          <span className="time">{log.time}</span>
                        </div>
                      </AlertItem>
                  ))}
                </div>
              </AlertSection>
            </InfoSection>
          </DashboardBody>
        </MainContent>

        <AnimatePresence>
          {showLogModal && (
            <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogModal(false)}>
              <ModalContent 
                variants={modalVariants} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2><FileText size={24} color={COLORS.primary} /> 전체 알림 및 로그 내역</h2>
                  <button className="close-btn" onClick={() => setShowLogModal(false)}><X size={20} /></button>
                </div>
                
                <div className="modal-toolbar">
                    <div className="search-box">
                      <Search size={16} />
                      <input 
                        placeholder="로그 검색 (예: '자재 부족', '오류')" 
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </div>
                    
                    <div className="filter-wrapper">
                        <button 
                          className={`filter-btn ${filterType !== 'all' ? 'active' : ''}`} 
                          onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                        >
                          <Filter size={14} /> {getFilterLabel()} <ChevronDown size={14} />
                        </button>

                        <AnimatePresence>
                          {isFilterMenuOpen && (
                            <FilterMenu 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.15 }}
                            >
                              <FilterOption $selected={filterType === 'all'} onClick={() => { setFilterType('all'); setIsFilterMenuOpen(false); }}>
                                전체 보기 {filterType === 'all' && <Check size={14} />}
                              </FilterOption>
                              <FilterOption $selected={filterType === 'error'} onClick={() => { setFilterType('error'); setIsFilterMenuOpen(false); }}>
                                오류 (Error) {filterType === 'error' && <Check size={14} />}
                              </FilterOption>
                              <FilterOption $selected={filterType === 'warning'} onClick={() => { setFilterType('warning'); setIsFilterMenuOpen(false); }}>
                                경고 (Warning) {filterType === 'warning' && <Check size={14} />}
                              </FilterOption>
                              <FilterOption $selected={filterType === 'success'} onClick={() => { setFilterType('success'); setIsFilterMenuOpen(false); }}>
                                정보 (Info) {filterType === 'success' && <Check size={14} />}
                              </FilterOption>
                            </FilterMenu>
                          )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="modal-body">
                  <LogTableWrapper>
                    <LogTable>
                      <thead><tr><th style={{width: '12%'}}>시간</th><th style={{width: '15%'}}>유형</th><th>메시지 내용</th><th style={{width: '15%'}}>상태</th></tr></thead>
                      <tbody>
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map((log, idx) => (
                              <tr key={idx}>
                                <td style={{fontFamily: 'Rajdhani', fontWeight: 600}}>{log.time}</td>
                                <td>
                                  <span className={`type-badge ${log.type}`}>
                                    {log.type === 'error' ? '오류 (Error)' : log.type === 'warning' ? '경고 (Warn)' : '정보 (Info)'}
                                  </span>
                                </td>
                                <td style={{fontWeight: 600}}>{log.msg}</td>
                                <td>
                                    {log.type === 'success' ? 
                                        <div style={{display:'flex', alignItems:'center', gap:6, color: COLORS.success, fontSize: '0.8rem', fontWeight: 700}}><CheckCircle2 size={14}/> 해결됨</div> : 
                                        <div style={{display:'flex', alignItems:'center', gap:6, color: COLORS.textSub, fontSize: '0.8rem', fontWeight: 600}}>확인 필요</div>
                                    }
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr><td colSpan={4} style={{textAlign:'center', padding: '40px', color: COLORS.textSub}}>검색 결과가 없습니다.</td></tr>
                        )}
                      </tbody>
                    </LogTable>
                  </LogTableWrapper>
                </div>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showBottleneckAlert && (
            <BottleneckAlertOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setShowBottleneckAlert(false)}
            >
              <BottleneckAlertBox
                role="dialog"
                aria-modal="true"
                aria-labelledby="bottleneck-alert-title"
                initial={{ opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.985 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
              >
                <BottleneckAlertIcon>
                  <AlertTriangle size={26} strokeWidth={2.7} />
                </BottleneckAlertIcon>
                <BottleneckAlertTitle id="bottleneck-alert-title">병목 예측 사전 알림</BottleneckAlertTitle>
                <BottleneckAlertMessage>
                  <strong>총조립2라인 병목이 예상됩니다.</strong>
                  <span>조립인원 추가가 필요합니다.</span>
                </BottleneckAlertMessage>
                <BottleneckConfirmButton type="button" onClick={() => setShowBottleneckAlert(false)}>
                  확인
                </BottleneckConfirmButton>
              </BottleneckAlertBox>
            </BottleneckAlertOverlay>
          )}
        </AnimatePresence>

      </LayoutContainer>
    </>
  );
}
