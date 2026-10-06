"use client";
import { usePageVisible } from '@/hooks/use-page-visible';

import React, { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import styled from "styled-components";
import type { VWorldMarker } from "@/components/vworld-map-dev";
import MapAttribution from "@/components/transport-map/MapAttribution";
import MapTileStatus from "@/components/transport-map/MapTileStatus";
import GmtTruckModel from "@/components/transport-map/GmtTruckModel";
import TruckModelStatus from "@/components/transport-map/TruckModelStatus";
import { useGmtTruckModel } from "@/hooks/use-gmt-truck-model";
import { useTransportMapTexture } from "@/hooks/use-transport-map-texture";
import { VectorMapTextureSurface } from "@/components/transport-map/VectorMapTextureSurface";
import { TRANSPORT_VECTOR_BASEMAP } from "@/constants/transport-basemap";
import { color as mapColor, focusRing, font, fontSize, fontWeight, gridLayer, motion as transition, radius, shadow, space, tone } from "@/styles/design-tokens";

type MarkerInfoMode = "hidden" | "all" | "selected" | "auto";

interface Transport3DMapProps {
  markers?: VWorldMarker[];
  focusedTitle?: string | null;
  markerInfoMode?: MarkerInfoMode;
  selectedMarkerIds?: string[];
  onMarkerClick?: (marker: VWorldMarker) => void;
  onMapBlankClick?: () => void;
}

const TILE_ZOOM = 12;
const TILE_SIZE = 256;
const MAP_BOUNDS = {
  west: 128.63,
  east: 128.89,
  north: 35.23,
  south: 35.12,
};

const lonToTileX = (longitude: number, zoom = TILE_ZOOM) =>
  ((longitude + 180) / 360) * (2 ** zoom);

const latToTileY = (latitude: number, zoom = TILE_ZOOM) => {
  const latitudeRad = latitude * Math.PI / 180;
  return ((1 - Math.asinh(Math.tan(latitudeRad)) / Math.PI) / 2) * (2 ** zoom);
};

const TILE_RANGE = {
  minX: Math.floor(lonToTileX(MAP_BOUNDS.west)),
  maxX: Math.floor(lonToTileX(MAP_BOUNDS.east)),
  minY: Math.floor(latToTileY(MAP_BOUNDS.north)),
  maxY: Math.floor(latToTileY(MAP_BOUNDS.south)),
};

const TILE_COLUMN_COUNT = TILE_RANGE.maxX - TILE_RANGE.minX + 1;
const TILE_ROW_COUNT = TILE_RANGE.maxY - TILE_RANGE.minY + 1;
const WORLD_WIDTH = 52;
const WORLD_DEPTH = WORLD_WIDTH * (TILE_ROW_COUNT / TILE_COLUMN_COUNT);

const geoToWorld = (longitude: number, latitude: number): THREE.Vector3 => {
  const tileX = lonToTileX(longitude);
  const tileY = latToTileY(latitude);
  const x = ((tileX - TILE_RANGE.minX) / TILE_COLUMN_COUNT - 0.5) * WORLD_WIDTH;
  const z = ((tileY - TILE_RANGE.minY) / TILE_ROW_COUNT - 0.5) * WORLD_DEPTH;
  return new THREE.Vector3(x, 0.12, z);
};

// 실제 운행 경로의 주요 굴곡점을 추려 3D 곡선으로 사용한다.
const ROUTE_GEO_POINTS: Array<[number, number]> = [
  [128.665967, 35.207494],
  [128.670354, 35.202816],
  [128.668013, 35.199278],
  [128.668354, 35.196195],
  [128.675605, 35.191698],
  [128.680048, 35.186061],
  [128.689093, 35.182403],
  [128.699583, 35.181114],
  [128.709748, 35.184502],
  [128.719664, 35.185167],
  [128.731126, 35.182116],
  [128.756425, 35.181444],
  [128.768719, 35.181505],
  [128.778159, 35.179189],
  [128.783108, 35.174603],
  [128.791383, 35.172273],
  [128.799834, 35.171567],
  [128.808824, 35.165872],
  [128.819797, 35.163723],
  [128.828299, 35.160290],
  [128.834483, 35.155607],
  [128.842422, 35.152772],
  [128.851295, 35.151063],
  [128.856125, 35.148007],
  [128.859201, 35.145156],
  [128.861309, 35.142237],
  [128.861468, 35.145143],
  [128.859367, 35.148732],
];

const ROUTE_POINTS = ROUTE_GEO_POINTS.map(([longitude, latitude]) =>
  geoToWorld(longitude, latitude)
);

const ROUTE_CURVE = new THREE.CatmullRomCurve3(
  ROUTE_POINTS,
  false,
  "centripetal",
  0.35
);

const getMarkerRouteProgress = (marker: VWorldMarker) => {
  const progress = Math.max(0, Math.min(1, marker.progress ?? 0));
  const startsAtLg = (marker.startLat ?? marker.lat) > 35.18;
  return startsAtLg ? progress : 1 - progress;
};

const getMarkerPoint = (marker: VWorldMarker) => {
  if (typeof marker.progress === "number") {
    return ROUTE_CURVE.getPointAt(getMarkerRouteProgress(marker));
  }
  return geoToWorld(marker.lng, marker.lat);
};

function GroundMap({ texture }: { texture: THREE.CanvasTexture | null }) {
  return (
    <group>
      <mesh position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WORLD_WIDTH, WORLD_DEPTH]} />
        {/* 지도 글자와 도로 색상은 조명·톤 매핑·안개에 바래지 않도록 유지한다. */}
        <meshBasicMaterial
          key={texture?.uuid ?? 'loading-map'}
          color={texture ? mapColor.surface : mapColor.fill}
          map={texture}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <mesh position={[0, -0.155, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD_WIDTH, WORLD_DEPTH]} />
        <shadowMaterial color={mapColor.ink3} opacity={0.18} depthWrite={false} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, -0.35, 0]} receiveShadow>
        <boxGeometry args={[WORLD_WIDTH + 0.6, 0.34, WORLD_DEPTH + 0.6]} />
        <meshStandardMaterial color={mapColor.fill} roughness={1} />
      </mesh>
    </group>
  );
}

function RouteLayer() {
  const routeLinePoints = useMemo(
    () => ROUTE_CURVE.getPoints(260).map((point) => [point.x, 0.18, point.z] as [number, number, number]),
    []
  );

  return (
    <group>
      <Line
        points={routeLinePoints}
        color={mapColor.surface}
        lineWidth={9}
        renderOrder={1}
        depthWrite={false}
        transparent
        opacity={0.92}
      />
      <Line
        points={routeLinePoints}
        color={mapColor.ink}
        lineWidth={6}
        renderOrder={2}
        depthWrite={false}
        transparent
        opacity={0.84}
      />
      <Line
        points={routeLinePoints}
        color={tone.info.fg}
        lineWidth={2.6}
        renderOrder={3}
        depthWrite={false}
        transparent
        opacity={0.98}
      />
      <Line
        points={routeLinePoints}
        color={tone.info.bg}
        lineWidth={1}
        renderOrder={4}
        depthWrite={false}
        dashed
        dashSize={0.35}
        gapSize={0.28}
      />
    </group>
  );
}

type FacilityKind = 'lg' | 'gmt';

const FACILITY_PALETTE = {
  lg: { background: mapColor.surface, accent: mapColor.brand, border: mapColor.brandBorder, text: mapColor.ink, code: mapColor.brand },
  gmt: { background: mapColor.brand, accent: mapColor.ink, border: mapColor.ink, text: mapColor.surface, code: mapColor.surface },
} as const;

interface FacilityProps {
  point: THREE.Vector3;
  shortName: string;
  kind: FacilityKind;
}

function Facility({ point, shortName, kind }: FacilityProps) {
  const palette = FACILITY_PALETTE[kind];
  return (
    <group position={[point.x, 0, point.z]}>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.58, 48]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 48]} />
        <meshBasicMaterial color={palette.background} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.2, 18, 18]} />
        <meshBasicMaterial color={palette.accent} />
      </mesh>
      <Html position={[0, 0.9, 0]} center style={{ pointerEvents: "none" }}>
        <FacilityLabel $kind={kind} className="transport-3d-facility-label">
          <FacilityCode $kind={kind}>{shortName}</FacilityCode>
        </FacilityLabel>
      </Html>
    </group>
  );
}

interface Vehicle3DProps {
  model: THREE.Group | null;
  marker: VWorldMarker;
  showInfo: boolean;
  selected: boolean;
  onMarkerClick?: (marker: VWorldMarker) => void;
}

function Vehicle3D({ model, marker, showInfo, selected, onMarkerClick }: Vehicle3DProps) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const progress = getMarkerRouteProgress(marker);
  const point = ROUTE_CURVE.getPointAt(progress);
  const tangent = ROUTE_CURVE.getTangentAt(progress);
  const startsAtLg = (marker.startLat ?? marker.lat) > 35.18;
  const rotationY = Math.atan2(tangent.x, tangent.z) + (startsAtLg ? 0 : Math.PI);
  const progressPct = Math.round(Math.max(0, Math.min(1, marker.progress ?? 0)) * 100);

  useFrame(({ clock }) => {
    if (!pulseRef.current || !selected) return;
    const scale = 1 + (Math.sin(clock.elapsedTime * 3.4) + 1) * 0.16;
    pulseRef.current.scale.setScalar(scale);
  });

  return (
    <group
      position={[point.x, 0.24, point.z]}
      rotation={[0, rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onMarkerClick?.(marker);
      }}
    >
      {selected && (
        <mesh ref={pulseRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.63, 48]} />
          <meshBasicMaterial color={tone.success.fg} transparent opacity={0.48} depthWrite={false} />
        </mesh>
      )}
      <GmtTruckModel model={model} />

      {showInfo && (
        <Html position={[0, 1.35, 0]} center style={{ pointerEvents: "auto" }}>
          <button
            type="button"
            className={`transport-3d-vehicle-label${selected ? " is-selected" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onMarkerClick?.(marker);
            }}
          >
            <span className="status-dot" />
            <span className="copy">
              <strong>{marker.vehicleNo || marker.title || "차량"}</strong>
              <small>{marker.driver || "기사 미지정"} · {progressPct.toLocaleString('ko-KR')}%</small>
            </span>
            <span className="eta">{marker.eta || "이동 중"}</span>
          </button>
        </Html>
      )}
    </group>
  );
}

interface CameraRigProps {
  focusPoint: THREE.Vector3 | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

function CameraRig({ focusPoint, controlsRef }: CameraRigProps) {
  const { camera } = useThree();
  const goal = useRef(new THREE.Vector3());
  const desiredCamera = useRef(new THREE.Vector3());

  useEffect(() => {
    if (focusPoint) goal.current.copy(focusPoint).setY(0);
  }, [focusPoint]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !focusPoint) return;
    const alpha = 1 - Math.pow(0.035, delta);
    const offset = camera.position.clone().sub(controls.target);
    controls.target.lerp(goal.current, alpha);
    desiredCamera.current.copy(controls.target).add(offset);
    camera.position.lerp(desiredCamera.current, alpha);
    controls.update();
  });

  return null;
}

function Scene({
  texture,
  truckModel,
  markers,
  focusedTitle,
  markerInfoMode,
  selectedMarkerIds,
  onMarkerClick,
}: { texture: THREE.CanvasTexture | null; truckModel: THREE.Group | null } & Required<Pick<Transport3DMapProps, "markers" | "markerInfoMode" | "selectedMarkerIds">> &
  Pick<Transport3DMapProps, "focusedTitle" | "onMarkerClick">) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const cars = markers.filter((marker) => !marker.isFacility);
  const selectedSet = new Set(selectedMarkerIds.map(String));
  const focusedMarker = cars.find(
    (marker) => String(marker.id) === String(focusedTitle) || String(marker.title) === String(focusedTitle)
  );
  const focusPoint = focusedMarker ? getMarkerPoint(focusedMarker) : null;

  const shouldShowInfo = (marker: VWorldMarker) => {
    const markerId = String(marker.id);
    if (markerInfoMode === "hidden") return false;
    if (markerInfoMode === "all") return true;
    if (markerInfoMode === "selected") return selectedSet.has(markerId);
    return Boolean(marker.isFocused) || markerId === String(focusedTitle);
  };

  return (
    <>
      <color attach="background" args={[mapColor.surfaceSubtle]} />
      <fog attach="fog" args={[mapColor.surfaceSubtle, 70, 120]} />
      <ambientLight color={mapColor.surface} intensity={1.15} />
      <hemisphereLight args={[mapColor.surface, mapColor.borderStrong, 1.0]} />
      <directionalLight
        position={[-14, 28, 18]}
        intensity={1.75}
        color={mapColor.surface}
        castShadow
        shadow-bias={-0.0002}
        shadow-normalBias={0.025}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />

      <GroundMap texture={texture} />
      <RouteLayer />
      <Facility point={ROUTE_CURVE.getPointAt(0)} shortName="LG" kind="lg" />
      <Facility point={ROUTE_CURVE.getPointAt(1)} shortName="GMT" kind="gmt" />

      {cars.map((marker, index) => {
        const markerId = String(marker.id || index);
        const showInfo = shouldShowInfo(marker);
        return (
          <Vehicle3D
            key={markerId}
            model={truckModel}
            marker={marker}
            showInfo={showInfo}
            selected={selectedSet.has(markerId) || showInfo}
            onMarkerClick={onMarkerClick}
          />
        );
      })}

      <CameraRig focusPoint={focusPoint} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={58}
        minPolarAngle={0.48}
        maxPolarAngle={1.34}
        target={[0, 0, 0]}
        panSpeed={0.7}
        rotateSpeed={0.55}
        zoomSpeed={0.72}
      />
    </>
  );
}

export default function Transport3DMap({
  markers = [],
  focusedTitle = null,
  markerInfoMode = "auto",
  selectedMarkerIds = [],
  onMarkerClick,
  onMapBlankClick,
}: Transport3DMapProps) {
  const visible = usePageVisible();
  const { texture, status, retry, surfaceRef, surfaceSize } = useTransportMapTexture({ zoom: TILE_ZOOM, tileSize: TILE_SIZE, ...TILE_RANGE });
  const { model: truckModel, status: truckStatus, retry: retryTruck } = useGmtTruckModel();

  return (
    <MapContainer className="transport-3d-map">
      <VectorMapTextureSurface targetRef={surfaceRef} {...surfaceSize} />
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.25]}
        shadows
        camera={{ position: [2, 24, 31], fov: 36, near: 0.1, far: 120 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onPointerMissed={() => onMapBlankClick?.()}
      >
        <Scene
          texture={texture}
          truckModel={truckModel}
          markers={markers}
          focusedTitle={focusedTitle}
          markerInfoMode={markerInfoMode}
          selectedMarkerIds={selectedMarkerIds}
          onMarkerClick={onMarkerClick}
        />
      </Canvas>

      <div className="transport-3d-status" aria-hidden="true">
        <span className="live-dot" />
        <div>
          <strong>3D DIGITAL TWIN</strong>
          <small>GMT ↔ LG 실시간 운송 경로</small>
        </div>
      </div>
      <div className="transport-3d-help" aria-hidden="true">
        드래그 회전 · 휠 줌 · 우클릭 이동
      </div>
      <MapTileStatus status={status} onRetry={retry} />
      {markers.some(marker => !marker.isFacility) && <TruckModelStatus status={truckStatus} onRetry={retryTruck} />}
      <MapAttribution sources={TRANSPORT_VECTOR_BASEMAP.attributions} />

    </MapContainer>
  );
}

const FacilityLabel = styled.div<{ $kind: FacilityKind }>`
  display: flex;
  align-items: center;
  padding: ${space.md}px ${space.xl}px;
  border: 1px solid ${({ $kind }) => FACILITY_PALETTE[$kind].border};
  border-radius: ${radius.card}px;
  background: ${({ $kind }) => FACILITY_PALETTE[$kind].background};
  color: ${({ $kind }) => FACILITY_PALETTE[$kind].text};
  box-shadow: ${shadow.popover};
  white-space: nowrap;
`;

const FacilityCode = styled.span<{ $kind: FacilityKind }>`
  color: ${({ $kind }) => FACILITY_PALETTE[$kind].code};
  font-size: ${fontSize.meta};
  font-weight: ${fontWeight.semibold};
`;

const MapContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: ${mapColor.surfaceSubtle};
  font-family: ${font.family};
  *, *::before, *::after { font-family: inherit; }
  canvas { display: block; }
  canvas:focus-visible { outline: ${focusRing}; outline-offset: -3px; }
  .transport-3d-status {
    position: absolute;
    left: ${space.huge + space.xs}px;
    top: ${space.huge}px;
    z-index: ${gridLayer.stickyColumn};
    display: flex;
    align-items: center;
    gap: ${space.lg}px;
    color: ${mapColor.ink};
    border: 1px solid ${mapColor.border};
    background: color-mix(in srgb, ${mapColor.surface} 72%, transparent);
    box-shadow: ${shadow.popover};
    backdrop-filter: blur(12px);
    border-radius: ${radius.card}px;
    padding: ${space.lg}px ${space.xl}px;
    pointer-events: none;
  }
  .transport-3d-status .live-dot {
    width: ${space.md}px;
    height: ${space.md}px;
    border-radius: ${radius.pill}px;
    background: ${mapColor.live};
    border: 1px solid ${tone.success.border};
  }
  .transport-3d-status strong,
  .transport-3d-status small {
    display: block;
    white-space: nowrap;
    font-weight: ${fontWeight.semibold};
  }
  .transport-3d-status strong {
    font-size: ${fontSize.caption};
    letter-spacing: .12em;
  }
  .transport-3d-status small {
    margin-top: ${space.xs}px;
    color: ${mapColor.ink3};
    font-size: ${fontSize.caption};
  }
  .transport-3d-help {
    position: absolute;
    left: ${space.huge + space.xs}px;
    bottom: ${space.xl + space.sm}px;
    z-index: ${gridLayer.stickyColumn};
    color: ${mapColor.ink2};
    background: color-mix(in srgb, ${mapColor.surface} 70%, transparent);
    border: 1px solid ${mapColor.border};
    backdrop-filter: blur(10px);
    border-radius: ${radius.control}px;
    padding: ${space.sm}px ${space.lg}px;
    font-size: ${fontSize.caption};
    font-weight: ${fontWeight.semibold};
    pointer-events: none;
  }
  .transport-3d-vehicle-label {
    min-width: 178px;
    display: grid;
    grid-template-columns: ${space.md}px 1fr auto;
    align-items: center;
    gap: ${space.md}px;
    border: 1px solid ${mapColor.border};
    background: color-mix(in srgb, ${mapColor.surface} 95%, transparent);
    box-shadow: ${shadow.popover};
    border-radius: ${radius.control}px;
    padding: ${space.md}px ${space.lg}px;
    color: ${mapColor.ink};
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: background ${transition.hover}, border-color ${transition.hover}, transform ${transition.hover};
  }
  .transport-3d-vehicle-label:hover {
    background: ${mapColor.surfaceSubtle};
    border-color: ${mapColor.borderStrong};
    transform: translateY(-1px);
  }
  .transport-3d-vehicle-label.is-selected {
    background: ${tone.info.bg};
    border-color: ${tone.info.border};
  }
  .transport-3d-vehicle-label:focus-visible {
    outline: ${focusRing};
    outline-offset: 3px;
  }
  .transport-3d-vehicle-label .status-dot {
    width: ${space.md}px;
    height: ${space.md}px;
    border-radius: ${radius.pill}px;
    background: ${mapColor.live};
    border: 1px solid ${tone.success.border};
  }
  .transport-3d-vehicle-label .copy { display: block; min-width: 0; }
  .transport-3d-vehicle-label strong,
  .transport-3d-vehicle-label small {
    display: block;
    font-weight: ${fontWeight.semibold};
  }
  .transport-3d-vehicle-label strong { font-size: ${fontSize.micro}; }
  .transport-3d-vehicle-label small {
    margin-top: ${space.xs}px;
    color: ${mapColor.ink3};
    font-size: ${fontSize.caption};
  }
  .transport-3d-vehicle-label .eta {
    color: ${tone.info.fg};
    background: ${tone.info.bg};
    border: 1px solid ${tone.info.border};
    border-radius: ${radius.row}px;
    padding: ${space.xs}px ${space.sm}px;
    font-size: ${fontSize.caption};
    font-weight: ${fontWeight.semibold};
  }
`;
