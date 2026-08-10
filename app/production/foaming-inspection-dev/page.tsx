'use client';

import React, { useMemo, useState } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import {
  FiAlertTriangle,
  FiSearch,
  FiActivity,
} from 'react-icons/fi';
import { useFoamingSensor } from '@/hooks/use-foaming-sensor';
import {
  CHART_POINT_LIMIT,
  DEFAULT_PROCESS,
  LIVE_LOG_LIMIT,
  PROCESS_TABS,
  WARN_MARGIN_RATIO,
} from '@/constants/foamingInspection';
import type { FoamingSensorSeries, FoamingStatus } from '@/types/foamingSensor';

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
const T = {
  primary: '#C1124F',
  lightPink: '#FCE7F3',
  pinkTint: '#FFF5F7',
  green: '#10B981',
  amber: '#F59E0B',
  amberText: '#B45309',
  amberBg: '#FFFBEB',
  redText: '#DC2626',
  redBg: '#FEF2F2',
  bg: '#F1F5F9',
  card: '#FFFFFF',
  textMain: '#0F172A',
  textSub: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  dark: '#1E293B',
};

const GlobalStyle = createGlobalStyle`
  /* Pretendard는 globals.css에서 로컬 호스팅한다. createGlobalStyle은 CSSOM
     insertRule로 주입되어 @import가 무시되므로 여기에 두면 안 된다. */
  * { box-sizing: border-box; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
  body { margin: 0; background-color: ${T.bg}; color: ${T.textMain}; overflow: hidden; }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
`;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const Page = styled.div`
  width: 100%;
  height: calc(100vh - 60px);
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: ${T.bg};
  overflow: hidden;
`;

const TabBar = styled.div`
  display: flex;
  justify-content: center;
  flex-shrink: 0;
`;

const TabGroup = styled.div`
  display: flex;
  gap: 6px;
  background: #E9EDF3;
  border: 1px solid ${T.border};
  padding: 6px;
  border-radius: 12px;
`;

const Tab = styled.button<{ $active?: boolean; $error?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 9px 22px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.3px;
  background: ${({ $active }) => ($active ? '#FFFFFF' : 'transparent')};
  border: 1px solid ${({ $active }) => ($active ? T.border : 'transparent')};
  color: ${({ $active, $error }) =>
    $active ? ($error ? T.primary : T.textMain) : $error ? T.primary : T.textSub};
  box-shadow: ${({ $active }) => ($active ? '0 4px 12px rgba(15, 23, 42, 0.16)' : 'none')};
  transition: all 0.18s ease;

  &:hover {
    background: ${({ $active }) => ($active ? '#FFFFFF' : 'rgba(255,255,255,0.55)')};
  }
`;

const TabDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${T.primary};
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
`;

const LeftColumn = styled.div`
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Card = styled.div`
  background: ${T.card};
  border: 1px solid ${T.border};
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
`;

// --- Process overview card (header + charts) ---
const OverviewCard = styled(Card)`
  padding: 26px 28px;
  flex-shrink: 0;
`;

const OverviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
`;

const ProcessTitle = styled.h1`
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -1px;
  color: ${T.textMain};
`;

const HeaderStats = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 44px;
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
`;

const StatLabel = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${T.textSub};
  letter-spacing: -0.2px;
`;

const StatValue = styled.span<{ $danger?: boolean }>`
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.6px;
  color: ${({ $danger }) => ($danger ? T.primary : T.textMain)};

  small {
    font-size: 14px;
    font-weight: 700;
    color: ${T.textSub};
    margin-left: 5px;
  }
`;

const ChartRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
`;

const ChartCard = styled.div<{ $active?: boolean }>`
  border: 1px solid ${({ $active }) => ($active ? T.primary : T.border)};
  background: ${({ $active }) => ($active ? T.pinkTint : '#FFFFFF')};
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ChartHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const ChartTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const ChartIndex = styled.span<{ $active?: boolean }>`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  background: ${({ $active }) => ($active ? T.primary : '#F1F5F9')};
  color: ${({ $active }) => ($active ? '#FFFFFF' : T.textSub)};
`;

const ChartName = styled.span<{ $active?: boolean }>`
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: ${({ $active }) => ($active ? T.primary : T.textMain)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChartValue = styled.span<{ $active?: boolean }>`
  flex-shrink: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.6px;
  color: ${({ $active }) => ($active ? T.primary : T.textMain)};

  small {
    font-size: 13px;
    font-weight: 700;
    color: ${T.textSub};
    margin-left: 4px;
  }
`;

const ChartSvg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
`;

// --- Log card ---
const LogCard = styled(Card)`
  flex: 1;
  min-height: 0;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
`;

const LogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  flex-shrink: 0;
`;

const LogTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: ${T.textMain};
`;

const LiveBadge = styled.span<{ $offline?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $offline }) => ($offline ? T.textMuted : T.primary)};

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ $offline }) => ($offline ? T.textMuted : T.primary)};
    /* 연결이 끊겼으면 깜빡임을 멈춰 실시간이 아님을 드러낸다 */
    animation: ${({ $offline }) => ($offline ? 'none' : pulse)} 1.4s ease-in-out infinite;
  }
`;

const LogTable = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

const EmptyState = styled.div`
  padding: 34px 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: ${T.textMuted};
`;

const LogRowGrid = styled.div`
  display: grid;
  grid-template-columns: 110px 1.4fr 1fr 1fr 1fr;
  align-items: center;
  gap: 12px;
`;

const LogHeadRow = styled(LogRowGrid)`
  padding: 0 4px 12px;
  border-bottom: 1px solid ${T.border};

  span {
    font-size: 13px;
    font-weight: 700;
    color: ${T.textSub};
    letter-spacing: -0.2px;
  }
`;

const LogRow = styled(LogRowGrid)`
  padding: 18px 4px;
  border-bottom: 1px solid #F1F5F9;
`;

const LogCellTime = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${T.textSub};
`;

const LogCellSensor = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${T.textMain};
  letter-spacing: -0.2px;
`;

const EventPill = styled.span<{ $tone: 'critical' | 'warn' }>`
  justify-self: start;
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.2px;
  background: ${({ $tone }) => ($tone === 'critical' ? T.redBg : T.amberBg)};
  color: ${({ $tone }) => ($tone === 'critical' ? T.redText : T.amberText)};
  border: 1px solid ${({ $tone }) => ($tone === 'critical' ? '#FECACA' : '#FDE68A')};
`;

const LogValue = styled.span<{ $tone?: 'critical' | 'warn' }>`
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.2px;
  color: ${({ $tone }) => ($tone === 'critical' ? T.redText : $tone === 'warn' ? T.amberText : T.textMain)};
`;

// ---------------------------------------------------------------------------
// AI Risk Diagnosis panel (자재관리 > 공정재고 와 동일)
// ---------------------------------------------------------------------------
const RiskPanel = styled(Card)`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  padding: 0;
`;

const RiskHeader = styled.div`
  padding: 15px 18px;
  border-bottom: 1px solid #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

const RiskHeaderTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${T.textMain};
  letter-spacing: -0.6px;
`;

const AnalyzingBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border-radius: 6px;
  background: ${T.lightPink};
  color: ${T.primary};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.2px;
`;

const PulseDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${T.primary};
  animation: ${pulse} 1.4s ease-in-out infinite;
`;

const RiskBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
`;

const PriorityAlert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #FEF2F2;
  border: 1px solid #FEE2E2;
  flex-shrink: 0;
`;

const PriorityIcon = styled.div`
  color: ${T.primary};
  flex-shrink: 0;
  margin-top: 2px;
  line-height: 0;
`;

const PriorityTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

const PriorityLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${T.primary};
  letter-spacing: -0.2px;
`;

const PriorityMain = styled.strong`
  font-size: 16px;
  font-weight: 700;
  color: ${T.textMain};
  letter-spacing: -0.4px;
`;

const RiskSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const RiskSectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: ${T.textMain};
  letter-spacing: -0.3px;

  svg { color: #475569; }
`;

const CauseBox = styled.div`
  padding: 14px 16px;
  border-radius: 8px;
  background: #F8FAFC;
  border: 1px solid #EEF2F6;
  display: flex;
  flex-direction: column;
  gap: 10px;

  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
    font-weight: 500;
    color: #334155;
    letter-spacing: -0.2px;
  }

  b { color: ${T.primary}; font-weight: 700; }
`;

const GuideList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const GuideItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
`;

const GuideNumber = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: ${T.textMain};
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const GuideText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const GuideTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${T.textMain};
  letter-spacing: -0.3px;
`;

const GuideDesc = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #64748B;
  line-height: 1.5;
  letter-spacing: -0.2px;
`;

const RiskFooter = styled.div`
  flex-shrink: 0;
  padding: 14px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FooterStat = styled.div`
  height: 46px;
  padding: 0 16px;
  border-radius: 8px;
  background: ${T.textMain};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FooterLabel = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #94A3B8;
  letter-spacing: -0.2px;
`;

const FooterValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${T.primary};
  letter-spacing: -0.4px;

  small {
    color: #E2E8F0;
    font-size: 14px;
    font-weight: 700;
    margin-right: 7px;
  }
`;

// ---------------------------------------------------------------------------
// Line chart (SVG)
// ---------------------------------------------------------------------------
interface ChartProps {
  axisMin: number;
  axisMax: number;
  /** 정상범위 상한 — 원본에 값이 없으면 null */
  refMax: number | null;
  /** 정상범위 하한 */
  refMin: number | null;
  /** best_value */
  optimal: number | null;
  points: number[];
  active?: boolean;
  /** x축 좌/중앙/우 라벨 (실제 TIMESTAMP) */
  xLabels: [string, string, string];
}

const LineChart = ({
  axisMin,
  axisMax,
  refMax,
  refMin,
  optimal,
  points,
  active,
  xLabels,
}: ChartProps) => {
  const W = 400;
  const H = 230;
  const padL = 46;
  const padR = 46;
  const padT = 18;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const lineColor = active ? T.primary : T.dark;

  // 측정값이 1건뿐일 때 0으로 나누지 않도록 가운데에 찍는다
  const xAt = (i: number) =>
    points.length <= 1 ? padL + plotW / 2 : padL + (plotW * i) / (points.length - 1);
  // 모든 값이 동일하면 축 폭이 0이 되므로 중앙 고정
  const span = axisMax - axisMin;
  const yAt = (v: number) =>
    span === 0 ? padT + plotH / 2 : padT + plotH - ((v - axisMin) / span) * plotH;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(p).toFixed(1)}`)
    .join(' ');

  const lastX = xAt(points.length - 1);
  const lastY = yAt(points[points.length - 1]);

  return (
    <ChartSvg viewBox={`0 0 ${W} ${H}`} role="img">
      {/* plot area */}
      <rect x={padL} y={padT} width={plotW} height={plotH} rx="6" fill={active ? 'rgba(193,18,79,0.05)' : '#F8FAFC'} />

      {/* Max / Min reference lines */}
      {refMax !== null && (
        <>
          <line x1={padL} y1={yAt(refMax)} x2={W - padR} y2={yAt(refMax)} stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="5 5" />
          <text x={padL + 6} y={yAt(refMax) - 7} fontSize="12" fontWeight="600" fill="#94A3B8">Max ({refMax})</text>
        </>
      )}

      {refMin !== null && (
        <>
          <line x1={padL} y1={yAt(refMin)} x2={W - padR} y2={yAt(refMin)} stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="5 5" />
          <text x={padL + 6} y={yAt(refMin) + 16} fontSize="12" fontWeight="600" fill="#94A3B8">Min ({refMin})</text>
        </>
      )}

      {/* optimal (green) */}
      {optimal !== null && (
        <>
          <line x1={padL} y1={yAt(optimal)} x2={W - padR} y2={yAt(optimal)} stroke={T.green} strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
          <text x={W - padR} y={yAt(optimal) + 17} fontSize="12" fontWeight="700" fill={T.green} textAnchor="end">최적값</text>
        </>
      )}

      {/* measured series */}
      <path d={path} fill="none" stroke={lineColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="5" fill={lineColor} />
      <text x={lastX - 10} y={lastY - 9} fontSize="12" fontWeight="700" fill={lineColor} textAnchor="end">측정값</text>

      {/* left axis labels */}
      <text x={padL - 10} y={yAt(axisMax) + 4} fontSize="12" fontWeight="600" fill="#64748B" textAnchor="end">{axisMax}</text>
      {optimal !== null && (
        <text x={padL - 10} y={yAt(optimal) + 4} fontSize="12" fontWeight="600" fill="#64748B" textAnchor="end">{optimal}</text>
      )}
      <text x={padL - 10} y={yAt(axisMin) + 4} fontSize="12" fontWeight="600" fill="#64748B" textAnchor="end">{axisMin}</text>

      {/* x axis labels — 실제 TIMESTAMP 기준 */}
      <text x={padL} y={H - 9} fontSize="12" fontWeight="600" fill="#94A3B8" textAnchor="start">{xLabels[0]}</text>
      <text x={padL + plotW / 2} y={H - 9} fontSize="12" fontWeight="600" fill="#94A3B8" textAnchor="middle">{xLabels[1]}</text>
      <text x={W - padR} y={H - 9} fontSize="12" fontWeight="600" fill="#94A3B8" textAnchor="end">{xLabels[2]}</text>
    </ChartSvg>
  );
};

// ---------------------------------------------------------------------------
// Derivation helpers — 원본 API 값에서 화면 표시값을 계산한다
// ---------------------------------------------------------------------------
const fmt = (value: number, digits = 1) => value.toFixed(digits);

/** 상태 심각도 순위 (정렬/최악 센서 선정용) */
const STATUS_RANK: Record<FoamingStatus, number> = {
  critical: 3,
  warn: 2,
  normal: 1,
  unknown: 0,
};

const STATUS_TEXT: Record<FoamingStatus, string> = {
  critical: '주의 (임계)',
  warn: '주의 (경계)',
  normal: '정상',
  unknown: '판정 불가',
};

/** 정상범위·최적값·실측값을 모두 담도록 y축 범위를 잡고 여유를 둔다 */
function axisRange(series: FoamingSensorSeries, points: number[]) {
  const candidates = [...points, series.lower, series.upper, series.optimal].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v)
  );

  if (!candidates.length) return { axisMin: 0, axisMax: 1 };

  const lo = Math.min(...candidates);
  const hi = Math.max(...candidates);
  const pad = (hi - lo) * 0.12 || Math.max(Math.abs(hi) * 0.1, 1);

  return {
    axisMin: Math.floor(lo - pad),
    axisMax: Math.ceil(hi + pad),
  };
}

/** x축 좌/중앙/우 라벨을 실제 TIMESTAMP에서 뽑는다 */
function xAxisLabels(timestamps: string[]): [string, string, string] {
  if (!timestamps.length) return ['-', '-', '-'];

  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  const mid = timestamps[Math.floor((timestamps.length - 1) / 2)];

  // "08:07:16" → "08:07" (초는 라벨에서 생략)
  const short = (t: string) => t.slice(0, 5);
  return [short(first), short(mid), short(last)];
}

interface LogRowData {
  time: string;
  sensor: string;
  event: string;
  tone: 'critical' | 'warn';
  value: string;
  delta: string;
}

/** 최우선 조치 권고 문구 — 최신값이 기준을 어떻게 벗어났는지 서술한다 */
function priorityHeadline(series: FoamingSensorSeries): string {
  const { name, unit, status, breach, latest, upper, lower } = series;

  if (!latest) return `${name} : 측정값 없음`;

  if (status === 'critical') {
    const direction = breach > 0 ? '상한 초과' : '하한 미달';
    return `${name} : ${direction} (${breach > 0 ? '+' : ''}${fmt(breach)} ${unit})`;
  }

  if (status === 'warn') {
    const toUpper = upper !== null ? upper - latest.value : Infinity;
    const toLower = lower !== null ? latest.value - lower : Infinity;
    const edge = toUpper <= toLower ? '상한' : '하한';
    const gap = Math.min(toUpper, toLower);
    return `${name} : ${edge} 임계점 접근 (여유 ${fmt(gap)} ${unit})`;
  }

  if (status === 'normal') return `${name} : 정상 범위 유지`;
  return `${name} : 기준값 미설정으로 판정 불가`;
}

/** 원인 추론 박스의 첫 문장 — 관측된 사실만 서술한다 (추정 없음) */
function observedFact(
  series: FoamingSensorSeries | null,
  isLoading: boolean
): React.ReactNode {
  if (!series || !series.latest) {
    return isLoading ? '센서 데이터를 수신하는 중입니다.' : '판정할 센서 데이터가 없습니다.';
  }

  const { name, unit, latest, lower, upper, status } = series;
  const current = `${fmt(latest.value)}${unit}`;

  if (status === 'critical' && upper !== null && latest.value > upper) {
    return (
      <>
        현재 <b>{name}가 상한 임계치({upper}{unit})를 초과</b>했습니다 (측정값 {current}, {latest.timestamp}).
      </>
    );
  }

  if (status === 'critical' && lower !== null && latest.value < lower) {
    return (
      <>
        현재 <b>{name}가 하한 임계치({lower}{unit})를 밑돌고</b> 있습니다 (측정값 {current}, {latest.timestamp}).
      </>
    );
  }

  if (status === 'warn' && upper !== null && lower !== null) {
    const nearUpper = upper - latest.value <= latest.value - lower;
    const edge = nearUpper ? upper : lower;
    const word = nearUpper ? '상한' : '하한';
    return (
      <>
        현재 <b>{name}가 {word} 임계치({edge}{unit})에 근접</b>했습니다 (측정값 {current}, {latest.timestamp}).
      </>
    );
  }

  if (status === 'normal' && lower !== null && upper !== null) {
    return (
      <>
        현재 <b>{name}는 정상범위({lower}~{upper}{unit}) 내</b>에 있습니다 (측정값 {current}, {latest.timestamp}).
      </>
    );
  }

  return (
    <>
      현재 <b>{name}</b> 측정값은 {current}이며, 기준값이 없어 판정할 수 없습니다.
    </>
  );
}

/** 정상범위를 벗어났거나 경계에 근접한 측정만 로그로 뽑는다 */
function buildLogRows(allSeries: FoamingSensorSeries[]): LogRowData[] {
  const rows: LogRowData[] = [];

  for (const series of allSeries) {
    const { lower, upper, unit, name } = series;
    if (lower === null || upper === null) continue;

    const margin = (upper - lower) * WARN_MARGIN_RATIO;

    for (const reading of series.readings) {
      const { value, timestamp } = reading;
      let tone: 'critical' | 'warn';
      let event: string;
      let delta: string;

      if (value > upper) {
        tone = 'critical';
        event = '상한 초과';
        delta = `+${fmt(value - upper)} ${unit} 초과`;
      } else if (value < lower) {
        tone = 'critical';
        event = '하한 미달';
        delta = `${fmt(value - lower)} ${unit} 미달`;
      } else if (margin > 0 && upper - value <= margin) {
        tone = 'warn';
        event = '상한 임계점 접근';
        delta = `상한까지 ${fmt(upper - value)} ${unit}`;
      } else if (margin > 0 && value - lower <= margin) {
        tone = 'warn';
        event = '하한 임계점 접근';
        delta = `하한까지 ${fmt(value - lower)} ${unit}`;
      } else {
        continue;
      }

      rows.push({
        time: timestamp,
        sensor: name,
        event,
        tone,
        value: `${fmt(value)} ${unit}`,
        delta,
      });
    }
  }

  // 최신 발생순
  return rows
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, LIVE_LOG_LIMIT);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function FoamingInspectionDev() {
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_PROCESS);
  const activeLabel = PROCESS_TABS.find((t) => t.id === activeTab)?.label ?? `${activeTab} 공정`;

  const { data, isInitialLoading, error } = useFoamingSensor(activeTab);

  // `?? []`를 인라인으로 두면 렌더마다 새 배열이 되어 아래 useMemo가 무력해진다
  const series = useMemo(() => data?.series ?? [], [data]);

  /** 차트 카드용 표시 데이터 */
  const charts = useMemo(
    () =>
      series.map((s, idx) => {
        const recent = s.readings.slice(-CHART_POINT_LIMIT);
        const points = recent.map((r) => r.value);
        const { axisMin, axisMax } = axisRange(s, points);

        return {
          key: s.seq,
          index: idx + 1,
          name: s.name,
          unit: s.unit,
          value: s.latest ? fmt(s.latest.value) : '-',
          status: s.status,
          axisMin,
          axisMax,
          refMax: s.upper,
          refMin: s.lower,
          optimal: s.optimal,
          points,
          xLabels: xAxisLabels(recent.map((r) => r.timestamp)),
        };
      }),
    [series]
  );

  /** 가장 심각한 센서 — 차트 강조와 최우선 조치 권고에 사용 */
  const worstSeries = useMemo(() => {
    if (!series.length) return null;
    return series.reduce(
      (worst, s) => (STATUS_RANK[s.status] > STATUS_RANK[worst.status] ? s : worst),
      series[0]
    );
  }, [series]);

  const logRows = useMemo(() => buildLogRows(series), [series]);

  const overallStatus: FoamingStatus = worstSeries?.status ?? 'unknown';
  const isDanger = overallStatus === 'critical' || overallStatus === 'warn';

  return (
    <>
      <GlobalStyle />
      <Page>
        <TabBar>
          <TabGroup>
            {PROCESS_TABS.map((tab) => {
              // 이상 표시는 조회 중인 공정에만 붙는다 (다른 공정은 폴링하지 않음)
              const hasAlert = activeTab === tab.id && overallStatus === 'critical';

              return (
                <Tab
                  key={tab.id}
                  type="button"
                  $active={activeTab === tab.id}
                  $error={hasAlert}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {hasAlert && <TabDot />}
                  {tab.label}
                </Tab>
              );
            })}
          </TabGroup>
        </TabBar>

        <Body>
          <LeftColumn>
            <OverviewCard>
              <OverviewHeader>
                <ProcessTitle>{activeLabel}</ProcessTitle>
                <HeaderStats>
                  <Stat>
                    <StatLabel>총 생산갯수</StatLabel>
                    <StatValue>
                      1,245 <small>개</small>
                    </StatValue>
                  </Stat>
                  <Stat>
                    <StatLabel>설비 이상징후 결과</StatLabel>
                    <StatValue $danger={isDanger}>{STATUS_TEXT[overallStatus]}</StatValue>
                  </Stat>
                </HeaderStats>
              </OverviewHeader>

              {charts.length === 0 ? (
                <EmptyState>
                  {isInitialLoading
                    ? '센서 데이터를 불러오는 중입니다…'
                    : error ?? '표시할 센서 데이터가 없습니다.'}
                </EmptyState>
              ) : (
                <ChartRow>
                  {charts.map((c) => {
                    const active = worstSeries?.seq === c.key;

                    return (
                      <ChartCard key={c.key} $active={active}>
                        <ChartHead>
                          <ChartTitleGroup>
                            <ChartIndex $active={active}>{c.index}</ChartIndex>
                            <ChartName $active={active} title={c.name}>{c.name}</ChartName>
                          </ChartTitleGroup>
                          <ChartValue $active={active}>
                            {c.value} <small>{c.unit}</small>
                          </ChartValue>
                        </ChartHead>
                        <LineChart
                          axisMin={c.axisMin}
                          axisMax={c.axisMax}
                          refMax={c.refMax}
                          refMin={c.refMin}
                          optimal={c.optimal}
                          points={c.points}
                          active={active}
                          xLabels={c.xLabels}
                        />
                      </ChartCard>
                    );
                  })}
                </ChartRow>
              )}
            </OverviewCard>

            <LogCard>
              <LogHeader>
                <LogTitle>실시간 안전 감지 로그</LogTitle>
                <LiveBadge $offline={Boolean(error)}>
                  {error ? '연결 오류 — 마지막 수신 데이터' : 'LIVE'}
                </LiveBadge>
              </LogHeader>
              <LogTable>
                <LogHeadRow>
                  <span>발생시간</span>
                  <span>센서 위치</span>
                  <span>이벤트 상세</span>
                  <span>측정값</span>
                  <span>기준치 대비</span>
                </LogHeadRow>
                {logRows.length === 0 ? (
                  <EmptyState>
                    {isInitialLoading
                      ? '감지 로그를 불러오는 중입니다…'
                      : '정상범위를 벗어난 측정이 없습니다.'}
                  </EmptyState>
                ) : (
                  logRows.map((row, idx) => (
                    <LogRow key={`${row.sensor}-${row.time}-${idx}`}>
                      <LogCellTime>{row.time}</LogCellTime>
                      <LogCellSensor>{row.sensor}</LogCellSensor>
                      <EventPill $tone={row.tone}>{row.event}</EventPill>
                      <LogValue $tone={row.tone === 'critical' ? 'critical' : undefined}>{row.value}</LogValue>
                      <LogValue $tone={row.tone}>{row.delta}</LogValue>
                    </LogRow>
                  ))
                )}
              </LogTable>
            </LogCard>
          </LeftColumn>

          {/* 오른쪽: AI 실시간 위험 진단 (공정재고 페이지와 동일) */}
          <RiskPanel>
            <RiskHeader>
              <RiskHeaderTitle>AI 실시간 위험 진단</RiskHeaderTitle>
              <AnalyzingBadge>
                <PulseDot /> 분석 중
              </AnalyzingBadge>
            </RiskHeader>

            <RiskBody>
              <PriorityAlert>
                <PriorityIcon>
                  <FiAlertTriangle size={22} />
                </PriorityIcon>
                <PriorityTextGroup>
                  <PriorityLabel>최우선 조치 권고</PriorityLabel>
                  <PriorityMain>
                    {worstSeries
                      ? priorityHeadline(worstSeries)
                      : isInitialLoading
                        ? '센서 데이터 수신 대기 중'
                        : '감지된 센서가 없습니다'}
                  </PriorityMain>
                </PriorityTextGroup>
              </PriorityAlert>

              <RiskSection>
                <RiskSectionTitle>
                  <FiSearch size={17} /> 원인 추론
                </RiskSectionTitle>
                <CauseBox>
                  {/* 관측 사실은 API 값에서 그대로 서술한다 */}
                  <p>{observedFact(worstSeries, isInitialLoading)}</p>
                  {/* 원인 가설은 현재 API가 제공하지 않는 정보다.
                      추론 엔진이 붙기 전까지는 고정 문구를 유지한다. */}
                  <p>
                    패턴 매칭 결과, <b>온조기(Chiller) 냉각수 펌프 성능 저하 또는 필터 막힘</b>으로 열교환 효율이 떨어졌을 확률이 높습니다.
                  </p>
                </CauseBox>
              </RiskSection>

              <RiskSection>
                <RiskSectionTitle>
                  <FiActivity size={17} /> 권장 조치 가이드
                </RiskSectionTitle>
                <GuideList>
                  <GuideItem>
                    <GuideNumber>1</GuideNumber>
                    <GuideText>
                      <GuideTitle>온조 #1 공급수압력 점검</GuideTitle>
                      <GuideDesc>냉각수 유량이 충분한지 칠러 압력을 확인하십시오.</GuideDesc>
                    </GuideText>
                  </GuideItem>
                  <GuideItem>
                    <GuideNumber>2</GuideNumber>
                    <GuideText>
                      <GuideTitle>R액 탱크 자켓 세척</GuideTitle>
                      <GuideDesc>냉각수 라인 이상이 없다면 자켓 내부 스케일을 점검하십시오.</GuideDesc>
                    </GuideText>
                  </GuideItem>
                </GuideList>
              </RiskSection>
            </RiskBody>

            <RiskFooter>
              <FooterStat>
                <FooterLabel>AI 추론 신뢰도</FooterLabel>
                <FooterValue>96.8%</FooterValue>
              </FooterStat>
              <FooterStat>
                <FooterLabel>유사 패턴 발생 이력</FooterLabel>
                <FooterValue>
                  <small>최근 30일</small> 2건
                </FooterValue>
              </FooterStat>
            </RiskFooter>
          </RiskPanel>
        </Body>
      </Page>
    </>
  );
}
