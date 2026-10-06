'use client';

import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label
} from 'recharts';
import { BarChart2, TrendingUp, AlertCircle, HelpCircle, ChevronDown, Truck } from 'lucide-react';

// --- Types & Interfaces ---
interface DataPoint {
  name?: string;
  date?: string;
  value: number;
  type: 'actual' | 'interpolated' | 'mixed' | 'prediction';
  isCurrent?: boolean;
}

// --- Mock Data ---
const dailyData: DataPoint[] = [
  { date: '01/06 (월)', value: 52000, type: 'actual' },
  { date: '01/07 (화)', value: 74000, type: 'actual' },
  { date: '01/08 (수)', value: 138000, type: 'actual' },
  { date: '01/09 (목)', value: 71000, type: 'actual' },
  { date: '01/10 (금)', value: 235000, type: 'actual' },
  { date: '01/11 (토)', value: 12000, type: 'actual' },
  { date: '01/12 (일)', value: 28000, type: 'interpolated' },
];

const generateWeeklyData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  for (let i = 1; i <= 6; i++) {
    data.push({ name: `W${i}`, value: Math.floor(Math.random() * 400000) + 200000, type: 'interpolated' });
  }
  data.push({ name: '이번 주', value: 456456, type: 'mixed', isCurrent: true });
  for (let i = 1; i <= 10; i++) {
    data.push({ name: `+W${i}`, value: Math.floor(Math.random() * 100000) + 350000, type: 'prediction' });
  }
  return data;
};
const weeklyData = generateWeeklyData();

// --- Colors ---
const COLORS = {
  actual: '#10B981',       // Emerald
  interpolated: '#F59E0B', // Amber
  mixed: '#3B82F6',        // Blue
  prediction: '#8B5CF6',   // Violet
  bgGray: '#F9FAFB',
  textMain: '#111827',
  textSub: '#6B7280',
};

// --- Styled Components ---

const Container = styled.div`
  /* 수정됨: 높이를 정확히 고정하고 내부 스크롤 처리 */
  height: 100vh;
  overflow-y: auto;

  background-color: ${COLORS.bgGray};
  padding: 2rem;
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: ${COLORS.textMain};
  box-sizing: border-box;

  /* 스크롤바 스타일링 (선택사항 - 크롬/사파리) */
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #D1D5DB;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
`;

const IconBox = styled.div`
  padding: 0.75rem;
  background-color: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    color: ${COLORS.mixed};
  }
`;

const TitleArea = styled.div`
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.025em;
  }
`;

const SubInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${COLORS.textSub};
  margin-top: 0.25rem;
`;

const ping = keyframes`
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
`;

const LiveIndicator = styled.span`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: #EF4444;
  font-weight: 500;
`;

const PulseDot = styled.span`
  position: relative;
  display: flex;
  height: 0.5rem;
  width: 0.5rem;

  &::before {
    content: '';
    position: absolute;
    display: inline-flex;
    height: 100%;
    width: 100%;
    border-radius: 9999px;
    background-color: #F87171;
    opacity: 0.75;
    animation: ${ping} 1s cubic-bezier(0, 0, 0.2, 1) infinite;
  }

  &::after {
    content: '';
    position: relative;
    display: inline-flex;
    border-radius: 9999px;
    height: 0.5rem;
    width: 0.5rem;
    background-color: #EF4444;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Card = styled.div<{ $highlight?: boolean }>`
  background-color: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: ${props => props.$highlight
    ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'};
  border: 1px solid ${props => props.$highlight ? 'transparent' : '#F3F4F6'};
  border-left: ${props => props.$highlight ? `4px solid ${COLORS.mixed}` : '1px solid #F3F4F6'};
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
`;

const CardHeader = styled.div<{ $color?: string }>`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;

  span {
    font-size: 0.875rem;
    font-weight: ${props => props.$color ? '700' : '500'};
    color: ${props => props.$color || COLORS.textSub};
  }
`;

const CardValue = styled.div`
  font-size: 1.875rem;
  font-weight: 700;
  color: ${COLORS.textMain};
  margin-bottom: 1rem;
`;

const Badge = styled.div<{ $variant: 'yellow' | 'blue' | 'purple' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;

  ${props => props.$variant === 'yellow' && css`
    background-color: #FFFBEB;
    color: #B45309;
  `}
  ${props => props.$variant === 'blue' && css`
    background-color: #EFF6FF;
    color: #1D4ED8;
  `}
  ${props => props.$variant === 'purple' && css`
    background-color: #F5F3FF;
    color: #6D28D9;
  `}
`;

const Section = styled.section`
  background-color: white;
  border-radius: 1.5rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  border: 1px solid #F3F4F6;
  padding: 2rem;
`;

const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${COLORS.textMain};
  margin: 0;
`;

const ToggleContainer = styled.div`
  background-color: #F3F4F6;
  padding: 0.25rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
`;

const ToggleBtn = styled.button<{ $active: boolean; $color: string }>`
  padding: 0.375rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
  background-color: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? props.$color : '#6B7280'};
  box-shadow: ${props => props.$active ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'};

  &:hover {
    color: ${props => !props.$active && '#374151'};
  }
`;

const DateSelectBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #F9FAFB;
  border: 1px solid #E5E7EB;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #4B5563;
  cursor: pointer;

  &:hover {
    background-color: #F3F4F6;
  }
`;

const ChartContainer = styled.div`
  height: 400px;
  width: 100%;
`;

const TooltipBox = styled.div`
  background-color: white;
  padding: 0.75rem;
  border: 1px solid #F3F4F6;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  z-index: 50;
`;

const TooltipLabel = styled.p`
  font-weight: 700;
  color: #374151;
  margin-bottom: 0.25rem;
`;

const TooltipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Legend = styled.div`
  margin-top: 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
  font-size: 0.75rem;
  color: ${COLORS.textSub};
  border-top: 1px solid #F3F4F6;
  padding-top: 1.5rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Dot = styled.span<{ $color: string }>`
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  background-color: ${props => props.$color};
`;

// --- Component ---

  const getBarColor = (entry: DataPoint) => {
    return COLORS[entry.type] || COLORS.actual;
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: readonly { payload: DataPoint; fill?: string; value?: number | string }[]; label?: React.ReactNode }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as DataPoint;
      return (
        <TooltipBox>
          <TooltipLabel>{label}</TooltipLabel>
          <TooltipRow>
            <Dot $color={payload[0].fill || getBarColor(data)} style={{ width: 8, height: 8 }} />
            <span style={{ color: '#6B7280' }}>출하량:</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>
              {Number(payload[0].value ?? 0).toLocaleString('ko-KR')} EA
            </span>
          </TooltipRow>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
            {data.type === 'interpolated' ? '⚠️ 데이터 보간됨' :
             data.type === 'prediction' ? '🔮 AI 예측값' : '✅ 확정 실적'}
          </p>
        </TooltipBox>
      );
    }
    return null;
  };


const ShipmentManagementPage = () => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  return (
    <Container>

      {/* Header */}
      <Header>
        <IconBox>
          <Truck size={24} />
        </IconBox>
        <TitleArea>
          <h1>주간/월간 출하관리 시스템</h1>
          <SubInfo>
            <LiveIndicator>
              <PulseDot />
              실시간 모니터링
            </LiveIndicator>
            <span>| 기준일: 2026-01-15 (이번 주: 01/12~01/18)</span>
          </SubInfo>
        </TitleArea>
      </Header>

      {/* Summary Cards */}
      <Grid data-demo="shipment-metrics">
        {/* Card 1 */}
        <Card>
          <CardHeader>
            <span>지난주 출하 (01/05~01/11)</span>
            <HelpCircle size={16} color="#D1D5DB" />
          </CardHeader>
          <CardValue>455,986 EA</CardValue>
          <Badge $variant="yellow">
             <AlertCircle size={12} />
             실적 0일 + 보간 7일
          </Badge>
        </Card>

        {/* Card 2 (Highlight) */}
        <Card $highlight>
          <CardHeader $color={COLORS.mixed}>
            <span>이번주 출하 (01/12~01/18)</span>
            <HelpCircle size={16} color="#D1D5DB" />
          </CardHeader>
          <CardValue>456,456 EA</CardValue>
          <Badge $variant="blue">
             <TrendingUp size={12} />
             실적 0일 + 보간 3일 + 예측 4일
          </Badge>
        </Card>

        {/* Card 3 */}
        <Card>
          <CardHeader>
            <span>다음주 예상 (01/19~01/25)</span>
            <HelpCircle size={16} color="#D1D5DB" />
          </CardHeader>
          <CardValue>456,930 EA</CardValue>
          <Badge $variant="purple">
             <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>AI</div>
             예측 데이터
          </Badge>
        </Card>
      </Grid>

      {/* Main Chart Section */}
      <Section>

        {/* Controls */}
        <SectionHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <SectionTitle>
              <BarChart2 size={20} color="#9CA3AF" />
              출하량 추이 (Shipment Trend)
            </SectionTitle>

            <ToggleContainer>
              <ToggleBtn
                $active={viewMode === 'weekly'}
                $color={COLORS.mixed}
                data-demo="shipment-weekly" onClick={() => setViewMode('weekly')}
              >
                주간 보기
              </ToggleBtn>
              <ToggleBtn
                $active={viewMode === 'daily'}
                $color={COLORS.actual}
                data-demo="shipment-daily" onClick={() => setViewMode('daily')}
              >
                일별 보기
              </ToggleBtn>
            </ToggleContainer>
          </div>

          <DateSelectBtn>
            {viewMode === 'daily' ? '01/06 ~ 01/12' : '2025.12 ~ 2026.03'}
            <ChevronDown size={16} />
          </DateSelectBtn>
        </SectionHeader>

        {/* Chart Area */}
        <ChartContainer data-demo="shipment-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={viewMode === 'daily' ? dailyData : weeklyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              barSize={viewMode === 'daily' ? 60 : 20}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey={viewMode === 'daily' ? 'date' : 'name'}
                axisLine={false}
                tickLine={false}
                dy={10}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6', opacity: 0.5 }} />

              {viewMode === 'weekly' && (
                <ReferenceLine x="이번 주" stroke={COLORS.mixed} strokeDasharray="3 3">
                  <Label
                    value="This Week"
                    position="top"
                    fill={COLORS.mixed}
                    fontSize={12}
                    fontWeight="bold"
                  />
                </ReferenceLine>
              )}

              <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1000}>
                {
                  (viewMode === 'daily' ? dailyData : weeklyData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Legend */}
        <Legend>
          <LegendItem>
            <Dot $color={COLORS.actual} />
            <span>확정 실적 (Actual)</span>
          </LegendItem>
          <LegendItem>
            <Dot $color={COLORS.interpolated} />
            <span>보간 (Interpolated)</span>
          </LegendItem>
          <LegendItem>
            <Dot $color={COLORS.mixed} />
            <span>혼합 (Mixed)</span>
          </LegendItem>
          <LegendItem>
            <Dot $color={COLORS.prediction} />
            <span>예측 (Prediction)</span>
          </LegendItem>
        </Legend>

      </Section>
    </Container>
  );
};

export default ShipmentManagementPage;