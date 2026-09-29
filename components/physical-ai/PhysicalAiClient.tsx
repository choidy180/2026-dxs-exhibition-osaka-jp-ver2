"use client";

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, ThemeProvider, createGlobalStyle } from 'styled-components';
import { 
  Activity, User, Cpu, FileText, 
  CheckCircle2, AlertTriangle, XCircle, 
  BarChart3, Users, Layers,
  Clock, Thermometer, Droplets // 아이콘 추가
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 0. Global Style (Pretendard Font) ---
const GlobalStyle = createGlobalStyle`

  * {
    font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif !important;
  }

  body {
    margin: 0; padding: 0; overflow: hidden;
  }
`;

// --- 1. Theme Definition ---
const theme = {
  bg: '#F8FAFC', cardBg: '#FFFFFF', text: '#1E293B', textSub: '#64748B',
  border: '#E2E8F0', accent: '#0EA5E9', accentBg: 'rgba(14, 165, 233, 0.1)',
  success: '#10B981', warning: '#F59E0B', critical: '#EF4444',
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  videoBorder: '#334155'
};

type MyThemeType = typeof theme;
declare module 'styled-components' {
  export interface DefaultTheme extends MyThemeType {
    readonly __physicalAiTheme?: never;
  }
}

// --- Types ---
type StatusType = '정상' | '주의' | '위험';

interface LogData {
  id: string; timestamp: string; item: string; workerId: string;
  joints: number; status: StatusType; confidence: number;
}

interface StatsData {
  totalLogs: number;
  uniqueWorkers: number;
  statusCounts: {
    정상: number;
    주의: number;
    위험: number;
  };
}

// --- Mock Data ---
const ITEMS = [
  '대차 견인 이동', '자재 적재 상태 확인', '통로 진입', 
  '안전거리 유지', '정지/대기 중', '자재 낙하 감지', '교차로 진입'
];
const WORKERS = ['작업자-A', '작업자-B', '작업자-C', '관리자-01', '작업자-D'];

const generateLog = (): LogData => {
  const now = new Date();
  const timeString = now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const status = Math.random() > 0.8 ? (Math.random() > 0.5 ? '주의' : '위험') : '정상';
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: timeString,
    item: ITEMS[Math.floor(Math.random() * ITEMS.length)],
    workerId: WORKERS[Math.floor(Math.random() * WORKERS.length)],
    joints: Math.floor(Math.random() * 5) + 15,
    status: status as StatusType,
    confidence: Math.floor(Math.random() * (99 - 85) + 85)
  };
};

export default function PhysicalAIDashboard() {
  const [logs, setLogs] = useState<LogData[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalLogs: 1420, uniqueWorkers: 3,
    statusCounts: { 정상: 1200, 주의: 150, 위험: 70 }
  });
  
  // 날씨 및 시간 상태 추가
  const [currentTime, setCurrentTime] = useState<string>('');
  const [weather, setWeather] = useState<{temp: number, humidity: number} | null>(null);

  const workerSetRef = useRef<Set<string>>(new Set(WORKERS.slice(0, 3)));
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // 영상 자동 재생
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(console.error);
    }
  }, []);

  // 시간 및 날씨 데이터 로직
  useEffect(() => {
    // 1. 시간 업데이트 (1초마다)
    const updateTime = () => {
      const now = new Date();
      // 오후 02:30 형식
      setCurrentTime(now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })); 
    };
    updateTime();
    const timeInterval = setInterval(updateTime, 1000);

    // 2. 부산 날씨 가져오기 (Open-Meteo API 사용)
    const fetchWeather = () => setWeather({ temp: 24, humidity: 48 });
    fetchWeather();
    // 날씨는 자주 바뀔 필요 없으므로 10분(600000ms)마다 갱신하거나 한 번만 호출
    const weatherInterval = setInterval(fetchWeather, 600000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(weatherInterval);
    };
  }, []);

  // 데이터 생성 로직
  useEffect(() => {
    const initialLogsTimer = window.setTimeout(() => {
      setLogs(Array.from({ length: 12 }).map(generateLog));
    }, 0);
    
    const interval = setInterval(() => {
      const newLog = generateLog();
      setLogs(prev => {
        const newLogs = [...prev, newLog];
        if (newLogs.length > 20) return newLogs.slice(newLogs.length - 20);
        return newLogs;
      });
      workerSetRef.current.add(newLog.workerId);
      setStats(prev => ({
        totalLogs: prev.totalLogs + 1,
        uniqueWorkers: workerSetRef.current.size,
        statusCounts: { ...prev.statusCounts, [newLog.status]: prev.statusCounts[newLog.status] + 1 }
      }));
    }, 800);
    return () => {
      window.clearTimeout(initialLogsTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      
      <Container>
        <Header>
          <Brand>
            <LogoIcon><Cpu size={20} color="#fff" /></LogoIcon>
            <div>
              <Title>Warehouse <span style={{color: theme.accent}}>Safety AI</span></Title>
              <SubTitle>대차 이동 및 자재 운반 안전 관제 시스템</SubTitle>
            </div>
          </Brand>
          <StatusGroup>
            <StatusItem>
              <Label>모니터링 구역</Label><Value>자재 출고 A-01</Value>
            </StatusItem>
            <Divider />
            <StatusItem>
              <Label>시스템 상태</Label><Value style={{color: theme.success}}>정상 가동 중</Value>
            </StatusItem>
          </StatusGroup>
        </Header>

        <Main>
          <VideoCard>
            <VideoWrapper>
              <LocalVideo 
                ref={videoRef}
                src="/videos/aivideo.mp4" 
                loop muted playsInline 
              />
              <Overlay>
                <Grid />
                
                {/* 상단 오버레이 그룹 (좌: Live태그, 우: 날씨/시간) */}
                <TopOverlayRow>
                  <CamTag>
                    <span className="dot" /> CAM-01 (대차 창고) • Live
                  </CamTag>

                  <WeatherWidget>
                    <div className="item">
                      <Clock size={14} /> {currentTime}
                    </div>
                    <div className="bar" />
                    <div className="item">
                      <Thermometer size={14} /> {weather ? `${weather.temp}°C` : '--'}
                    </div>
                    <div className="bar" />
                    <div className="item">
                      <Droplets size={14} /> {weather ? `${weather.humidity}%` : '--'}
                    </div>
                    <div className="loc">Busan</div>
                  </WeatherWidget>
                </TopOverlayRow>

                {/* 하단 현황판 (Modal) */}
                <StatsHud
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <HudItem>
                    <div className="icon-box"><FileText size={18} /></div>
                    <div className="content">
                      <div className="label">Total Logs</div>
                      <div className="value">{stats.totalLogs.toLocaleString()}</div>
                    </div>
                  </HudItem>
                  <HudDivider />
                  <HudItem>
                    <div className="icon-box"><Users size={18} /></div>
                    <div className="content">
                      <div className="label">Workers</div>
                      <div className="value">{stats.uniqueWorkers}명</div>
                    </div>
                  </HudItem>
                  <HudDivider />
                  <HudItem style={{flex: 1.5}}>
                    <div className="icon-box"><BarChart3 size={18} /></div>
                    <div className="content">
                      <div className="label">Status Breakdown</div>
                      <StatusRow>
                        <span className="s-item success"><span className="dot"/> {stats.statusCounts.정상}</span>
                        <span className="s-item warning"><span className="dot"/> {stats.statusCounts.주의}</span>
                        <span className="s-item critical"><span className="dot"/> {stats.statusCounts.위험}</span>
                      </StatusRow>
                    </div>
                  </HudItem>
                </StatsHud>

              </Overlay>
            </VideoWrapper>
          </VideoCard>

          <LogCard>
            <LogHeader>
              <HeaderTitle>
                <Layers size={18} color={theme.accent} /> 실시간 안전 감지 로그
              </HeaderTitle>
              <LiveIndicator><div className="dot" /> LIVE</LiveIndicator>
            </LogHeader>

            <ColHeader>
              <span style={{width: '70px'}}>시간</span><span style={{flex: 1}}>탐지 항목</span>
              <span style={{width: '80px'}}>작업자</span><span style={{width: '60px'}}>신뢰도</span>
              <span style={{width: '60px', textAlign:'right'}}>상태</span>
            </ColHeader>

            <LogList ref={scrollRef}>
              <AnimatePresence mode='popLayout'>
                {logs.map((log) => (
                  <LogItem key={log.id} $status={log.status} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <TimeText>{log.timestamp}</TimeText>
                    <ItemText>{log.item}</ItemText>
                    <MetaText $width="80px"><User size={12} color={theme.textSub} /> {log.workerId}</MetaText>
                    <MetaText $width="60px"><Activity size={12} color={theme.textSub} /> {log.confidence}%</MetaText>
                    <StatusContainer>
                      {log.status === '정상' && <CheckCircle2 size={14} color={theme.success}/>}
                      {log.status === '주의' && <AlertTriangle size={14} color={theme.warning}/>}
                      {log.status === '위험' && <XCircle size={14} color={theme.critical}/>}
                      <StatusBadge $status={log.status}>{log.status}</StatusBadge>
                    </StatusContainer>
                  </LogItem>
                ))}
              </AnimatePresence>
              <div style={{height: 10}} /> 
            </LogList>
          </LogCard>
        </Main>
      </Container>
    </ThemeProvider>
  );
}

// -------------------------------------------------------------------------
// Styled Components
// -------------------------------------------------------------------------

// --- Layout ---
const Container = styled.div` width: 100%; max-width: 100%; min-width: 0; height: 100vh; height: 100dvh; overflow: hidden; background: ${p=>p.theme.bg}; color: ${p=>p.theme.text}; display: flex; flex-direction: column; `;
const Header = styled.header` width: 100%; max-width: 100%; min-width: 0; height: 64px; flex-shrink: 0; background: ${p=>p.theme.cardBg}; border-bottom: 1px solid ${p=>p.theme.border}; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; box-shadow: ${p=>p.theme.shadow}; z-index: 10; `;
const Brand = styled.div` min-width: 0; display: flex; align-items: center; gap: 12px; `;
const LogoIcon = styled.div` width: 36px; height: 36px; background: #0F172A; border-radius: 8px; display: flex; align-items: center; justify-content: center; `;
const Title = styled.h1` font-size: 18px; font-weight: 800; margin: 0; line-height: 1; letter-spacing: -0.5px; `;
const SubTitle = styled.div` font-size: 12px; color: ${p=>p.theme.textSub}; margin-top: 3px; font-weight: 500; `;
const StatusGroup = styled.div` flex: 0 0 auto; display: flex; align-items: center; gap: 16px; `;
const StatusItem = styled.div` text-align: right; `;
const Label = styled.div` font-size: 11px; color: ${p=>p.theme.textSub}; font-weight: 600; margin-bottom: 2px; `;
const Value = styled.div` font-size: 15px; font-weight: 700; font-family: 'Pretendard', sans-serif; `;
const Divider = styled.div` width: 1px; height: 24px; background: ${p=>p.theme.border}; `;

const Main = styled.main` width: 100%; max-width: 100%; min-width: 0; min-height: 0; flex: 1; padding: 20px; display: flex; gap: 20px; overflow: hidden; `;

// --- Video & HUD ---
const VideoCard = styled.div` flex: 2; min-width: 0; min-height: 0; background: #000; border-radius: 16px; overflow: hidden; position: relative; border: 1px solid ${p=>p.theme.videoBorder}; box-shadow: ${p=>p.theme.shadow}; `;
const VideoWrapper = styled.div` width: 100%; height: 100%; position: relative; background: #000; overflow: hidden; /* 중요: 확대된 비디오 잘리도록 설정 */ `;

// [수정] 비디오 1.1배 확대
const LocalVideo = styled.video` 
  width: 100%; height: 100%; object-fit: cover; opacity: 1; 
  transform: scale(1.15); 
`;

const Overlay = styled.div` position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; padding: 24px; `;
const Grid = styled.div` position: absolute; inset: 0; opacity: 0.15; background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; `;
const pulse = keyframes` 0%{opacity:1} 50%{opacity:0.3} 100%{opacity:1} `;

// [신규] 상단 오버레이 가로 정렬용 컨테이너
const TopOverlayRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
`;

// [수정] align-self 제거 (부모 Flex 제어로 변경)
const CamTag = styled.div` 
  background: rgba(0,0,0,0.7); color: #fff; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; gap: 8px; 
  .dot { width: 8px; height: 8px; background: #EF4444; border-radius: 50%; animation: ${pulse} 2s infinite; } 
`;

// [신규] 우측 상단 날씨 위젯
const WeatherWidget = styled.div`
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  font-feature-settings: "tnum";

  .item { display: flex; align-items: center; gap: 6px; }
  .bar { width: 1px; height: 10px; background: rgba(255,255,255,0.3); }
  .loc { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-left: 4px; }
`;

// 화이트 테마 모달 (Stats HUD)
const StatsHud = styled(motion.div)`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 18px 28px;
  display: flex;
  align-items: center;
  gap: 32px;
  color: #1E293B;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  width: 95%;
  max-width: 100%;
  min-width: 0;
  align-self: center;
  margin-bottom: 10px;
  pointer-events: auto;
`;

const HudItem = styled.div`
  min-width: 0; display: flex; align-items: center; gap: 14px; flex: 1;
  .icon-box { 
    width: 42px; height: 42px; 
    background: #F1F5F9; 
    border-radius: 12px; 
    display: flex; align-items: center; justify-content: center; 
    color: ${p=>p.theme.accent}; 
  }
  .content { display: flex; flex-direction: column; gap: 2px; }
  .label { 
    font-size: 11px; color: #64748B; 
    text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;
  }
  .value { 
    font-size: 20px; font-weight: 800; color: #0F172A; 
    font-family: 'Pretendard', sans-serif; letter-spacing: -0.5px;
  }
`;

const HudDivider = styled.div` width: 1px; height: 32px; background: #E2E8F0; `;

const StatusRow = styled.div`
  display: flex; gap: 16px; font-size: 13px; font-weight: 600;
  .s-item { display: flex; align-items: center; gap: 6px; color: #334155; }
  .dot { width: 8px; height: 8px; border-radius: 50%; }
  .success .dot { background: ${p=>p.theme.success}; }
  .warning .dot { background: ${p=>p.theme.warning}; }
  .critical .dot { background: ${p=>p.theme.critical}; }
`;

// --- Log Section ---
const LogCard = styled.div` flex: 1.2; min-width: 0; min-height: 0; background: ${p=>p.theme.cardBg}; border-radius: 16px; border: 1px solid ${p=>p.theme.border}; display: flex; flex-direction: column; overflow: hidden; box-shadow: ${p=>p.theme.shadow}; `;
const LogHeader = styled.div` padding: 18px 20px; border-bottom: 1px solid ${p=>p.theme.border}; display: flex; justify-content: space-between; align-items: center; background: #fff; `;
const HeaderTitle = styled.div` font-size: 16px; font-weight: 700; color: ${p=>p.theme.text}; display: flex; align-items: center; gap: 8px; `;
const LiveIndicator = styled.div` font-size: 12px; font-weight: 800; color: #EF4444; display: flex; align-items: center; gap: 6px; .dot { width: 6px; height: 6px; background: #EF4444; border-radius: 50%; animation: ${pulse} 1s infinite; } `;
const ColHeader = styled.div` display: flex; padding: 12px 16px; background: #F1F5F9; font-size: 12px; font-weight: 700; color: ${p=>p.theme.textSub}; border-bottom: 1px solid ${p=>p.theme.border}; `;
const LogList = styled.div` flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0 12px; &::-webkit-scrollbar { display: none; } `;
interface StatusStyleProps { $status: StatusType; }
const LogItem = styled(motion.div)<StatusStyleProps>` display: flex; align-items: center; padding: 12px 4px; border-bottom: 1px solid #F1F5F9; font-size: 14px; background: ${p=>p.$status==='위험'?'#FEF2F2':p.$status==='주의'?'#FFFBEB':'transparent'}; &:last-child { border-bottom: none; } `;
const TimeText = styled.div` width: 70px; font-family: 'Pretendard'; font-variant-numeric: tabular-nums; color: #94A3B8; font-size: 13px; letter-spacing: -0.5px; `;
const ItemText = styled.div` flex: 1; font-weight: 700; color: #334155; `;
interface MetaWidthStyleProps { $width?: string; }
const MetaText = styled.div<MetaWidthStyleProps>` font-size: 13px; color: #64748B; font-weight: 500; display: flex; align-items: center; gap: 5px; width: ${p=>p.$width||'70px'}; `;
const StatusContainer = styled.div` width: 60px; display: flex; align-items: center; justify-content: flex-end; gap: 4px; `;
const StatusBadge = styled.span<StatusStyleProps>` font-size: 13px; font-weight: 700; color: ${p=>p.$status==='위험'?p.theme.critical:p.$status==='주의'?p.theme.warning:p.theme.success}; `;
