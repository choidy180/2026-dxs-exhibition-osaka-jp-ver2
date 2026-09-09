'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { getDxApiUrl, resolveDxResourceUrl } from '@/utils/dx-api';
import { 
  Monitor, Clock, CheckCircle2, XCircle, 
  ZoomIn, Volume2, VolumeX, Siren, X,
  ClipboardX, Home, Calendar, FileText, 
  ChevronDown, ChevronLeft, ChevronRight,
  Info
} from 'lucide-react';
import styled, { createGlobalStyle } from 'styled-components';

// ─── [CONFIG] 설정 및 테마 ───
type ScreenMode = 'FHD' | 'QHD';
type InspectionTone = 'ok' | 'ng' | 'wait';
type InspectionViewType = 'guide' | 'split' | 'rightStack';
type SummaryFilter = 'ng' | 'ok' | 'all';
type CornerKey = 'tl' | 'tr' | 'bl' | 'br';

interface ApiData {
  TIMEVALUE: string;
  TIMEVALUE2: string;
  FILENAME1: string;
  FILENAME2: string;
  FILENAME3: string;
  FILENAME4: string;
  FILEPATH1: string;
  FILEPATH2: string;
  FILEPATH3: string;
  FILEPATH4: string;
  CDGITEM: string;
  WO: string;
  COUNT_NUM: string;
  RESULT: string;
  LABEL001: string;
  LABEL002: string;
  LABEL003: string;
  LABEL004: string;
}

interface TotalData {
  total_count: number;
  normal_count: number;
}

interface ConnectorLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CornerItem {
  key: CornerKey;
  code: string;
  title: string;
  camera: string;
  status: string;
  imgUrl: string;
  anchor: {
    left: string;
    top: string;
  };
  description: string;
}

const CORNER_KEYS: CornerKey[] = ['tl', 'tr', 'bl', 'br'];

type CornerAnchor = {
  left: number;
  top: number;
};

const CORNER_ANCHORS_STORAGE_KEY = 'glassGapInspection.cornerAnchors.v1';

const DEFAULT_CORNER_ANCHORS: Record<CornerKey, CornerAnchor> = {
  tl: { left: 8, top: 10 },
  tr: { left: 92, top: 10 },
  bl: { left: 8, top: 90 },
  br: { left: 92, top: 90 },
};

const clampPercent = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getInitialCornerAnchors = (): Record<CornerKey, CornerAnchor> => {
  if (typeof window === 'undefined') return { ...DEFAULT_CORNER_ANCHORS };

  try {
    const savedValue = window.localStorage.getItem(CORNER_ANCHORS_STORAGE_KEY);
    if (!savedValue) return { ...DEFAULT_CORNER_ANCHORS };

    const parsed = JSON.parse(savedValue) as Partial<Record<CornerKey, Partial<CornerAnchor>>>;

    return CORNER_KEYS.reduce((acc, key) => {
      const savedAnchor = parsed[key];
      const defaultAnchor = DEFAULT_CORNER_ANCHORS[key];

      acc[key] = {
        left: clampPercent(Number(savedAnchor?.left ?? defaultAnchor.left), 4, 96),
        top: clampPercent(Number(savedAnchor?.top ?? defaultAnchor.top), 5, 95),
      };

      return acc;
    }, {} as Record<CornerKey, CornerAnchor>);
  } catch {
    return { ...DEFAULT_CORNER_ANCHORS };
  }
};

const LAYOUT_CONFIGS = {
  FHD: {
    padding: '20px',
    gap: '16px',
    headerHeight: '96px',
    fontSize: { title: '20px', sub: '14px', badge: '13px', metaLabel: '12px', metaValue: '15px' },
    iconSize: 20,
    cornerPanelWidth: 'clamp(204px, 12vw, 260px)',
  },
  QHD: {
    padding: '30px',
    gap: '20px',
    headerHeight: '112px',
    fontSize: { title: '28px', sub: '18px', badge: '16px', metaLabel: '14px', metaValue: '18px' },
    iconSize: 28,
    cornerPanelWidth: 'clamp(260px, 11vw, 340px)',
  }
};

const theme = {
  bg: '#F7F8FA',
  cardBg: 'rgba(255, 255, 255, 0.92)',
  surface: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#667085',
  textMuted: '#98A2B3',
  accent: '#E11D2E',
  accentSoft: '#FFF1F2',
  accentMuted: '#FFE4E8',
  success: '#12B76A',
  danger: '#E11D2E',
  border: 'rgba(17, 24, 39, 0.08)',
  hairline: 'rgba(17, 24, 39, 0.12)',
  shadow: '0 24px 80px rgba(15, 23, 42, 0.08)',
  shadowStrong: '0 34px 100px rgba(15, 23, 42, 0.14)',
  status: {
    ok: { bg: '#ECFDF3', text: '#027A48', border: '#12B76A' },
    ng: { bg: '#FFF1F2', text: '#B42318', border: '#E11D2E' },
    wait: { bg: '#F8FAFC', text: '#98A2B3', border: '#D0D5DD' }
  }
};

const getInspectionTone = (status?: string): InspectionTone => {
  const normalized = (status || '').trim();
  if (!normalized || normalized === '-' || normalized === '대기') return 'wait';
  if (normalized === '정상' || normalized.toUpperCase() === 'OK') return 'ok';
  return 'ng';
};

const getToneColor = (tone: InspectionTone) => {
  if (tone === 'ok') return theme.status.ok.border;
  if (tone === 'ng') return theme.status.ng.border;
  return theme.status.wait.border;
};

const getToneBg = (tone: InspectionTone) => {
  if (tone === 'ok') return theme.status.ok.bg;
  if (tone === 'ng') return theme.status.ng.bg;
  return theme.status.wait.bg;
};

const formatStatusLabel = (status?: string) => {
  const normalized = (status || '').trim();
  return normalized && normalized !== '-' ? normalized : '대기';
};

const subscribeToOrigin = () => () => undefined;

const normalizeImageUrlText = (url?: string | null) => {
  const imageUrl = (url ?? '').trim().replace(/^['"]|['"]$/g, '');
  if (!imageUrl) return '';

  return imageUrl.replace(/\\/g, '/');
};

const getImageUrlByCurrentPage = (url?: string | null) => resolveDxResourceUrl(normalizeImageUrlText(url));

const getImageUrlWithVersion = (url?: string | null, version?: string | number | null) => {
  const normalizedUrl = getImageUrlByCurrentPage(url);
  const versionText = String(version ?? '').trim();

  if (!normalizedUrl || !versionText || normalizedUrl.startsWith('data:') || normalizedUrl.startsWith('blob:')) {
    return normalizedUrl;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    parsedUrl.searchParams.set('_v', versionText);
    return parsedUrl.href;
  } catch {
    const separator = normalizedUrl.includes('?') ? '&' : '?';
    return `${normalizedUrl}${separator}_v=${encodeURIComponent(versionText)}`;
  }
};

const toCssUrl = (url?: string) => {
  if (!url) return '';
  return `url("${url.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
};

// ─── [GLOBAL STYLES] ───
const GlobalStyles = createGlobalStyle`
  @keyframes pulse-green-soft {
    0% { box-shadow: 0 0 0 0 rgba(18, 183, 106, 0.18); }
    70% { box-shadow: 0 0 0 10px rgba(18, 183, 106, 0); }
    100% { box-shadow: 0 0 0 0 rgba(18, 183, 106, 0); }
  }
  
  @keyframes pulse-red-soft {
    0% { box-shadow: 0 0 0 0 rgba(225, 29, 46, 0.24); }
    70% { box-shadow: 0 0 0 12px rgba(225, 29, 46, 0); }
    100% { box-shadow: 0 0 0 0 rgba(225, 29, 46, 0); }
  }
  
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }
  
  @keyframes slideDownFade {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes connector-flow {
    to { stroke-dashoffset: -32; }
  }
  
  .animate-ok { animation: pulse-green-soft 2s infinite; }
  .animate-ng { animation: pulse-red-soft 2s infinite; }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .connector-flow { animation: connector-flow 1.8s linear infinite; }
  
  .custom-scrollbar::-webkit-scrollbar { width: 8px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #F8FAFC; border-radius: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #D0D5DD; border-radius: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #98A2B3; }
  
  body {
    margin: 0;
    padding: 0;
    background-color: ${theme.bg};
    overflow: hidden;
    color: ${theme.textPrimary};
  }
  
  * { box-sizing: border-box; }
  strong, b { font-weight: 700; }
`;

// ─── [STYLED COMPONENTS] ───
const Container = styled.div`
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  background: ${theme.bg};
`;

const HeaderRow = styled.div`
  display: grid;
  grid-template-columns: clamp(276px, 17vw, 360px) minmax(0, 1fr);
  flex-shrink: 0;
`;

const HeaderInfoArea = styled.div`
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(420px, 1fr) clamp(178px, 12vw, 236px) clamp(82px, 5vw, 104px) clamp(164px, 9.5vw, 210px);
  gap: clamp(8px, 0.55vw, 12px);
  align-items: stretch;
  justify-content: stretch;
`;

const ResultCard = styled.div<{ $status: 'ok' | 'ng' | 'wait' }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 0 18px;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid ${({ $status }) => $status === 'ok' ? 'rgba(18, 183, 106, 0.28)' : $status === 'ng' ? 'rgba(225, 29, 46, 0.34)' : theme.border};
  background: #FFFFFF;
  box-shadow: ${theme.shadow};

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 18px;
    bottom: 18px;
    width: 5px;
    border-radius: 3px;
    background: ${({ $status }) => $status === 'ok' ? theme.success : $status === 'ng' ? theme.danger : theme.status.wait.border};
  }
`;

const ResultIconBox = styled.div<{ $status: 'ok' | 'ng' | 'wait' }>`
  width: clamp(48px, 2.7vw, 58px);
  height: clamp(48px, 2.7vw, 58px);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $status }) => $status === 'ok' ? theme.status.ok.bg : $status === 'ng' ? theme.status.ng.bg : theme.status.wait.bg};
  color: ${({ $status }) => $status === 'ok' ? theme.status.ok.border : $status === 'ng' ? theme.status.ng.border : theme.status.wait.border};
  border: 1px solid ${({ $status }) => $status === 'ok' ? 'rgba(18, 183, 106, 0.18)' : $status === 'ng' ? 'rgba(225, 29, 46, 0.20)' : theme.border};
`;

const ResultTextBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const ResultLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${theme.textSecondary};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ResultValue = styled.span<{ $status: 'ok' | 'ng' | 'wait' }>`
  font-size: clamp(22px, 2vw, 30px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.05em;
  color: ${({ $status }) => $status === 'ok' ? theme.status.ok.text : $status === 'ng' ? theme.status.ng.text : theme.status.wait.text};
`;

const SoundToggleBtn = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${theme.border};
  background: rgba(255,255,255,0.72);
  color: ${theme.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(225, 29, 46, 0.28);
    background: ${theme.accentSoft};
    color: ${theme.accent};
  }
`;

const InfoTableCard = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid ${theme.border};
  background: #FFFFFF;
  box-shadow: ${theme.shadow};
`;

const InfoTableHeader = styled.div`
  display: flex;
  width: 100%;
  height: 34%;
  background: #F8FAFC;
  border-bottom: 1px solid ${theme.border};
`;

const InfoTableBody = styled.div`
  display: flex;
  width: 100%;
  height: 66%;
`;

const Th = styled.div<{ $isLast?: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: ${theme.textSecondary};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-right: ${({ $isLast }) => $isLast ? 'none' : `1px solid ${theme.border}`};
`;

const Td = styled.div<{ $isLast?: boolean }>`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: ${({ $isLast }) => $isLast ? 'none' : `1px solid ${theme.border}`};
`;

const TdValueText = styled.span<{ $color?: string }>`
  max-width: 100%;
  font-size: clamp(16px, 1.15vw, 20px);
  font-weight: 700;
  letter-spacing: -0.04em;
  color: ${({ $color }) => $color || theme.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const InspectionWorkspace = styled.div<{ $panelWidth: string }>`
  flex: 1;
  min-height: 0;
  height: 100%;
  position: relative;
  isolation: isolate;
  display: grid;
  align-items: stretch;
  grid-template-columns: minmax(0, 1fr);
`;

const MainInspectionPanel = styled.section`
  position: relative;
  z-index: 10;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid ${theme.border};
  background: #FFFFFF;
  box-shadow: ${theme.shadowStrong};
`;

const MainPanelHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: clamp(10px, 0.7vw, 14px) 20px;
  border-bottom: 1px solid ${theme.border};
  background: #FFFFFF;
`;

const MainPanelEyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${theme.accent};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
`;

const LiveBadge = styled.div<{ $isDefect: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid ${({ $isDefect }) => $isDefect ? 'rgba(225, 29, 46, 0.26)' : 'rgba(18, 183, 106, 0.24)'};
  background: ${({ $isDefect }) => $isDefect ? theme.status.ng.bg : theme.status.ok.bg};
  color: ${({ $isDefect }) => $isDefect ? theme.status.ng.text : theme.status.ok.text};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const LiveDot = styled.span<{ $isDefect: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $isDefect }) => $isDefect ? theme.danger : theme.success};
  box-shadow: 0 0 0 5px ${({ $isDefect }) => $isDefect ? 'rgba(225, 29, 46, 0.12)' : 'rgba(18, 183, 106, 0.12)'};
`;

const MainImageStage = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  margin: clamp(6px, 0.55vw, 10px);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.07);
  background: #FFFFFF;

  &::after {
    content: '';
    position: absolute;
    inset: 12px;
    border: 1px solid rgba(225, 29, 46, 0.12);
    border-radius: 10px;
    pointer-events: none;
  }
`;

const GuideImage = styled.img`
  position: relative;
  z-index: 2;
  max-width: 99%;
  max-height: 97%;
  object-fit: contain;
  filter: drop-shadow(0 32px 48px rgba(15, 23, 42, 0.16));
  user-select: none;
`;

const StageSplitGrid = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(220px, 0.28fr) minmax(0, 1fr) minmax(220px, 0.28fr);
  gap: clamp(10px, 0.8vw, 16px);
  padding: clamp(10px, 0.8vw, 16px);

  @media (max-width: 1800px) {
    grid-template-columns: minmax(190px, 0.26fr) minmax(0, 1fr) minmax(190px, 0.26fr);
  }
`;

const StageRightStackGrid = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(680px, 36vw, 840px);
  gap: clamp(12px, 0.9vw, 18px);
  padding: clamp(10px, 0.8vw, 16px);

  @media (min-width: 2200px) {
    grid-template-columns: minmax(0, 1fr) clamp(840px, 34vw, 1040px);
  }

  @media (max-width: 1800px) {
    grid-template-columns: minmax(0, 1fr) clamp(600px, 36vw, 740px);
  }
`;

const CameraStackGrid = styled.div`
  align-self: center;
  justify-self: stretch;
  width: 100%;
  max-height: 100%;
  aspect-ratio: 16 / 9;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: clamp(10px, 0.8vw, 14px);
`;

const BoxConnectorSvg = styled.svg`
  position: absolute;
  inset: 0;
  z-index: 80;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
`;

const CenterGuideViewport = styled.div<{ $solo?: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: ${({ $solo }) => $solo ? '16px' : '14px'};
  border: ${({ $solo }) => $solo ? 'none' : `1px solid ${theme.border}`};
  background: #FFFFFF;
`;

const CameraRail = styled.div`
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: clamp(10px, 0.8vw, 14px);
`;

const CameraTile = styled.button<{
  $tone: InspectionTone;
  $active: boolean;
  $imgUrl: string;
  $fallbackImgUrl: string;
  $imgSize: string;
  $fallbackImgSize: string;
  $imgPosition: string;
  $fallbackImgPosition: string;
}>`
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid ${({ $tone, $active }) => $active ? getToneColor($tone) : $tone === 'wait' ? theme.border : `${getToneColor($tone)}45`};
  background-color: #F2F4F7;
  background-image: ${({ $imgUrl, $fallbackImgUrl }) => {
    const layers = [$imgUrl, $fallbackImgUrl]
      .filter((url): url is string => Boolean(url))
      .map((url) => toCssUrl(url));
    return layers.length > 0 ? layers.join(', ') : 'none';
  }};
  background-size: ${({ $imgUrl, $fallbackImgUrl, $imgSize, $fallbackImgSize }) => {
    const layers: string[] = [];
    if ($imgUrl) layers.push($imgSize);
    if ($fallbackImgUrl) layers.push($fallbackImgSize);
    return layers.length > 0 ? layers.join(', ') : 'cover';
  }};
  background-position: ${({ $imgUrl, $fallbackImgUrl, $imgPosition, $fallbackImgPosition }) => {
    const layers: string[] = [];
    if ($imgUrl) layers.push($imgPosition);
    if ($fallbackImgUrl) layers.push($fallbackImgPosition);
    return layers.length > 0 ? layers.join(', ') : 'center';
  }};
  background-repeat: no-repeat;
  box-shadow: ${({ $active }) => $active ? '0 24px 56px rgba(15, 23, 42, 0.16)' : '0 14px 36px rgba(15, 23, 42, 0.08)'};
  cursor: pointer;
  outline: none;
  padding: 0;
  text-align: left;
  transform: ${({ $active }) => $active ? 'translateY(-2px)' : 'translateY(0)'};
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: ${({ $tone }) => getToneColor($tone)};
    box-shadow: 0 24px 58px rgba(15, 23, 42, 0.15);
  }
`;

const CameraTilePreloader = styled.img`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`;

const CameraTileHeader = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  z-index: 2;
`;

const CameraTileCode = styled.span<{ $tone: InspectionTone }>`
  min-width: 36px;
  height: 30px;
  padding: 0 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid ${({ $tone }) => `${getToneColor($tone)}35`};
  color: ${({ $tone }) => getToneColor($tone)};
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10);
`;

const CameraTileStatus = styled.span<{ $tone: InspectionTone }>`
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid ${({ $tone }) => `${getToneColor($tone)}30`};
  color: ${({ $tone }) => $tone === 'ok' ? theme.status.ok.text : $tone === 'ng' ? theme.status.ng.text : theme.status.wait.text};
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10);
`;

const CameraTileFooter = styled.div`
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const CameraTileName = styled.span`
  min-width: 0;
  height: 32px;
  padding: 0 12px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.94);
  color: ${theme.textPrimary};
  border: 1px solid rgba(17, 24, 39, 0.08);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CameraTileZoom = styled.span`
  position: relative;
  z-index: 4;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.96);
  color: ${theme.accent};
  border: 1px solid rgba(225, 29, 46, 0.24);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;

  &:hover {
    transform: translateY(-1px) scale(1.04);
    background: #FFF1F2;
    border-color: rgba(225, 29, 46, 0.42);
  }
`;

const CornerHotspot = styled.button<{ $tone: InspectionTone; $isActive: boolean }>`
  position: absolute;
  z-index: 30;
  transform: translate(-50%, -50%);
  width: clamp(44px, 3.4vw, 58px);
  height: clamp(44px, 3.4vw, 58px);
  border-radius: 12px;
  border: 1px solid ${({ $tone }) => getToneColor($tone)};
  background: rgba(255, 255, 255, 0.92);
  color: ${({ $tone }) => getToneColor($tone)};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  cursor: grab;
  touch-action: none;
  user-select: none;
  box-shadow: ${({ $isActive, $tone }) => $isActive
    ? `0 16px 36px ${getToneColor($tone)}2B, 0 0 0 7px ${getToneBg($tone)}`
    : '0 14px 30px rgba(15, 23, 42, 0.10)'};
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  &::before,
  &::after {
    content: '';
    position: absolute;
    inset: 8px;
    border-radius: 12px;
    border: 1px solid ${({ $tone }) => getToneColor($tone)};
    opacity: 0.36;
  }

  &:hover {
    transform: translate(-50%, -50%) scale(1.08);
    background: #FFFFFF;
  }

  &:active {
    cursor: grabbing;
  }
`;

const MainPanelFooter = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px clamp(8px, 0.65vw, 12px) 20px;
  color: ${theme.textSecondary};
  font-size: 12px;
  font-weight: 700;
`;

const LegendGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`;

const LegendDot = styled.span<{ $tone: InspectionTone }>`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ $tone }) => getToneColor($tone)};
`;

const CornerInspectorPanel = styled.aside`
  position: relative;
  z-index: 20;
  height: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
  gap: clamp(10px, 1vh, 14px);
`;

const PanelHeadingCard = styled.div`
  flex-shrink: 0;
  border-radius: 12px;
  border: 1px solid ${theme.border};
  background: #FFFFFF;
  box-shadow: ${theme.shadow};
  padding: clamp(10px, 0.75vw, 14px);
`;


const HeaderSummaryCard = styled.div`
  min-width: 0;
  height: 100%;
  border-radius: 12px;
  border: 1px solid ${theme.border};
  background: #FFFFFF;
  box-shadow: ${theme.shadow};
  padding: 7px;
  display: flex;
  align-items: stretch;
`;

const PanelStats = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
`;

const PanelStatChip = styled.button<{ $tone?: InspectionTone; $active?: boolean }>`
  min-width: 0;
  height: 100%;
  padding: 0 6px;
  border-radius: 12px;
  border: 1px solid ${({ $tone, $active }) => $active
    ? ($tone ? getToneColor($tone) : theme.textPrimary)
    : ($tone ? `${getToneColor($tone)}33` : theme.border)};
  background: ${({ $tone }) => $tone ? getToneBg($tone) : '#FFFFFF'};
  color: ${({ $tone }) => $tone ? getToneColor($tone) : theme.textPrimary};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.02em;
  cursor: pointer;
  box-shadow: ${({ $active, $tone }) => $active ? `0 0 0 4px ${$tone ? getToneBg($tone) : '#F2F4F7'}` : 'none'};
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ $tone }) => $tone ? getToneColor($tone) : theme.textPrimary};
  }
`;

const StatLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
`;

const StatCount = styled.span`
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.04em;
`;

const CompactTypeButton = styled.button`
  min-width: 0;
  height: 100%;
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.10);
  background: #FFFFFF;
  color: ${theme.textPrimary};
  box-shadow: ${theme.shadow};
  padding: 0 9px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease;

  svg {
    color: ${theme.textSecondary};
  }

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(225, 29, 46, 0.26);
    color: ${theme.accent};
    box-shadow: 0 22px 54px rgba(15, 23, 42, 0.13), 0 0 0 5px rgba(225, 29, 46, 0.05);
  }
`;

const CompactTypeValue = styled.span`
  max-width: 100%;
  color: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TypeSelectorButton = styled.button`
  flex-shrink: 0;
  width: 100%;
  min-height: 124px;
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.10);
  background: #FFFFFF;
  color: ${theme.textPrimary};
  box-shadow: ${theme.shadow};
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(225, 29, 46, 0.30);
    box-shadow: 0 24px 58px rgba(15, 23, 42, 0.14), 0 0 0 5px rgba(225, 29, 46, 0.05);
  }
`;

const TypeButtonTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const TypeButtonLabel = styled.span`
  color: ${theme.accent};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const TypeButtonValue = styled.div`
  color: ${theme.textPrimary};
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.04em;
  text-align: left;
`;

const MiniLayoutPreview = styled.div<{ $variant: InspectionViewType }>`
  height: 54px;
  display: grid;
  grid-template-columns: ${({ $variant }) => $variant === 'split' ? '0.56fr 1fr 0.56fr' : $variant === 'rightStack' ? '1fr 0.72fr' : '1fr'};
  gap: 6px;
`;

const MiniPreviewColumn = styled.div`
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 4px;
`;

const MiniPreviewBlock = styled.div<{ $accent?: boolean }>`
  min-width: 0;
  min-height: 0;
  border-radius: 8px;
  border: 1px solid ${({ $accent }) => $accent ? 'rgba(225, 29, 46, 0.28)' : theme.border};
  background: ${({ $accent }) => $accent ? theme.accentSoft : '#F8FAFC'};
`;


const MiniPreviewStack = styled.div`
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 4px;
`;

const TypeModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgba(248, 250, 252, 0.76);
  backdrop-filter: blur(12px);
`;

const TypeModalShell = styled.div`
  width: min(1120px, 92vw);
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.10);
  background: #FFFFFF;
  box-shadow: ${theme.shadowStrong};
  padding: clamp(22px, 1.8vw, 30px);
`;

const TypeModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
`;

const TypeModalTitle = styled.div`
  color: ${theme.textPrimary};
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.05em;
`;

const TypeModalDescription = styled.p`
  margin: 6px 0 0 0;
  color: ${theme.textSecondary};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
`;

const TypeModalClose = styled.button`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 1px solid ${theme.border};
  background: #FFFFFF;
  color: ${theme.textSecondary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease;

  &:hover {
    color: ${theme.accent};
    border-color: rgba(225, 29, 46, 0.25);
    background: ${theme.accentSoft};
  }
`;

const TypeOptionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const TypeOptionCard = styled.button<{ $active: boolean }>`
  position: relative;
  min-width: 0;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => $active ? theme.accent : theme.border};
  background: #FFFFFF;
  padding: 16px;
  cursor: pointer;
  text-align: left;
  box-shadow: ${({ $active }) => $active ? '0 24px 58px rgba(225, 29, 46, 0.12)' : '0 16px 38px rgba(15, 23, 42, 0.07)'};
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: ${theme.accent};
    box-shadow: 0 24px 58px rgba(15, 23, 42, 0.14);
  }
`;

const TypeOptionPreview = styled.div<{ $variant: InspectionViewType }>`
  height: 190px;
  border-radius: 10px;
  border: 1px solid ${theme.border};
  background: #F8FAFC;
  padding: 12px;
  display: grid;
  grid-template-columns: ${({ $variant }) => $variant === 'split' ? '0.55fr 1fr 0.55fr' : $variant === 'rightStack' ? '1fr 0.72fr' : '1fr'};
  gap: 10px;
  margin-bottom: 14px;
`;

const TypeOptionPreviewRail = styled.div`
  display: grid;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;


const TypeOptionPreviewStack = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

const TypeOptionPreviewBlock = styled.div<{ $main?: boolean; $accent?: boolean }>`
  min-width: 0;
  min-height: 0;
  border-radius: ${({ $main }) => $main ? '12px' : '10px'};
  border: 1px solid ${({ $accent }) => $accent ? 'rgba(225, 29, 46, 0.32)' : theme.border};
  background: ${({ $main, $accent }) => $main ? '#FFFFFF' : $accent ? theme.accentSoft : '#FFFFFF'};
  box-shadow: ${({ $main }) => $main ? '0 12px 28px rgba(15, 23, 42, 0.08)' : 'none'};
`;

const TypeOptionName = styled.div`
  color: ${theme.textPrimary};
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.04em;
`;

const TypeOptionText = styled.p`
  margin: 6px 0 0 0;
  color: ${theme.textSecondary};
  font-size: 13px;
  font-weight: 700;
  line-height: 1.42;
  word-break: keep-all;
`;

const NoImageText = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.textMuted};
  font-size: 13px;
  font-weight: 700;
`;

const FloatingHistoryButton = styled.button`
  flex-shrink: 0;
  align-self: stretch;
  min-width: clamp(164px, 9.5vw, 210px);
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.10);
  background: rgba(255, 255, 255, 0.94);
  color: ${theme.textPrimary};
  box-shadow: ${theme.shadow};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease, background 0.2s ease;

  svg {
    color: ${theme.accent};
  }

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(225, 29, 46, 0.28);
    background: #FFFFFF;
    color: ${theme.accent};
    box-shadow: 0 22px 56px rgba(15, 23, 42, 0.14), 0 0 0 5px rgba(225, 29, 46, 0.06);
  }
`;

const EmptyStateBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90000;
  background-color: rgba(248, 250, 252, 0.68);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyStateCard = styled.div`
  background-color: ${theme.surface};
  padding: 48px;
  border-radius: 12px;
  box-shadow: ${theme.shadowStrong};
  border: 1px solid ${theme.border};
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 460px;
  position: relative;
`;

const CloseIconButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${theme.textSecondary};
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: ${theme.accentSoft};
    color: ${theme.accent};
  }
`;

const ImageZoomBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
  background: ${theme.bg};
`;

const ImageZoomPanel = styled.div`
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: ${theme.bg};
  box-shadow: none;
`;

const ImageZoomHeader = styled.div`
  flex-shrink: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 18px 0 22px;
  border-bottom: 1px solid ${theme.border};
  background: #FFFFFF;
`;

const ImageZoomTitleGroup = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ImageZoomIconBadge = styled.div`
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 0;
  border: 1px solid rgba(225, 29, 46, 0.18);
  background: ${theme.accentSoft};
  color: ${theme.accent};
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const ImageZoomTitle = styled.div`
  min-width: 0;
  overflow: hidden;
  color: ${theme.textPrimary};
  font-size: clamp(18px, 1.25vw, 23px);
  font-weight: 700;
  letter-spacing: -0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ImageZoomSubText = styled.div`
  margin-top: 3px;
  color: ${theme.textSecondary};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.02em;
`;

const ImageZoomCloseButton = styled.button`
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border: 1px solid ${theme.border};
  border-radius: 0;
  background: #FFFFFF;
  color: ${theme.textSecondary};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: ${theme.accentSoft};
    border-color: rgba(225, 29, 46, 0.24);
    color: ${theme.accent};
  }
`;

const ImageZoomFrame = styled.div`
  flex: 1;
  min-height: 0;
  padding: 18px;
  background: ${theme.bg};
  display: flex;
  align-items: stretch;
  justify-content: stretch;
`;

const ImageZoomImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 1px solid ${theme.border};
  border-radius: 0;
  background: #FFFFFF;
  object-fit: contain;
`;

const ImageZoomEmptyState = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 1px solid ${theme.border};
  border-radius: 0;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
`;

const ImageZoomEmptyIcon = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 0;
  border: 1px solid rgba(225, 29, 46, 0.18);
  background: ${theme.accentSoft};
  color: ${theme.accent};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
`;

const ImageZoomEmptyTitle = styled.div`
  color: ${theme.textPrimary};
  font-size: clamp(22px, 1.65vw, 30px);
  font-weight: 700;
  letter-spacing: -0.05em;
`;

const ImageZoomEmptyText = styled.p`
  margin: 10px 0 0 0;
  color: ${theme.textSecondary};
  font-size: 15px;
  font-weight: 700;
  line-height: 1.55;
  word-break: keep-all;
`;

// ─── [UI COMPONENTS] ───

const CustomDatePicker = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const formattedDate = useMemo(() => {
    if (!value) return "날짜를 선택하세요";
    const dateObj = new Date(value);
    return dateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }, [value]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', 
          alignItems: 'center', 
          padding: '14px 16px', 
          gap: '12px',
          background: '#FFFFFF', 
          border: `1.5px solid ${isOpen ? theme.accent : '#E2E8F0'}`,
          borderRadius: '10px', 
          cursor: 'pointer', 
          transition: 'all 0.2s',
          boxShadow: isOpen ? '0 4px 12px rgba(225, 29, 46, 0.10)' : '0 2px 4px rgba(0,0,0,0.02)'
        }}
      >
        <Calendar size={20} color={theme.accent} />
        <span style={{ 
          flex: 1, 
          fontSize: '15px', 
          fontWeight: 700, 
          color: '#1E293B', 
          letterSpacing: '-0.3px' 
        }}>
          {formattedDate}
        </span>
        <ChevronDown 
          size={18} 
          color={theme.textSecondary} 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
            transition: 'transform 0.2s' 
          }} 
        />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', 
          top: 'calc(100% + 8px)', 
          left: 0, 
          width: '100%',
          background: '#FFFFFF', 
          borderRadius: '10px', 
          border: `1px solid ${theme.border}`,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          zIndex: 100, 
          padding: '16px', 
          animation: 'slideDownFade 0.2s ease-out'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <button 
              onClick={handlePrevMonth} 
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '4px', 
                borderRadius: '8px', 
                display: 'flex' 
              }} 
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'} 
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ChevronLeft size={20} color={theme.textPrimary} />
            </button>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: 700, 
              color: theme.textPrimary 
            }}>
              {viewYear}년 {viewMonth + 1}월
            </span>
            <button 
              onClick={handleNextMonth} 
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '4px', 
                borderRadius: '8px', 
                display: 'flex' 
              }} 
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'} 
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ChevronRight size={20} color={theme.textPrimary} />
            </button>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '4px', 
            marginBottom: '8px' 
          }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div 
                key={day} 
                style={{ 
                  textAlign: 'center', 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  color: idx === 0 ? theme.danger : (idx === 6 ? theme.accent : theme.textSecondary) 
                }}
              >
                {day}
              </div>
            ))}
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '4px' 
          }}>
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              
              const isSelected = value === `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = new Date().toDateString() === new Date(viewYear, viewMonth, day).toDateString();
              
              return (
                <button
                  key={day}
                  onClick={() => handleSelectDate(day)}
                  style={{
                    aspectRatio: '1', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: isSelected ? theme.accent : (isToday ? '#FFF1F2' : 'transparent'),
                    color: isSelected ? '#FFFFFF' : (isToday ? theme.accent : theme.textPrimary),
                    border: 'none', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: isSelected || isToday ? 700 : 600,
                    cursor: 'pointer', 
                    transition: 'all 0.1s'
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = isToday ? '#FFF1F2' : 'transparent'; }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyStateModal = ({ onNavigateHome, onClose }: { onNavigateHome: () => void, onClose: () => void }) => {
  return (
    <EmptyStateBackdrop>
      <EmptyStateCard>
        <CloseIconButton onClick={onClose}>
          <X size={24} strokeWidth={2.5} />
        </CloseIconButton>
        
        <div className="animate-float" style={{ 
          width: '100px', 
          height: '100px', 
          borderRadius: '50%', 
          backgroundColor: '#FFF1F2',
          color: theme.accent,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: '0 10px 20px -5px rgba(225, 29, 46, 0.16)'
        }}>
          <ClipboardX size={48} strokeWidth={1.5} />
        </div>

        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          color: theme.textPrimary, 
          margin: '0 0 12px 0' 
        }}>
          금일 검사 데이터가 없습니다
        </h2>
        <p style={{ 
          fontSize: '15px', 
          color: theme.textSecondary, 
          lineHeight: '1.6', 
          margin: '0 0 32px 0', 
          wordBreak: 'keep-all' 
        }}>
          생산 라인이 가동 중인지 확인하거나,<br/>잠시 후 다시 시도해 주세요.
        </p>

        <button 
          onClick={onNavigateHome}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            backgroundColor: '#fff', 
            color: theme.textPrimary,
            border: `1px solid ${theme.border}`, 
            padding: '12px 32px', 
            borderRadius: '10px', 
            fontWeight: 700, 
            fontSize: '15px',
            cursor: 'pointer', 
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.accent;
            e.currentTarget.style.color = theme.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.border;
            e.currentTarget.style.color = theme.textPrimary;
          }}
        >
          <Home size={18} />
          메인 화면으로 이동
        </button>
      </EmptyStateCard>
    </EmptyStateBackdrop>
  );
};

const TypePreviewGraphic = ({ variant }: { variant: InspectionViewType }) => {
  if (variant === 'split') {
    return (
      <>
        <TypeOptionPreviewRail>
          <TypeOptionPreviewBlock $accent />
          <TypeOptionPreviewBlock />
        </TypeOptionPreviewRail>
        <TypeOptionPreviewBlock $main />
        <TypeOptionPreviewRail>
          <TypeOptionPreviewBlock />
          <TypeOptionPreviewBlock $accent />
        </TypeOptionPreviewRail>
      </>
    );
  }

  if (variant === 'rightStack') {
    return (
      <>
        <TypeOptionPreviewBlock $main />
        <TypeOptionPreviewStack>
          <TypeOptionPreviewBlock $accent />
          <TypeOptionPreviewBlock />
          <TypeOptionPreviewBlock />
          <TypeOptionPreviewBlock $accent />
        </TypeOptionPreviewStack>
      </>
    );
  }

  return <TypeOptionPreviewBlock $main $accent />;
};

const InlineTypePreview = ({ variant }: { variant: InspectionViewType }) => {
  if (variant === 'split') {
    return (
      <>
        <MiniPreviewColumn>
          <MiniPreviewBlock $accent />
          <MiniPreviewBlock />
        </MiniPreviewColumn>
        <MiniPreviewBlock />
        <MiniPreviewColumn>
          <MiniPreviewBlock />
          <MiniPreviewBlock $accent />
        </MiniPreviewColumn>
      </>
    );
  }

  if (variant === 'rightStack') {
    return (
      <>
        <MiniPreviewBlock />
        <MiniPreviewStack>
          <MiniPreviewBlock $accent />
          <MiniPreviewBlock />
          <MiniPreviewBlock />
          <MiniPreviewBlock $accent />
        </MiniPreviewStack>
      </>
    );
  }

  return <MiniPreviewBlock $accent />;
};

const TypeSelectionModal = ({
  isOpen,
  currentType,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  currentType: InspectionViewType;
  onClose: () => void;
  onSelect: (type: InspectionViewType) => void;
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  const options: Array<{ type: InspectionViewType; name: string; text: string }> = [
    {
      type: 'guide',
      name: 'TYPE 01 · Guide Focus',
      text: '큰 검사 이미지를 단독으로 보여주는 기본 화면입니다.',
    },
    {
      type: 'split',
      name: 'TYPE 02 · Camera Split',
      text: '확대 카메라 화면을 큰 검사 이미지 좌우에 2개씩 배치합니다.',
    },
    {
      type: 'rightStack',
      name: 'TYPE 03 · Right Stack',
      text: '확대 카메라 화면 4개를 오른쪽 한 영역에 모아 표시합니다.',
    },
  ];

  return createPortal(
    <TypeModalBackdrop onClick={onClose}>
      <TypeModalShell onClick={(event) => event.stopPropagation()}>
        <TypeModalHeader>
          <div>
            <TypeModalTitle>검사 화면 TYPE 선택</TypeModalTitle>
            <TypeModalDescription>
              선택한 타입에 맞춰 메인 검사 화면의 배치가 바로 변경됩니다.
            </TypeModalDescription>
          </div>
          <TypeModalClose type="button" onClick={onClose} aria-label="TYPE 선택 닫기">
            <X size={18} strokeWidth={2.4} />
          </TypeModalClose>
        </TypeModalHeader>

        <TypeOptionGrid>
          {options.map((option) => {
            const active = currentType === option.type;
            return (
              <TypeOptionCard
                key={option.type}
                type="button"
                $active={active}
                onClick={() => onSelect(option.type)}
              >
                <TypeOptionPreview $variant={option.type}>
                  <TypePreviewGraphic variant={option.type} />
                </TypeOptionPreview>
                <TypeOptionName>{option.name}</TypeOptionName>
                <TypeOptionText>{option.text}</TypeOptionText>
              </TypeOptionCard>
            );
          })}
        </TypeOptionGrid>
      </TypeModalShell>
    </TypeModalBackdrop>,
    document.body
  );
};

const HistoryModal = ({ isOpen, onClose, onImageClick }: { isOpen: boolean; onClose: () => void; onImageClick: (title: string, url: string) => void }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const dummyLogs = useMemo(() => {
    if (!selectedDate) return [];
    return [
      { 
        id: "log_1", time: "09:12:34", model: "GL-100", wo: "WO-A901", result: "ok", detail: "전 항목 정상 판정 완료. 특이사항 없음.",
        images: {
          main: getImageUrlByCurrentPage("/images/DX_API000102/guide_img.png"),
          a1: "https://dummyimage.com/960x540/F8FAFC/475467&text=A1+Normal",
          a2: "https://dummyimage.com/960x540/F8FAFC/475467&text=A2+Normal",
          a3: "https://dummyimage.com/960x540/F8FAFC/475467&text=A3+Normal",
          a4: "https://dummyimage.com/960x540/F8FAFC/475467&text=A4+Normal"
        }
      },
      { 
        id: "log_2", time: "10:05:22", model: "GL-100", wo: "WO-A901", result: "ng", detail: "좌측 상단(A1) 모서리 들뜸 현상 감지됨. 재검사 요망.",
        images: {
          main: getImageUrlByCurrentPage("/images/DX_API000102/guide_img.png"),
          a1: "https://dummyimage.com/960x540/FFF1F2/E11D2E&text=A1+Defect",
          a2: "https://dummyimage.com/960x540/F8FAFC/475467&text=A2+Normal",
          a3: "https://dummyimage.com/960x540/F8FAFC/475467&text=A3+Normal",
          a4: "https://dummyimage.com/960x540/F8FAFC/475467&text=A4+Normal"
        }
      },
      { 
        id: "log_3", time: "13:30:00", model: "GL-PRO", wo: "WO-B122", result: "ok", detail: "전 항목 정상 판정 완료.",
        images: {
          main: getImageUrlByCurrentPage("/images/DX_API000102/guide_img.png"),
          a1: "https://dummyimage.com/960x540/F8FAFC/475467&text=A1+Normal",
          a2: "https://dummyimage.com/960x540/F8FAFC/475467&text=A2+Normal",
          a3: "https://dummyimage.com/960x540/F8FAFC/475467&text=A3+Normal",
          a4: "https://dummyimage.com/960x540/F8FAFC/475467&text=A4+Normal"
        }
      },
      { 
        id: "log_4", time: "15:45:10", model: "GL-PRO", wo: "WO-B122", result: "ng", detail: "우측 하단(A4) 틈새 불량 (오차 범위 초과).",
        images: {
          main: getImageUrlByCurrentPage("/images/DX_API000102/guide_img.png"),
          a1: "https://dummyimage.com/960x540/F8FAFC/475467&text=A1+Normal",
          a2: "https://dummyimage.com/960x540/F8FAFC/475467&text=A2+Normal",
          a3: "https://dummyimage.com/960x540/F8FAFC/475467&text=A3+Normal",
          a4: "https://dummyimage.com/960x540/FFF1F2/E11D2E&text=A4+Defect"
        }
      },
    ];
  }, [selectedDate]);

  const selectedLog = useMemo(() => dummyLogs.find((l) => l.id === selectedLogId) || null, [dummyLogs, selectedLogId]);
  const historyStats = useMemo(() => {
    const ok = dummyLogs.filter((log) => log.result === 'ok').length;
    const ng = dummyLogs.filter((log) => log.result === 'ng').length;
    return { total: dummyLogs.length, ok, ng };
  }, [dummyLogs]);
  const cornerPreviewItems = selectedLog ? [
    { key: 'a1', code: 'A1', title: '좌측 상단', url: selectedLog.images.a1 },
    { key: 'a2', code: 'A2', title: '우측 상단', url: selectedLog.images.a2 },
    { key: 'a3', code: 'A3', title: '좌측 하단', url: selectedLog.images.a3 },
    { key: 'a4', code: 'A4', title: '우측 하단', url: selectedLog.images.a4 },
  ] : [];

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal((
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        backgroundColor: 'rgba(248, 250, 252, 0.82)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '8px 20px 20px 20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: 'calc(100vw - 40px)',
          height: '100dvh',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 34px 100px rgba(15, 23, 42, 0.18)',
          border: `1px solid ${theme.border}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          flexShrink: 0,
          padding: '22px 28px',
          backgroundColor: '#FFFFFF',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: theme.accentSoft,
              color: theme.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(225, 29, 46, 0.14)'
            }}>
              <Calendar size={24} strokeWidth={2.5} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                color: theme.accent,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '5px'
              }}>
                Inspection Archive
              </div>
              <h2 style={{
                margin: 0,
                color: theme.textPrimary,
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '-0.05em'
              }}>
                이전 검사기록 조회
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '10px',
              backgroundColor: '#F8FAFC',
              border: `1px solid ${theme.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: theme.textSecondary,
              fontSize: '12px',
              fontWeight: 700
            }}>
              ALL <strong style={{ color: theme.textPrimary }}>{historyStats.total}</strong>
            </div>
            <div style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '10px',
              backgroundColor: theme.status.ok.bg,
              border: '1px solid rgba(18, 183, 106, 0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: theme.status.ok.text,
              fontSize: '12px',
              fontWeight: 700
            }}>
              OK <strong>{historyStats.ok}</strong>
            </div>
            <div style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '10px',
              backgroundColor: theme.status.ng.bg,
              border: '1px solid rgba(225, 29, 46, 0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: theme.status.ng.text,
              fontSize: '12px',
              fontWeight: 700
            }}>
              NG <strong>{historyStats.ng}</strong>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                border: `1px solid ${theme.border}`,
                backgroundColor: '#FFFFFF',
                color: theme.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="이전 검사기록 닫기"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'clamp(330px, 22vw, 420px) minmax(0, 1fr)',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF'
        }}>
          <aside style={{
            minHeight: 0,
            backgroundColor: '#FFFFFF',
            borderRight: `1px solid ${theme.border}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '18px', borderBottom: `1px solid ${theme.border}` }}>
              <div style={{
                marginBottom: '12px',
                color: theme.textSecondary,
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Search Date
              </div>
              <CustomDatePicker
                value={selectedDate}
                onChange={(val) => {
                  setSelectedDate(val);
                  setSelectedLogId(null);
                }}
              />
            </div>

            <div style={{
              padding: '14px 18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              borderBottom: `1px solid ${theme.border}`,
              backgroundColor: '#FFFFFF'
            }}>
              <div style={{ padding: '10px 8px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 700 }}>TOTAL</div>
                <div style={{ marginTop: '4px', fontSize: '18px', color: theme.textPrimary, fontWeight: 700 }}>{historyStats.total}</div>
              </div>
              <div style={{ padding: '10px 8px', borderRadius: '10px', backgroundColor: theme.status.ok.bg, border: '1px solid rgba(18, 183, 106, 0.18)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: theme.status.ok.text, fontWeight: 700 }}>OK</div>
                <div style={{ marginTop: '4px', fontSize: '18px', color: theme.status.ok.text, fontWeight: 700 }}>{historyStats.ok}</div>
              </div>
              <div style={{ padding: '10px 8px', borderRadius: '10px', backgroundColor: theme.status.ng.bg, border: '1px solid rgba(225, 29, 46, 0.18)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: theme.status.ng.text, fontWeight: 700 }}>NG</div>
                <div style={{ marginTop: '4px', fontSize: '18px', color: theme.status.ng.text, fontWeight: 700 }}>{historyStats.ng}</div>
              </div>
            </div>

            <div
              className="custom-scrollbar"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: '#FFFFFF'
              }}
            >
              {dummyLogs.length > 0 ? dummyLogs.map((log) => {
                const isActive = selectedLogId === log.id;
                const isOk = log.result === 'ok';
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLogId(log.id)}
                    style={{
                      position: 'relative',
                      textAlign: 'left',
                      padding: '16px 16px 16px 18px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: `1px solid ${isActive ? (isOk ? 'rgba(18, 183, 106, 0.34)' : 'rgba(225, 29, 46, 0.34)') : theme.border}`,
                      backgroundColor: isActive ? (isOk ? theme.status.ok.bg : theme.status.ng.bg) : '#FFFFFF',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 14px 34px rgba(15, 23, 42, 0.08)' : '0 8px 20px rgba(15, 23, 42, 0.035)',
                      overflow: 'hidden',
                      appearance: 'none'
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      top: '14px',
                      bottom: '14px',
                      width: '4px',
                      borderRadius: '10px',
                      backgroundColor: isOk ? theme.success : theme.danger
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 700, color: theme.textPrimary, fontSize: '16px', letterSpacing: '-0.03em' }}>{log.time}</span>
                      <span style={{
                        flexShrink: 0,
                        padding: '6px 9px',
                        borderRadius: '10px',
                        backgroundColor: isOk ? '#FFFFFF' : '#FFFFFF',
                        color: isOk ? theme.status.ok.text : theme.status.ng.text,
                        border: `1px solid ${isOk ? 'rgba(18, 183, 106, 0.20)' : 'rgba(225, 29, 46, 0.20)'}`,
                        fontSize: '11px',
                        fontWeight: 700,
                        lineHeight: 1
                      }}>
                        {log.result.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ color: theme.textSecondary, fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                      {log.model} · {log.wo}
                    </div>
                    <div style={{ color: theme.textMuted, fontSize: '12px', fontWeight: 700, lineHeight: 1.45, wordBreak: 'keep-all' }}>
                      {log.detail}
                    </div>
                  </button>
                );
              }) : (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: theme.textSecondary,
                  fontWeight: 700,
                  lineHeight: 1.6,
                  wordBreak: 'keep-all'
                }}>
                  해당 날짜의 기록이 없습니다.
                </div>
              )}
            </div>
          </aside>

          <main
            className="custom-scrollbar"
            style={{
              minHeight: 0,
              overflowY: 'auto',
              padding: '24px',
              backgroundColor: '#F7F8FA'
            }}
          >
            {selectedLog ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <section style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '22px',
                  border: `1px solid ${theme.border}`,
                  boxShadow: '0 18px 46px rgba(15, 23, 42, 0.07)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <div style={{
                        width: '58px',
                        height: '58px',
                        borderRadius: '10px',
                        backgroundColor: selectedLog.result === 'ok' ? theme.status.ok.bg : theme.status.ng.bg,
                        color: selectedLog.result === 'ok' ? theme.status.ok.text : theme.status.ng.text,
                        border: `1px solid ${selectedLog.result === 'ok' ? 'rgba(18, 183, 106, 0.18)' : 'rgba(225, 29, 46, 0.18)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {selectedLog.result === 'ok' ? <CheckCircle2 size={30} strokeWidth={2.5} /> : <XCircle size={30} strokeWidth={2.5} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: theme.textSecondary, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Selected Log
                        </div>
                        <h3 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: theme.textPrimary, letterSpacing: '-0.06em' }}>
                          {selectedLog.model}
                        </h3>
                        <p style={{ margin: '6px 0 0 0', fontSize: '14px', fontWeight: 700, color: theme.textSecondary }}>
                          작업지시서 {selectedLog.wo}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      flexShrink: 0,
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      backgroundColor: selectedLog.result === 'ok' ? theme.status.ok.bg : theme.status.ng.bg,
                      color: selectedLog.result === 'ok' ? theme.status.ok.text : theme.status.ng.text,
                      border: `1px solid ${selectedLog.result === 'ok' ? 'rgba(18, 183, 106, 0.20)' : 'rgba(225, 29, 46, 0.20)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '13px',
                      fontWeight: 700
                    }}>
                      {selectedLog.result === 'ok' ? '정상 (OK)' : '불량 (NG)'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
                    <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: `1px solid ${theme.border}` }}>
                      <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 700, marginBottom: '6px' }}>DATE</div>
                      <div style={{ color: theme.textPrimary, fontSize: '14px', fontWeight: 700 }}>{selectedDate}</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: `1px solid ${theme.border}` }}>
                      <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 700, marginBottom: '6px' }}>TIME</div>
                      <div style={{ color: theme.textPrimary, fontSize: '14px', fontWeight: 700 }}>{selectedLog.time}</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: `1px solid ${theme.border}` }}>
                      <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 700, marginBottom: '6px' }}>RESULT</div>
                      <div style={{ color: selectedLog.result === 'ok' ? theme.success : theme.danger, fontSize: '14px', fontWeight: 700 }}>
                        {selectedLog.result.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '16px 18px',
                    borderRadius: '10px',
                    backgroundColor: selectedLog.result === 'ok' ? '#F8FAFC' : theme.accentSoft,
                    border: `1px solid ${selectedLog.result === 'ok' ? theme.border : 'rgba(225, 29, 46, 0.14)'}`
                  }}>
                    <strong style={{ display: 'block', marginBottom: '7px', color: theme.textPrimary, fontWeight: 700, fontSize: '14px' }}>
                      상세 내용
                    </strong>
                    <p style={{ margin: 0, color: theme.textSecondary, lineHeight: '1.6', fontWeight: 700, wordBreak: 'keep-all' }}>
                      {selectedLog.detail}
                    </p>
                  </div>
                </section>

                <section style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '22px',
                  border: `1px solid ${theme.border}`,
                  boxShadow: '0 18px 46px rgba(15, 23, 42, 0.07)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ color: theme.accent, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Captured Images
                      </div>
                      <h4 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: theme.textPrimary, letterSpacing: '-0.05em' }}>
                        검사 이미지
                      </h4>
                    </div>
                    <span style={{ fontSize: '12px', color: theme.textSecondary, fontWeight: 700 }}>
                      이미지를 클릭하면 크게 볼 수 있습니다.
                    </span>
                  </div>

                  <button
                    onClick={() => onImageClick('메인 검사 이미지', selectedLog.images.main)}
                    style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      marginBottom: '14px',
                      cursor: 'pointer',
                      border: `1px solid ${theme.border}`,
                      backgroundImage: `url(${selectedLog.images.main})`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      position: 'relative',
                      boxShadow: 'inset 0 0 0 1px rgba(17, 24, 39, 0.02)',
                      overflow: 'hidden',
                      padding: 0,
                      appearance: 'none'
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      backgroundColor: 'rgba(255,255,255,0.92)',
                      color: theme.textPrimary,
                      padding: '7px 10px',
                      borderRadius: '10px',
                      border: `1px solid ${theme.border}`,
                      fontSize: '12px',
                      fontWeight: 700
                    }}>
                      MAIN
                    </span>
                    <span style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      backgroundColor: '#FFFFFF',
                      color: theme.textPrimary,
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: `1px solid ${theme.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)'
                    }}>
                      <ZoomIn size={18} color={theme.textPrimary} />
                    </span>
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
                    {cornerPreviewItems.map((corner) => (
                      <button
                        key={corner.key}
                        onClick={() => onImageClick(`${corner.title} (${corner.code})`, corner.url)}
                        style={{
                          aspectRatio: '16 / 9',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          border: `1px solid ${theme.border}`,
                          position: 'relative',
                          backgroundImage: `url(${corner.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          overflow: 'hidden',
                          boxShadow: '0 10px 26px rgba(15, 23, 42, 0.06)',
                          padding: 0,
                          appearance: 'none',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          backgroundColor: 'rgba(255,255,255,0.92)',
                          color: theme.textPrimary,
                          padding: '7px 10px',
                          borderRadius: '10px',
                          border: `1px solid ${theme.border}`,
                          fontSize: '12px',
                          fontWeight: 700
                        }}>
                          <strong style={{ color: theme.accent }}>{corner.code}</strong>{corner.title}
                        </span>
                        <span style={{
                          position: 'absolute',
                          bottom: '10px',
                          right: '10px',
                          backgroundColor: '#FFFFFF',
                          color: theme.textPrimary,
                          padding: '7px',
                          borderRadius: '9px',
                          border: `1px solid ${theme.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 10px 22px rgba(15, 23, 42, 0.12)'
                        }}>
                          <ZoomIn size={15} color={theme.textPrimary} />
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div style={{
                height: '100%',
                minHeight: '420px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: '440px',
                  padding: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${theme.border}`,
                  boxShadow: '0 18px 46px rgba(15, 23, 42, 0.07)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '10px',
                    backgroundColor: theme.accentSoft,
                    color: theme.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px auto',
                    border: '1px solid rgba(225, 29, 46, 0.14)'
                  }}>
                    <FileText size={34} strokeWidth={1.8} />
                  </div>
                  <h3 style={{ margin: '0 0 10px 0', color: theme.textPrimary, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.05em' }}>
                    검사 로그를 선택해주세요
                  </h3>
                  <p style={{ margin: 0, color: theme.textSecondary, fontWeight: 700, lineHeight: 1.6, wordBreak: 'keep-all' }}>
                    좌측 목록에서 기록을 선택하면 판정 정보와 모서리별 검사 이미지를 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  ), document.body);
};

const ImageModal = ({
  isOpen,
  onClose,
  title,
  imgUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  imgUrl: string;
}) => {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const normalizedImgUrl = getImageUrlByCurrentPage(imgUrl);
  const hasImageUrl = !!normalizedImgUrl.trim();
  const canShowImage = hasImageUrl && !imageLoadFailed;

  useEffect(() => {
    if (!isOpen) return;

    setImageLoadFailed(false);
  }, [isOpen, imgUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <ImageZoomBackdrop onClick={onClose}>
      <ImageZoomPanel onClick={(event) => event.stopPropagation()}>
        <ImageZoomHeader>
          <ImageZoomTitleGroup>
            <ImageZoomIconBadge>
              <ZoomIn size={21} strokeWidth={2.5} />
            </ImageZoomIconBadge>
            <div style={{ minWidth: 0 }}>
              <ImageZoomTitle>{title}</ImageZoomTitle>
              <ImageZoomSubText>
                {canShowImage
                  ? '전체 화면으로 확대 이미지를 확인 중입니다. ESC 키로 닫을 수 있습니다.'
                  : '이미지 데이터가 아직 준비되지 않았습니다.'}
              </ImageZoomSubText>
            </div>
          </ImageZoomTitleGroup>

          <ImageZoomCloseButton
            type="button"
            aria-label="확대 이미지 닫기"
            onClick={onClose}
          >
            <X size={22} strokeWidth={2.5} />
          </ImageZoomCloseButton>
        </ImageZoomHeader>

        <ImageZoomFrame>
          {canShowImage ? (
            <ImageZoomImage
              key={normalizedImgUrl}
              src={normalizedImgUrl}
              alt={title}
              onError={(event) => {
                const fallbackUrl = getImageUrlByCurrentPage('/images/DX_API000102/guide_img.png');
                const fallbackAlreadyApplied = event.currentTarget.dataset.fallbackApplied === 'true';

                if (!fallbackAlreadyApplied && fallbackUrl && normalizedImgUrl !== fallbackUrl) {
                  event.currentTarget.dataset.fallbackApplied = 'true';
                  event.currentTarget.src = fallbackUrl;
                  return;
                }

                setImageLoadFailed(true);
              }}
            />
          ) : (
            <ImageZoomEmptyState>
              <ImageZoomEmptyIcon>
                <Info size={34} strokeWidth={2.4} />
              </ImageZoomEmptyIcon>
              <ImageZoomEmptyTitle>현재 이미지를 불러올 수 없습니다.</ImageZoomEmptyTitle>
              <ImageZoomEmptyText>
                잠시 후 다시 시도해주세요.
              </ImageZoomEmptyText>
            </ImageZoomEmptyState>
          )}
        </ImageZoomFrame>
      </ImageZoomPanel>
    </ImageZoomBackdrop>,
    document.body
  );
};

const SoundPermissionModal = ({ onConfirm }: { onConfirm: () => void }) => (
  <div style={{ 
    position: 'fixed', 
    inset: 0, 
    zIndex: 99999, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    backdropFilter: 'blur(4px)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center' 
  }}>
    <div style={{ 
      backgroundColor: '#FFFFFF', 
      padding: '48px', 
      borderRadius: '10px', 
      width: '90%', 
      maxWidth: '420px', 
      textAlign: 'center', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '32px' 
    }}>
      <div style={{ 
        width: '88px', 
        height: '88px', 
        borderRadius: '50%', 
        backgroundColor: '#FEF2F2', 
        margin: '0 auto', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Siren size={44} color={theme.danger} />
      </div>
      <div>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          marginBottom: '12px' 
        }}>
          불량 알림 권한 요청
        </h2>
        <p style={{ color: '#6B7280' }}>
          심각한 <strong style={{color: theme.danger}}>유격 불량이 감지</strong>되었습니다.<br />경고음을 켜시겠습니까?
        </p>
      </div>
      <button
        onClick={onConfirm}
        style={{
          width: '100%', 
          padding: '16px', 
          borderRadius: '10px', 
          border: 'none',
          background: theme.danger, 
          color: 'white', 
          fontSize: '16px', 
          fontWeight: 700,
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px',
          boxShadow: `0 4px 10px -4px ${theme.danger}60`
        }}
      >
        <Volume2 size={20} />네, 경고음 켜기
      </button>
    </div>
  </div>
);


// ─── [MAIN COMPONENT] ───
export default function GlassGapInspection() {
  const router = useRouter(); 

  const [screenMode, setScreenMode] = useState<ScreenMode>('FHD');
  const [modalInfo, setModalInfo] = useState<{ isOpen: boolean, title: string, imgUrl: string } | null>(null);
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [totalStats, setTotalStats] = useState<TotalData | null>(null);

  const [isDefectMode, setIsDefectMode] = useState(false); 
  const [audioAllowed, setAudioAllowed] = useState(false); 
  const [showPermissionModal, setShowPermissionModal] = useState(false); 
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); 
  const [isEmptyStateClosed, setIsEmptyStateClosed] = useState(false); 
  const [activeCorner, setActiveCorner] = useState<CornerKey | null>(null);
  const [loadedCameraImages, setLoadedCameraImages] = useState<Partial<Record<CornerKey, string>>>({});
  const [failedCameraImages, setFailedCameraImages] = useState<Partial<Record<CornerKey, string>>>({});
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all');
  const [inspectionViewType, setInspectionViewType] = useState<InspectionViewType>('split');
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [boxConnectorLines, setBoxConnectorLines] = useState<Partial<Record<CornerKey, ConnectorLine>>>({});
  const [cornerAnchors, setCornerAnchors] = useState<Record<CornerKey, CornerAnchor>>(() => ({ ...DEFAULT_CORNER_ANCHORS }));
  const [isCornerAnchorsHydrated, setIsCornerAnchorsHydrated] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const guideViewportRef = useRef<HTMLDivElement | null>(null);
  const draggedCornerRef = useRef<{ key: CornerKey; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressNextHotspotClickRef = useRef(false);
  const hotspotRefs = useRef<Record<CornerKey, HTMLButtonElement | null>>({ tl: null, tr: null, bl: null, br: null });
  const cameraTileRefs = useRef<Record<CornerKey, HTMLButtonElement | null>>({ tl: null, tr: null, bl: null, br: null });
  const cameraRetryTimeoutsRef = useRef<Partial<Record<CornerKey, number>>>({});

  const handleNavigateHome = () => {
    router.push('/');
  };

  const handleImageClick = (title: string, url: string) => {
    setModalInfo({ isOpen: true, title, imgUrl: url ?? '' });
  };

  const handleCameraPreloadLoad = useCallback((key: CornerKey, url: string) => {
    const retryTimeoutId = cameraRetryTimeoutsRef.current[key];
    if (retryTimeoutId && typeof window !== 'undefined') {
      window.clearTimeout(retryTimeoutId);
      delete cameraRetryTimeoutsRef.current[key];
    }

    setFailedCameraImages((prev) => {
      if (prev[key] !== url) return prev;

      const next = { ...prev };
      delete next[key];
      return next;
    });

    setLoadedCameraImages((prev) => (prev[key] === url ? prev : { ...prev, [key]: url }));
  }, []);

  const handleCameraPreloadError = useCallback((key: CornerKey, url: string) => {
    setLoadedCameraImages((prev) => {
      if (prev[key] !== url) return prev;

      const next = { ...prev };
      delete next[key];
      return next;
    });

    setFailedCameraImages((prev) => (prev[key] === url ? prev : { ...prev, [key]: url }));

    if (typeof window === 'undefined') return;

    const retryTimeoutId = cameraRetryTimeoutsRef.current[key];
    if (retryTimeoutId) window.clearTimeout(retryTimeoutId);

    cameraRetryTimeoutsRef.current[key] = window.setTimeout(() => {
      setFailedCameraImages((prev) => {
        if (prev[key] !== url) return prev;

        const next = { ...prev };
        delete next[key];
        return next;
      });

      delete cameraRetryTimeoutsRef.current[key];
    }, 8000);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return;

      Object.values(cameraRetryTimeoutsRef.current).forEach((timeoutId) => {
        if (typeof timeoutId === 'number') window.clearTimeout(timeoutId);
      });
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setCornerAnchors(getInitialCornerAnchors());
    setIsCornerAnchorsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isCornerAnchorsHydrated || typeof window === 'undefined') return;

    window.localStorage.setItem(CORNER_ANCHORS_STORAGE_KEY, JSON.stringify(cornerAnchors));
  }, [cornerAnchors, isCornerAnchorsHydrated]);

  const updateCornerAnchorFromPointer = useCallback((key: CornerKey, event: React.PointerEvent<HTMLButtonElement>) => {
    const viewport = guideViewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const nextLeft = clampPercent(((event.clientX - rect.left) / rect.width) * 100, 4, 96);
    const nextTop = clampPercent(((event.clientY - rect.top) / rect.height) * 100, 5, 95);

    setCornerAnchors((prev) => ({
      ...prev,
      [key]: {
        left: Number(nextLeft.toFixed(1)),
        top: Number(nextTop.toFixed(1)),
      },
    }));
  }, []);

  const handleHotspotPointerDown = (event: React.PointerEvent<HTMLButtonElement>, key: CornerKey) => {
    if (event.button !== 0) return;

    draggedCornerRef.current = {
      key,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
  };

  const handleHotspotPointerMove = (event: React.PointerEvent<HTMLButtonElement>, key: CornerKey) => {
    const dragState = draggedCornerRef.current;
    if (!dragState || dragState.key !== key) return;

    const moved = Math.abs(event.clientX - dragState.startX) > 3 || Math.abs(event.clientY - dragState.startY) > 3;
    if (!moved && !dragState.moved) return;

    dragState.moved = true;
    suppressNextHotspotClickRef.current = true;
    updateCornerAnchorFromPointer(key, event);
  };

  const handleHotspotPointerUp = (event: React.PointerEvent<HTMLButtonElement>, key: CornerKey) => {
    const dragState = draggedCornerRef.current;

    if (dragState?.key === key) {
      suppressNextHotspotClickRef.current = dragState.moved;
      draggedCornerRef.current = null;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

  };

  const recalculateBoxConnectors = useCallback(() => {
    const stage = stageRef.current;
    const shouldShowConnectors = inspectionViewType === 'split' || inspectionViewType === 'rightStack';
    if (!stage || !shouldShowConnectors) {
      setBoxConnectorLines({});
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const nextLines: Partial<Record<CornerKey, ConnectorLine>> = {};

    CORNER_KEYS.forEach((key) => {
      const hotspot = hotspotRefs.current[key];
      const cameraTile = cameraTileRefs.current[key];
      if (!hotspot || !cameraTile) return;

      const hotspotRect = hotspot.getBoundingClientRect();
      const tileRect = cameraTile.getBoundingClientRect();
      const connectFromLeftEdge = inspectionViewType === 'rightStack' || key === 'tr' || key === 'br';

      nextLines[key] = {
        x1: (connectFromLeftEdge ? tileRect.left : tileRect.right) - stageRect.left,
        y1: tileRect.top + tileRect.height / 2 - stageRect.top,
        x2: hotspotRect.left + hotspotRect.width / 2 - stageRect.left,
        y2: hotspotRect.top + hotspotRect.height / 2 - stageRect.top,
      };
    });

    setBoxConnectorLines(nextLines);
  }, [inspectionViewType]);

  useEffect(() => {
    const shouldShowConnectors = inspectionViewType === 'split' || inspectionViewType === 'rightStack';
    if (!shouldShowConnectors) {
      setBoxConnectorLines({});
      return;
    }

    const update = () => recalculateBoxConnectors();
    const rafId = window.requestAnimationFrame(update);
    const timeoutId = window.setTimeout(update, 160);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;

    if (resizeObserver) {
      if (stageRef.current) resizeObserver.observe(stageRef.current);
      CORNER_KEYS.forEach((key) => {
        if (hotspotRefs.current[key]) resizeObserver.observe(hotspotRefs.current[key] as HTMLButtonElement);
        if (cameraTileRefs.current[key]) resizeObserver.observe(cameraTileRefs.current[key] as HTMLButtonElement);
      });
    }

    window.addEventListener('resize', update);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', update);
      resizeObserver?.disconnect();
    };
  }, [apiData, screenMode, inspectionViewType, cornerAnchors, recalculateBoxConnectors]);

  useEffect(() => {
    const handleResize = () => setScreenMode(window.innerWidth > 2200 ? 'QHD' : 'FHD');
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(getDxApiUrl('/api/DX_API000023'), {
          cache: 'no-store',
        });
        const json = await response.json();
        
        if (json.success && json.data && json.data.length > 0) {
          const data: ApiData = json.data[0];
          setApiData(data);
          const hasError = data.RESULT !== '정상';
          setIsDefectMode(hasError);
          if (hasError && !audioAllowed && !showPermissionModal && !audioCtxRef.current) {
            setShowPermissionModal(true);
          }
        }

        if (json.success && json.total_data) {
          setTotalStats({
            total_count: json.total_data.total_count,
            normal_count: json.total_data.normal_count
          });
        }
      } catch (error) { console.error(error); }
    };
    fetchData();
    const intervalId = window.setInterval(fetchData, 3000);
    return () => window.clearInterval(intervalId);
  }, [audioAllowed, showPermissionModal]);

  useEffect(() => {
    if (isDefectMode && audioAllowed) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();

      const playBeep = () => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.15);
      };
      playBeep();
      intervalRef.current = window.setInterval(playBeep, 500);
    } else {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [isDefectMode, audioAllowed]);

  const handlePermissionConfirm = () => {
    setAudioAllowed(true);
    setShowPermissionModal(false);
  };

  const toggleSound = () => setAudioAllowed(prev => !prev);
  const layout = LAYOUT_CONFIGS[screenMode];
  const guideImageSrc = useSyncExternalStore(subscribeToOrigin, () => getImageUrlByCurrentPage('/images/DX_API000102/guide_img.png'), () => '');
  const imageVersionKey = apiData
    ? [apiData.TIMEVALUE2, apiData.TIMEVALUE, apiData.COUNT_NUM, apiData.WO].filter(Boolean).join('_')
    : '';

  // 설비의 실제 카메라/모서리 매핑을 유지했습니다.
  // API가 FILEPATH1=Camera1, FILEPATH2=Camera2, FILEPATH3=Camera3, FILEPATH4=Camera4 순서라면
  // 아래 imgUrl 매핑만 1:1로 바꾸면 됩니다.
  const cornerItems = useMemo<CornerItem[]>(() => ([
    {
      key: 'tl',
      code: 'A1',
      title: '좌측 상단',
      camera: 'camera-1',
      status: apiData ? apiData.LABEL001 : '-',
      imgUrl: apiData ? getImageUrlWithVersion(apiData.FILEPATH3, imageVersionKey) : '',
      anchor: { left: `${cornerAnchors.tl.left}%`, top: `${cornerAnchors.tl.top}%` },
      description: '상단 좌측 모서리 확대'
    },
    {
      key: 'tr',
      code: 'A2',
      title: '우측 상단',
      camera: 'camera-2',
      status: apiData ? apiData.LABEL002 : '-',
      imgUrl: apiData ? getImageUrlWithVersion(apiData.FILEPATH2, imageVersionKey) : '',
      anchor: { left: `${cornerAnchors.tr.left}%`, top: `${cornerAnchors.tr.top}%` },
      description: '상단 우측 모서리 확대'
    },
    {
      key: 'bl',
      code: 'A3',
      title: '좌측 하단',
      camera: 'camera-4',
      status: apiData ? apiData.LABEL003 : '-',
      imgUrl: apiData ? getImageUrlWithVersion(apiData.FILEPATH1, imageVersionKey) : '',
      anchor: { left: `${cornerAnchors.bl.left}%`, top: `${cornerAnchors.bl.top}%` },
      description: '하단 좌측 모서리 확대'
    },
    {
      key: 'br',
      code: 'A4',
      title: '우측 하단',
      camera: 'camera-3',
      status: apiData ? apiData.LABEL004 : '-',
      imgUrl: apiData ? getImageUrlWithVersion(apiData.FILEPATH4, imageVersionKey) : '',
      anchor: { left: `${cornerAnchors.br.left}%`, top: `${cornerAnchors.br.top}%` },
      description: '하단 우측 모서리 확대'
    },
  ]), [apiData, cornerAnchors, imageVersionKey]);

  const resultStr = apiData?.RESULT || '';
  const isPass = resultStr === '정상' || resultStr.toUpperCase() === 'OK';
  const isFail = !isPass && !!resultStr;

  let statusState: 'wait' | 'ok' | 'ng' = 'wait';
  let ResultIcon = Info;
  let label = "READY";

  if (isPass) {
    statusState = 'ok';
    ResultIcon = CheckCircle2;
    label = "정상 (OK)";
  } else if (isFail) {
    statusState = 'ng';
    ResultIcon = XCircle;
    label = "불량 (NG)";
  }

  const timeValue = apiData?.TIMEVALUE || '00:00:00';
  const modelValue = apiData?.CDGITEM || '-';
  const woValue = apiData?.WO || '-';
  const normalCount = totalStats?.normal_count ?? 0;
  const totalCount = totalStats?.total_count ?? 0;
  const ngCount = cornerItems.filter((item) => getInspectionTone(item.status) === 'ng').length;
  const okCount = cornerItems.filter((item) => getInspectionTone(item.status) === 'ok').length;
  const leftCameraItems = cornerItems.filter((item) => item.key === 'tl' || item.key === 'bl');
  const rightCameraItems = cornerItems.filter((item) => item.key === 'tr' || item.key === 'br');
  const typeLabel = inspectionViewType === 'split' ? 'Split' : inspectionViewType === 'rightStack' ? 'Right' : 'Guide';

  const handleSummaryFilterClick = (filter: SummaryFilter) => {
    setSummaryFilter(filter);
    if (filter === 'all') {
      setActiveCorner(null);
      return;
    }

    const matchedCorner = cornerItems.find((item) => getInspectionTone(item.status) === filter);
    setActiveCorner(matchedCorner?.key ?? null);
  };

  const handleTypeSelect = (type: InspectionViewType) => {
    setInspectionViewType(type);
    setIsTypeModalOpen(false);
  };

  const renderGuideViewport = (solo = false) => (
    <CenterGuideViewport ref={guideViewportRef} $solo={solo}>
      <GuideImage
        src={guideImageSrc || undefined}
        alt="Main Glass Guide"
        draggable={false}
        onError={(event) => {
          console.error('Guide image load failed:', event.currentTarget.currentSrc);
        }}
      />
      {cornerItems.map((item) => {
        const tone = getInspectionTone(item.status);
        const isActive = activeCorner === item.key;
        const detailImageUrl = item.imgUrl || guideImageSrc;

        return (
          <CornerHotspot
            key={item.key}
            ref={(node) => { hotspotRefs.current[item.key] = node; }}
            style={{ left: item.anchor.left, top: item.anchor.top }}
            $tone={tone}
            $isActive={isActive}
            onMouseEnter={() => setActiveCorner(item.key)}
            onMouseLeave={() => setActiveCorner(null)}
            onPointerDown={(event) => handleHotspotPointerDown(event, item.key)}
            onPointerMove={(event) => handleHotspotPointerMove(event, item.key)}
            onPointerUp={(event) => handleHotspotPointerUp(event, item.key)}
            onPointerCancel={(event) => handleHotspotPointerUp(event, item.key)}
            onClick={() => {
              if (suppressNextHotspotClickRef.current) {
                suppressNextHotspotClickRef.current = false;
                return;
              }

              handleImageClick(`${item.title} (${item.camera})`, detailImageUrl);
            }}
            title={`${item.title} 확대 이미지 보기 / 드래그로 위치 조정`}
            aria-label={`${item.title} 확대 이미지 보기 / 드래그로 위치 조정`}
          >
            {item.code}
          </CornerHotspot>
        );
      })}
    </CenterGuideViewport>
  );

  const renderCameraTile = (item: CornerItem) => {
    const tone = getInspectionTone(item.status);
    const isActive = activeCorner === item.key;
    const modalTitle = `${item.title} (${item.camera})`;
    const candidateCameraUrl = item.imgUrl || '';
    const isCameraUrlFailed = !!candidateCameraUrl && failedCameraImages[item.key] === candidateCameraUrl;
    const isCameraUrlLoaded = !!candidateCameraUrl && loadedCameraImages[item.key] === candidateCameraUrl && !isCameraUrlFailed;
    const cameraPreviewUrl = isCameraUrlLoaded ? candidateCameraUrl : '';
    const cameraFallbackUrl = guideImageSrc;
    const cameraDetailUrl = cameraPreviewUrl || cameraFallbackUrl;
    const cameraFallbackPosition = `${cornerAnchors[item.key].left}% ${cornerAnchors[item.key].top}%`;

    const openCameraImage = () => {
      handleImageClick(modalTitle, cameraDetailUrl);
    };

    const handleCameraClick = () => {
      openCameraImage();
    };

    const handleZoomClick = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.stopPropagation();
      openCameraImage();
    };

    const handleZoomKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      event.stopPropagation();
      openCameraImage();
    };

    return (
      <CameraTile
        key={item.key}
        ref={(node) => { cameraTileRefs.current[item.key] = node; }}
        type="button"
        $tone={tone}
        $active={isActive}
        $imgUrl={cameraPreviewUrl}
        $fallbackImgUrl={cameraFallbackUrl}
        $imgSize="cover"
        $fallbackImgSize="260%"
        $imgPosition="center"
        $fallbackImgPosition={cameraFallbackPosition}
        onMouseEnter={() => setActiveCorner(item.key)}
        onMouseLeave={() => setActiveCorner(null)}
        onClick={handleCameraClick}
        aria-label={`${item.title} 카메라 확대 이미지 보기`}
      >
        {candidateCameraUrl && !isCameraUrlFailed && (
          <CameraTilePreloader
            src={candidateCameraUrl}
            alt=""
            aria-hidden="true"
            onLoad={() => handleCameraPreloadLoad(item.key, candidateCameraUrl)}
            onError={() => handleCameraPreloadError(item.key, candidateCameraUrl)}
          />
        )}
        {!cameraDetailUrl && <NoImageText>이미지 대기</NoImageText>}
        <CameraTileHeader>
          <CameraTileCode $tone={tone}>{item.code}</CameraTileCode>
          <CameraTileStatus $tone={tone}>{formatStatusLabel(item.status)}</CameraTileStatus>
        </CameraTileHeader>
        <CameraTileFooter>
          <CameraTileName>{item.camera} · {item.title}</CameraTileName>
          <CameraTileZoom
            role="button"
            tabIndex={0}
            title="확대 보기"
            aria-label={`${item.title} 확대 보기`}
            onClick={handleZoomClick}
            onKeyDown={handleZoomKeyDown}
          >
            <ZoomIn size={15} strokeWidth={2.5} />
          </CameraTileZoom>
        </CameraTileFooter>
      </CameraTile>
    );
  };


  const renderBoxConnectors = () => {
    if (inspectionViewType === 'guide') return null;

    return (
      <BoxConnectorSvg aria-hidden="true">
        {cornerItems.map((item) => {
          const line = boxConnectorLines[item.key];
          if (!line) return null;

          const tone = getInspectionTone(item.status);
          const isActive = activeCorner === item.key;
          const strokeColor = isActive
            ? 'rgba(52, 64, 84, 0.88)'
            : tone === 'wait'
              ? 'rgba(102, 112, 133, 0.48)'
              : 'rgba(71, 84, 103, 0.64)';
          const dx = line.x2 - line.x1;
          const handle = Math.min(260, Math.max(92, Math.abs(dx) * 0.42));
          const direction = dx >= 0 ? 1 : -1;
          const path = `M ${line.x1} ${line.y1} C ${line.x1 + handle * direction} ${line.y1}, ${line.x2 - handle * direction} ${line.y2}, ${line.x2} ${line.y2}`;

          return (
            <g key={item.key} opacity={isActive ? 1 : 0.82}>
              <path
                d={path}
                fill="none"
                stroke="rgba(255, 255, 255, 0.88)"
                strokeWidth={isActive ? 7 : 6}
                strokeLinecap="round"
              />
              <path
                d={path}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isActive ? 3 : 2.35}
                strokeLinecap="round"
                strokeDasharray="5 9"
                className={isActive ? 'connector-flow' : undefined}
              />
              <circle cx={line.x1} cy={line.y1} r={4.1} fill="#FFFFFF" stroke={strokeColor} strokeWidth={2.1} />
              <circle cx={line.x2} cy={line.y2} r={4.4} fill="#FFFFFF" stroke={strokeColor} strokeWidth={2.1} />
            </g>
          );
        })}
      </BoxConnectorSvg>
    );
  };

  return (
    <Container style={{ padding: layout.padding }}>
      <GlobalStyles />

      {totalStats && totalStats.total_count === 0 && !isEmptyStateClosed && (
        <EmptyStateModal 
          onNavigateHome={handleNavigateHome} 
          onClose={() => setIsEmptyStateClosed(true)} 
        />
      )}

      <HeaderRow style={{ gap: layout.gap, height: layout.headerHeight, marginBottom: layout.gap }}>
        <ResultCard $status={statusState}>
          <SoundToggleBtn onClick={toggleSound} aria-label="불량 경고음 토글">
            {audioAllowed ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </SoundToggleBtn>
          <ResultIconBox $status={statusState}>
            <ResultIcon size={34} strokeWidth={2.5} />
          </ResultIconBox>
          <ResultTextBox>
            <ResultLabel>
              <Clock size={14} /> Live Judgment
            </ResultLabel>
            <ResultValue $status={statusState}>{label}</ResultValue>
          </ResultTextBox>
        </ResultCard>

        <HeaderInfoArea>
          <InfoTableCard>
            <InfoTableHeader>
              <Th>검사 시간</Th>
              <Th>검사 수량</Th>
              <Th $isLast>모델명 / WO</Th>
            </InfoTableHeader>
            <InfoTableBody>
              <Td>
                <TdValueText>{timeValue}</TdValueText>
              </Td>
              <Td>
                {totalStats ? (
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <TdValueText>{normalCount}</TdValueText>
                    <span style={{ fontSize: '16px', color: theme.textSecondary, margin: '0 5px' }}>/</span>
                    <span style={{ fontSize: '16px', color: theme.textSecondary, fontWeight: 700 }}>{totalCount}</span>
                  </div>
                ) : (
                  <TdValueText $color={theme.textSecondary}>-</TdValueText>
                )}
              </Td>
              <Td $isLast>
                <TdValueText>{modelValue} / {woValue}</TdValueText>
              </Td>
            </InfoTableBody>
          </InfoTableCard>

          <HeaderSummaryCard>
            <PanelStats>
              <PanelStatChip
                type="button"
                $tone="ng"
                $active={summaryFilter === 'ng'}
                onClick={() => handleSummaryFilterClick('ng')}
              >
                <StatLabel>NG</StatLabel>
                <StatCount>{ngCount}</StatCount>
              </PanelStatChip>
              <PanelStatChip
                type="button"
                $tone="ok"
                $active={summaryFilter === 'ok'}
                onClick={() => handleSummaryFilterClick('ok')}
              >
                <StatLabel>OK</StatLabel>
                <StatCount>{okCount}</StatCount>
              </PanelStatChip>
              <PanelStatChip
                type="button"
                $active={summaryFilter === 'all'}
                onClick={() => handleSummaryFilterClick('all')}
              >
                <StatLabel>ALL</StatLabel>
                <StatCount>{cornerItems.length}</StatCount>
              </PanelStatChip>
            </PanelStats>
          </HeaderSummaryCard>

          <CompactTypeButton type="button" onClick={() => setIsTypeModalOpen(true)}>
            <TypeButtonLabel>TYPE</TypeButtonLabel>
            <CompactTypeValue>{typeLabel}</CompactTypeValue>
            <ChevronDown size={15} strokeWidth={2.4} />
          </CompactTypeButton>

          <FloatingHistoryButton onClick={() => setIsHistoryOpen(true)}>
            <Calendar size={18} strokeWidth={2.5} />
            이전 검사기록 조회
          </FloatingHistoryButton>
        </HeaderInfoArea>
      </HeaderRow>

      <InspectionWorkspace $panelWidth={layout.cornerPanelWidth} style={{ gap: layout.gap }}>
        <MainInspectionPanel>
          <MainPanelHeader>
            <MainPanelEyebrow>
              <Monitor size={15} strokeWidth={2.5} /> Live Inspection Map
            </MainPanelEyebrow>
            <LiveBadge $isDefect={isFail}>
              <LiveDot $isDefect={isFail} />
              {isFail ? 'Defect Focus' : 'Nominal Flow'}
            </LiveBadge>
          </MainPanelHeader>

          <MainImageStage ref={stageRef}>
            {inspectionViewType === 'split' ? (
              <>
                <StageSplitGrid>
                  <CameraRail>{leftCameraItems.map(renderCameraTile)}</CameraRail>
                  {renderGuideViewport(false)}
                  <CameraRail>{rightCameraItems.map(renderCameraTile)}</CameraRail>
                </StageSplitGrid>
                {renderBoxConnectors()}
              </>
            ) : inspectionViewType === 'rightStack' ? (
              <>
                <StageRightStackGrid>
                  {renderGuideViewport(false)}
                  <CameraStackGrid>{cornerItems.map(renderCameraTile)}</CameraStackGrid>
                </StageRightStackGrid>
                {renderBoxConnectors()}
              </>
            ) : (
              renderGuideViewport(true)
            )}
          </MainImageStage>

          <MainPanelFooter>
            <LegendGroup>
              <LegendItem><LegendDot $tone="ok" /> 정상</LegendItem>
              <LegendItem><LegendDot $tone="ng" /> 불량</LegendItem>
              <LegendItem><LegendDot $tone="wait" /> 대기</LegendItem>
            </LegendGroup>
            <span>TYPE 선택에 따라 검사 이미지와 확대 카메라 배치가 변경됩니다.</span>
          </MainPanelFooter>
        </MainInspectionPanel>

      </InspectionWorkspace>

      <TypeSelectionModal
        isOpen={isTypeModalOpen}
        currentType={inspectionViewType}
        onClose={() => setIsTypeModalOpen(false)}
        onSelect={handleTypeSelect}
      />
      <HistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        onImageClick={handleImageClick}
      />
      {showPermissionModal && <SoundPermissionModal onConfirm={handlePermissionConfirm} />}
      {modalInfo && (
        <ImageModal
          isOpen={modalInfo.isOpen}
          onClose={() => setModalInfo(null)}
          title={modalInfo.title}
          imgUrl={modalInfo.imgUrl}
        />
      )}
    </Container>
  );
}
