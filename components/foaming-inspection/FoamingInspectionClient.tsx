"use client";

import { startVisibleInterval } from '@/utils/visible-interval';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { 
  FiCheck, 
  FiAlertTriangle,
  FiX,
  FiGrid,
  FiDatabase
} from 'react-icons/fi';

// --------------------------------------------------------------------------
// 1. Global Styles & Fonts
// --------------------------------------------------------------------------
const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    background-color: #f8fafc;
    overflow: hidden;
  }
`;

// --------------------------------------------------------------------------
// 2. Types & Data
// --------------------------------------------------------------------------
interface ApiDataItem {
  "time_diff": number;
  "Serial No.": string;
  "Model No.": string;
  "지그번호": string;
  "대차번호": string;
  "R액 압력": string;
  "P액 압력": string;
  "R액 탱크온도": string;
  "P액 탱크온도": string;
  "R액 헤드온도": string;
  "P액 헤드온도": string;
  "온조#1 리턴온도": string;
  "온조#2 리턴온도": string;
  "온조#1 공급수압력": string;
  "온조#2 공급수압력": string;
  [key: string]: unknown;
}

interface ApiLimitItem {
  name: string;
  min: string;
  max: string;
}

interface ApiResponse {
  success?: boolean;
  data: ApiDataItem[];
  DX_LIMIT_LIST: ApiLimitItem[];
}

interface GaugeData {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  isError: boolean;
}

const METRIC_CONFIG = [
  { key: 'R액 압력', label: 'R액 압력', unit: 'bar' },
  { key: 'P액 압력', label: 'P액 압력', unit: 'bar' },
  { key: 'R액 탱크온도', label: 'R액 탱크온도', unit: '℃' },
  { key: 'P액 탱크온도', label: 'P액 탱크온도', unit: '℃' },
  { key: 'R액 헤드온도', label: 'R액 헤드온도', unit: '℃' },
  { key: 'P액 헤드온도', label: 'P액 헤드온도', unit: '℃' },
  { key: '온조#1 리턴온도', label: '온조#1 리턴온도', unit: '℃' },
  { key: '온조#2 리턴온도', label: '온조#2 리턴온도', unit: '℃' },
  { key: '온조#1 공급수압력', label: '온조#1 공급수압력', unit: 'bar' },
  { key: '온조#2 공급수압력', label: '온조#2 공급수압력', unit: 'bar' },
];

// M-01 ~ M-24 목업 데이터 자동 생성
const generateMockData = (): ApiDataItem[] => {
  const data: ApiDataItem[] = [];
  for (let i = 1; i <= 24; i++) {
    const id = `M-${String(i).padStart(2, '0')}`;
    // M-05, M-12 등 일부 설비에만 고의로 에러 데이터 주입
    const isError = i === 5 || i === 12; 
    data.push({
      "time_diff": 0, 
      "Serial No.": `W00${i}`, 
      "Model No.": `MOD${i}`, 
      "지그번호": `J${i}`, 
      "대차번호": id, 
      "R액 압력": isError ? "120.0" : "150.5",
      "P액 압력": "148.2", 
      "R액 탱크온도": isError ? "35.5" : "26.1",
      "P액 탱크온도": "26.5", // <--- 누락되었던 이 부분을 추가했습니다.
      "R액 헤드온도": "28.0", 
      "P액 헤드온도": "28.5", 
      "온조#1 리턴온도": "28.0", 
      "온조#2 리턴온도": "3.67", 
      "온조#1 공급수압력": "28.0", 
      "온조#2 공급수압력": "28.5" 
    });
  }
  return data;
};

const MOCK_API_RESPONSE: ApiResponse = {
  success: true,
  data: generateMockData(),
  "DX_LIMIT_LIST": [
    { "name": "R액 압력", "min": "130", "max": "170" },
    { "name": "P액 압력", "min": "130", "max": "170" },
    { "name": "R액 탱크온도", "min": "20", "max": "30" },
    { "name": "P액 탱크온도", "min": "20", "max": "30" },
    { "name": "R액 헤드온도", "min": "25", "max": "35" },
    { "name": "P액 헤드온도", "min": "25", "max": "35" },
    { "name": "온조#1 리턴온도", "min": "25", "max": "35" },
    { "name": "온조#2 리턴온도", "min": "3", "max": "6" },
    { "name": "온조#1 공급수압력", "min": "25", "max": "35" },
    { "name": "온조#2 공급수압력", "min": "25", "max": "35" }
  ]
};

// --------------------------------------------------------------------------
// 3. Styled Components
// --------------------------------------------------------------------------
const PageContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 100vh;
  height: 100dvh;
  padding: 16px;
  display: flex;
  flex-direction: column;
  background-color: #f1f5f9;
  overflow: hidden;

  @media (max-width: 1280px) {
    padding: 12px;
  }
`;

const loadingSpin = keyframes`
  to { transform: rotate(360deg); }
`;

const loadingPulse = keyframes`
  0%, 100% { opacity: 0.42; transform: scale(0.94); }
  50% { opacity: 1; transform: scale(1); }
`;

const loadingSweep = keyframes`
  0% { transform: translateX(-130%); }
  100% { transform: translateX(420%); }
`;

const loadingSkeleton = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.8; }
`;

const contentReveal = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const modalReveal = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const LoadingStage = styled.div<{ $leaving: boolean }>`
  position: absolute;
  inset: 16px;
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  opacity: ${props => props.$leaving ? 0 : 1};
  transform: ${props => props.$leaving ? 'scale(0.995)' : 'scale(1)'};
  transition: opacity 0.36s ease, transform 0.36s ease;
  pointer-events: ${props => props.$leaving ? 'none' : 'auto'};
  z-index: 30;

  @media (max-width: 1280px) {
    inset: 12px;
  }
`;

const LoadingSkeletonGrid = styled.div`
  position: absolute;
  inset: 24px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  opacity: 0.55;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const LoadingSkeletonCard = styled.div`
  min-width: 0;
  min-height: 116px;
  padding: 20px;
  overflow: hidden;
  background-color: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 18px;
  animation: ${loadingSkeleton} 1.8s ease-in-out infinite;

  &:nth-child(2n) { animation-delay: 180ms; }
  &:nth-child(3n) { animation-delay: 360ms; }

  span {
    display: block;
    height: 10px;
    margin-bottom: 18px;
    background-color: #e2e8f0;
    border-radius: 99px;
  }

  span:first-child { width: 42%; }
  span:last-child { width: 72%; height: 16px; margin: 0; }
`;

const LoadingPanel = styled.div`
  position: relative;
  z-index: 1;
  width: min(520px, calc(100% - 40px));
  padding: 34px 38px;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.96);
  border: 1px solid #dbe3ee;
  border-radius: 18px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.1);
`;

const LoadingIconShell = styled.div`
  position: relative;
  width: 76px;
  height: 76px;
  margin: 0 auto 18px;
  display: grid;
  place-items: center;
  color: #e11d48;
  background-color: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 50%;
  font-size: 28px;
`;

const LoadingOrbit = styled.span`
  position: absolute;
  inset: -7px;
  border: 2px solid transparent;
  border-top-color: #e11d48;
  border-right-color: #fda4af;
  border-radius: 50%;
  animation: ${loadingSpin} 1.15s linear infinite;
`;

const LoadingEyebrow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #e11d48;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
`;

const LoadingLiveDot = styled.span`
  width: 7px;
  height: 7px;
  background-color: #e11d48;
  border-radius: 50%;
  animation: ${loadingPulse} 1.2s ease-in-out infinite;
`;

const LoadingTitle = styled.h1`
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.04em;
`;

const LoadingDescription = styled.p`
  margin: 10px 0 24px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
`;

const LoadingSteps = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 20px;
`;

const LoadingStep = styled.div`
  min-width: 0;
  padding: 10px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #475569;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    background-color: #fb7185;
    border-radius: 50%;
    animation: ${loadingPulse} 1.4s ease-in-out infinite;
  }

  &:nth-child(2)::before { animation-delay: 240ms; }
  &:nth-child(3)::before { animation-delay: 480ms; }
`;

const LoadingProgressTrack = styled.div`
  width: 100%;
  height: 7px;
  overflow: hidden;
  background-color: #ffe4e6;
  border-radius: 99px;
`;

const LoadingProgressBar = styled.div`
  width: 24%;
  height: 100%;
  background-color: #e11d48;
  border-radius: inherit;
  animation: ${loadingSweep} 1.45s ease-in-out infinite;
`;

const LoadingFootnote = styled.div`
  margin-top: 11px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
`;

const LoadingMotionGuard = styled.div`
  display: contents;

  @media (prefers-reduced-motion: reduce) {
    ${LoadingStage} {
      transition: none;
    }

    ${LoadingOrbit}, ${LoadingLiveDot}, ${LoadingStep}::before,
    ${LoadingProgressBar}, ${LoadingSkeletonCard} {
      animation: none;
    }
  }
`;

const DashboardContent = styled.div`
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  animation: ${contentReveal} 0.48s cubic-bezier(0.22, 1, 0.36, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const TopNavContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-width: 0;
  padding: 14px 18px;
  margin-bottom: 16px;
  flex-shrink: 0;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
`;

const PageTitleGroup = styled.div`
  min-width: 0;
`;

const PageEyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
  color: #e11d48;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.11em;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    background-color: #e11d48;
    border-radius: 50%;
  }
`;

const PageTitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
`;

const PageTitle = styled.h1`
  flex: 0 0 auto;
  margin: 0;
  color: #0f172a;
  font-size: 21px;
  font-weight: 600;
  letter-spacing: -0.04em;
`;

const PageDescription = styled.p`
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const TabGroup = styled.div`
  display: flex;
  flex: 0 0 auto;
  background-color: #f8fafc;
  padding: 4px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  gap: 4px;
`;

const Tab = styled.button<{ $active?: boolean; $hasError?: boolean; $isAction?: boolean }>`
  background-color: ${props => props.$isAction ? '#e11d48' : (props.$active ? '#ffffff' : 'transparent')};
  color: ${props => props.$isAction ? '#ffffff' : (props.$hasError ? '#ef4444' : (props.$active ? '#0f172a' : '#94a3b8'))};
  border: 1px solid ${props => props.$active && !props.$isAction ? '#e2e8f0' : 'transparent'};
  padding: 9px 16px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: ${props => props.$active || props.$isAction ? '0 2px 6px rgba(15, 23, 42, 0.05)' : 'none'};
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;

  &:hover {
    background-color: ${props => props.$isAction ? '#be123c' : (props.$active ? '#ffffff' : '#f1f5f9')};
  }
`;

const ErrorDot = styled.div`
  width: 16px;
  height: 16px;
  background-color: #ef4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
`;

// --- 모달 관련 스타일 추가 ---
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  padding: 24px;
  background: rgba(15, 23, 42, 0.58);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10050;
`;

const ModalContainer = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  width: min(750px, calc(100vw - 48px));
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  padding: 26px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.2);
  animation: ${modalReveal} 0.24s ease-out both;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  cursor: pointer;
  font-size: 20px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
`;

const MachineGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
`;

const MachineButton = styled.button<{ $active?: boolean; $hasError?: boolean }>`
  position: relative;
  background: ${props => props.$active ? '#fff1f2' : (props.$hasError ? '#fef2f2' : '#ffffff')};
  color: ${props => props.$active ? '#be123c' : (props.$hasError ? '#dc2626' : '#475569')};
  border: 1px solid ${props => props.$active ? '#fb7185' : (props.$hasError ? '#fca5a5' : '#e2e8f0')};
  border-radius: 10px;
  padding: 14px 0;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;

  &:hover {
    background: ${props => props.$active ? '#ffe4e6' : (props.$hasError ? '#fee2e2' : '#f8fafc')};
    border-color: ${props => props.$active || props.$hasError ? '#fb7185' : '#cbd5e1'};
  }

  .status-dot {
    position: absolute;
    top: -6px;
    right: -6px;
  }
`;
// ------------------------------

const DashboardGrid = styled.div`
  display: flex;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  width: clamp(270px, 18vw, 310px);
  gap: 16px;
  flex-shrink: 0;
  height: 100%;
`;

const StatusCard = styled.div<{ $type: 'good' | 'error' }>`
  background-color: #ffffff;
  border: 1px solid ${props => props.$type === 'good' ? '#cbd5e1' : '#fda4af'};
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-height: 0;
`;

const CardTitle = styled.div`
  width: 100%;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: auto;
`;

const CircleIconWrapper = styled.div<{ $type: 'good' | 'error' }>`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background-color: ${props => props.$type === 'good' ? '#d1fae5' : '#fee2e2'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 0;
`;

const CircleIconInner = styled.div<{ $type: 'good' | 'error' }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: ${props => props.$type === 'good' ? '#10b981' : '#ef4444'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 30px;
`;

const StatusMainText = styled.div`
  font-size: 34px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 12px;
  letter-spacing: -1px;
`;

const StatusSubPill = styled.div<{ $type: 'good' | 'error' }>`
  background-color: ${props => props.$type === 'good' ? '#ecfdf5' : '#fff1f2'};
  color: ${props => props.$type === 'good' ? '#047857' : '#be123c'};
  border: 1px solid ${props => props.$type === 'good' ? '#a7f3d0' : '#fecdd3'};
  padding: 7px 12px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: auto;
`;

const LegendWrapper = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 14px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 10px;
  width: 100%;
`;

const LegendDot = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: ${props => props.color};
  }
`;

const RightColumn = styled.div`
  flex: 1;
  min-width: 0;
  max-width: 100%;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #cbd5e1;
  padding: 22px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);

  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;

const RightHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
`;

const RightTitle = styled.h2`
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  color: #0f172a;
`;

const LiveBadge = styled.div`
  background-color: #fef2f2;
  color: #ef4444;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  letter-spacing: 0.5px;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    background-color: #ef4444;
    border-radius: 50%;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
  padding-bottom: 10px;
`;

const MetricCardWrapper = styled.div<{ $isError: boolean }>`
  min-width: 0;
  border: 1px solid ${props => props.$isError ? '#fb7185' : '#cbd5e1'};
  background-color: ${props => props.$isError ? '#fff7f7' : '#f8fafc'};
  border-radius: 13px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  height: 120px;
  justify-content: center;
  transition: border-color 0.18s ease, background-color 0.18s ease;

  &:hover {
    border-color: ${props => props.$isError ? '#fb7185' : '#cbd5e1'};
    background-color: ${props => props.$isError ? '#fff1f2' : '#ffffff'};
  }
`;

const MetricHeader = styled.div`
  display: flex;
  min-width: 0;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 13px;
`;

const MetricName = styled.div`
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  text-overflow: ellipsis;

  span {
    font-size: 12px;
    color: #64748b;
    font-weight: 600;
    margin-left: 4px;
  }
`;

const MetricValueBox = styled.div<{ $isError: boolean }>`
  flex: 0 0 auto;
  background-color: ${props => props.$isError ? '#fff1f2' : '#ecfdf5'};
  color: ${props => props.$isError ? '#dc2626' : '#047857'};
  border: 1px solid ${props => props.$isError ? '#fecdd3' : '#bbf7d0'};
  padding: 4px 10px;
  border-radius: 7px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.5px;
`;

const GaugeContainer = styled.div`
  position: relative;
  width: 100%;
  height: 36px;
`;

const GaugeTrack = styled.div`
  position: absolute;
  bottom: 13px;
  width: 100%;
  height: 10px;
  background-color: #cbd5e1;
  border-radius: 99px;
`;

const GaugeFill = styled.div<{ $percent: number; $isError: boolean }>`
  position: absolute;
  bottom: 13px;
  left: 0;
  width: ${props => props.$percent}%;
  height: 10px;
  background-color: ${props => props.$isError ? '#dc2626' : '#059669'};
  border-radius: 99px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
`;

const GaugeValueText = styled.div<{ $percent: number }>`
  position: absolute;
  bottom: 26px;
  left: ${props => props.$percent}%;
  transform: translateX(-50%);
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
`;

const GaugeMinMax = styled.div`
  position: absolute;
  bottom: -3px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
`;

// --------------------------------------------------------------------------
// 4. Sub-Components
// --------------------------------------------------------------------------
const MetricCard = ({ data }: { data: GaugeData }) => {
  let percent = ((data.value - data.min) / (data.max - data.min)) * 100;
  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;
  const labelPercent = Math.min(96, Math.max(4, percent));

  // 중간값(최적값) 계산 로직 유지
  const optimalValue = (data.min + data.max) / 2;
  const displayOptimal = Number.isInteger(optimalValue) ? optimalValue : optimalValue.toFixed(1);

  return (
    <MetricCardWrapper $isError={data.isError}>
      <MetricHeader>
        <MetricName>
          {data.label} <span>({data.unit})</span>
        </MetricName>
        <MetricValueBox $isError={data.isError}>
          {displayOptimal}
        </MetricValueBox>
      </MetricHeader>
      
      <GaugeContainer>
        <GaugeValueText $percent={labelPercent}>{data.value}</GaugeValueText>
        <GaugeTrack />
        <GaugeFill $percent={percent} $isError={data.isError} />
        <GaugeMinMax>
          <span>{data.min}</span>
          <span>{data.max}</span>
        </GaugeMinMax>
      </GaugeContainer>
    </MetricCardWrapper>
  );
};

// --------------------------------------------------------------------------
// 5. Main Page Component
// --------------------------------------------------------------------------
export default function ProcessDashboard() {
  const [cartList, setCartList] = useState<ApiDataItem[]>([]);
  const [selectedCartNo, setSelectedCartNo] = useState<string>('');
  const [metricsData, setMetricsData] = useState<GaugeData[]>([]);
  const [apiLimits, setApiLimits] = useState<Record<string, {min: number, max: number}>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingStage, setShowLoadingStage] = useState(true);
  
  // 모달 상태 추가
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Update Metrics when Cart Changes
  const updateMetricsForCart = useCallback((cartData: ApiDataItem, limits: Record<string, {min: number, max: number}>) => {
    const newMetrics: GaugeData[] = [];

    METRIC_CONFIG.forEach((config, index) => {
      const valStr = cartData[config.key];
      const val = parseFloat(String(valStr));
      
      let min = 0, max = 100;
      if (limits[config.key]) {
        min = limits[config.key].min;
        max = limits[config.key].max;
      }
      if (min > max) { [min, max] = [max, min]; }

      if (!isNaN(val)) {
        const isError = val < min || val > max;
        newMetrics.push({
          id: `m-${index}`,
          label: config.label,
          unit: config.unit,
          min,
          max,
          value: val,
          isError
        });
      }
    });
    setMetricsData(newMetrics);
  }, []);

  // 2. Process Response
  const processApiResponse = useCallback((json: ApiResponse) => {
    const limitMap: Record<string, {min: number, max: number}> = {};
    if (json.DX_LIMIT_LIST) {
      json.DX_LIMIT_LIST.forEach(item => {
        let min = parseFloat(item.min);
        let max = parseFloat(item.max);
        if (isNaN(min)) min = 0;
        if (isNaN(max)) max = 100;
        limitMap[item.name] = { min, max };
      });
    }
    setApiLimits(limitMap);

    if (json.data && json.data.length > 0) {
      const firstCart = json.data[0];
      setCartList(json.data);
      setSelectedCartNo(firstCart['대차번호']);
      updateMetricsForCart(firstCart, limitMap);
    }
  }, [updateMetricsForCart]);

  // 전시 데이터는 로컬에서 갱신하며 설비에 요청하지 않는다.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      processApiResponse(MOCK_API_RESPONSE);
      setIsLoading(false);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [processApiResponse]);

  useEffect(() => {
    if (isLoading) return;
    const timer = startVisibleInterval(() => {
      const phase = Date.now() / 5000;
      const next = generateMockData().map((cart, cartIndex) => {
        const nextCart = { ...cart };
        METRIC_CONFIG.forEach((metric, metricIndex) => {
          const base = Number(cart[metric.key]);
          nextCart[metric.key] = (base + Math.sin(phase + cartIndex + metricIndex) * base * 0.006).toFixed(2);
        });
        return nextCart;
      });
      setCartList(next);
      const selected = next.find(cart => cart['대차번호'] === selectedCartNo);
      if (selected) updateMetricsForCart(selected, apiLimits);
    }, 3000);
    return () => timer();
  }, [isLoading, selectedCartNo, apiLimits, updateMetricsForCart]);

  useEffect(() => {
    if (isLoading) return;

    const transitionTimer = window.setTimeout(() => {
      setShowLoadingStage(false);
    }, 380);

    return () => window.clearTimeout(transitionTimer);
  }, [isLoading]);

  // Handle Tab Click
  const handleCartChange = (cartNo: string) => {
    setSelectedCartNo(cartNo);
    const cartData = cartList.find(c => c['대차번호'] === cartNo);
    if (cartData) {
      updateMetricsForCart(cartData, apiLimits);
    }
  };

  // Check if a specific cart has any errors
  const checkCartError = useCallback((item: ApiDataItem | string) => {
    let data;
    if (typeof item === 'string') {
      data = cartList.find(c => c['대차번호'] === item);
    } else {
      data = item;
    }
    if (!data) return false;

    return METRIC_CONFIG.some(config => {
      const val = parseFloat(String(data[config.key]));
      if (isNaN(val)) return false;
      const limit = apiLimits[config.key];
      if (!limit) return false;
      let { min, max } = limit;
      if (min > max) { [min, max] = [max, min]; }
      return val < min || val > max;
    });
  }, [apiLimits, cartList]);

  // Global Error State derived from currently viewed metrics
  const errorMetrics = useMemo(() => metricsData.filter(m => m.isError), [metricsData]);
  const hasCriticalError = errorMetrics.length > 0;
  const errorCount = errorMetrics.length;

  return (
    <>
      <GlobalStyle />
      <PageContainer>
        {!isLoading && (
          <DashboardContent>
            {isModalOpen && createPortal(
              <ModalOverlay onClick={() => setIsModalOpen(false)}>
                <ModalContainer data-demo="foaming-panel" onClick={e => e.stopPropagation()}>
                  <ModalHeader>
                    <ModalTitle>설비 선택 (M-01 ~ M-24)</ModalTitle>
                    <CloseButton data-demo="foaming-close" onClick={() => setIsModalOpen(false)} aria-label="설비 선택 닫기">
                      <FiX />
                    </CloseButton>
                  </ModalHeader>
                  <MachineGrid>
                    {cartList.map(item => {
                      const cNo = item['대차번호'];
                      const hasErr = checkCartError(cNo);
                      return (
                        <MachineButton
                          key={cNo}
                          $active={selectedCartNo === cNo}
                          $hasError={hasErr}
                          onClick={() => {
                            handleCartChange(cNo);
                            setIsModalOpen(false);
                          }}
                        >
                          {hasErr && <ErrorDot className="status-dot">!</ErrorDot>}
                          {cNo}
                        </MachineButton>
                      );
                    })}
                  </MachineGrid>
                </ModalContainer>
              </ModalOverlay>,
              document.body
            )}

            <TopNavContainer>
              <PageTitleGroup>
                <PageEyebrow>PRODUCTION INSPECTION</PageEyebrow>
                <PageTitleRow>
                  <PageTitle>발포 공정 검사</PageTitle>
                  <PageDescription>설비별 핵심 공정 지표와 관리 범위를 실시간으로 확인합니다.</PageDescription>
                </PageTitleRow>
              </PageTitleGroup>

              <TabGroup>
                <Tab $active={true} $hasError={checkCartError(selectedCartNo)}>
                  {checkCartError(selectedCartNo) && <ErrorDot>!</ErrorDot>}
                  {selectedCartNo}
                </Tab>
                <Tab
                  $isAction={true}
                  data-demo="foaming-expand" onClick={() => setIsModalOpen(true)}
                >
                  <FiGrid />
                  설비 전체보기
                </Tab>
              </TabGroup>
            </TopNavContainer>

            <DashboardGrid>
              <LeftColumn>
                <StatusCard $type={hasCriticalError ? "error" : "good"}>
                  <CardTitle>설비 상태</CardTitle>
                  <CircleIconWrapper $type={hasCriticalError ? "error" : "good"}>
                    <CircleIconInner $type={hasCriticalError ? "error" : "good"}>
                      {hasCriticalError ? <FiAlertTriangle strokeWidth={2.5} /> : <FiCheck strokeWidth={3} />}
                    </CircleIconInner>
                  </CircleIconWrapper>
                  <StatusMainText>{hasCriticalError ? "점검" : "양호"}</StatusMainText>
                  <StatusSubPill $type={hasCriticalError ? "error" : "good"}>
                    {hasCriticalError ? <FiAlertTriangle size={14} /> : <FiCheck size={14} />}{' '}
                    {hasCriticalError ? "관리 범위 이탈 발생" : "관리 범위 내 안정적으로 운영중"}
                  </StatusSubPill>
                  <LegendWrapper>
                    <LegendDot color="#10b981">양호</LegendDot>
                    <LegendDot color="#facc15">주의</LegendDot>
                    <LegendDot color="#ef4444">불량</LegendDot>
                  </LegendWrapper>
                </StatusCard>

                <StatusCard $type={errorCount > 0 ? "error" : "good"}>
                  <CardTitle>발생 건수</CardTitle>
                  <CircleIconWrapper $type={errorCount > 0 ? "error" : "good"}>
                    <CircleIconInner $type={errorCount > 0 ? "error" : "good"}>
                      {errorCount > 0 ? <FiAlertTriangle strokeWidth={2.5} /> : <FiCheck strokeWidth={3} />}
                    </CircleIconInner>
                  </CircleIconWrapper>
                  <StatusMainText>{errorCount}건</StatusMainText>
                  <StatusSubPill $type={errorCount > 0 ? "error" : "good"}>
                    {errorCount > 0 ? <FiAlertTriangle size={14} /> : <FiCheck size={14} />}{' '}
                    {errorCount > 0 ? `특이사항이 ${errorCount}건 발생했습니다.` : "특이사항 없음"}
                  </StatusSubPill>
                  <LegendWrapper>
                    <LegendDot color="#10b981">없음</LegendDot>
                    <LegendDot color="#facc15">1건 이상</LegendDot>
                    <LegendDot color="#ef4444">3건 이상</LegendDot>
                  </LegendWrapper>
                </StatusCard>
              </LeftColumn>

              <RightColumn>
                <RightHeader>
                  <RightTitle>핵심 공정 지표 및 운영 범위</RightTitle>
                  <LiveBadge>LIVE</LiveBadge>
                </RightHeader>
                <MetricsGrid data-demo="foaming-metrics">
                  {metricsData.map((metric) => (
                    <MetricCard key={metric.id} data={metric} />
                  ))}
                </MetricsGrid>
              </RightColumn>
            </DashboardGrid>
          </DashboardContent>
        )}

        {showLoadingStage && (
          <LoadingMotionGuard>
            <LoadingStage
              $leaving={!isLoading}
              role="status"
              aria-live="polite"
              aria-label="설비 데이터를 불러오는 중입니다"
            >
              <LoadingSkeletonGrid aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => (
                  <LoadingSkeletonCard key={index}>
                    <span />
                    <span />
                  </LoadingSkeletonCard>
                ))}
              </LoadingSkeletonGrid>

              <LoadingPanel>
                <LoadingIconShell aria-hidden="true">
                  <LoadingOrbit />
                  <FiDatabase />
                </LoadingIconShell>
                <LoadingEyebrow>
                  <LoadingLiveDot />
                  LIVE DATA SYNC
                </LoadingEyebrow>
                <LoadingTitle>설비 데이터를 불러오는 중입니다</LoadingTitle>
                <LoadingDescription>
                  센서 기준값과 실시간 설비 상태를 동기화하고 있습니다.<br />
                  잠시만 기다려 주세요.
                </LoadingDescription>
                <LoadingSteps aria-hidden="true">
                  <LoadingStep>설비 연결</LoadingStep>
                  <LoadingStep>기준값 확인</LoadingStep>
                  <LoadingStep>화면 구성</LoadingStep>
                </LoadingSteps>
                <LoadingProgressTrack aria-hidden="true">
                  <LoadingProgressBar />
                </LoadingProgressTrack>
                <LoadingFootnote>실시간 공정 데이터를 안전하게 준비하고 있습니다</LoadingFootnote>
              </LoadingPanel>
            </LoadingStage>
          </LoadingMotionGuard>
        )}
      </PageContainer>
    </>
  );
}
