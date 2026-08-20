"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import axios from "axios";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Truck,
  RefreshCw,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PieChart,
} from "lucide-react";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import type { VWorldMarker } from "@/components/vworld-map";

const VWorldMap = dynamic(
  () => import("@/components/vworld-map"),
  { 
    ssr: false,
    loading: () => <div style={{width: '100%', height: '100%', background: '#f8fafc'}} /> 
  }
);

/* --- Types & Constants --- */

type VehicleStatus = 'Arrived' | 'Moving';

interface ApiVehicleData {
  출도착처리ID: string;
  출발시간: string;
  출발위치: string;
  도착시간: string | null;
  도착위치: string | null;
  상태: string;
  차량번호: string;
  출발지: string;
  도착지: string;
  소요시간: string | null;
  운전자명: string | null;
}

interface SimulationVehicle {
  id: string;        
  vehicleNo: string; 
  driver: string;
  startPos: { lat: number; lng: number; title: string };
  destPos: { lat: number; lng: number; title: string };
  totalDistanceKm: number;
  baseDurationSec: number;
  startTime: number;
  status: VehicleStatus;
  cargo: string;
  temp: string;
  dailyTripCount: number; 
}

const LOCATION_MAP: Record<string, { lat: number; lng: number; title: string }> = {
  "GMT_부산": { lat: 35.1487345915681, lng: 128.859885213419, title: "고모텍 부산공장" },
  "GMT": { lat: 35.1487345915681, lng: 128.859885213419, title: "고모텍 본사" },
  "LG1_선진화": { lat: 35.2078432680624, lng: 128.666263957419, title: "LG전자" },
  "신창원물류": { lat: 35.2255, lng: 128.6044, title: "신창원 물류센터" },
  "CKD납품": { lat: 35.213020, lng: 128.635923, title: "CKD 납품장" },
  "성철사": { lat: 35.1855, lng: 128.9044, title: "성철사" }
};

const DEFAULT_POS = { lat: 35.148734, lng: 128.859885, title: "Unknown" };

// 알림 기준: 차량번호별 4회 이상 운행 시 경고
const TARGET_TRIPS_PER_DAY = 4;

const parseCoordinate = (coordStr: string | null, locName: string) => {
  if (coordStr && coordStr !== "0.000000, 0.000000") {
    const parts = coordStr.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (lat !== 0 && lng !== 0) return { lat, lng, title: locName };
    }
  }
  for (const key in LOCATION_MAP) {
    if (locName.includes(key) || key.includes(locName)) return { ...LOCATION_MAP[key], title: locName };
  }
  return { ...DEFAULT_POS, title: locName };
};

const getShortLocName = (title: string) => {
  if (title.includes("LG")) return "LG";
  if (title.includes("GMT") || title.includes("고모텍")) return "GMT";
  if (title.includes("CKD")) return "CKD";
  if (title.includes("신창원")) return "신창원";
  if (title.includes("성철사")) return "성철사";
  return title.substring(0, 4);
};

// 헬퍼 함수
const isLg = (title: string) => title.includes("LG");
const isGmt = (title: string) => title.includes("GMT") || title.includes("고모텍") || title.includes("부산");

// --- [1. 다양한 더미 데이터 세팅] ---
const generateDummyData = (): SimulationVehicle[] => {
  const now = Date.now();
  return [
    {
      id: "dummy-1", vehicleNo: "86가7530", driver: "김철수",
      startPos: LOCATION_MAP["GMT_부산"], destPos: LOCATION_MAP["LG1_선진화"],
      totalDistanceKm: 45, baseDurationSec: 1800, startTime: now - (1800 * 1000 * 0.1), status: 'Moving', cargo: "부품", temp: "상온", dailyTripCount: 1
    },
    {
      id: "dummy-2", vehicleNo: "93소0898", driver: "정순형",
      startPos: LOCATION_MAP["LG1_선진화"], destPos: LOCATION_MAP["GMT_부산"], 
      totalDistanceKm: 45, baseDurationSec: 1800, startTime: now - (1800 * 1000 * 0.8), status: 'Moving', cargo: "모터", temp: "상온", dailyTripCount: 4 
    },
    {
      id: "dummy-3", vehicleNo: "88라4873", driver: "김준동",
      startPos: LOCATION_MAP["CKD납품"], destPos: LOCATION_MAP["GMT_부산"], 
      totalDistanceKm: 20, baseDurationSec: 1200, startTime: now - (1200 * 1000 * 0.5), status: 'Moving', cargo: "전자부품", temp: "상온", dailyTripCount: 2
    },
    {
      id: "dummy-4", vehicleNo: "12다3456", driver: "박민수",
      startPos: LOCATION_MAP["신창원물류"], destPos: LOCATION_MAP["LG1_선진화"], 
      totalDistanceKm: 15, baseDurationSec: 1000, startTime: now - (1000 * 1000 * 0.95), status: 'Moving', cargo: "플라스틱", temp: "상온", dailyTripCount: 5 
    },
    {
      id: "dummy-5", vehicleNo: "45마6789", driver: "이영희",
      startPos: LOCATION_MAP["성철사"], destPos: LOCATION_MAP["GMT_부산"], 
      totalDistanceKm: 30, baseDurationSec: 2000, startTime: now - (2000 * 1000 * 0.2), status: 'Moving', cargo: "금속부품", temp: "상온", dailyTripCount: 3
    },
    {
      id: "dummy-6", vehicleNo: "77바1111", driver: "최동석",
      startPos: LOCATION_MAP["GMT_부산"], destPos: LOCATION_MAP["LG1_선진화"], 
      totalDistanceKm: 45, baseDurationSec: 1800, startTime: now - (1800 * 1000 * 1.1), status: 'Arrived', cargo: "완제품", temp: "상온", dailyTripCount: 3
    },
    {
      id: "dummy-7", vehicleNo: "88사2222", driver: "강백호",
      startPos: LOCATION_MAP["LG1_선진화"], destPos: LOCATION_MAP["GMT_부산"], 
      totalDistanceKm: 45, baseDurationSec: 1800, startTime: now - (1800 * 1000 * 1.5), status: 'Arrived', cargo: "회수품", temp: "상온", dailyTripCount: 4
    }
  ];
};

const useVehicleSimulation = () => {
  const [vehicles, setVehicles] = useState<SimulationVehicle[]>([]);
  const [markers, setMarkers] = useState<VWorldMarker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDummyMode, setIsDummyMode] = useState(false);
  const [targetIds, setTargetIds] = useState<{ lgId: string | null; gmtId: string | null }>({ lgId: null, gmtId: null });
  const vehiclesRef = useRef<SimulationVehicle[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let mappedVehicles: SimulationVehicle[] = [];
      if (isDummyMode) {
        mappedVehicles = generateDummyData();
        await new Promise(r => setTimeout(r, 500)); 
      } else {
        try {
          const res = await axios.get('http://192.168.2.147:24828/api/DX_API000002');
          const data: ApiVehicleData[] = res.data;
          const now = Date.now();

          // 차량별 운행 횟수 누적 계산
          const tripCounts: Record<string, number> = {};
          data.forEach(item => {
              tripCounts[item.차량번호] = (tripCounts[item.차량번호] || 0) + 1;
          });

          mappedVehicles = data.map((item) => {
            const startPos = parseCoordinate(item.출발위치, item.출발지);
            const destPos = parseCoordinate(item.도착위치, item.도착지);
            const startTime = new Date(item.출발시간).getTime();
            let durationSec = 1800;
            if (item.소요시간) {
              const [h, m, s] = item.소요시간.split(':').map(Number);
              durationSec = h * 3600 + m * 60 + s;
            }
            const elapsedSec = (now - startTime) / 1000;
            const isTimeOver = elapsedSec >= durationSec;
            const isArrived = (item.상태 === "도착") || isTimeOver;
            
            return {
              id: item.출도착처리ID,
              vehicleNo: item.차량번호,
              driver: item.운전자명 || '미지정',
              startPos, destPos, totalDistanceKm: 45, baseDurationSec: durationSec,
              startTime: startTime, status: isArrived ? 'Arrived' : 'Moving', 
              cargo: "전자부품", temp: "상온",
              dailyTripCount: tripCounts[item.차량번호] || 1
            };
          });
        } catch (apiError) {
          console.error("API Call Failed", apiError);
          mappedVehicles = [];
        }
      }
      mappedVehicles.sort((a, b) => b.startTime - a.startTime);
      setVehicles(mappedVehicles);
      vehiclesRef.current = mappedVehicles;

      const moving = mappedVehicles.filter(v => v.status === 'Moving');
      const getBestVehicleId = (filterFn: (v: SimulationVehicle) => boolean) => {
        const candidates = moving.filter(filterFn);
        if (candidates.length === 0) return null;
        return candidates.sort((a, b) => a.startTime - b.startTime)[0].id;
      };
      const bestLg = getBestVehicleId(v => v.startPos.title.includes("LG"));
      const bestGmt = getBestVehicleId(v => v.startPos.title.includes("GMT") || v.startPos.title.includes("부산"));
      setTargetIds({ lgId: bestLg, gmtId: bestGmt });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isDummyMode]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    let animationFrameId: number;
    let lastFrameTime = 0;
    const TARGET_FPS = 30;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const baseMarkers = [
      { id: 'fac-gmt', ...LOCATION_MAP["GMT_부산"], isFacility: true },
      { id: 'fac-lg', ...LOCATION_MAP["LG1_선진화"], isFacility: true }
    ];

    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastFrameTime;
      if (deltaTime >= FRAME_INTERVAL) {
        lastFrameTime = timestamp - (deltaTime % FRAME_INTERVAL);
        const now = Date.now();
        const currentVehicles = vehiclesRef.current;
        const currentMarkers: VWorldMarker[] = [...baseMarkers];
        
        currentVehicles.forEach(v => {
          if (v.status === 'Arrived') return;
          const elapsedSec = (now - v.startTime) / 1000;
          let progress = elapsedSec / v.baseDurationSec;
          if (progress > 1) progress = 1;
          if (progress < 0) progress = 0;

          const currentLat = v.startPos.lat + (v.destPos.lat - v.startPos.lat) * progress;
          const currentLng = v.startPos.lng + (v.destPos.lng - v.startPos.lng) * progress;
          const isTarget = v.id === targetIds.lgId || v.id === targetIds.gmtId;
          const isLgToGomotek = v.startPos.title.includes("LG");

          currentMarkers.push({
            id: v.id, lat: currentLat, lng: currentLng, title: v.id, vehicleNo: v.vehicleNo,
            isFocused: isTarget, progress: progress,
            startLat: v.startPos.lat, startLng: v.startPos.lng, destLat: v.destPos.lat, destLng: v.destPos.lng,
            driver: v.driver, cargo: v.cargo, eta: "이동 중", flip: isLgToGomotek,
          } as VWorldMarker);
        });
        setMarkers(currentMarkers);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetIds]);

  return { vehicles, markers, targetIds, fetchData, isLoading, isDummyMode, setIsDummyMode };
};

// ─── [Components] ───

const NoDataModal = React.memo(({ onEnableDummy }: { onEnableDummy: () => void }) => (
  <ModalOverlay>
    <ModalContent>
      <div className="icon-wrapper" onClick={onEnableDummy} style={{ cursor: 'pointer' }} title="테스트 모드 켜기">
        <div className="pulse-ring"></div>
        <Truck size={42} strokeWidth={1.5} color="#64748b" />
      </div>
      <div className="text-content">
        <h2 className="title">현재 운행 중인 차량이 없습니다</h2>
        <p className="desc">
          모든 배차가 완료되었거나 대기 중입니다.<br />
          새로운 배차 정보가 수신되면 자동으로 갱신됩니다.<br/>
          <span style={{fontSize: '12px', color: '#94a3b8', textDecoration: 'underline', cursor: 'pointer'}} onClick={onEnableDummy}>
            (아이콘을 눌러 UI 테스트 모드 실행)
          </span>
        </p>
      </div>
      <div className="status-pill">
        <span className="dot" /> 시스템 대기 중
      </div>
    </ModalContent>
  </ModalOverlay>
));
NoDataModal.displayName = "NoDataModal";

// ─── [Main Page] ───

export default function LocalMapPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [weather, setWeather] = useState<{ temp: number; desc: string; icon: React.ReactNode }>({ 
      temp: 0, desc: '-', icon: <Sun size={20} color="#64748b" /> 
  });
  
  const { vehicles, markers, targetIds, fetchData, isLoading, isDummyMode, setIsDummyMode } = useVehicleSimulation();

  const markerMap = useMemo(() => {
    const map = new Map<string, VWorldMarker>();
    for (const m of markers) {
      if(m.title) map.set(m.title, m);
    }
    return map;
  }, [markers]);

  // ─── [통계 계산 로직 수정] ───
  const movingVehicles = vehicles.filter(v => v.status === 'Moving');
  const arrivedVehicles = vehicles.filter(v => v.status === 'Arrived');
  
  // 1. 전체 상태 통계
  const totalCount = vehicles.length;
  const movingCount = movingVehicles.length;
  const arrivedCount = arrivedVehicles.length;
  
  // 2. 목적지별 도착 예정 (현재 '운행 중'인 차량 기준)
  const expectedLg = movingVehicles.filter(v => isLg(v.destPos.title)).length;
  const expectedGmt = movingVehicles.filter(v => isGmt(v.destPos.title)).length;
  
  // 3. 노선별 총 배차 (운행 + 도착 모두 포함)
  const gmtToLgTotal = vehicles.filter(v => isGmt(v.startPos.title) && isLg(v.destPos.title)).length;
  const lgToGmtTotal = vehicles.filter(v => isLg(v.startPos.title) && isGmt(v.destPos.title)).length;
  const otherRoutesTotal = totalCount - gmtToLgTotal - lgToGmtTotal; // 기타 노선 (성철사, 신창원 등)
  
  // 복귀 대상: 현재 목적지가 고모텍이 아닌 차량 (외부로 가는 중이거나 외부에 도착해 대기 중)
  const expectedReturn = vehicles.filter(v => !isGmt(v.destPos.title)).length;

  const calculateAvgTime = (startKeyword: string) => {
      const relevantVehicles = vehicles.filter((v: SimulationVehicle) => 
          v.startPos.title.includes(startKeyword) && v.status === 'Moving'
      );
      if (relevantVehicles.length === 0) return "28분"; 
      const totalSec = relevantVehicles.reduce((acc: number, cur: SimulationVehicle) => acc + cur.baseDurationSec, 0);
      const avgMin = Math.round((totalSec / relevantVehicles.length) / 60);
      return `${avgMin}분`;
  };

  const avgLgToGmt = calculateAvgTime("LG");
  const avgGmtToLg = calculateAvgTime("고모텍"); 

  const fetchWeather = async () => {
    try {
        const res = await axios.get("https://api.open-meteo.com/v1/forecast?latitude=35.15&longitude=128.86&current_weather=true&timezone=auto");
        const { temperature, weathercode } = res.data.current_weather;
        
        let desc = "맑음";
        let icon = <Sun size={18} color="#64748b" />;

        if (weathercode >= 0 && weathercode <= 3) {
            desc = weathercode === 0 ? "맑음" : "구름조금";
            icon = weathercode === 0 ? <Sun size={18} color="#FDB813" /> : <Cloud size={18} color="#64748b" />;
        } else if (weathercode >= 45 && weathercode <= 48) {
            desc = "안개";
            icon = <Cloud size={18} color="#cbd5e1" />;
        } else if (weathercode >= 51 && weathercode <= 67) {
            desc = "비";
            icon = <CloudRain size={18} color="#3b82f6" />;
        } else if (weathercode >= 71 && weathercode <= 77) {
            desc = "눈";
            icon = <CloudSnow size={18} color="#bfdbfe" />;
        } else if (weathercode >= 80 && weathercode <= 82) {
            desc = "소나기";
            icon = <CloudRain size={18} color="#2563eb" />;
        } else if (weathercode >= 95) {
            desc = "뇌우";
            icon = <CloudLightning size={18} color="#7c3aed" />;
        }

        setWeather({ temp: temperature, desc, icon });
    } catch (e) {
        console.error("Weather fetch failed", e);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());
    fetchWeather();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const weatherTimer = setInterval(fetchWeather, 600000); 
    
    return () => {
        clearInterval(timer);
        clearInterval(weatherTimer);
    };
  }, []);

  if (!isMounted) return null;

  return (
    <Container>
      <MapArea>
        <VWorldMap markers={markers} focusedTitle={targetIds.lgId || targetIds.gmtId || null} />
      </MapArea>

      {!isLoading && movingCount === 0 && <NoDataModal onEnableDummy={() => setIsDummyMode(true)} />}

      {/* 우측 상단 위젯 (시간, 날씨, 통신상태) */}
      <TopRightWidget>
        <div className="time">{currentTime ? format(currentTime, "HH:mm") : "00:00"}</div>
        <div className="date">{currentTime ? format(currentTime, "yyyy.MM.dd (EEE)") : "-"}</div>
        <div className="divider" />
        <div className="weather">
          {weather.icon} <span className="temp">{weather.temp}°C</span> <span className="desc">{weather.desc}</span>
        </div>
        <div className="divider" />
        <div className="api-status" onClick={() => isDummyMode && setIsDummyMode(false)} style={{ cursor: isDummyMode ? 'pointer' : 'default' }}>
           <div className={`dot ${isLoading ? 'loading' : (isDummyMode ? 'dummy' : 'normal')}`} />
           <span style={{ color: isDummyMode ? '#f59e0b' : 'inherit', fontWeight: isDummyMode ? 800 : 600 }}>
             {isDummyMode ? '테스트 모드 (클릭시 종료)' : 'API 연동 정상'}
           </span>
        </div>
        <div className="divider" />
        <div className="updated">
          <RefreshCw size={12} className={isLoading ? 'spin' : ''} onClick={fetchData} style={{cursor:'pointer'}} />
          Updated: {currentTime ? format(currentTime, "HH:mm:ss") : "--:--:--"}
        </div>
      </TopRightWidget>

      {/* 🟢 우측 레이아웃 래퍼 */}
      <RightSideWrapper>
        {/* 우측 상단: 종합 운행 통계 패널 */}
        <StatsPanel>
          <StatsHeader>
              <PieChart size={15} color="#0f172a" />
              당일 배차 및 운행 통계
          </StatsHeader>
          <StatsGrid>
              {/* 1행: 전체 상태 */}
              <div className="stat-card">
                  <div className="stat-title">총 배차</div>
                  <div className="stat-val">{totalCount}대</div>
              </div>
              <div className="stat-card">
                  <div className="stat-title"><Truck size={14} />운행중</div>
                  <div className="stat-val red">{movingCount}대</div>
              </div>
              <div className="stat-card">
                  <div className="stat-title"><CheckCircle2 size={14} />도착완료</div>
                  <div className="stat-val green">{arrivedCount}대</div>
              </div>

              {/* 2행: 목적지별 도착 예정 (운행 중 기준) */}
              <div className="stat-card">
                  <div className="stat-title">LG 도착 예정</div>
                  <div className="stat-val blue">{expectedLg}대</div>
              </div>
              <div className="stat-card">
                  <div className="stat-title">GMT 도착 예정</div>
                  <div className="stat-val blue">{expectedGmt}대</div>
              </div>
              <div className="stat-card">
                  <div className="stat-title" title="현재 목적지가 외부인 복귀 대상 차량">복귀 대상</div>
                  <div className="stat-val orange">{expectedReturn}대</div>
              </div>

              {/* 3행: 노선별 누적 현황 (도착완료 포함) */}
              <div className="stat-card">
                  <div className="stat-title">GMT➔LG 누적</div>
                  <div className="stat-val">{gmtToLgTotal}대</div>
              </div>
              <div className="stat-card">
                  <div className="stat-title">LG➔GMT 누적</div>
                  <div className="stat-val">{lgToGmtTotal}대</div>
              </div>
              <div className="stat-card">
                  <div className="stat-title">기타노선 누적</div>
                  <div className="stat-val">{otherRoutesTotal}대</div>
              </div>
          </StatsGrid>
        </StatsPanel>

        {/* 우측 하단: 실시간 운행 현황 리스트 */}
        <MovingListPanel>
          <MovingListHeader>
              <Navigation size={14} color="#0f172a" />
              실시간 운행 현황 리스트
          </MovingListHeader>
          <MiniMovingList>
              {movingVehicles.length > 0 ? movingVehicles.map(v => {
                const marker = markerMap.get(v.id);
                const progress = marker?.progress || 0;
                const remainingSec = Math.max(0, v.baseDurationSec * (1 - progress));
                const remainingMin = Math.ceil(remainingSec / 60);
                
                const shortStart = getShortLocName(v.startPos.title);
                const shortDest = getShortLocName(v.destPos.title);
                const themeColor = v.startPos.title.includes("LG") ? '#1e293b' : '#ce0037';
                const isWarning = v.dailyTripCount >= TARGET_TRIPS_PER_DAY;

                return (
                    <CompactListItem key={`mini-active-${v.id}`} $isWarning={isWarning}>
                        <div className="v-info">
                            <div className="v-no">
                              {v.vehicleNo}
                              {isWarning && (
                                <span title="목표 운행 횟수 초과" style={{ display: 'flex', alignItems: 'center' }}>
                                  <AlertTriangle size={12} color="#b45309" />
                                </span>
                              )}
                            </div>
                            <div className="v-trip">{v.dailyTripCount}회차 운행</div>
                        </div>
                        <div className="route-info">
                            {shortStart} ➔ {shortDest}
                        </div>
                        <div className="time-info" style={{ color: themeColor }}>
                            {remainingMin}분
                        </div>
                    </CompactListItem>
                );
              }) : (
                  <div className="empty-state">현재 운행 중인 차량이 없습니다.</div>
              )}
          </MiniMovingList>
        </MovingListPanel>
      </RightSideWrapper>

      {/* 좌측 사이드바: 전체 운행 이력 전용 공간 */}
      <SidebarModal>
        <SidebarHeaderSection>
          <SidebarHeader>운행 이력 및 통계</SidebarHeader>
          <AvgTimeSection>
            <div className="avg-row">
              <span className="dot" /> LG전자 행 평균 소요시간
              <span className="count-spacer" />
              <span className="time">{avgGmtToLg}</span>
            </div>
            <div className="avg-row">
              <span className="dot" /> 고모텍 행 평균 소요시간
              <span className="count-spacer" />
              <span className="time">{avgLgToGmt}</span>
            </div>
          </AvgTimeSection>
        </SidebarHeaderSection>

        <HistorySectionWrapper>
          <HistoryHeader>
            전체 배차 내역
            <span className="count-badge">{totalCount}건</span>
          </HistoryHeader>
          
          <ScrollableHistoryList>
            {vehicles.map((v, idx) => {
              const isArrived = v.status === 'Arrived';
              const marker = markerMap.get(v.id);
              const displayPct = isArrived ? 100 : Math.floor((marker?.progress || 0) * 100);
              const shortStart = getShortLocName(v.startPos.title);
              const shortDest = getShortLocName(v.destPos.title);
              const isLgStart = (v.startPos.lat || 0) > 35.18;
              const themeColor = isLgStart ? '#1e293b' : '#ce0037';
              const isWarning = v.dailyTripCount >= TARGET_TRIPS_PER_DAY;

              return (
                <HistoryItem key={`hist-${v.id}`} $isWarning={isWarning}>
                  <div className="info-row">
                    <div className="title">
                      <span className="v-no">{v.vehicleNo}</span>
                      {isWarning ? (
                        <span className="trip-count warning" title="목표 운행 횟수 초과"><AlertTriangle size={12}/> {v.dailyTripCount}회차 완료</span>
                      ) : (
                        <span className="trip-count">누적 {v.dailyTripCount}회차</span>
                      )}
                    </div>
                    <div className={`status ${isArrived ? 'arrived' : 'moving'}`} style={{ color: isArrived ? '#64748b' : themeColor, background: isArrived ? '#f1f5f9' : (isLgStart ? '#f1f5f9' : '#fff1f2') }}>
                      {isArrived ? '도착완료' : '배송중'}
                    </div>
                  </div>
                  <div className="route-row">
                    {shortStart} ➔ {shortDest}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems:'center', gap: 4}}>
                      <Clock size={11} />
                      {v.status === 'Arrived' ? '운행 종료' : `${Math.ceil(Math.max(0, v.baseDurationSec * (1 - displayPct/100)) / 60)}분 후 도착 예정`}
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className={`fill ${isArrived ? 'green' : 'red'}`} style={{ width: `${displayPct}%`, background: isArrived ? '#10b981' : themeColor }} />
                    <Truck size={14} className={`truck-icon ${isArrived ? 'green' : 'red'}`} style={{ right: 0, color: isArrived ? '#10b981' : themeColor }} />
                  </div>
                  <div className="pct-text">{displayPct}%</div>
                </HistoryItem>
              );
            })}
          </ScrollableHistoryList>
        </HistorySectionWrapper>
      </SidebarModal>
    </Container>
  );
}

// ─── [Styles] ───

const Container = styled.div`
  width: 100vw; height: 100vh; position: relative; overflow: hidden; background: #f8fafc; font-family: 'Pretendard', sans-serif;
`;

const MapArea = styled.div`
  position: absolute; inset: 0; z-index: 0;
`;

const TopRightWidget = styled.div`
  position: absolute; top: 20px; right: 20px; z-index: 100;
  display: flex; align-items: center; gap: 10px;
  background: white; border-radius: 14px; 
  padding: 8px 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #f1f5f9;
  font-size: 13px; font-weight: 600; color: #1e293b;

  .time { font-size: 16px; font-weight: 800; letter-spacing: -0.5px; }
  .date { color: #64748b; font-weight: 500; font-size: 12px;}
  .divider { width: 1px; height: 12px; background: #e2e8f0; }
  
  .weather { display: flex; align-items: center; gap: 4px; }
  .temp { font-weight: 700; }
  .desc { color: #64748b; font-weight: 500; }

  .api-status {
    display: flex; align-items: center; gap: 6px; 
    .dot { width: 6px; height: 6px; border-radius: 50%; }
    .dot.normal { background: #10b981; box-shadow: 0 0 0 2px rgba(16,185,129,0.2); }
    .dot.loading { background: #f59e0b; animation: blink 1s infinite; }
    .dot.dummy { background: #f59e0b; box-shadow: 0 0 0 2px rgba(245,158,11,0.2); }
  }

  .updated { display: flex; align-items: center; gap: 4px; color: #94a3b8; font-weight: 500; font-size: 12px; }
  .spin { animation: spin 1s linear infinite; }
  
  @keyframes spin { 100% { transform: rotate(360deg); } }
  @keyframes blink { 50% { opacity: 0.4; } }
`;

const RightSideWrapper = styled.div`
  position: absolute; right: 20px; top: 100px; bottom: 20px; z-index: 100;
  width: 340px;
  display: flex; flex-direction: column; gap: 20px;
`;

const StatsPanel = styled.div`
  background: white; border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.1);
  border: 1px solid #f1f5f9;
  display: flex; flex-direction: column; overflow: hidden;
  flex-shrink: 0; 
`;

const StatsHeader = styled.div`
  font-size: 14px; font-weight: 800; padding: 14px 16px 10px 16px;
  color: #0f172a; display: flex; align-items: center; gap: 6px;
  background: white; border-bottom: 1px solid #f8fafc;
  flex-shrink: 0;
`;

const StatsGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr);
  background: #f8fafc;
  
  .stat-card {
    padding: 14px 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    border-right: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
  }
  .stat-card:nth-child(3n) { border-right: none; }
  .stat-card:nth-last-child(-n+3) { border-bottom: none; }
  
  .stat-title { font-size: 12px; color: #64748b; font-weight: 700; display: flex; align-items: center; gap: 4px; text-align: center; }
  .stat-val { font-size: 20px; font-weight: 800; font-family: 'Rajdhani', sans-serif; letter-spacing: -0.5px; }
  
  .stat-val.red { color: #ce0037; }
  .stat-val.green { color: #10b981; }
  .stat-val.blue { color: #3b82f6; }
  .stat-val.orange { color: #f59e0b; }
`;

const MovingListPanel = styled.div`
  background: white; border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.1);
  border: 1px solid #f1f5f9;
  display: flex; flex-direction: column; overflow: hidden;
  flex: 1; 
  min-height: 0; 
`;

const MovingListHeader = styled.div`
  font-size: 14px; font-weight: 800; padding: 14px 16px 10px 16px;
  color: #0f172a; display: flex; align-items: center; gap: 6px;
  background: white; border-bottom: 1px solid #f8fafc;
  flex-shrink: 0;
`;

const MiniMovingList = styled.div`
  flex: 1; 
  overflow-y: auto; 
  padding: 12px 16px 16px 16px;
  display: flex; flex-direction: column; gap: 8px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

  .empty-state { text-align: center; font-size: 12px; color: #94a3b8; padding: 20px 0; font-weight: 500; }
`;

const CompactListItem = styled.div<{ $isWarning?: boolean }>`
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px;
  border-radius: 10px;
  background: ${(props) => props.$isWarning ? '#fffbeb' : '#f8fafc'};
  border: 1px solid ${(props) => props.$isWarning ? '#fde68a' : '#e2e8f0'};
  flex-shrink: 0;
  
  .v-info { display: flex; flex-direction: column; gap: 4px; width: 85px; }
  .v-no { font-size: 14px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 4px; letter-spacing: -0.5px;}
  .v-trip { font-size: 11px; color: ${(props) => props.$isWarning ? '#b45309' : '#64748b'}; font-weight: 600; }
  
  .route-info { flex: 1; text-align: center; font-size: 13px; font-weight: 700; color: #475569; letter-spacing: -0.5px; }
  
  .time-info { width: 55px; text-align: right; font-size: 16px; font-weight: 800; letter-spacing: -0.5px; }
`;

const SidebarModal = styled.div`
  position: absolute; left: 24px; top: 24px; bottom: 24px; width: 380px;
  background: white; z-index: 100; 
  border-radius: 24px; 
  box-shadow: 0 12px 40px rgba(0,0,0,0.1); 
  display: flex; flex-direction: column; 
  overflow: hidden; 
`;

const SidebarHeaderSection = styled.div`
  padding: 24px 24px 16px 24px;
  flex-shrink: 0; 
`;

const SidebarHeader = styled.h2`
  font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 20px 0; letter-spacing: -0.5px;
`;

const AvgTimeSection = styled.div`
  display: flex; flex-direction: column; gap: 8px;
  background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 12px;
  .avg-row {
    display: flex; align-items: center; font-size: 13px; color: #475569; font-weight: 600;
    .dot { width: 4px; height: 4px; background: #64748b; border-radius: 50%; margin-right: 6px; }
    .count-spacer { flex: 1; border-bottom: 1px dashed #cbd5e1; margin: 0 12px; }
    .time { color: #0f172a; font-weight: 800; }
  }
`;

const HistorySectionWrapper = styled.div`
  display: flex; flex-direction: column;
  flex: 1; 
  overflow: hidden; 
`;

const HistoryHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  font-size: 15px; font-weight: 800; color: #1e293b; 
  padding: 16px 24px 12px 24px;
  background: white;
  border-top: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
  
  .count-badge { background: #1e293b; color: white; font-size: 11px; padding: 4px 10px; border-radius: 99px; }
`;

const ScrollableHistoryList = styled.div`
  flex: 1;
  overflow-y: auto; 
  padding: 16px 24px 24px 24px;
  display: flex; flex-direction: column; gap: 10px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;

const HistoryItem = styled.div<{ $isWarning?: boolean }>`
  display: flex; flex-direction: column; gap: 8px;
  background: white; border: 1px solid ${(props) => props.$isWarning ? '#fcd34d' : '#f1f5f9'}; 
  border-radius: 12px; padding: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  ${(props) => props.$isWarning && `background: #fffbeb; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);`}

  .info-row { display: flex; justify-content: space-between; align-items: center; }
  .title { display: flex; align-items: center; gap: 8px; }
  .v-no { font-size: 15px; font-weight: 800; color: #0f172a; }
  
  .trip-count { font-size: 11px; color: #64748b; font-weight: 700; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;}
  .trip-count.warning { color: #b45309; background: #fef3c7; display: flex; align-items: center; gap: 4px; border: 1px solid #fde68a;}
  
  .status { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }

  .route-row { display: flex; font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 4px; }

  .progress-bar { position: relative; width: 100%; height: 3px; background: #f1f5f9; border-radius: 2px; margin-bottom: 4px; }
  .fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 2px; }
  
  .truck-icon { position: absolute; top: -14px; background: white; padding: 2px; }

  .pct-text { text-align: right; font-size: 10px; font-weight: 800; color: #10b981; }
`;

const ModalOverlay = styled.div`
  position: absolute; inset: 0; z-index: 999;
  background: rgba(248, 250, 252, 0.4); 
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
`;

const ModalContent = styled.div`
  background: white; padding: 40px 60px; border-radius: 32px;
  box-shadow: 0 20px 50px -12px rgba(0,0,0,0.1);
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 24px;
  .icon-wrapper { width: 80px; height: 80px; background: #f8fafc; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
  .icon-wrapper:hover { transform: scale(1.05); }
  .title { font-size: 20px; font-weight: 800; margin: 0; }
  .desc { font-size: 14px; color: #64748b; margin: 0; line-height: 1.5; }
  .status-pill { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 99px; font-size: 13px; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 8px; }
  .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
`;