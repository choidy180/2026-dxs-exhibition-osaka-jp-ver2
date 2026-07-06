'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import {
  FiVideo, FiMoreHorizontal, FiUser, FiClock, FiAlertCircle,
  FiCheck, FiMinus, FiPlayCircle, FiArrowUp, FiX, FiPackage
} from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';
import { useVehicleImageUrl } from '@/hooks/useVehicleImageUrl';

// 앱 전역과 동일한 Pretendard 폰트 스택 (한글 폴백 포함 → 로드 중 폰트 스와프/깜빡임 방지)
const FONT_STACK =
  '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// --- 1. Global Style ---
const GlobalStyle = createGlobalStyle`
  @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");

  * {
    box-sizing: border-box;
    font-family: ${FONT_STACK};
  }

  body {
    margin: 0;
    padding: 0;
    background-color: #F1F5F9;
    color: #1E293B;
    overflow: hidden;
  }

  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
`;

// --- 2. Theme ---
const theme = {
  primary: '#C1124F',
  lightPink: '#FCE7F3',
  green: '#10B981',
  lightGreen: '#ECFDF5',
  bg: '#F4F6F8',
  cardBg: '#FFFFFF',
  textMain: '#0F172A',
  textSub: '#64748B',
  radius: '12px',
  shadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
};

// --- API Interfaces ---
interface SlotDetail { slot_id: number; occupied: boolean; entry_time: string | null; slot_name?: string; }
interface CameraData { total: number; occupied: number; empty_idxs: number[]; slots_detail: SlotDetail[]; }
type CamDataMap = { [key: string]: CameraData; };
interface WorkingData { NoWkOrd: string; ItemName: string; OrdQty: number; ProdQty: number; NmEmplo: string; NmWrkState: string; NmProce: string; PlnSTime: string; PlnETime: string; }
interface ApiResult { success: boolean; working_data: WorkingData; camData: CamDataMap; }
interface FlattenedSlotItem extends SlotDetail { camId: string; }

const CAM_DATA_API_URL = useVehicleImageUrl('http://192.168.2.147:24828/api/DX_API000018');

const CAMERAS = [
  { camId: '207', title: 'GR5 가조립 자재 #1', wsUrl: useVehicleImageUrl('ws://192.168.2.147:8132') },
  { camId: '218', title: 'GR5 가조립 자재 #2', wsUrl: useVehicleImageUrl('ws://192.168.2.147:8133') },
] as const;

const getCamOccupancyPercent = (cameraData?: CameraData) => {
  const total = cameraData?.total ?? 0;
  const occupied = cameraData?.occupied ?? 0;

  if (total <= 0) return 0;
  return Math.min(Math.round((occupied / total) * 100), 100);
};

const getSlotDisplayName = (slot: SlotDetail) => {
  return slot.slot_name ?? `슬롯 ${slot.slot_id}`;
};

const formatEntryTime = (entryTime: string | null) => {
  if (!entryTime) return '-';

  const parsedDate = new Date(entryTime);
  if (Number.isNaN(parsedDate.getTime())) return entryTime;

  return parsedDate.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

// --- Animation Keyframes ---
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const backdropFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// --- Styled Components ---
const DashboardContainer = styled.div`
  width: 100%;
  height: 100vh;
  padding: 18px;
  display: flex;
  background-color: ${theme.bg};
  overflow: hidden;
  font-family: ${FONT_STACK};
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1.4fr 360px;
  gap: 16px;
  flex: 1;
  min-height: 0;
  height: 100%;
`;

const Card = styled.div`
  background-color: ${theme.cardBg};
  border-radius: ${theme.radius};
  box-shadow: ${theme.shadow};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
`;

// --- 1. Left: Video Styles ---
const VideoColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
`;

const VideoWrapper = styled(Card)`
  flex: 1;
  position: relative;
  background: #0f172a;
  border: none;
`;

const StyledWebsocketImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
  transform: scale(1.05);
  background-color: #000;
`;

const VideoOverlayTop = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  z-index: 10;
`;

const CamTag = styled.div`
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MiniDashboardOverlay = styled.div`
  position: absolute;
  bottom: 24px;
  left: 24px;
  width: 210px;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(12px) saturate(1.15);
  -webkit-backdrop-filter: blur(12px) saturate(1.15);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 14px;
  color: white;
  z-index: 20;
  display: flex;
  flex-direction: column;
  font-weight: 600;
`;

const MiniTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #F8FAFC;
  margin-bottom: 10px;
`;

const MiniLabel = styled.div`
  font-size: 13px;
  color: #94A3B8;
  font-weight: 600;
  margin-bottom: 6px;
`;

const MiniValueRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
`;

const MiniValueBig = styled.span`
  font-size: 28px;
  font-weight: 600;
  color: ${theme.green};
`;

const MiniValueSub = styled.span`
  font-size: 20px;
  color: #F1F5F9;
  font-weight: 600;
`;

const MiniProgressBar = styled.div<{ $percent: number }>`
  width: 100%;
  height: 6px;
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${props => props.$percent}%;
    background-color: ${theme.green};
    border-radius: 3px;
    transition: width 0.25s ease;
  }
`;

const MiniError = styled.div`
  margin-top: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #FCA5A5;
`;

// --- 2. Center: Middle Column Styles ---
const MiddleColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 4px;
`;

const SectionTitle = styled.h2`
  font-size: 22px;
  font-weight: 600;
  color: ${theme.textMain};
  margin: 0;
  padding-left: 4px;
  letter-spacing: -0.5px;
`;

const ViewAllBtn = styled.button`
  background: #E2E8F0;
  color: #475569;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #CBD5E1;
    color: #0F172A;
  }
`;

const WorkInfoCard = styled(Card)`
  padding: 18px;
  border-radius: 12px;
  flex-shrink: 0;
`;

const WorkInfoTopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const WorkOrderBadge = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: ${theme.primary};
  background: ${theme.lightPink};
  padding: 6px 12px;
  border-radius: 8px;
`;

const WorkStatusPlay = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ItemNameText = styled.div`
  font-size: 22px;
  font-weight: 600;
  color: ${theme.textMain};
  margin-bottom: 16px;
`;

const WorkGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 18px;
`;

const WorkDetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0px;
`;

const WorkLabel = styled.span`
  font-size: 18px;
  color: #6c727a;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
`;

const WorkValue = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: ${theme.textMain};
`;

const ProgressContainer = styled.div`
  width: 100%;
`;

const ProgressLabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 600;
  color: ${theme.textMain};
`;

const ProgressBarBg = styled.div`
  width: 100%;
  height: 16px;
  background: #F1F5F9;
  border-radius: 8px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${props => props.$percent}%;
  background: ${theme.primary};
  border-radius: 6px;
`;

const NoticeBanner = styled.div`
  background: #FFFBEB;
  color: #D97706;
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #FEF3C7;
  flex-shrink: 0;
`;

const ListScrollArea = styled.div`
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
`;

const SlotItem = styled.div<{ $occupied: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-radius: 12px;
  background: white;
  border: 1px solid ${props => props.$occupied ? theme.green : '#E2E8F0'};
  opacity: ${props => props.$occupied ? 1 : 0.6};
`;

const ItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const IconCircle = styled.div<{ $occupied: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid ${props => props.$occupied ? theme.green : '#CBD5E1'};
  color: ${props => props.$occupied ? theme.green : '#CBD5E1'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
`;

const ItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ItemTitle = styled.span<{ $occupied: boolean }>`
  font-size: 17px;
  font-weight: 600;
  color: ${props => props.$occupied ? '#0F172A' : '#64748B'};
`;

const ItemSub = styled.span`
  font-size: 14px;
  color: #64748B;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StatusTextRow = styled.div<{ $occupied: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: ${props => props.$occupied ? theme.green : '#94A3B8'};
`;

const StatusDot = styled.div<{ $occupied: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$occupied ? theme.green : 'transparent'};
`;

// --- 3. Right: Chat Styles ---
const ChatContainer = styled(Card)`
  padding: 0;
  border: 1px solid #E2E8F0;
`;

const ChatHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #F1F5F9;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
`;

const AiAvatar = styled.div`
  width: 40px;
  height: 40px;
  background-color: ${theme.lightPink};
  color: ${theme.primary};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`;

const AiTitleInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const AiTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${theme.textMain};
`;

const AiSub = styled.div`
  font-size: 13px;
  color: #64748B;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ChatBody = styled.div`
  flex: 1;
  background: white;
  padding: 16px;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const MessageRow = styled.div<{ $isUser: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  gap: 6px;
  animation: ${fadeIn} 0.3s ease-out;
`;

const Bubble = styled.div<{ $isUser: boolean }>`
  background: ${props => props.$isUser ? theme.primary : '#F8FAFC'};
  color: ${props => props.$isUser ? 'white' : '#1E293B'};
  padding: 12px 14px;
  border-radius: 12px;
  border-bottom-right-radius: ${props => props.$isUser ? '4px' : '12px'};
  border-top-left-radius: ${props => props.$isUser ? '12px' : '4px'};
  font-size: 15px;
  font-weight: 500;
  max-width: 85%;
  line-height: 1.5;
`;

const TimeText = styled.div`
  font-size: 12px;
  color: #94A3B8;
  font-weight: 500;
  margin: 0 2px;
`;

const InputArea = styled.form`
  padding: 14px 16px;
  background: white;
  border-top: 1px solid #F1F5F9;
  flex-shrink: 0;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  background: #F8FAFC;
  border-radius: 12px;
  padding: 8px 8px 8px 18px;
  border: 1px solid #E2E8F0;
`;

const Input = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  font-size: 15px;
  font-weight: 500;
  outline: none;
  color: ${theme.textMain};
  &::placeholder {
    color: #94A3B8;
    font-weight: 500;
  }
`;

const SendBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${theme.primary};
  border: none;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 20px;
  flex-shrink: 0;
  transition: transform 0.1s;
  &:active {
    transform: scale(0.95);
  }
`;

// --- 4. Modal Styles ---
const ModalBackdrop = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${backdropFadeIn} 0.2s ease-out;
`;

const ModalContainer = styled.div`
  background: white;
  width: 600px;
  max-width: 90vw;
  max-height: 85vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
  animation: ${fadeIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const ModalHeader = styled.div`
  padding: 18px 20px;
  border-bottom: 1px solid #F1F5F9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: ${theme.textMain};
`;

const CloseBtn = styled.button`
  background: #F1F5F9;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748B;
  transition: background 0.2s;

  &:hover {
    background: #E2E8F0;
    color: #0F172A;
  }
`;

const ModalBody = styled.div`
  padding: 18px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
`;

// --- 5. Auto Order Alert Styles ---
const AutoOrderBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 36%, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0) 42%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.44) 0%, rgba(15, 23, 42, 0.58) 100%);
  backdrop-filter: blur(14px) saturate(1.08);
  -webkit-backdrop-filter: blur(14px) saturate(1.08);
  animation: ${backdropFadeIn} 0.18s ease-out;
`;

const AutoOrderBox = styled.div`
  width: min(520px, calc(100vw - 48px));
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 12px;
  box-shadow:
    0 34px 90px rgba(15, 23, 42, 0.32),
    0 12px 30px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
  padding: 22px;
  animation: ${fadeIn} 0.24s cubic-bezier(0.16, 1, 0.3, 1);

  &::after {
    content: '';
    position: absolute;
    top: -120px;
    right: -120px;
    width: 240px;
    height: 240px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.16) 0%, rgba(14, 165, 233, 0) 68%);
    pointer-events: none;
  }
`;

const AutoOrderHeader = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 22px;
`;

const AutoOrderIconBadge = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%);
  color: #2563EB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.10);
`;

const AutoOrderTitleGroup = styled.div`
  min-width: 0;
  flex: 1;
`;

const AutoOrderEyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 10px;
  background: rgba(37, 99, 235, 0.08);
  color: #2563EB;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.2px;
  margin-bottom: 9px;
`;

const AutoOrderTitle = styled.h3`
  margin: 0;
  color: #0F172A;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.8px;
`;

const AutoOrderDescription = styled.p`
  margin: 8px 0 0;
  color: #64748B;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: -0.2px;
`;

const AutoOrderBody = styled.div`
  position: relative;
  z-index: 1;
  padding: 18px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.86);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
`;

const AutoOrderMessage = styled.div`
  text-align: center;
  color: #0F172A;
  letter-spacing: -0.35px;

  strong {
    display: block;
    font-size: 19px;
    font-weight: 600;
    line-height: 1.55;
  }

  span {
    display: block;
    margin-top: 6px;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.55;
    color: #334155;
  }
`;

const AutoOrderQuantity = styled.div`
  margin-top: 18px;
  height: 62px;
  padding: 0 18px;
  border-radius: 12px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
`;

const AutoOrderQuantityLabel = styled.span`
  color: #64748B;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.2px;
`;

const AutoOrderQuantityValue = styled.span`
  color: #0F172A;
  font-size: 26px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.6px;

  span {
    color: #94A3B8;
    font-size: 18px;
    font-weight: 600;
  }
`;

const AutoOrderButtonRow = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 22px;
`;

const AutoOrderButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
  height: 48px;
  border-radius: 12px;
  border: 1px solid ${props => props.$variant === 'primary' ? 'rgba(37, 99, 235, 0.18)' : '#E2E8F0'};
  background: ${props => props.$variant === 'primary'
    ? '#2563EB'
    : 'rgba(255, 255, 255, 0.92)'};
  color: ${props => props.$variant === 'primary' ? '#FFFFFF' : '#334155'};
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.25px;
  cursor: pointer;
  box-shadow: ${props => props.$variant === 'primary'
    ? '0 12px 24px rgba(37, 99, 235, 0.24)'
    : '0 8px 18px rgba(15, 23, 42, 0.05)'};
  transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease, background 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    filter: ${props => props.$variant === 'primary' ? 'brightness(1.03)' : 'none'};
    background: ${props => props.$variant === 'primary'
      ? 'linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%)'
      : '#F8FAFC'};
    box-shadow: ${props => props.$variant === 'primary'
      ? '0 16px 30px rgba(37, 99, 235, 0.28)'
      : '0 10px 22px rgba(15, 23, 42, 0.08)'};
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${props => props.$variant === 'primary'
      ? '0 8px 18px rgba(37, 99, 235, 0.18)'
      : '0 4px 12px rgba(15, 23, 42, 0.05)'};
  }
`;


// --- [수정 완료] 실시간 비디오 스트리밍을 처리하는 WebSocket Component ---
const WsVideoStream = ({ wsUrl }: { wsUrl: string }) => {
  const [imageSrc, setImageSrc] = useState<string>('');

  useEffect(() => {
    // 1. 공정 카메라 웹소켓 서버 연결
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'blob'; // 바이너리 스트림 우선 설정

    let previousUrl = '';

    ws.onmessage = (event) => {
      // 케이스 A: 백엔드가 이미지 파일 바이너리(Blob) 데이터로 프레임을 보낼 때
      if (event.data instanceof Blob) {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl); // 24시간 가동되는 공정이므로 가비지 컬렉션을 위해 메모리 해제 필수
        }
        const url = URL.createObjectURL(event.data);
        setImageSrc(url);
        previousUrl = url;
      }
      // 케이스 B: 백엔드가 Base64 문자열 형태로 프레임을 보낼 때
      else if (typeof event.data === 'string') {
        if (event.data.startsWith('data:image')) {
          setImageSrc(event.data);
        } else {
          setImageSrc(`data:image/jpeg;base64,${event.data}`);
        }
      }
    };

    ws.onerror = (error) => {
      console.error(`공정 CCTV 웹소켓 에러 [주소: ${wsUrl}]:`, error);
    };

    ws.onclose = () => {
      console.warn(`공정 CCTV 웹소켓 연결이 해제되었습니다. [주소: ${wsUrl}]`);
    };

    // 컴포넌트 언마운트 시 웹소켓 정상 해제 및 메모리 정리
    return () => {
      ws.close();
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
    };
  }, [wsUrl]);

  return (
    <StyledWebsocketImg
      src={imageSrc || "https://via.placeholder.com/600x400/1e293b/ffffff?text=Connecting+Stream..."}
      alt="Live Production Stream"
    />
  );
};


// --- Mock Data ---
const MOCK_DATA: ApiResult = {
  "success": true,
  "working_data": {
    "NoWkOrd": "WO-260305-003",
    "ItemName": "Door Foam Assembly,Refrigerato",
    "OrdQty": 750,
    "ProdQty": 750,
    "NmEmplo": "박태용",
    "NmWrkState": "가동중",
    "NmProce": "발포 / 조립 1라인",
    "PlnSTime": "09:00 ~ 17:35",
    "PlnETime": "09:00 ~ 17:35",
  },
  "camData": {
    "207": {
      "total": 7,
      "occupied": 4,
      "empty_idxs": [],
      "slots_detail": [
        { "slot_id": 1, "occupied": true, "entry_time": "06:14:39", "slot_name": "S-01" },
        { "slot_id": 2, "occupied": true, "entry_time": "06:14:39", "slot_name": "S-01" },
        { "slot_id": 3, "occupied": true, "entry_time": "06:14:39", "slot_name": "S-01" },
        { "slot_id": 4, "occupied": true, "entry_time": "06:14:39", "slot_name": "S-01" },
        { "slot_id": 5, "occupied": false, "entry_time": "06:14:39", "slot_name": "S-03" }
      ]
    },
    "218": {
      "total": 3,
      "occupied": 2,
      "empty_idxs": [],
      "slots_detail": []
    }
  }
};

const SmartFactoryDashboard: React.FC = () => {
  const [apiData] = useState<ApiResult>(MOCK_DATA);
  const [camData, setCamData] = useState<CamDataMap>(MOCK_DATA.camData);
  const [camDataError, setCamDataError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAutoOrderModalOpen, setIsAutoOrderModalOpen] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([
    { id: 1, text: "시스템 가동. 실시간 공정 데이터 수신중.\n\n현재 'Door Foam Assembly' 작업이 진행중입니다.", user: false, time: '09:40 AM' },
    { id: 2, text: "생산 진행률을 알려주세요", user: true, time: '09:40 AM' },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isAlive = true;
    let controller: AbortController | null = null;

    const fetchCamData = async () => {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch(CAM_DATA_API_URL, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`카메라 적재 데이터 API 오류: ${response.status}`);
        }

        const payload = await response.json() as ({ camData?: CamDataMap } & CamDataMap);
        const nextCamData = payload.camData ?? payload;

        if (!nextCamData || typeof nextCamData !== 'object') {
          throw new Error('camData 형식이 올바르지 않습니다.');
        }

        if (isAlive) {
          setCamData(nextCamData);
          setCamDataError(null);
        }
      } catch (error) {
        if (!isAlive || (error instanceof Error && error.name === 'AbortError')) return;
        setCamDataError(error instanceof Error ? error.message : '카메라 적재 데이터 수신 실패');
      }
    };

    fetchCamData();
    const intervalId = window.setInterval(fetchCamData, 10000);

    return () => {
      isAlive = false;
      window.clearInterval(intervalId);
      controller?.abort();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping = tagName === 'input' || tagName === 'textarea' || target?.isContentEditable;

      if (event.key === 'Escape') {
        setIsAutoOrderModalOpen(false);
        return;
      }

      if (event.key !== 'Enter' || isTyping || isModalOpen || isAutoOrderModalOpen) return;
      event.preventDefault();
      setIsAutoOrderModalOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isAutoOrderModalOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now(), text: chatInput, user: true, time: now }]);
    setChatInput("");
  };

  const allSlots: FlattenedSlotItem[] = useMemo(() => {
    return Object.entries(camData).flatMap(([camId, cameraData]) =>
      (cameraData.slots_detail ?? []).map(slot => ({
        camId,
        ...slot
      }))
    );
  }, [camData]);

  const wkData = apiData.working_data;
  const progressPercent = Math.min((wkData.ProdQty / wkData.OrdQty) * 100, 100);

  if (!mounted) return null;

  return (
    <>
      <GlobalStyle />
      <DashboardContainer>
        <MainGrid>

          {/* 1. LEFT: Video Feed */}
          <VideoColumn>
            {CAMERAS.map((camera) => {
              const currentCamData = camData[camera.camId];
              const total = currentCamData?.total ?? 0;
              const occupied = currentCamData?.occupied ?? 0;
              const percent = getCamOccupancyPercent(currentCamData);

              return (
                <VideoWrapper key={camera.camId}>
                  <VideoOverlayTop>
                    <CamTag><FiVideo size={18} /> {camera.title}</CamTag>
                    <FiMoreHorizontal color="white" size={24} />
                  </VideoOverlayTop>

                  <WsVideoStream wsUrl={camera.wsUrl} />

                  <MiniDashboardOverlay>
                    <MiniLabel>실시간 적재 현황</MiniLabel>
                    <MiniTitle>{camera.title}</MiniTitle>
                    <MiniValueRow>
                      <MiniValueBig>{percent}%</MiniValueBig>
                      <MiniValueSub>{occupied} / {total} EA</MiniValueSub>
                    </MiniValueRow>
                    <MiniProgressBar $percent={percent} />
                    {camDataError && <MiniError>API 연결 오류 · 기존 데이터 표시</MiniError>}
                  </MiniDashboardOverlay>
                </VideoWrapper>
              );
            })}
          </VideoColumn>

          {/* 2. CENTER: Data List */}
          <MiddleColumn>
            <SectionTitle>실시간 생산 및 적재 데이터</SectionTitle>

            <WorkInfoCard>
              <WorkInfoTopRow>
                <WorkOrderBadge>{wkData.NoWkOrd}</WorkOrderBadge>
                <WorkStatusPlay>
                  <FiPlayCircle size={20} /> {wkData.NmWrkState}
                </WorkStatusPlay>
              </WorkInfoTopRow>

              <ItemNameText>{wkData.ItemName}</ItemNameText>

              <WorkGrid>
                <WorkDetailItem>
                  <WorkLabel><FiUser size={16}/> 작업자</WorkLabel>
                  <WorkValue>{wkData.NmEmplo}</WorkValue>
                </WorkDetailItem>
                <WorkDetailItem>
                  <WorkLabel><FiAlertCircle size={16}/> 공정명</WorkLabel>
                  <WorkValue>{wkData.NmProce}</WorkValue>
                </WorkDetailItem>
                <WorkDetailItem>
                  <WorkLabel><FiClock size={16}/> 계획 시작</WorkLabel>
                  <WorkValue>{wkData.PlnSTime}</WorkValue>
                </WorkDetailItem>
                <WorkDetailItem>
                  <WorkLabel><FiClock size={16}/> 계획 종료</WorkLabel>
                  <WorkValue>{wkData.PlnETime}</WorkValue>
                </WorkDetailItem>
              </WorkGrid>

              <ProgressContainer>
                <ProgressLabelRow>
                  <span>생산 진행률</span>
                  <span style={{color: theme.primary}}>{wkData.ProdQty} / {wkData.OrdQty} EA</span>
                </ProgressLabelRow>
                <ProgressBarBg>
                  <ProgressBarFill $percent={progressPercent} />
                </ProgressBarBg>
              </ProgressContainer>
            </WorkInfoCard>

            <NoticeBanner>
              <FiAlertCircle size={20} style={{flexShrink: 0}} />
              적재 한계: 자재 1분 이상 미도착 / 작업자 5명 이상 대기 시 자동 경보
            </NoticeBanner>

            <SectionHeader>
              <SectionTitle>대차 슬롯 상세</SectionTitle>
              <ViewAllBtn onClick={() => setIsModalOpen(true)}>
                전체보기
              </ViewAllBtn>
            </SectionHeader>

            <ListScrollArea>
              {allSlots.map((item, idx) => (
                <SlotItem key={`list-${idx}`} $occupied={item.occupied}>
                  <ItemLeft>
                    <IconCircle $occupied={item.occupied}>
                      {item.occupied ? <FiCheck /> : <FiMinus />}
                    </IconCircle>
                    <ItemInfo>
                      <ItemTitle $occupied={item.occupied}>
                        공정 #{item.camId} - {getSlotDisplayName(item)}
                      </ItemTitle>
                      <ItemSub>
                        <FiClock size={14} />
                        입고: {formatEntryTime(item.entry_time)}
                      </ItemSub>
                    </ItemInfo>
                  </ItemLeft>
                  <StatusTextRow $occupied={item.occupied}>
                    <StatusDot $occupied={item.occupied} />
                    {item.occupied ? '작업중' : '빈슬롯'}
                  </StatusTextRow>
                </SlotItem>
              ))}
            </ListScrollArea>
          </MiddleColumn>

          {/* 3. RIGHT: AI Chat */}
          <ChatContainer>
            <ChatHeader>
              <AiAvatar>
                <FaRobot />
              </AiAvatar>
              <AiTitleInfo>
                <AiTitle>AI 관제 어시스턴트</AiTitle>
                <AiSub>
                  <StatusDot $occupied={true} /> 실시간 공정 모니터링 중
                </AiSub>
              </AiTitleInfo>
            </ChatHeader>

            <ChatBody>
              {messages.map((m) => (
                <MessageRow key={m.id} $isUser={m.user}>
                  <Bubble $isUser={m.user} style={{ whiteSpace: 'pre-wrap' }}>
                    {m.text}
                  </Bubble>
                  <TimeText>{m.time}</TimeText>
                </MessageRow>
              ))}
              <div ref={chatEndRef} />
            </ChatBody>

            <InputArea onSubmit={handleSend}>
              <InputWrapper>
                <Input
                  placeholder="지시사항 입력..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <SendBtn type="submit">
                  <FiArrowUp />
                </SendBtn>
              </InputWrapper>
            </InputArea>
          </ChatContainer>

        </MainGrid>
      </DashboardContainer>

      {/* 모달 렌더링 영역 */}
      {isModalOpen && (
        <ModalBackdrop onClick={() => setIsModalOpen(false)}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>대차 슬롯 전체 상세</ModalTitle>
              <CloseBtn onClick={() => setIsModalOpen(false)}>
                <FiX size={20} />
              </CloseBtn>
            </ModalHeader>
            <ModalBody>
              {allSlots.map((item, idx) => (
                <SlotItem key={`modal-list-${idx}`} $occupied={item.occupied}>
                  <ItemLeft>
                    <IconCircle $occupied={item.occupied}>
                      {item.occupied ? <FiCheck /> : <FiMinus />}
                    </IconCircle>
                    <ItemInfo>
                      <ItemTitle $occupied={item.occupied}>
                        공정 #{item.camId} - {getSlotDisplayName(item)}
                      </ItemTitle>
                      <ItemSub>
                        <FiClock size={14} />
                        입고: {formatEntryTime(item.entry_time)}
                      </ItemSub>
                    </ItemInfo>
                  </ItemLeft>
                  <StatusTextRow $occupied={item.occupied}>
                    <StatusDot $occupied={item.occupied} />
                    {item.occupied ? '작업중' : '빈슬롯'}
                  </StatusTextRow>
                </SlotItem>
              ))}
            </ModalBody>
          </ModalContainer>
        </ModalBackdrop>
      )}

      {isAutoOrderModalOpen && (
        <AutoOrderBackdrop onClick={() => setIsAutoOrderModalOpen(false)}>
          <AutoOrderBox
            role="dialog"
            aria-modal="true"
            aria-labelledby="auto-order-alert-title"
            onClick={(e) => e.stopPropagation()}
          >
            <AutoOrderHeader>
              <AutoOrderIconBadge>
                <FiPackage size={25} strokeWidth={2.4} />
              </AutoOrderIconBadge>
              <AutoOrderTitleGroup>
                <AutoOrderEyebrow>사전 재고 부족 감지</AutoOrderEyebrow>
                <AutoOrderTitle id="auto-order-alert-title">자동 발주 알림</AutoOrderTitle>
                <AutoOrderDescription>
                  현재 재고와 생산 흐름을 기준으로 발주 여부를 확인합니다.
                </AutoOrderDescription>
              </AutoOrderTitleGroup>
            </AutoOrderHeader>

            <AutoOrderBody>
              <AutoOrderMessage>
                <strong>MCR66488275 재고가 부족할 것 같습니다.</strong>
                <span>발주를 넣으시겠습니까?</span>
              </AutoOrderMessage>
              <AutoOrderQuantity>
                <AutoOrderQuantityLabel>요청 수량</AutoOrderQuantityLabel>
                <AutoOrderQuantityValue>
                  20 <span>/ 530</span>
                </AutoOrderQuantityValue>
              </AutoOrderQuantity>
            </AutoOrderBody>

            <AutoOrderButtonRow>
              <AutoOrderButton $variant="primary" type="button" onClick={() => setIsAutoOrderModalOpen(false)}>
                예, 발주 진행
              </AutoOrderButton>
              <AutoOrderButton $variant="secondary" type="button" onClick={() => setIsAutoOrderModalOpen(false)}>
                아니오
              </AutoOrderButton>
            </AutoOrderButtonRow>
          </AutoOrderBox>
        </AutoOrderBackdrop>
      )}
    </>
  );
};

export default SmartFactoryDashboard;