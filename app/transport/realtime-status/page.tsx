"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import axios from "axios";
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Truck,
  RefreshCw, CheckCircle2, Navigation, Clock, AlertTriangle, PieChart,
  Eye, EyeOff, Layers3, X, Route, UserRound,
  PackageCheck, Gauge, TimerReset, Radio, MapPin, GripHorizontal,
  Box, Map as MapIcon
} from "lucide-react";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import type { VWorldMarker } from "@/components/vworld-map-dev";
import { getDxApiUrl } from "@/utils/dx-api";

const VWorldMap = dynamic(
  () => import("@/components/vworld-map-dev"),
  {
    ssr: false,
    loading: () => <div style={{ width: "100%", height: "100%", background: "#eef3f8" }} />
  }
);

const Transport3DMap = dynamic(
  () => import("@/components/transport-3d-map"),
  {
    ssr: false,
    loading: () => <div style={{ width: "100%", height: "100%", background: "#d8e6e3" }} />
  }
);

type VehicleStatus = "Arrived" | "Moving";
type MarkerInfoMode = "hidden" | "all" | "selected";
type MapViewMode = "2d" | "3d";
type InfoPanelKey = "top" | "left" | "right" | "detail";

const INFO_PANEL_LABELS: Record<InfoPanelKey, string> = {
  top: "상태",
  left: "이력",
  right: "통계/현황",
  detail: "상세",
};

const DEFAULT_INFO_PANELS: Record<InfoPanelKey, boolean> = {
  top: true,
  left: true,
  right: true,
  detail: true,
};

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

interface Point2D { x: number; y: number; }
interface Size2D { width: number; height: number; }
interface PanelRect extends Point2D, Size2D {}

const LOCATION_MAP: Record<string, { lat: number; lng: number; title: string }> = {
  "GMT_부산": { lat: 35.1487345915681, lng: 128.859885213419, title: "고모텍 부산공장" },
  "GMT": { lat: 35.1487345915681, lng: 128.859885213419, title: "고모텍 본사" },
  "LG1_선진화": { lat: 35.2078432680624, lng: 128.666263957419, title: "LG전자" },
  "신창원물류": { lat: 35.2255, lng: 128.6044, title: "신창원 물류센터" },
  "CKD납품": { lat: 35.213020, lng: 128.635923, title: "CKD 납품장" },
  "성철사": { lat: 35.1855, lng: 128.9044, title: "성철사" }
};

const DEFAULT_POS = { lat: 35.148734, lng: 128.859885, title: "Unknown" };
const TARGET_TRIPS_PER_DAY = 4;
const EDGE = 24;
const PANEL_GAP = 16;
const HEADER_OFFSET = 64;
const MAP_MODE_TOP = 18;
const MAP_MODE_WIDTH = 390;
const MAP_MODE_HEIGHT = 56;
const MAP_MODE_SAFE_BOTTOM = MAP_MODE_TOP + MAP_MODE_HEIGHT + PANEL_GAP;

const parseCoordinate = (coordStr: string | null, locName: string) => {
  if (coordStr && coordStr !== "0.000000, 0.000000") {
    const parts = coordStr.split(",");
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

const isLg = (title: string) => title.includes("LG");
const isGmt = (title: string) => title.includes("GMT") || title.includes("고모텍") || title.includes("부산");

const getNearestLocation = (lat?: number, lng?: number, fallbackTitle = "임시 위치") => {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return { ...DEFAULT_POS, title: fallbackTitle };
  }

  const nearest = Object.values(LOCATION_MAP)
    .map(loc => ({ loc, distance: Math.hypot(loc.lat - lat, loc.lng - lng) }))
    .sort((a, b) => a.distance - b.distance)[0];

  return {
    lat,
    lng,
    title: nearest && nearest.distance < 0.08 ? nearest.loc.title : fallbackTitle,
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

const rectsOverlap = (a: PanelRect, b: PanelRect) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const rectDistance = (a: PanelRect, b: PanelRect) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const clampRect = (rect: PanelRect, bounds: PanelRect): PanelRect => ({
  ...rect,
  x: clamp(rect.x, bounds.x, bounds.x + bounds.width - rect.width),
  y: clamp(rect.y, bounds.y, bounds.y + bounds.height - rect.height),
});

const resolvePanelRect = (baseRect: PanelRect, obstacles: PanelRect[], bounds: PanelRect): PanelRect => {
  let current = clampRect(baseRect, bounds);
  const maxPass = Math.max(4, obstacles.length * 4);

  for (let pass = 0; pass < maxPass; pass += 1) {
    const obstacle = obstacles.find(item => rectsOverlap(current, item));
    if (!obstacle) return current;

    const candidates: PanelRect[] = [
      { ...current, x: obstacle.x - PANEL_GAP - current.width },
      { ...current, x: obstacle.x + obstacle.width + PANEL_GAP },
      { ...current, y: obstacle.y - PANEL_GAP - current.height },
      { ...current, y: obstacle.y + obstacle.height + PANEL_GAP },
      { ...current, x: baseRect.x, y: obstacle.y - PANEL_GAP - current.height },
      { ...current, x: baseRect.x, y: obstacle.y + obstacle.height + PANEL_GAP },
      { ...current, x: bounds.x, y: current.y },
      { ...current, x: bounds.x + bounds.width - current.width, y: current.y },
    ].map(candidate => clampRect(candidate, bounds));

    const nonOverlapping = candidates.filter(candidate => obstacles.every(item => !rectsOverlap(candidate, item)));
    const singleResolved = candidates.filter(candidate => !rectsOverlap(candidate, obstacle));
    const pool = nonOverlapping.length > 0 ? nonOverlapping : (singleResolved.length > 0 ? singleResolved : candidates);
    current = pool.sort((a, b) => rectDistance(a, baseRect) - rectDistance(b, baseRect))[0];
  }

  return current;
};

const toPanelStyle = (rect: PanelRect): React.CSSProperties => ({
  left: rect.x,
  top: rect.y,
  width: rect.width,
  height: rect.height,
});

const toRightAnchoredPanelStyle = (rect: PanelRect, viewportWidth: number): React.CSSProperties => ({
  left: "auto",
  right: Math.max(EDGE, Math.round(viewportWidth - rect.x - rect.width)),
  top: rect.y,
  width: rect.width,
  height: rect.height,
});

const avoidDockByResizing = (rect: PanelRect, dock: PanelRect, bounds: PanelRect): PanelRect => {
  const current = clampRect(rect, bounds);
  if (!rectsOverlap(current, dock)) return current;

  const minHeight = Math.min(320, current.height);
  const topSpace = Math.max(0, dock.y - PANEL_GAP - current.y);
  const bottomY = dock.y + dock.height + PANEL_GAP;
  const bottomSpace = Math.max(0, bounds.y + bounds.height - bottomY);

  if (topSpace >= bottomSpace && topSpace >= minHeight) {
    return { ...current, height: topSpace };
  }

  if (bottomSpace >= minHeight) {
    return { ...current, y: bottomY, height: bottomSpace };
  }

  return resolvePanelRect(current, [dock], bounds);
};

const generateSampleData = (): SimulationVehicle[] => {
  const now = Date.now();
  return [
    {
      id: "sample-1", vehicleNo: "86가7530", driver: "김철수",
      startPos: LOCATION_MAP["GMT_부산"], destPos: LOCATION_MAP["LG1_선진화"],
      totalDistanceKm: 45, baseDurationSec: 1800, startTime: now - (1800 * 1000 * 0.1), status: "Moving", cargo: "부품", temp: "상온", dailyTripCount: 1
    },
    {
      id: "sample-2", vehicleNo: "93소0898", driver: "정순형",
      startPos: LOCATION_MAP["LG1_선진화"], destPos: LOCATION_MAP["GMT_부산"],
      totalDistanceKm: 45, baseDurationSec: 1800, startTime: now - (1800 * 1000 * 0.8), status: "Moving", cargo: "모터", temp: "상온", dailyTripCount: 4
    },
    {
      id: "sample-3", vehicleNo: "88라4873", driver: "김준동",
      startPos: LOCATION_MAP["CKD납품"], destPos: LOCATION_MAP["GMT_부산"],
      totalDistanceKm: 20, baseDurationSec: 1200, startTime: now - (1200 * 1000 * 0.5), status: "Moving", cargo: "전자부품", temp: "상온", dailyTripCount: 2
    },
    {
      id: "sample-4", vehicleNo: "12다3456", driver: "박민수",
      startPos: LOCATION_MAP["신창원물류"], destPos: LOCATION_MAP["LG1_선진화"],
      totalDistanceKm: 15, baseDurationSec: 1000, startTime: now - (1000 * 1000 * 0.95), status: "Moving", cargo: "플라스틱", temp: "상온", dailyTripCount: 5
    },
    {
      id: "sample-5", vehicleNo: "45마6789", driver: "이영희",
      startPos: LOCATION_MAP["성철사"], destPos: LOCATION_MAP["GMT_부산"],
      totalDistanceKm: 30, baseDurationSec: 2000, startTime: now - (2000 * 1000 * 0.2), status: "Moving", cargo: "금속부품", temp: "상온", dailyTripCount: 3
    },
    {
      id: "sample-6", vehicleNo: "77바1111", driver: "최동석",
      startPos: LOCATION_MAP["GMT_부산"], destPos: LOCATION_MAP["LG1_선진화"],
      totalDistanceKm: 45, baseDurationSec: 1800, startTime: now - (1800 * 1000 * 1.1), status: "Arrived", cargo: "완제품", temp: "상온", dailyTripCount: 3
    },
    {
      id: "sample-7", vehicleNo: "88사2222", driver: "강백호",
      startPos: LOCATION_MAP["LG1_선진화"], destPos: LOCATION_MAP["GMT_부산"],
      totalDistanceKm: 45, baseDurationSec: 1800, startTime: now - (1800 * 1000 * 1.5), status: "Arrived", cargo: "회수품", temp: "상온", dailyTripCount: 4
    }
  ];
};

const useViewportSize = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean
) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      const container = containerRef.current;
      const width = container?.clientWidth || window.innerWidth;
      const height = container?.clientHeight || Math.max(480, window.innerHeight - HEADER_OFFSET);
      setSize({ width: Math.round(width), height: Math.max(480, Math.round(height)) });
    };
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    update();
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef, enabled]);

  return size;
};

const useDraggableDock = (viewport: Size2D) => {
  const dockRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [dockSize, setDockSize] = useState<Size2D>({ width: 560, height: 116 });
  const [dockPosition, setDockPosition] = useState<Point2D | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const safeViewport = useMemo(() => {
    if (viewport.width && viewport.height) return viewport;
    if (typeof window === "undefined") return { width: 1920, height: 960 };
    return { width: window.innerWidth, height: Math.max(480, window.innerHeight - HEADER_OFFSET) };
  }, [viewport]);

  const getDefaultPosition = useCallback((size = dockSize): Point2D => ({
    x: Math.max(EDGE, Math.round((safeViewport.width - size.width) / 2)),
    y: Math.max(EDGE, safeViewport.height - size.height - EDGE),
  }), [dockSize, safeViewport.height, safeViewport.width]);

  const clampDockPosition = useCallback((point: Point2D, size = dockSize): Point2D => ({
    x: clamp(point.x, EDGE, safeViewport.width - size.width - EDGE),
    y: Math.max(MAP_MODE_SAFE_BOTTOM, safeViewport.height - size.height - EDGE),
  }), [dockSize, safeViewport.height, safeViewport.width]);

  useEffect(() => {
    if (!dockRef.current) return;
    const dockElement = dockRef.current;
    const observer = new ResizeObserver(() => {
      const rect = dockElement.getBoundingClientRect();
      const nextSize = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
      setDockSize(nextSize);
      setDockPosition(prev => prev ? clampDockPosition(prev, nextSize) : null);
    });
    observer.observe(dockElement);
    return () => observer.disconnect();
  }, [clampDockPosition]);

  useEffect(() => {
    if (!viewport.width || !viewport.height) return;
    setDockPosition(prev => prev ? clampDockPosition(prev) : getDefaultPosition());
  }, [clampDockPosition, getDefaultPosition, viewport.height, viewport.width]);

  const position = dockPosition ?? getDefaultPosition();

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const currentPosition = dockPosition ?? getDefaultPosition();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - currentPosition.x,
      offsetY: event.clientY - currentPosition.y,
    };
    setDockPosition(currentPosition);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [dockPosition, getDefaultPosition]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    setDockPosition(clampDockPosition({
      x: event.clientX - dragState.offsetX,
      y: event.clientY - dragState.offsetY,
    }));
  }, [clampDockPosition]);

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return {
    dockRef,
    dockSize,
    dockPosition: position,
    isDragging,
    dragHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
};

const useVehicleSimulation = () => {
  const [vehicles, setVehicles] = useState<SimulationVehicle[]>([]);
  const [markers, setMarkers] = useState<VWorldMarker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [targetIds, setTargetIds] = useState<{ lgId: string | null; gmtId: string | null }>({ lgId: null, gmtId: null });
  const vehiclesRef = useRef<SimulationVehicle[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let mappedVehicles: SimulationVehicle[] = [];
      if (isSampleMode) {
        mappedVehicles = generateSampleData();
        await new Promise(r => setTimeout(r, 300));
      } else {
        try {
          const res = await axios.get(getDxApiUrl('/api/DX_API000002'));
          const data: ApiVehicleData[] = res.data;
          const now = Date.now();
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
              const [h, m, s] = item.소요시간.split(":").map(Number);
              durationSec = h * 3600 + m * 60 + s;
            }
            const elapsedSec = (now - startTime) / 1000;
            const isTimeOver = elapsedSec >= durationSec;
            const isArrived = item.상태 === "도착" || isTimeOver;

            return {
              id: item.출도착처리ID,
              vehicleNo: item.차량번호,
              driver: item.운전자명 || "미지정",
              startPos,
              destPos,
              totalDistanceKm: 45,
              baseDurationSec: durationSec,
              startTime,
              status: isArrived ? "Arrived" : "Moving",
              cargo: "전자부품",
              temp: "상온",
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

      const moving = mappedVehicles.filter(v => v.status === "Moving");
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
  }, [isSampleMode]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    let animationFrameId: number;
    let lastFrameTime = 0;
    const targetFps = 30;
    const frameInterval = 1000 / targetFps;

    const baseMarkers = [
      { id: "fac-gmt", ...LOCATION_MAP["GMT_부산"], isFacility: true },
      { id: "fac-lg", ...LOCATION_MAP["LG1_선진화"], isFacility: true }
    ];

    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastFrameTime;
      if (deltaTime >= frameInterval) {
        lastFrameTime = timestamp - (deltaTime % frameInterval);
        const now = Date.now();
        const currentMarkers: VWorldMarker[] = [...baseMarkers];

        vehiclesRef.current.forEach(v => {
          if (v.status === "Arrived") return;
          const elapsedSec = (now - v.startTime) / 1000;
          const progress = Math.max(0, Math.min(1, elapsedSec / v.baseDurationSec));
          const currentLat = v.startPos.lat + (v.destPos.lat - v.startPos.lat) * progress;
          const currentLng = v.startPos.lng + (v.destPos.lng - v.startPos.lng) * progress;
          const isTarget = v.id === targetIds.lgId || v.id === targetIds.gmtId;
          const isLgToGomotek = v.startPos.title.includes("LG");

          currentMarkers.push({
            id: v.id,
            lat: currentLat,
            lng: currentLng,
            title: v.id,
            vehicleNo: v.vehicleNo,
            isFocused: isTarget,
            progress,
            startLat: v.startPos.lat,
            startLng: v.startPos.lng,
            destLat: v.destPos.lat,
            destLng: v.destPos.lng,
            driver: v.driver,
            cargo: v.cargo,
            eta: "이동 중",
            flip: isLgToGomotek,
          } as VWorldMarker);
        });
        setMarkers(currentMarkers);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetIds]);

  return { vehicles, markers, targetIds, fetchData, isLoading, isSampleMode, setIsSampleMode };
};

const NoDataModal = React.memo(({ onShowSample }: { onShowSample: () => void }) => (
  <ModalOverlay>
    <ModalContent>
      <button className="icon-wrapper" onClick={onShowSample} title="샘플 운행 데이터 보기" type="button">
        <Truck size={38} strokeWidth={1.7} />
      </button>
      <div className="text-content">
        <h2>현재 운행 중인 차량이 없습니다</h2>
        <p>새로운 배차 정보가 수신되면 자동으로 갱신됩니다.</p>
      </div>
      <button type="button" className="status-pill" onClick={onShowSample}>샘플 운행 보기</button>
    </ModalContent>
  </ModalOverlay>
));
NoDataModal.displayName = "NoDataModal";

export default function LocalMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [weather, setWeather] = useState<{ temp: number; desc: string; icon: React.ReactNode }>({
    temp: 0,
    desc: "-",
    icon: <Sun size={20} color="#64748b" />
  });
  const [infoMode, setInfoMode] = useState<MarkerInfoMode>("selected");
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>("2d");
  const [selectedMarkerIds, setSelectedMarkerIds] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedMarkerSnapshot, setSelectedMarkerSnapshot] = useState<VWorldMarker | null>(null);
  const [visiblePanels, setVisiblePanels] = useState<Record<InfoPanelKey, boolean>>(DEFAULT_INFO_PANELS);
  const selectionInitializedRef = useRef(false);

  const viewport = useViewportSize(containerRef, isMounted);
  const { dockRef, dockSize, dockPosition, isDragging, dragHandlers } = useDraggableDock(viewport);
  const { vehicles, markers, targetIds, fetchData, isLoading, isSampleMode, setIsSampleMode } = useVehicleSimulation();

  const markerMap = useMemo(() => {
    const map = new Map<string, VWorldMarker>();
    for (const marker of markers) {
      if (marker.title) map.set(String(marker.title), marker);
      if (marker.id) map.set(String(marker.id), marker);
    }
    return map;
  }, [markers]);

  const movingVehicles = vehicles.filter(v => v.status === "Moving");
  const arrivedVehicles = vehicles.filter(v => v.status === "Arrived");
  const totalCount = vehicles.length;
  const movingCount = movingVehicles.length;
  const arrivedCount = arrivedVehicles.length;
  const expectedLg = movingVehicles.filter(v => isLg(v.destPos.title)).length;
  const expectedGmt = movingVehicles.filter(v => isGmt(v.destPos.title)).length;
  const gmtToLgTotal = vehicles.filter(v => isGmt(v.startPos.title) && isLg(v.destPos.title)).length;
  const lgToGmtTotal = vehicles.filter(v => isLg(v.startPos.title) && isGmt(v.destPos.title)).length;
  const otherRoutesTotal = totalCount - gmtToLgTotal - lgToGmtTotal;
  const expectedReturn = vehicles.filter(v => !isGmt(v.destPos.title)).length;
  const warningCount = vehicles.filter(v => v.dailyTripCount >= TARGET_TRIPS_PER_DAY).length;
  const completionRate = totalCount > 0 ? Math.round((arrivedCount / totalCount) * 100) : 0;
  const passivePanelsVisible = infoMode !== "hidden";
  const isPanelVisible = useCallback((key: InfoPanelKey) => {
    if (infoMode === "hidden") return false;
    if (infoMode === "all") return true;
    return visiblePanels[key];
  }, [infoMode, visiblePanels]);

  const getRuntime = useCallback((v: SimulationVehicle) => {
    const marker = markerMap.get(v.id);
    const rawProgress = typeof marker?.progress === "number"
      ? marker.progress
      : (Date.now() - v.startTime) / 1000 / Math.max(1, v.baseDurationSec);
    const progress = v.status === "Arrived" ? 1 : Math.max(0, Math.min(1, rawProgress));
    const progressPct = Math.round(progress * 100);
    const elapsedSec = Math.max(0, Math.round(v.baseDurationSec * progress));
    const remainingSec = v.status === "Arrived" ? 0 : Math.max(0, Math.round(v.baseDurationSec * (1 - progress)));
    const elapsedMin = Math.floor(elapsedSec / 60);
    const remainingMin = Math.ceil(remainingSec / 60);
    const etaLabel = v.status === "Arrived" ? "도착 완료" : remainingMin <= 1 ? "도착 임박" : `${remainingMin}분`;
    return { progress, progressPct, elapsedSec, remainingSec, elapsedMin, remainingMin, etaLabel };
  }, [markerMap]);

  const movingRuntimeList = movingVehicles.map(v => ({ vehicle: v, runtime: getRuntime(v) }));
  const nextArrival = movingRuntimeList.length > 0
    ? [...movingRuntimeList].sort((a, b) => a.runtime.remainingSec - b.runtime.remainingSec)[0]
    : null;

  const defaultFocusIds = useMemo(
    () => [targetIds.lgId, targetIds.gmtId].filter(Boolean) as string[],
    [targetIds.lgId, targetIds.gmtId]
  );

  const activeSelectedMarkerIds = infoMode === "selected"
    ? selectedMarkerIds
    : [];

  const selectedMarker = useMemo(() => {
    if (!selectedVehicleId) return null;
    return markerMap.get(selectedVehicleId)
      || (selectedMarkerSnapshot && String(selectedMarkerSnapshot.id) === selectedVehicleId ? selectedMarkerSnapshot : null)
      || markers.find(marker => String(marker.id) === selectedVehicleId)
      || null;
  }, [markerMap, markers, selectedMarkerSnapshot, selectedVehicleId]);

  const selectedVehicle = useMemo(() => {
    const matchedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (matchedVehicle) return matchedVehicle;
    if (!selectedVehicleId || !selectedMarker || selectedMarker.isFacility) return null;

    const progress = Math.max(0, Math.min(1, selectedMarker.progress ?? 0.35));
    const baseDurationSec = 1800;

    return {
      id: selectedVehicleId,
      vehicleNo: selectedMarker.vehicleNo || selectedMarker.title || "임시차량",
      driver: selectedMarker.driver || "미지정",
      startPos: getNearestLocation(selectedMarker.startLat, selectedMarker.startLng, "출발지 확인 중"),
      destPos: getNearestLocation(selectedMarker.destLat, selectedMarker.destLng, "도착지 확인 중"),
      totalDistanceKm: 45,
      baseDurationSec,
      startTime: Date.now() - Math.round(progress * baseDurationSec * 1000),
      status: "Moving" as VehicleStatus,
      cargo: selectedMarker.cargo || "운행 화물",
      temp: "상온",
      dailyTripCount: 1,
    };
  }, [vehicles, selectedVehicleId, selectedMarker]);
  const selectedRuntime = selectedVehicle ? getRuntime(selectedVehicle) : null;

  const panelRects = useMemo(() => {
    const width = viewport.width || 1920;
    const height = viewport.height || 960;
    const availableWidth = Math.max(0, width - EDGE * 2);
    const wideLeftW = width >= 2200 ? 380 : 360;
    const wideRightW = width >= 2200 ? 380 : 360;
    const wideDetailW = width >= 2200 ? 440 : 420;
    const widePanelsWidth = wideLeftW + wideRightW + wideDetailW + PANEL_GAP * 2;
    const compactSideW = clamp(
      Math.floor((availableWidth - PANEL_GAP * 2) * 0.29),
      250,
      wideLeftW
    );
    const leftW = availableWidth >= widePanelsWidth ? wideLeftW : compactSideW;
    const rightW = availableWidth >= widePanelsWidth ? wideRightW : compactSideW;
    const detailW = availableWidth >= widePanelsWidth
      ? wideDetailW
      : Math.max(340, availableWidth - leftW - rightW - PANEL_GAP * 2);
    const topW = Math.min(610, width - EDGE * 2);
    const topH = 54;
    const bounds = { x: EDGE, y: EDGE, width: Math.max(320, width - EDGE * 2), height: Math.max(420, height - EDGE * 2) };
    const dockRect = { x: dockPosition.x, y: dockPosition.y, width: dockSize.width, height: dockSize.height };
    const modeWidth = Math.min(MAP_MODE_WIDTH, availableWidth);
    const modeRect = {
      x: Math.round((width - modeWidth) / 2),
      y: MAP_MODE_TOP,
      width: modeWidth,
      height: MAP_MODE_HEIGHT,
    };

    const topBase = { x: width - EDGE - topW, y: MAP_MODE_TOP, width: topW, height: topH };
    const rightBase = { x: width - EDGE - rightW, y: 92, width: rightW, height: height - 116 };
    const leftBase = { x: EDGE, y: EDGE, width: leftW, height: height - EDGE * 2 };
    const detailBase = passivePanelsVisible
      ? { x: width - EDGE - rightW - PANEL_GAP - detailW, y: 92, width: detailW, height: height - 116 }
      : { x: width - EDGE - detailW, y: 92, width: detailW, height: height - 116 };

    const avoidObstacles = (rect: PanelRect, obstacles: PanelRect[]) =>
      obstacles.reduce((current, obstacle) => avoidDockByResizing(current, obstacle, bounds), rect);

    const keepAboveDock = (rect: PanelRect): PanelRect => ({
      ...rect,
      height: Math.max(0, Math.min(rect.height, dockRect.y - PANEL_GAP - rect.y)),
    });

    const top = resolvePanelRect(topBase, [modeRect, dockRect], bounds);
    const leftObstacles = [modeRect, top, dockRect];
    const left = keepAboveDock(resolvePanelRect(avoidObstacles(leftBase, leftObstacles), leftObstacles, bounds));
    const rightObstacles = [modeRect, top, dockRect, left];
    const right = keepAboveDock(resolvePanelRect(avoidObstacles(rightBase, rightObstacles), rightObstacles, bounds));
    const detailObstacles = passivePanelsVisible
      ? [modeRect, top, dockRect, left, right]
      : [modeRect, top, dockRect];
    const detailSafe = avoidObstacles(detailBase, detailObstacles);
    const detail = keepAboveDock(resolvePanelRect(detailSafe, detailObstacles, bounds));

    return { top, left, right, detail, mode: modeRect, dock: dockRect };
  }, [dockPosition.x, dockPosition.y, dockSize.height, dockSize.width, passivePanelsVisible, viewport.height, viewport.width]);

  const calculateAvgTime = (startKeyword: string) => {
    const relevantVehicles = vehicles.filter((v: SimulationVehicle) =>
      v.startPos.title.includes(startKeyword) && v.status === "Moving"
    );
    if (relevantVehicles.length === 0) return "28분";
    const totalSec = relevantVehicles.reduce((acc: number, cur: SimulationVehicle) => acc + cur.baseDurationSec, 0);
    const avgMin = Math.round((totalSec / relevantVehicles.length) / 60);
    return `${avgMin}분`;
  };

  const avgLgToGmt = calculateAvgTime("LG");
  const avgGmtToLg = calculateAvgTime("고모텍");

  const clearAllSelections = useCallback(() => {
    selectionInitializedRef.current = true;
    setSelectedVehicleId(null);
    setSelectedMarkerSnapshot(null);
    setSelectedMarkerIds([]);
  }, []);

  const clearVehicleSelection = useCallback((id?: string | null) => {
    const targetId = id ?? selectedVehicleId;
    selectionInitializedRef.current = true;
    setSelectedVehicleId(null);
    setSelectedMarkerSnapshot(null);
    if (targetId) {
      setSelectedMarkerIds(prev => prev.filter(item => item !== targetId));
    }
  }, [selectedVehicleId]);

  const toggleMarkerSelection = useCallback((id: string) => {
    selectionInitializedRef.current = true;
    setSelectedMarkerIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    if (selectedVehicleId === id) {
      clearVehicleSelection(id);
    }
  }, [clearVehicleSelection, selectedVehicleId]);

  const applyInfoMode = useCallback((mode: MarkerInfoMode) => {
    setInfoMode(mode);
    if (mode === "hidden") {
      clearAllSelections();
      return;
    }
    if (mode === "selected" && selectedMarkerIds.length === 0 && defaultFocusIds.length > 0) {
      setSelectedMarkerIds(defaultFocusIds);
      selectionInitializedRef.current = true;
    }
  }, [clearAllSelections, defaultFocusIds, selectedMarkerIds.length]);

  const togglePanelVisibility = useCallback((key: InfoPanelKey) => {
    setVisiblePanels(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const openVehicleDetail = useCallback((id: string) => {
    if (selectedVehicleId === id) {
      clearVehicleSelection(id);
      return;
    }
    if (infoMode === "hidden") {
      setInfoMode("selected");
    }
    selectionInitializedRef.current = true;
    setSelectedVehicleId(id);
    setSelectedMarkerIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setVisiblePanels(prev => ({ ...prev, detail: true }));
  }, [clearVehicleSelection, infoMode, selectedVehicleId]);

  const handleMarkerClick = useCallback((marker: VWorldMarker) => {
    if (!marker.id || marker.isFacility) return;
    const markerId = String(marker.id);
    if (selectedVehicleId === markerId) {
      clearVehicleSelection(markerId);
      return;
    }
    setSelectedMarkerSnapshot(marker);
    openVehicleDetail(markerId);
  }, [clearVehicleSelection, openVehicleDetail, selectedVehicleId]);

  const handleMapBlankClick = useCallback(() => {
    if (selectedVehicleId) {
      clearVehicleSelection();
    }
  }, [clearVehicleSelection, selectedVehicleId]);

  const fetchWeather = async () => {
    try {
      const res = await axios.get("https://api.open-meteo.com/v1/forecast?latitude=35.15&longitude=128.86&current_weather=true&timezone=auto");
      const { temperature, weathercode } = res.data.current_weather;
      let desc = "맑음";
      let icon = <Sun size={18} color="#64748b" />;

      if (weathercode >= 0 && weathercode <= 3) {
        desc = weathercode === 0 ? "맑음" : "구름조금";
        icon = weathercode === 0 ? <Sun size={18} color="#f59e0b" /> : <Cloud size={18} color="#64748b" />;
      } else if (weathercode >= 45 && weathercode <= 48) {
        desc = "안개";
        icon = <Cloud size={18} color="#94a3b8" />;
      } else if (weathercode >= 51 && weathercode <= 67) {
        desc = "비";
        icon = <CloudRain size={18} color="#2563eb" />;
      } else if (weathercode >= 71 && weathercode <= 77) {
        desc = "눈";
        icon = <CloudSnow size={18} color="#60a5fa" />;
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

  useEffect(() => {
    setSelectedMarkerIds(prev => {
      const movingIds = new Set(movingVehicles.map(v => v.id));
      const kept = prev.filter(id => movingIds.has(id));
      if (kept.length > 0) return kept;
      if (!selectionInitializedRef.current && defaultFocusIds.length > 0) {
        selectionInitializedRef.current = true;
        return defaultFocusIds;
      }
      return [];
    });
  }, [defaultFocusIds.join("|"), movingVehicles.map(v => v.id).join("|")]);

  useEffect(() => {
    if (!selectedVehicleId) return;
    const hasVehicle = vehicles.some(v => v.id === selectedVehicleId);
    const hasMarker = markerMap.has(selectedVehicleId) || markers.some(marker => String(marker.id) === selectedVehicleId);
    if (!hasVehicle && !hasMarker) {
      setSelectedVehicleId(null);
    }
  }, [markerMap, markers, selectedVehicleId, vehicles]);

  if (!isMounted) return null;

  return (
    <Container ref={containerRef}>
      <MapArea>
        {mapViewMode === "3d" ? (
          <Transport3DMap
            markers={markers}
            focusedTitle={selectedVehicleId || targetIds.lgId || targetIds.gmtId || null}
            markerInfoMode={infoMode}
            selectedMarkerIds={activeSelectedMarkerIds}
            onMarkerClick={handleMarkerClick}
            onMapBlankClick={handleMapBlankClick}
          />
        ) : (
          <VWorldMap
            markers={markers}
            focusedTitle={selectedVehicleId || targetIds.lgId || targetIds.gmtId || null}
            markerInfoMode={infoMode}
            selectedMarkerIds={activeSelectedMarkerIds}
            onMarkerClick={handleMarkerClick}
            onMapBlankClick={handleMapBlankClick}
          />
        )}
      </MapArea>

      <MapModeFloating aria-label="지도 보기 방식" data-panel="mode-switch">
        <span className="view-label">지도 보기</span>
        <button type="button" className={mapViewMode === "2d" ? "active" : ""} onClick={() => setMapViewMode("2d")} aria-pressed={mapViewMode === "2d"}>
          <MapIcon size={15} />
          <span><strong>기존 지도</strong><small>2D 실시간 관제</small></span>
        </button>
        <button type="button" className={mapViewMode === "3d" ? "active" : ""} onClick={() => setMapViewMode("3d")} aria-pressed={mapViewMode === "3d"}>
          <Box size={15} />
          <span><strong>자연형 3D</strong><small>입체 디지털 트윈</small></span>
        </button>
      </MapModeFloating>

      {passivePanelsVisible && !isLoading && movingCount === 0 && <NoDataModal onShowSample={() => setIsSampleMode(true)} />}

      {isPanelVisible("top") && (
        <TopRightWidget style={toRightAnchoredPanelStyle(panelRects.top, viewport.width || 1920)} data-panel="top-status">
          <div className="time">{currentTime ? format(currentTime, "HH:mm") : "00:00"}</div>
          <div className="date">{currentTime ? format(currentTime, "yyyy.MM.dd (EEE)") : "-"}</div>
          <div className="divider" />
          <div className="weather">{weather.icon}<span className="temp">{weather.temp}°C</span><span className="desc">{weather.desc}</span></div>
          <div className="divider" />
          <button className="api-status" type="button" onClick={() => isSampleMode && setIsSampleMode(false)}>
            <span className={`dot ${isLoading ? "loading" : (isSampleMode ? "sample" : "normal")}`} />
            {isSampleMode ? "실시간 연동으로 전환" : "API 연동 정상"}
          </button>
          <div className="divider" />
          <button className="updated" type="button" onClick={fetchData}>
            <RefreshCw size={12} className={isLoading ? "spin" : ""} />
            {currentTime ? format(currentTime, "HH:mm:ss") : "--:--:--"}
          </button>
        </TopRightWidget>
      )}

      <ControlDock
        ref={dockRef}
        style={{ left: dockPosition.x, top: dockPosition.y }}
        $dragging={isDragging}
        data-panel="control-dock"
      >
        <DockDragHandle {...dragHandlers}>
          <GripHorizontal size={16} />
          <div>
            <span>지도 표시 설정</span>
            <strong>{mapViewMode === "3d" ? "3D 디지털 트윈" : "2D 실시간 지도"} · {infoMode === "hidden" ? "정보창 숨김" : infoMode === "all" ? "전체 표시" : "선택 표시"}</strong>
          </div>
          <span className="dock-count">{infoMode === "all" ? `${movingCount}대` : infoMode === "hidden" ? "OFF" : `${activeSelectedMarkerIds.length}대`}</span>
        </DockDragHandle>

        <SegmentedControl>
          <button type="button" className={infoMode === "hidden" ? "active" : ""} onClick={() => applyInfoMode("hidden")}>
            <EyeOff size={14} /> 정보창 없이
          </button>
          <button type="button" className={infoMode === "all" ? "active" : ""} onClick={() => applyInfoMode("all")}>
            <Layers3 size={14} /> 전체 표시
          </button>
          <button type="button" className={infoMode === "selected" ? "active" : ""} onClick={() => applyInfoMode("selected")}>
            <Eye size={14} /> 선택 표시
          </button>
        </SegmentedControl>

        {infoMode === "selected" && (activeSelectedMarkerIds.length > 0 || selectedVehicleId) && (
          <SelectionClearBar>
            <span>{selectedVehicleId ? "선택된 차량 상세가 열려 있습니다." : "선택 표시 차량이 있습니다."}</span>
            <button type="button" onClick={clearAllSelections}>선택 해제</button>
          </SelectionClearBar>
        )}

        {infoMode === "selected" && (
          <>
            <PanelToggleRail>
              {(Object.keys(INFO_PANEL_LABELS) as InfoPanelKey[]).map(key => (
                <button key={key} type="button" className={visiblePanels[key] ? "active" : ""} onClick={() => togglePanelVisibility(key)}>
                  {INFO_PANEL_LABELS[key]}
                </button>
              ))}
            </PanelToggleRail>
            <SelectionRail>
              {movingVehicles.map(v => {
              const active = activeSelectedMarkerIds.includes(v.id);
              return (
                <SelectionChip key={`select-${v.id}`} type="button" className={active ? "active" : ""} onClick={() => toggleMarkerSelection(v.id)}>
                  <span className="dot" />
                  <span>{v.vehicleNo}</span>
                  <small>{getShortLocName(v.startPos.title)}→{getShortLocName(v.destPos.title)}</small>
                </SelectionChip>
              );
            })}
            </SelectionRail>
          </>
        )}
      </ControlDock>

      {isPanelVisible("right") && (
        <RightSideWrapper style={toRightAnchoredPanelStyle(panelRects.right, viewport.width || 1920)} data-panel="right-status">
          <StatsPanel>
            <StatsHeader>
              <div className="title-box">
                <span className="icon-box"><PieChart size={15} /></span>
                <div>
                  <strong>당일 배차 및 운행 통계</strong>
                  <small>{currentTime ? format(currentTime, "MM.dd HH:mm") : "--"} 기준</small>
                </div>
              </div>
              <span className="live-badge"><span /> LIVE</span>
            </StatsHeader>

            <StatsOverview>
              <div>
                <small>완료율</small>
                <strong>{completionRate}%</strong>
              </div>
              <p>{nextArrival ? `${nextArrival.vehicle.vehicleNo} ${nextArrival.runtime.etaLabel} 후 도착 예정` : "대기 중인 운행 차량이 없습니다."}</p>
            </StatsOverview>

            <StatsGrid>
              <div className="stat-card">
                <span className="stat-title"><Truck size={14} />운행중</span>
                <strong className="red">{movingCount}<span className="unit">대</span></strong>
              </div>
              <div className="stat-card">
                <span className="stat-title"><CheckCircle2 size={14} />도착완료</span>
                <strong className="green">{arrivedCount}<span className="unit">대</span></strong>
              </div>
              <div className="stat-card">
                <span className="stat-title"><MapPin size={14} />LG 예정</span>
                <strong className="blue">{expectedLg}<span className="unit">대</span></strong>
              </div>
              <div className="stat-card">
                <span className="stat-title"><Route size={14} />GMT 예정</span>
                <strong className="blue">{expectedGmt}<span className="unit">대</span></strong>
              </div>
              <div className="stat-card">
                <span className="stat-title"><TimerReset size={14} />복귀 대상</span>
                <strong className="orange">{expectedReturn}<span className="unit">대</span></strong>
              </div>
              <div className="stat-card">
                <span className="stat-title"><AlertTriangle size={14} />주의 차량</span>
                <strong className="red">{warningCount}<span className="unit">대</span></strong>
              </div>
            </StatsGrid>

            <RouteSummary>
              <div className="summary-head"><span>노선별 누적</span><strong>{totalCount}건</strong></div>
              <div className="route-row"><span>GMT → LG</span><div><i style={{ width: `${totalCount ? (gmtToLgTotal / totalCount) * 100 : 0}%` }} /></div><strong>{gmtToLgTotal}</strong></div>
              <div className="route-row"><span>LG → GMT</span><div><i style={{ width: `${totalCount ? (lgToGmtTotal / totalCount) * 100 : 0}%` }} /></div><strong>{lgToGmtTotal}</strong></div>
              <div className="route-row muted"><span>기타</span><div><i style={{ width: `${totalCount ? (otherRoutesTotal / totalCount) * 100 : 0}%` }} /></div><strong>{otherRoutesTotal}</strong></div>
            </RouteSummary>
          </StatsPanel>

          <MovingListPanel>
            <MovingListHeader>
              <span><Navigation size={14} /> 실시간 운행 현황 리스트</span>
              <small>{movingVehicles.length}대 운행중</small>
            </MovingListHeader>
            <MiniMovingList>
              {movingVehicles.length > 0 ? movingVehicles.map(v => {
                const runtime = getRuntime(v);
                const isWarning = v.dailyTripCount >= TARGET_TRIPS_PER_DAY;
                const isSelected = activeSelectedMarkerIds.includes(v.id);

                return (
                  <CompactListItem
                    key={`mini-active-${v.id}`}
                    $isWarning={isWarning}
                    $isActive={selectedVehicleId === v.id}
                    onClick={() => openVehicleDetail(v.id)}
                    data-vehicle-row={v.id}
                  >
                    <div className="v-info">
                      <div className="v-no">{v.vehicleNo}{isWarning && <AlertTriangle size={12} color="#b45309" />}</div>
                      <div className="v-trip">{v.dailyTripCount}회차 · {runtime.progressPct}%</div>
                    </div>
                    <div className="route-info">{getShortLocName(v.startPos.title)} <span>→</span> {getShortLocName(v.destPos.title)}</div>
                    <div className="time-info">{runtime.etaLabel}</div>
                    {infoMode === "selected" && (
                      <span
                        className={`select-dot ${isSelected ? "on" : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggleMarkerSelection(v.id); }}
                        title="지도 정보창 선택"
                      />
                    )}
                  </CompactListItem>
                );
              }) : (
                <div className="empty-state">현재 운행 중인 차량이 없습니다.</div>
              )}
            </MiniMovingList>
          </MovingListPanel>
        </RightSideWrapper>
      )}

      {isPanelVisible("left") && (
        <SidebarModal style={toPanelStyle(panelRects.left)} data-panel="left-history">
          <SidebarHeaderSection>
            <SidebarHeader>운행 이력 및 통계</SidebarHeader>
            <AvgTimeSection>
              <div className="avg-row"><span className="dot" /> LG전자 행 평균 소요시간<span className="count-spacer" /><span className="time">{avgGmtToLg}</span></div>
              <div className="avg-row"><span className="dot" /> 고모텍 행 평균 소요시간<span className="count-spacer" /><span className="time">{avgLgToGmt}</span></div>
            </AvgTimeSection>
          </SidebarHeaderSection>

          <HistorySectionWrapper>
            <HistoryHeader>전체 배차 내역<span className="count-badge">{totalCount}건</span></HistoryHeader>
            <ScrollableHistoryList>
              {vehicles.map((v) => {
                const isArrived = v.status === "Arrived";
                const runtime = getRuntime(v);
                const isWarning = v.dailyTripCount >= TARGET_TRIPS_PER_DAY;
                const themeColor = v.startPos.title.includes("LG") ? "#ce0037" : "#0f172a";

                return (
                  <HistoryItem
                    key={`hist-${v.id}`}
                    $isWarning={isWarning}
                    $isActive={selectedVehicleId === v.id}
                    onClick={() => openVehicleDetail(v.id)}
                  >
                    <div className="info-row">
                      <div className="title">
                        <span className="v-no">{v.vehicleNo}</span>
                        {isWarning ? <span className="trip-count warning"><AlertTriangle size={12} /> {v.dailyTripCount}회차 완료</span> : <span className="trip-count">누적 {v.dailyTripCount}회차</span>}
                      </div>
                      <div className={`status ${isArrived ? "arrived" : "moving"}`} style={{ color: isArrived ? "#64748b" : themeColor }}>{isArrived ? "도착완료" : "배송중"}</div>
                    </div>
                    <div className="route-row">
                      {getShortLocName(v.startPos.title)} → {getShortLocName(v.destPos.title)}
                      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={11} />{isArrived ? "운행 종료" : `${runtime.etaLabel} 후 도착 예정`}
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="fill" style={{ width: `${runtime.progressPct}%`, background: isArrived ? "#10b981" : themeColor }} />
                      <Truck size={14} className="truck-icon" style={{ left: `calc(${runtime.progressPct}% - 8px)`, color: isArrived ? "#10b981" : themeColor }} />
                    </div>
                    <div className="pct-text">{runtime.progressPct}%</div>
                  </HistoryItem>
                );
              })}
            </ScrollableHistoryList>
          </HistorySectionWrapper>
        </SidebarModal>
      )}

      {passivePanelsVisible && isPanelVisible("detail") && selectedVehicle && selectedRuntime && (
        <VehicleDetailDrawer
          style={toRightAnchoredPanelStyle(panelRects.detail, viewport.width || 1920)}
          $themeColor={selectedVehicle.startPos.title.includes("LG") ? "#ce0037" : "#0f172a"}
          data-panel="vehicle-detail"
        >
          <div className="drawer-head">
            <div>
              <span className="eyebrow"><Radio size={13} /> 선택 차량 상세</span>
              <h2>{selectedVehicle.vehicleNo}</h2>
              <p>{getShortLocName(selectedVehicle.startPos.title)} → {getShortLocName(selectedVehicle.destPos.title)}</p>
            </div>
            <div className="head-actions">
              <button type="button" className="clear-selection" onClick={() => clearVehicleSelection(selectedVehicle.id)}>선택 해제</button>
              <button type="button" onClick={() => clearVehicleSelection(selectedVehicle.id)} aria-label="상세 닫기"><X size={18} /></button>
            </div>
          </div>

          <VehicleVisual $themeColor={selectedVehicle.startPos.title.includes("LG") ? "#ce0037" : "#0f172a"}>
            <div className="dash-screen">
              <div className="gear-stack"><span>P</span><span>R</span><span>N</span><b>D</b></div>
              <div className="speed-copy"><strong>{selectedRuntime.remainingMin <= 1 ? 1 : selectedRuntime.remainingMin}</strong><span>min ETA</span></div>
              <div className="truck-stage"><Truck size={92} strokeWidth={1.2} /></div>
              <div className="mini-map">
                <span className="pin start">{getShortLocName(selectedVehicle.startPos.title)}</span>
                <div className="route-line"><i style={{ width: `${selectedRuntime.progressPct}%` }} /></div>
                <span className="pin end">{getShortLocName(selectedVehicle.destPos.title)}</span>
              </div>
            </div>
          </VehicleVisual>

          <DetailProgress $themeColor={selectedVehicle.startPos.title.includes("LG") ? "#ce0037" : "#0f172a"}>
            <div className="progress-top"><span>운행 진행률</span><strong>{selectedRuntime.progressPct}%</strong></div>
            <div className="progress-track"><i style={{ width: `${selectedRuntime.progressPct}%` }} /></div>
            <div className="progress-meta"><span>{selectedVehicle.startPos.title}</span><span>{selectedVehicle.destPos.title}</span></div>
          </DetailProgress>

          <DetailMetricGrid>
            <div><UserRound size={16} /><span>기사명</span><strong>{selectedVehicle.driver || "-"}</strong></div>
            <div><PackageCheck size={16} /><span>화물</span><strong>{selectedVehicle.cargo}</strong></div>
            <div><Gauge size={16} /><span>상태</span><strong>{selectedVehicle.status === "Arrived" ? "도착완료" : "이동중"}</strong></div>
            <div><TimerReset size={16} /><span>남은 시간</span><strong>{selectedRuntime.etaLabel}</strong></div>
            <div><Route size={16} /><span>총 거리</span><strong>{selectedVehicle.totalDistanceKm}km</strong></div>
            <div><AlertTriangle size={16} /><span>당일 회차</span><strong>{selectedVehicle.dailyTripCount}회</strong></div>
          </DetailMetricGrid>

          <DetailTimeline>
            <div className="step done"><span />출발 <strong>{selectedVehicle.startPos.title}</strong></div>
            <div className="step active"><span />현재 운행 <strong>{selectedRuntime.elapsedMin}분 경과</strong></div>
            <div className={selectedVehicle.status === "Arrived" ? "step done" : "step"}><span />도착 <strong>{selectedRuntime.etaLabel}</strong></div>
          </DetailTimeline>
        </VehicleDetailDrawer>
      )}
    </Container>
  );
}

const glassPanel = `
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.92);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.10);
`;

const Container = styled.div`
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  background: #eef3f8;
  contain: layout paint;
`;

const MapArea = styled.div`
  position: absolute;
  inset: 0;

  .ol-overlaycontainer,
  .ol-overlaycontainer-stopevent {
    z-index: 2147481000 !important;
    pointer-events: none;
  }

  .ol-overlaycontainer [data-marker-id],
  .ol-overlaycontainer-stopevent [data-marker-id] {
    pointer-events: auto !important;
    cursor: pointer;
  }
`;

const MapModeFloating = styled.div`
  position: absolute;
  z-index: 145;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: min(390px, calc(100% - 48px));
  display: grid;
  grid-template-columns: auto repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: 5px;
  padding: 5px;
  border: 1px solid rgba(255, 255, 255, 0.84);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.13);
  backdrop-filter: blur(16px);

  .view-label {
    padding: 0 8px;
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  button {
    min-width: 0;
    height: 44px;
    padding: 0 12px;
    border: 1px solid transparent;
    border-radius: 12px;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    cursor: pointer;
    text-align: left;
  }

  button:hover {
    color: #0f172a;
    background: #f8fafc;
  }

  button > span {
    min-width: 0;
    display: block;
  }

  strong,
  small {
    display: block;
    white-space: nowrap;
  }

  strong {
    color: inherit;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.15;
  }

  small {
    margin-top: 3px;
    color: #94a3b8;
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
  }

  button.active {
    color: #ffffff;
    background: #0f172a;
    border-color: #0f172a;
    box-shadow: 0 5px 12px rgba(15, 23, 42, 0.2);
  }

  button.active small {
    color: #cbd5e1;
  }
`;

const TopRightWidget = styled.div`
  position: absolute;
  z-index: 110;
  ${glassPanel}
  border-radius: 18px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1e293b;
  font-size: 13px;
  font-weight: 650;
  overflow: hidden;

  .time { font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
  .date { color: #64748b; font-weight: 650; font-size: 12px; white-space: nowrap; }
  .divider { width: 1px; height: 14px; background: #e2e8f0; }
  .weather { display: flex; align-items: center; gap: 5px; white-space: nowrap; }
  .temp { font-weight: 700; }
  .desc { color: #64748b; }

  button { border: 0; background: transparent; font: inherit; cursor: pointer; }
  .api-status { display: flex; align-items: center; gap: 6px; color: #334155; font-weight: 700; white-space: nowrap; }
  .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
  .dot.normal { background: #10b981; }
  .dot.loading { background: #f59e0b; animation: blink 1s infinite; }
  .dot.sample { background: #f59e0b; }
  .updated { display: flex; align-items: center; gap: 4px; color: #94a3b8; font-weight: 700; font-size: 12px; white-space: nowrap; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
  @keyframes blink { 50% { opacity: 0.42; } }
`;

const ControlDock = styled.div<{ $dragging: boolean }>`
  position: absolute;
  z-index: 140;
  width: min(560px, calc(100% - 48px));
  ${glassPanel}
  border-radius: 18px;
  padding: 10px;
  user-select: none;
  transition: ${(props) => props.$dragging ? 'none' : 'box-shadow .18s ease'};
  box-shadow: ${(props) => props.$dragging ? '0 12px 28px rgba(15,23,42,0.16)' : '0 8px 22px rgba(15,23,42,0.10)'};
`;

const DockDragHandle = styled.div`
  height: 36px;
  display: grid;
  grid-template-columns: 20px 1fr auto;
  gap: 8px;
  align-items: center;
  cursor: ew-resize;
  color: #64748b;
  padding: 0 4px 8px;
  touch-action: none;

  &:active { cursor: ew-resize; }
  div { min-width: 0; display: flex; align-items: baseline; gap: 8px; }
  span { font-size: 11px; font-weight: 700; color: #64748b; white-space: nowrap; }
  strong { font-size: 14px; font-weight: 700; color: #0f172a; letter-spacing: -0.4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dock-count { color: #0f172a; font-size: 11px; font-weight: 700; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 9px; border-radius: 999px; white-space: nowrap; }
`;

const SegmentedControl = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;

  button {
    border: 1px solid #e2e8f0;
    background: rgba(255,255,255,0.72);
    color: #64748b;
    border-radius: 12px;
    height: 36px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
  }
  button:hover { background: #ffffff; color: #0f172a; }
  button.active { background: #0f172a; color: #ffffff; border-color: #0f172a; }
`;

const PanelToggleRail = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 8px;

  button {
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #64748b;
    border-radius: 10px;
    height: 30px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  button.active {
    background: #0f172a;
    color: #ffffff;
    border-color: #0f172a;
  }
`;

const SelectionClearBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  padding: 9px 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 12px;

  span {
    min-width: 0;
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  button {
    flex-shrink: 0;
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    color: #0f172a;
    border-radius: 10px;
    padding: 7px 9px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
`;

const SelectionRail = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-top: 10px;
  padding-bottom: 2px;
  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
`;

const SelectionChip = styled.button`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #e2e8f0;
  background: rgba(255,255,255,0.72);
  color: #475569;
  border-radius: 999px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;

  .dot { width: 7px; height: 7px; border-radius: 50%; background: #cbd5e1; }
  small { color: #94a3b8; font-size: 10px; font-weight: 700; }
  &.active { color: #0f172a; border-color: #94a3b8; background: #ffffff; }
  &.active .dot { background: #ce0037; }
`;

const RightSideWrapper = styled.div`
  position: absolute;
  z-index: 105;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
`;

const StatsPanel = styled.div`
  ${glassPanel}
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  flex: 0 1 auto;
  min-height: 0;
  max-height: 64%;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;

const StatsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 16px 10px;
  color: #0f172a;
  .title-box { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .icon-box { width: 32px; height: 32px; border-radius: 11px; display: flex; align-items: center; justify-content: center; background: #0f172a; color: #ffffff; flex: 0 0 auto; }
  strong { display: block; font-size: 15px; font-weight: 700; letter-spacing: -0.5px; }
  small { display: block; margin-top: 2px; font-size: 11px; color: #64748b; font-weight: 700; }
  .live-badge { display: inline-flex; align-items: center; gap: 5px; color: #059669; border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 999px; padding: 5px 8px; font-size: 10px; font-weight: 700; }
  .live-badge span { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }
`;

const StatsOverview = styled.div`
  margin: 0 16px 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 16px;
  padding: 12px 13px;
  display: grid;
  grid-template-columns: 92px 1fr;
  align-items: center;
  gap: 12px;

  div { border-right: 1px solid #e2e8f0; }
  small { display: block; color: #64748b; font-size: 11px; font-weight: 700; margin-bottom: 4px; }
  strong { color: #0f172a; font-size: 28px; font-weight: 700; letter-spacing: -1px; line-height: 1; }
  p { margin: 0; color: #475569; font-size: 12px; font-weight: 700; line-height: 1.38; }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 0 16px 14px;

  .stat-card {
    min-height: 78px;
    padding: 12px;
    border-radius: 15px;
    background: rgba(255,255,255,0.72);
    border: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .stat-title { font-size: 11px; color: #64748b; font-weight: 700; display: flex; align-items: center; gap: 5px; }
  strong { font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.8px; line-height: 1; }
  .unit { font-size: 13px; margin-left: 2px; color: #64748b; }
  .red { color: #ce0037; }
  .green { color: #10b981; }
  .blue { color: #2563eb; }
  .orange { color: #f59e0b; }
`;

const RouteSummary = styled.div`
  margin: 0 16px 16px;
  padding: 13px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;

  .summary-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; color: #0f172a; font-weight: 700; font-size: 13px; }
  .summary-head strong { font-size: 13px; }
  .route-row { display: grid; grid-template-columns: 72px 1fr 26px; gap: 8px; align-items: center; margin-top: 8px; font-size: 11px; font-weight: 700; color: #475569; }
  .route-row > div { height: 6px; border-radius: 99px; background: #e2e8f0; overflow: hidden; }
  .route-row i { display: block; height: 100%; border-radius: inherit; background: #0f172a; }
  .route-row.muted i { background: #94a3b8; }
  .route-row strong { text-align: right; color: #0f172a; }
`;

const MovingListPanel = styled.div`
  ${glassPanel}
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
`;

const MovingListHeader = styled.div`
  font-size: 14px;
  font-weight: 700;
  padding: 15px 16px 10px;
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-shrink: 0;
  span { display: flex; align-items: center; gap: 6px; }
  small { font-size: 11px; color: #64748b; font-weight: 700; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 8px; border-radius: 999px; }
`;

const MiniMovingList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  .empty-state { text-align: center; font-size: 12px; color: #94a3b8; padding: 20px 0; font-weight: 700; }
`;

const CompactListItem = styled.div<{ $isWarning?: boolean; $isActive?: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: 86px 1fr 64px;
  align-items: center;
  gap: 8px;
  padding: 12px 13px;
  border-radius: 14px;
  background: ${(props) => props.$isActive ? '#0f172a' : (props.$isWarning ? '#fffbeb' : '#ffffff')};
  border: 1px solid ${(props) => props.$isActive ? '#0f172a' : (props.$isWarning ? '#fde68a' : '#e2e8f0')};
  cursor: pointer;
  flex-shrink: 0;
  transition: background .16s ease, border-color .16s ease;
  &:hover { background: ${(props) => props.$isActive ? '#0f172a' : '#f8fafc'}; }
  .v-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .v-no { font-size: 14px; font-weight: 700; color: ${(props) => props.$isActive ? '#ffffff' : '#0f172a'}; display: flex; align-items: center; gap: 4px; letter-spacing: -0.5px; }
  .v-trip { font-size: 11px; color: ${(props) => props.$isActive ? '#cbd5e1' : (props.$isWarning ? '#b45309' : '#64748b')}; font-weight: 700; }
  .route-info { text-align: center; font-size: 13px; font-weight: 700; color: ${(props) => props.$isActive ? '#e2e8f0' : '#475569'}; letter-spacing: -0.4px; white-space: nowrap; }
  .route-info span { color: ${(props) => props.$isActive ? '#94a3b8' : '#cbd5e1'}; }
  .time-info { text-align: right; font-size: 14px; font-weight: 700; letter-spacing: -0.4px; white-space: nowrap; color: ${(props) => props.$isActive ? '#ffffff' : '#0f172a'}; }
  .select-dot { position: absolute; top: 8px; right: 8px; width: 9px; height: 9px; border-radius: 50%; background: #cbd5e1; }
  .select-dot.on { background: #10b981; }
`;

const SidebarModal = styled.div`
  position: absolute;
  ${glassPanel}
  z-index: 105;
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SidebarHeaderSection = styled.div`
  padding: 22px 22px 15px;
  flex-shrink: 0;
`;

const SidebarHeader = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 18px;
  letter-spacing: -0.6px;
`;

const AvgTimeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 13px;
  border-radius: 14px;
  .avg-row { display: flex; align-items: center; font-size: 13px; color: #475569; font-weight: 700; }
  .dot { width: 5px; height: 5px; background: #64748b; border-radius: 50%; margin-right: 7px; }
  .count-spacer { flex: 1; border-bottom: 1px dashed #cbd5e1; margin: 0 12px; }
  .time { color: #0f172a; font-weight: 700; }
`;

const HistorySectionWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`;

const HistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  padding: 15px 22px 11px;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  .count-badge { background: #0f172a; color: #ffffff; font-size: 11px; padding: 4px 10px; border-radius: 99px; }
`;

const ScrollableHistoryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 14px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;

const HistoryItem = styled.div<{ $isWarning?: boolean; $isActive?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: ${(props) => props.$isActive ? '#0f172a' : (props.$isWarning ? '#fffbeb' : '#ffffff')};
  border: 1px solid ${(props) => props.$isActive ? '#0f172a' : (props.$isWarning ? '#fde68a' : '#e2e8f0')};
  border-radius: 14px;
  padding: 13px;
  cursor: pointer;
  transition: background .16s ease, border-color .16s ease;
  &:hover { background: ${(props) => props.$isActive ? '#0f172a' : '#f8fafc'}; }
  .info-row { display: flex; justify-content: space-between; align-items: center; }
  .title { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .v-no { font-size: 15px; font-weight: 700; color: ${(props) => props.$isActive ? '#ffffff' : '#0f172a'}; }
  .trip-count { font-size: 11px; color: ${(props) => props.$isActive ? '#cbd5e1' : '#64748b'}; font-weight: 700; background: ${(props) => props.$isActive ? '#1e293b' : '#f1f5f9'}; padding: 2px 6px; border-radius: 6px; }
  .trip-count.warning { color: #b45309; background: #fef3c7; display: flex; align-items: center; gap: 4px; border: 1px solid #fde68a; }
  .status { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 8px; background: ${(props) => props.$isActive ? '#1e293b' : '#f8fafc'}; }
  .route-row { display: flex; font-size: 12px; color: ${(props) => props.$isActive ? '#cbd5e1' : '#64748b'}; font-weight: 650; margin-bottom: 4px; }
  .progress-bar { position: relative; width: 100%; height: 4px; background: ${(props) => props.$isActive ? '#334155' : '#e2e8f0'}; border-radius: 2px; margin-bottom: 4px; }
  .fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 2px; }
  .truck-icon { position: absolute; top: -13px; background: ${(props) => props.$isActive ? '#0f172a' : '#ffffff'}; padding: 2px; border-radius: 5px; }
  .pct-text { text-align: right; font-size: 10px; font-weight: 700; color: ${(props) => props.$isActive ? '#e2e8f0' : '#10b981'}; }
`;

const VehicleDetailDrawer = styled.div<{ $themeColor: string }>`
  position: absolute;
  z-index: 2147483000;
  pointer-events: auto;
  ${glassPanel}
  border-radius: 22px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-x: hidden;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

  .drawer-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .head-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: ${(props) => props.$themeColor}; font-weight: 700; }
  h2 { margin: 6px 0 2px; font-size: 32px; line-height: 1; color: #0f172a; letter-spacing: -1.2px; }
  p { margin: 0; color: #64748b; font-size: 13px; font-weight: 700; }
  button { width: 34px; height: 34px; border: 1px solid #e2e8f0; background: #ffffff; border-radius: 12px; cursor: pointer; color: #334155; display: grid; place-items: center; }
  button.clear-selection { width: auto; min-width: 76px; padding: 0 12px; font-size: 12px; font-weight: 700; }
`;

const VehicleVisual = styled.div<{ $themeColor: string }>`
  .dash-screen {
    position: relative;
    height: 176px;
    border-radius: 20px;
    overflow: hidden;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    color: #0f172a;
  }
  .gear-stack { position: absolute; left: 16px; top: 15px; display: flex; flex-direction: column; gap: 6px; color: #94a3b8; font-size: 12px; font-weight: 700; }
  .gear-stack b { color: ${(props) => props.$themeColor}; }
  .speed-copy { position: absolute; left: 58px; top: 14px; display: flex; align-items: flex-start; gap: 6px; }
  .speed-copy strong { font-size: 48px; line-height: .9; letter-spacing: -1.8px; font-weight: 700; }
  .speed-copy span { margin-top: 8px; color: #64748b; font-size: 11px; font-weight: 700; }
  .truck-stage { position: absolute; left: 42px; bottom: 24px; width: 150px; height: 96px; display: grid; place-items: center; color: #334155; }
  .mini-map { position: absolute; right: 12px; top: 12px; bottom: 12px; width: 184px; border-radius: 16px; background: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0; overflow: hidden; }
  .route-line { position: absolute; left: 22px; right: 22px; top: 74px; height: 6px; border-radius: 99px; background: #e2e8f0; overflow: hidden; }
  .route-line i { display: block; height: 100%; background: ${(props) => props.$themeColor}; border-radius: inherit; }
  .pin { position: absolute; font-size: 10px; font-weight: 700; background: #ffffff; border: 1px solid #e2e8f0; padding: 5px 7px; border-radius: 999px; }
  .pin.start { left: 14px; bottom: 20px; }
  .pin.end { right: 14px; top: 20px; }
`;

const DetailProgress = styled.div<{ $themeColor: string }>`
  padding: 13px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  .progress-top { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; font-weight: 700; margin-bottom: 10px; }
  .progress-top strong { color: #0f172a; }
  .progress-track { height: 7px; border-radius: 99px; background: #e2e8f0; overflow: hidden; }
  .progress-track i { display: block; height: 100%; border-radius: inherit; background: ${(props) => props.$themeColor}; }
  .progress-meta { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; color: #94a3b8; font-size: 10px; font-weight: 700; }
  .progress-meta span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

const DetailMetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  div { min-height: 68px; border-radius: 15px; background: #ffffff; border: 1px solid #e2e8f0; padding: 11px; display: flex; flex-direction: column; justify-content: space-between; }
  svg { color: #64748b; }
  span { color: #64748b; font-size: 11px; font-weight: 700; }
  strong { color: #0f172a; font-size: 15px; font-weight: 700; letter-spacing: -0.4px; }
`;

const DetailTimeline = styled.div`
  margin-top: auto;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 13px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  .step { position: relative; display: flex; align-items: center; gap: 9px; color: #64748b; font-size: 12px; font-weight: 700; }
  .step + .step::before { content: ""; position: absolute; left: 5px; bottom: 20px; height: 18px; width: 1px; background: #e2e8f0; }
  .step span { width: 11px; height: 11px; border-radius: 50%; background: #cbd5e1; flex: 0 0 auto; }
  .step.done span { background: #10b981; }
  .step.active span { background: #ce0037; }
  strong { margin-left: auto; color: #0f172a; font-size: 12px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const ModalOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 130;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: rgba(248, 250, 252, 0.36);
  backdrop-filter: blur(8px) saturate(1.1);
  -webkit-backdrop-filter: blur(8px) saturate(1.1);
`;

const ModalContent = styled.div`
  ${glassPanel}
  background: rgba(255, 255, 255, 0.82);
  pointer-events: auto;
  border-radius: 22px;
  padding: 22px;
  width: 360px;
  text-align: center;
  color: #0f172a;
  .icon-wrapper { width: 70px; height: 70px; border-radius: 18px; border: 1px solid #e2e8f0; background: #ffffff; color: #64748b; display: inline-grid; place-items: center; cursor: pointer; }
  h2 { margin: 14px 0 6px; font-size: 20px; font-weight: 700; letter-spacing: -0.6px; }
  p { margin: 0; color: #64748b; font-size: 13px; font-weight: 650; }
  .status-pill { margin-top: 16px; border: 1px solid #e2e8f0; background: #0f172a; color: #ffffff; border-radius: 999px; padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
`;
