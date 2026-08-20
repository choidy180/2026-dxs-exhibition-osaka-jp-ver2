"use client";

import React, { useState, useMemo, useLayoutEffect } from "react";
import styled, { keyframes } from "styled-components";
import axios from "axios";
import { Cloud, Sun, CloudRain, Navigation, Truck, Activity, Bell, AlertTriangle, CheckCircle, Radio, Server, Zap, BarChart2, Siren } from "lucide-react";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import VehicleStatusCard from "./vehicle-status-card";

// ✅ 지도 로딩 (SSR 끔)
const VWorldMap = dynamic(
  () => import("@/components/vworld-map"),
  { ssr: false }
);

/* --- Types & Constants --- */

// [수정 1] id 속성 추가 (VWorldMap 컴포넌트의 요구사항에 맞춤)
export interface VWorldMarker {
  id: string; // ✅ 필수 속성 추가
  lat: number;
  lng: number;
  title?: string;
  imageUrl?: string;
  isFacility?: boolean;
  startLat?: number;
  startLng?: number;
  destLat?: number;
  destLng?: number;
  arrival?: string;
  progress?: number;
}

const RED_ARROW_ICON = "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='%23ef4444' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M12 2l7 19-7-4-7 4 7-19z'/%3e%3c/svg%3e";

// [수정 2] 정적 위치 데이터에 고유 ID 추가
const GOMOTEK_POS = {
  id: "loc-gomotek", // ✅ ID 추가
  lat: 35.1487345915681,
  lng: 128.859885213411,
  title: "고모텍 부산",
  imageUrl: "/icons/GMT.png"
};

const LG_POS = {
  id: "loc-lg", // ✅ ID 추가
  lat: 35.2078432680624,
  lng: 128.666263957419,
  title: "LG전자",
  imageUrl: "/icons/LG.jpg"
};

const FACILITY_MARKERS: VWorldMarker[] = [
  { ...GOMOTEK_POS, isFacility: true },
  { ...LG_POS, isFacility: true }
];

const formatDuration = (seconds: number) => {
  if (!seconds) return "-";
  const min = Math.floor(seconds / 60);
  const hour = Math.floor(min / 60);
  const remainMin = min % 60;
  if (hour > 0) return `${hour}시간 ${remainMin}분`;
  return `${min}분`;
};

const TRUCK_STATIC_INFO = [
  { driver: "김철수", status: "운행 중 (정상)", cargo: "전자부품 (PCB), 12 PLT", temp: "18°C" },
  { driver: "이영희", status: "운행 중 (지연)", cargo: "사출물, 10 PLT", temp: "22°C" },
  { driver: "박민수", status: "운행 중 (정상)", cargo: "컴프레서 부품, 8 PLT", temp: "20°C" },
  { driver: "최진호", status: "휴식 중", cargo: "포장재, 20 PLT", temp: "상온" },
  { driver: "정수민", status: "운행 중 (정상)", cargo: "모터 Ass'y, 6 PLT", temp: "15°C" },
];

const MOCK_ALERTS = [
  { id: 1, time: "16:20", msg: "GMT-102 도착 완료 (LG전자)", type: "success" },
  { id: 2, time: "16:15", msg: "창원대로 구간 정체 감지", type: "warning" },
  { id: 3, time: "16:05", msg: "GMT-105 운행 시작", type: "info" },
];

export default function LocalMapPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingUI, setShowLoadingUI] = useState(false);

  // Data States
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const isSimulationOn = true;
  const [eta, setEta] = useState({ toBusan: 0, toLG: 0 });
  const [weather, setWeather] = useState({ temp: 0, desc: '-', icon: <Sun size={18} color="#aaa" /> });
  const [focusedTruckId, setFocusedTruckId] = useState<string | null>(null);
  const [hasWarning, setHasWarning] = useState(false);

  useLayoutEffect(() => {
    setIsMounted(true);
    setIsLoading(true);
    setShowLoadingUI(false);

    const showUiTimer = setTimeout(() => setShowLoadingUI(true), 100);
    const finishLoadingTimer = setTimeout(() => setIsLoading(false), 2500);

    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const fetchWeather = async () => {
      try {
        const res = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=35.22&longitude=128.68&current_weather=true&timezone=auto');
        const d = res.data.current_weather;
        let desc = '맑음', icon = <Sun size={18} color="#FDB813" />;
        if (d.weathercode >= 1 && d.weathercode <= 3) { desc = '구름 많음'; icon = <Cloud size={18} color="#A0A0A0" />; }
        else if (d.weathercode >= 51) { desc = '비/눈'; icon = <CloudRain size={18} color="#60A5FA" />; }
        setWeather({ temp: Math.round(d.temperature), desc, icon });
      } catch { }
    };
    fetchWeather();

    const warningExists = MOCK_ALERTS.some(alert => alert.type === 'warning' || alert.msg.includes("정체"));
    setHasWarning(warningExists);

    return () => {
      clearTimeout(showUiTimer);
      clearTimeout(finishLoadingTimer);
      clearInterval(timer);
    };
  }, []);

  const mapMarkers = useMemo(() => {
    const markers: VWorldMarker[] = [...FACILITY_MARKERS];
    if (!currentTime) return markers;

    if (isSimulationOn) {
      for (let i = 0; i < 5; i++) {
        const isToBusan = i % 2 === 0;
        const timeVal = currentTime.getTime();
        const progress = (timeVal / (10000 + i * 2000)) % 1;

        // [수정 3] 시뮬레이션 마커 생성 시 id 속성 추가
        markers.push({
          id: `sim-truck-${i}`, // ✅ ID 추가
          lat: 0, lng: 0,
          title: `Sim-${i + 1}`,
          arrival: isToBusan ? "GMT" : "LG",
          startLat: LG_POS.lat, startLng: LG_POS.lng,
          destLat: GOMOTEK_POS.lat, destLng: GOMOTEK_POS.lng,
          progress: progress,
          imageUrl: RED_ARROW_ICON
        });
      }
    }
    return markers;
  }, [isSimulationOn, currentTime]);

  useLayoutEffect(() => {
    if (isSimulationOn && mapMarkers.length > 2) {
      if (focusedTruckId) return;
      const trucks = mapMarkers.filter(m => !m.isFacility && typeof m.progress === 'number');
      if (trucks.length > 0) {
        const bestTruck = trucks.reduce((prev, curr) => (prev.progress || 0) > (curr.progress || 0) ? prev : curr);
        if (bestTruck.title) setFocusedTruckId(bestTruck.title);
      }
    }
  }, [mapMarkers, isSimulationOn, focusedTruckId]);

  const targetTruck = useMemo(() => {
    if (!currentTime || !isSimulationOn || !focusedTruckId) return null;
    const vehicleMarker = mapMarkers.find(m => m.title === focusedTruckId);
    if (!vehicleMarker) return null;

    const truckIndex = parseInt(vehicleMarker.title?.split('-')[1] || "1") - 1;
    const staticInfo = TRUCK_STATIC_INFO[truckIndex % TRUCK_STATIC_INFO.length];
    const progress = vehicleMarker.progress || 0;
    const totalDist = 45;
    const distLeft = (totalDist * (1 - progress)).toFixed(1);
    const speed = Math.floor(80 + (progress * 100) % 10);
    const totalTimeMin = 60;
    const remainMin = Math.floor(totalTimeMin * (1 - progress));
    const arrivalTime = new Date(currentTime.getTime() + remainMin * 60000);

    return {
      vehicleId: `GMT-10${truckIndex + 1}`,
      imageUrl: "/truck-image.png",
      departure: vehicleMarker.arrival === "GMT" ? "LG Electronics" : "GOMOTEK Busan",
      arrival: vehicleMarker.arrival === "GMT" ? "GOMOTEK Busan" : "LG Electronics",
      progress: Math.floor(progress * 100),
      eta: format(arrivalTime, "HH:mm"),
      remainingTime: `${remainMin} 분 남음`,
      distanceLeft: `${distLeft} km`,
      speed: speed,
      cargoInfo: staticInfo.cargo,
      temperature: staticInfo.temp,
      driverName: staticInfo.driver,
      driverStatus: staticInfo.status
    };
  }, [mapMarkers, currentTime, isSimulationOn, focusedTruckId]);

  return (
    // Container를 항상 렌더링하고, Loader를 그 안에 Absolute로 배치
    <Container>
      {/* 로딩 오버레이: fixed가 아닌 absolute로 변경하여 네비게이션 아래에 위치시킴 */}
      <LoadingOverlay $visible={isLoading}>
        {showLoadingUI && (
          <LoadingContent>
            <div className="icon-area">
              <Truck size={48} color="#3B82F6" strokeWidth={1.5} />
            </div>
            <div className="text-area">
              <h1>실시간 운송현황 시스템</h1>
              <p>지도 정보를 받아오고 있습니다.</p>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" />
            </div>
            <div className="status-text">서버와 연결 중 입니다...</div>
          </LoadingContent>
        )}
      </LoadingOverlay>

      {isMounted && (
        <>
          <MapWrapper>
            <VWorldMap
              key={`map-${mapMarkers[2]?.imageUrl || 'default'}`}
              markers={mapMarkers}
              onEtaUpdate={setEta}
            />
          </MapWrapper>

          <TopLeftWidget>
            <KpiHeader>
              <Activity size={16} color="#3b82f6" />
              <span>Fleet KPI Dashboard</span>
              <LiveBadge>LIVE</LiveBadge>
            </KpiHeader>
            <KpiGrid>
              <KpiItem>
                <div className="label">가동률</div>
                <div className="value">98.5<span className="unit">%</span></div>
                <div className="trend up">▲ 1.2%</div>
              </KpiItem>
              <div className="divider" />
              <KpiItem>
                <div className="label">정시 도착</div>
                <div className="value">100<span className="unit">%</span></div>
                <div className="trend neutral">-</div>
              </KpiItem>
              <div className="divider" />
              <KpiItem>
                <div className="label">평균 속도</div>
                <div className="value">82<span className="unit">km/h</span></div>
                <div className="trend up">▲ 3km</div>
              </KpiItem>
            </KpiGrid>
          </TopLeftWidget>

          {targetTruck && (
            <CardOverlay>
              <VehicleStatusCard {...targetTruck} />
            </CardOverlay>
          )}

          <RightColumn>
            <StatusWidget>
              <TimeRow>
                <div className="time">{currentTime ? format(currentTime, "HH:mm") : "00:00"}</div>
                <div className="date">{currentTime ? format(currentTime, "yyyy.MM.dd (EEE)") : "-"}</div>
              </TimeRow>
              <WeatherRow>
                <div className="temp-box">
                  {weather.icon}
                  <span>{weather.temp}°C</span>
                </div>
                <span className="desc">{weather.desc}</span>
              </WeatherRow>
              <EtaBox>
                <EtaRow>
                  <div className="route"><Navigation size={12} color="#1E40AF" /> <span>고모텍 → LG</span></div>
                  <div className="time">{formatDuration(eta.toLG)}</div>
                </EtaRow>
                <div className="line" />
                <EtaRow>
                  <div className="route"><Navigation size={12} color="#1E40AF" /> <span>LG → 고모텍</span></div>
                  <div className="time">{formatDuration(eta.toBusan)}</div>
                </EtaRow>
              </EtaBox>
            </StatusWidget>

            <AlertWidget>
              <WidgetTitle>
                <Bell size={16} /> 실시간 알림
                <span className="count">3</span>
              </WidgetTitle>
              <AlertList>
                {MOCK_ALERTS.map((alert) => (
                  <AlertItem key={alert.id} $type={alert.type}>
                    <div className="icon-wrapper">
                      {alert.type === 'success' && <CheckCircle size={14} />}
                      {alert.type === 'warning' && <AlertTriangle size={14} />}
                      {alert.type === 'info' && <Radio size={14} />}
                    </div>
                    <div className="content">
                      <span className={`msg ${alert.msg.includes("정체") ? 'alert-red' : ''}`}>
                        {alert.msg}
                      </span>
                      <span className="time">{alert.time}</span>
                    </div>
                  </AlertItem>
                ))}
              </AlertList>
            </AlertWidget>

            <AnalyticsWidget>
              <WidgetTitle><BarChart2 size={16} /> 통합 운영 현황</WidgetTitle>
              <ChartRow>
                <DonutContainer>
                  <svg viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3B82F6" strokeWidth="3" strokeDasharray="60, 100" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#22C55E" strokeWidth="3" strokeDasharray="20, 100" strokeDashoffset="-60" />
                  </svg>
                  <div className="center-text">
                    <span className="num">5</span>
                    <span className="label">Total</span>
                  </div>
                </DonutContainer>
                <LegendBox>
                  <div className="item"><span className="dot" style={{ background: '#3B82F6' }} /> 운행중 (3)</div>
                  <div className="item"><span className="dot" style={{ background: '#22C55E' }} /> 대기 (1)</div>
                  <div className="item"><span className="dot" style={{ background: '#E2E8F0' }} /> 점검 (1)</div>
                </LegendBox>
              </ChartRow>

              <div style={{ marginTop: 12 }}>
                <SubTitle>연료 효율 추이 (Daily)</SubTitle>
                <svg width="100%" height="50" viewBox="0 0 200 60" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 Q20,40 40,30 T80,25 T120,40 T160,15 T200,30 V60 H0 Z" fill="url(#chartGrad)" />
                  <path d="M0,50 Q20,40 40,30 T80,25 T120,40 T160,15 T200,30" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            </AnalyticsWidget>

            <ServerWidget>
              <div className="row">
                <div className="label"><Server size={12} /> API Latency</div>
                <div className="val ok">12ms</div>
              </div>
              <div className="row">
                <div className="label"><Zap size={12} /> System Uptime</div>
                <div className="val">99.9%</div>
              </div>
            </ServerWidget>
          </RightColumn>

          {hasWarning && (
            <WarningBanner>
              <SirenIconWrapper>
                <Siren size={24} color="#fff" />
              </SirenIconWrapper>
              <WarningContent>
                <div className="title">구간 정체 경고 (Traffic Jam Alert)</div>
                <div className="desc">
                  현재 <strong>창원 터널</strong> 구간 정체 감지 (확률 82%)
                </div>
              </WarningContent>
            </WarningBanner>
          )}

          <BottomPanel>
            <BottomGroup>
              <div className="item active"><Truck size={16} /> 운행: 5대</div>
              <div className="divider" />
              <div className="item"><Activity size={16} /> 상태: 정상</div>
              <div className="divider" />
              <div className="item"><Navigation size={16} /> 경로 최적화: ON</div>
            </BottomGroup>
            <SystemTicker>
              <span className="dot"></span> Updated: {currentTime ? format(currentTime, "HH:mm:ss") : "--:--:--"}
            </SystemTicker>
          </BottomPanel>
        </>
      )}
    </Container>
  );
}

// --------------------------------------------------------------------------
// Styled Components
// --------------------------------------------------------------------------

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  position: relative; /* 중요: 내부 absolute 요소의 기준점 */
  overflow: hidden;
  background: #f8fafc;
  font-family: 'Pretendard', sans-serif;
`;

// [수정] 로딩 오버레이: fixed -> absolute로 변경하여 컨테이너 내부에 종속시킴
const LoadingOverlay = styled.div<{ $visible: boolean }>`
  position: fixed; /* 중요: absolute에서 fixed로 변경 */
  top: 0;       /* 중요: 네비게이션 바 아래부터 시작 */
  left: 0;
  width: 100vw;
  height: 100vh;

  z-index: 99999; /* 중요: 세상 모든 위젯보다 높게 설정 */

  background: rgba(248, 250, 252, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  opacity: ${props => props.$visible ? 1 : 0};
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};
  transition: opacity 0.5s ease-out, visibility 0.5s;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
`;

const LoadingContent = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 20px;
  animation: floatUp 0.8s ease-out;
  @keyframes floatUp { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }

  .icon-area {
    width: 80px; height: 80px; background: #EFF6FF; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }
  .text-area { text-align: center; }
  h1 { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 8px 0; letter-spacing: -0.5px; }
  p { font-size: 14px; color: #64748b; font-weight: 500; margin: 0; }
  .progress-bar-bg { width: 300px; height: 6px; background: #cbd5e1; border-radius: 99px; overflow: hidden; position: relative; }
  .progress-bar-fill {
    height: 100%; background: linear-gradient(90deg, #3B82F6, #2563EB);
    border-radius: 99px; animation: loadProgress 2s ease-in-out forwards;
  }
  @keyframes loadProgress { from { width: 0%; } to { width: 100%; } }
  .status-text { font-size: 14px; color: #94a3b8; margin-top: -10px; }
`;

const MapWrapper = styled.div` position: absolute; inset: 0; z-index: 0; `;

const GlassCard = styled.div`
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  color: #1e293b;
`;

const slideDown = keyframes` from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } `;
const TopLeftWidget = styled(GlassCard)`
  position: absolute; top: 10px; left: 20px; padding: 16px 20px; z-index: 1000;
  width: 340px;
  animation: ${slideDown} 0.5s ease-out;

  @media (min-width: 2200px) {
    width: 520px; max-width: 400px; padding: 24px 30px; top: 36px; left: 36px;
  }
`;

const KpiHeader = styled.div`
  display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 12px;
  @media (min-width: 2200px) { font-size: 16px; margin-bottom: 20px; }
`;

const pulseRed = keyframes` 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } `;
const LiveBadge = styled.span`
  margin-left: auto; background: #fee2e2; color: #ef4444; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; animation: ${pulseRed} 2s infinite;
  @media (min-width: 2200px) { font-size: 12px; padding: 4px 8px; }
`;

const KpiGrid = styled.div` display: flex; align-items: center; justify-content: space-between; `;

const KpiItem = styled.div`
  display: flex; flex-direction: column; gap: 2px;
  .label { font-size: 11px; color: #94a3b8; font-weight: 600; }
  .value { font-size: 18px; font-weight: 800; color: #1e293b; .unit { font-size: 12px; font-weight: 600; margin-left: 1px; color: #64748b; } }
  .trend { font-size: 10px; font-weight: 700; } .trend.up { color: #10b981; } .trend.neutral { color: #94a3b8; }

  @media (min-width: 2200px) {
    gap: 6px; .label { font-size: 14px; } .value { font-size: 24px; .unit { font-size: 16px; } } .trend { font-size: 13px; }
  }
`;

const slideRight = keyframes` from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } `;
const CardOverlay = styled.div`
  position: absolute; top: 156px; left: 20px; z-index: 1001; width: 340px; animation: ${slideRight} 0.5s ease-out;
  @media (min-width: 2200px) { top: 240px; left: 36px; width: 500px; }
`;

const slideLeft = keyframes` from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } `;
const RightColumn = styled.div`
  position: absolute; top: 10px; right: 20px; width: 260px; display: flex; flex-direction: column; gap: 12px; z-index: 1000; animation: ${slideLeft} 0.5s ease-out;
  @media (min-width: 2200px) { width: 380px; gap: 20px; top: 36px; right: 36px; }
`;

const StatusWidget = styled(GlassCard)`
  padding: 16px; display: flex; flex-direction: column; gap: 10px;
  @media (min-width: 2200px) { padding: 30px; gap: 18px; }
`;

const TimeRow = styled.div`
  .time { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; color: #1e293b; line-height: 1; }
  .date { font-size: 14px; color: #64748b; font-weight: 500; margin-top: 2px; }
  @media (min-width: 2200px) { .time { font-size: 36px; } .date { font-size: 20px; margin-top: 8px; } }
`;

const WeatherRow = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  .temp-box { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; color: #334155; }
  .desc { font-size: 12px; color: #64748b; font-weight: 500; }
  @media (min-width: 2200px) { .temp-box { font-size: 18px; gap: 10px; svg { width: 24px; height: 24px; } } .desc { font-size: 15px; } }
`;

const EtaBox = styled.div`background: rgba(241, 245, 249, 0.4); border-radius: 12px; padding: 10px; border: 1px solid rgba(255,255,255,0.3); .line { height: 1px; background: rgba(0,0,0,0.05); margin: 6px 0; }`;
const EtaRow = styled.div`
  display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600;
  .route { display: flex; align-items: center; gap: 4px; color: #475569; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 140px; }
  .time { color: #2563eb; background: rgba(37,99,235,0.1); padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
  @media (min-width: 2200px) { font-size: 16px; .time { padding: 4px 10px; } }
`;

const AlertWidget = styled(GlassCard)` padding: 16px; display: flex; flex-direction: column; gap: 10px; @media (min-width: 2200px) { padding: 24px; } `;
const WidgetTitle = styled.div`
  font-size: 14px; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 6px; text-transform: uppercase;
  .count { width:17px; height:17px; background: #ef4444; color: white; display:flex; justify-content:center; align-items:center; font-size: 12px; padding: 0; border-radius: 99px; padding-top: 1.6px; }
  @media (min-width: 2200px) { font-size: 16px; .count { width: 24px; height: 24px; font-size: 18px; } }
`;
const AlertList = styled.div`
  display: flex; flex-direction: column; gap: 8px; max-height: 120px; overflow-y: auto; &::-webkit-scrollbar { width: 3px; } &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  @media (min-width: 2200px) { max-height: 200px; gap: 14px; }
`;

const AlertItem = styled.div<{ $type: string }>`
  display: flex; gap: 8px; align-items: flex-start; padding: 8px; background: rgba(255,255,255,0.4); border-radius: 8px; border: 1px solid rgba(255,255,255,0.3);
  .icon-wrapper { margin-top: 2px; color: ${props => props.$type === 'success' ? '#22c55e' : props.$type === 'warning' ? '#f59e0b' : '#3b82f6'}; }
  .content { display: flex; flex-direction: column; gap: 1px; flex: 1; overflow: hidden; }
  .msg { font-size: 12px; font-weight: 600; color: #1e293b; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .msg.alert-red { color: #ef4444; font-weight: 800; }
  .time { font-size: 10px; color: #575f6a; }
  @media (min-width: 2200px) { padding: 14px; .msg { font-size: 18px; white-space: normal; } .time { font-size: 16px; } svg { width: 22px; height: 22px; } }
`;

const AnalyticsWidget = styled(GlassCard)` padding: 16px; display: flex; flex-direction: column; gap: 12px; @media (min-width: 2200px) { padding: 30px; gap: 24px; }`;
const ChartRow = styled.div` display: flex; align-items: center; justify-content: space-between; gap: 10px; `;
const DonutContainer = styled.div`
  position: relative; width: 70px; height: 70px; flex-shrink: 0; svg { transform: rotate(-90deg); width: 100%; height: 100%; } .center-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; } .num { font-size: 18px; font-weight: 800; color: #1e293b; line-height: 1; } .label { font-size: 9px; font-weight: 600; color: #94a3b8; }
  @media (min-width: 2200px) { width: 120px; height: 120px; .num { font-size: 28px; } .label { font-size: 13px; } }
`;

const LegendBox = styled.div`
  display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; .item { display: flex; align-items: center; gap: 6px; color: #475569; } .dot { width: 6px; height: 6px; border-radius: 50%; }
  @media (min-width: 2200px) { font-size: 14px; gap: 10px; .dot { width: 10px; height: 10px; } }
`;
const SubTitle = styled.div`
  font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 4px; text-transform: uppercase;
  @media (min-width: 2200px) { font-size: 18px; margin-bottom: 10px; }
`;

const ServerWidget = styled(GlassCard)`
  padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; .row { display: flex; flex-direction: column; gap: 2px; } .label { font-size: 14px; font-weight: 500; color: #4f565f; display: flex; align-items: center; gap: 4px; } .val { font-size: 16px; font-weight: 700; color: #334155; } .val.ok { color: #10b981; }
  @media (min-width: 2200px) { padding: 20px 24px; .label { font-size: 16px; } .val { font-size: 16px; } }
`;

const bannerSlideUp = keyframes` from { opacity: 0; transform: translate(-50%, 50px); } to { opacity: 1; transform: translate(-50%, 0); } `;
const WarningBanner = styled.div`
  position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 12px;
  background: rgba(239, 68, 68, 0.9); backdrop-filter: blur(20px);
  padding: 12px 20px; border-radius: 12px; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
  z-index: 2000; min-width: 380px; animation: ${bannerSlideUp} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid rgba(255,255,255,0.2);
  @media (min-width: 2200px) { bottom: 140px; min-width: 600px; padding: 24px 32px; gap: 24px; }
`;
const sirenPulse = keyframes` 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } `;
const SirenIconWrapper = styled.div`width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: ${sirenPulse} 1s infinite; @media (min-width: 2200px) { width: 56px; height: 56px; svg { width: 32px; height: 32px; } }`;
const WarningContent = styled.div`
  color: white; .title { font-size: 16px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; opacity: 0.9; } .desc { font-size: 14px; font-weight: 500; line-height: 1.3; } .desc strong { font-weight: 800; text-decoration: underline; text-underline-offset: 3px; }
  @media (min-width: 2200px) { .title { font-size: 16px; margin-bottom: 6px; } .desc { font-size: 18px; } }
`;

const slideUp = keyframes` from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } `;
const BottomPanel = styled(GlassCard)`
  position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 20px; padding: 10px 20px;
  animation: ${slideUp} 0.5s ease-out; z-index: 1000;
  @media (min-width: 2200px) { top: 36px; padding: 18px 32px; gap: 32px; }
`;

const pulseGreen = keyframes` 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } `;
const BottomGroup = styled.div`
  display: flex; align-items: center; gap: 12px; font-size: 12px; font-weight: 600; color: #475569; .item { display: flex; align-items: center; gap: 6px; cursor: pointer; transition: color 0.2s; } .item.active { color: #2563eb; } .item:hover { color: #1e293b; } .divider { width: 1px; height: 10px; background: #cbd5e1; }
  @media (min-width: 2200px) { font-size: 18px; gap: 24px; .divider { height: 16px; } svg { width: 20px; height: 20px; } }
`;

const SystemTicker = styled.div`
  display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 500; color: #94a3b8; padding-left: 20px; border-left: 1px solid #e2e8f0; .dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px #22c55e; animation: ${pulseGreen} 2s infinite; }
  @media (min-width: 2200px) { font-size: 18px; padding-left: 32px; .dot { width: 8px; height: 8px; } }
`;