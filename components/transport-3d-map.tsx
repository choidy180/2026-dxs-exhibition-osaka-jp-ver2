"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, Line, OrbitControls, RoundedBox } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import styled from "styled-components";
import type { VWorldMarker } from "@/components/vworld-map-dev";
import MapAttribution from "@/components/transport-map/MapAttribution";
import MapTileStatus from "@/components/transport-map/MapTileStatus";
import { useTransportMapTexture } from "@/hooks/use-transport-map-texture";
import { color as mapColor } from "@/styles/design-tokens";

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

const random01 = (seed: number) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const BUILDINGS = Array.from({ length: 180 }, (_, index) => {
  const column = index % 20;
  const row = Math.floor(index / 20);
  const x = -24.4 + column * 2.55 + (random01(index + 2) - 0.5) * 0.42;
  const z = -11.4 + row * 2.75 + (random01(index + 9) - 0.5) * 0.42;
  const height = 0.35 + random01(index + 17) * 1.75;
  const width = 0.78 + random01(index + 31) * 0.72;
  const depth = 0.78 + random01(index + 47) * 0.72;
  const distanceFromRoute = ROUTE_POINTS.reduce(
    (minimum, point) => Math.min(minimum, Math.hypot(point.x - x, point.z - z)),
    Number.POSITIVE_INFINITY
  );
  const visible = random01(index + 61) > 0.5 && distanceFromRoute > 1.05;
  return { id: index, x, z, height, width, depth, visible };
}).filter((building) => building.visible);

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
      <mesh position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD_WIDTH, WORLD_DEPTH]} />
        <meshStandardMaterial
          color={texture ? mapColor.surface : mapColor.fill}
          map={texture}
          roughness={0.96}
          metalness={0}
        />
      </mesh>
      <mesh position={[0, -0.35, 0]} receiveShadow>
        <boxGeometry args={[WORLD_WIDTH + 0.6, 0.34, WORLD_DEPTH + 0.6]} />
        <meshStandardMaterial color={mapColor.borderStrong} roughness={1} />
      </mesh>
    </group>
  );
}

function CityBlocks() {
  return (
    <group>
      {BUILDINGS.map((building, index) => {
        const palette = [mapColor.surface, mapColor.fill, mapColor.borderSoft, mapColor.border, mapColor.borderStrong];
        const color = palette[index % palette.length];
        return (
          <mesh
            key={building.id}
            position={[building.x, building.height / 2, building.z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[building.width, building.height, building.depth]} />
            <meshStandardMaterial color={color} roughness={0.8} metalness={0.04} />
          </mesh>
        );
      })}
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
        color="#ffffff"
        lineWidth={9}
        transparent
        opacity={0.92}
      />
      <Line
        points={routeLinePoints}
        color="#0f172a"
        lineWidth={6}
        transparent
        opacity={0.84}
      />
      <Line
        points={routeLinePoints}
        color="#38bdf8"
        lineWidth={2.6}
        transparent
        opacity={0.98}
      />
      <Line
        points={routeLinePoints}
        color="#e0f2fe"
        lineWidth={1}
        dashed
        dashSize={0.35}
        gapSize={0.28}
      />
    </group>
  );
}

interface FacilityProps {
  point: THREE.Vector3;
  name: string;
  shortName: string;
  color: string;
}

function Facility({ point, name, shortName, color }: FacilityProps) {
  return (
    <group position={[point.x, 0, point.z]}>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.58, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} />
      </mesh>
      <RoundedBox args={[2.5, 1.3, 1.8]} radius={0.18} smoothness={4} position={[0, 0.7, 0]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[1.1, 1.42, 1.92]} radius={0.16} smoothness={4} position={[0.25, 0.8, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.44} />
      </RoundedBox>
      <mesh position={[0.25, 1.76, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.72, 14]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0.25, 2.15, 0]}>
        <sphereGeometry args={[0.13, 18, 18]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
      <Html position={[0, 2.72, 0]} center style={{ pointerEvents: "none" }}>
        <div className="transport-3d-facility-label">
          <span style={{ background: color }}>{shortName}</span>
          <strong>{name}</strong>
        </div>
      </Html>
    </group>
  );
}

interface Vehicle3DProps {
  marker: VWorldMarker;
  showInfo: boolean;
  selected: boolean;
  onMarkerClick?: (marker: VWorldMarker) => void;
}

function Vehicle3D({ marker, showInfo, selected, onMarkerClick }: Vehicle3DProps) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const progress = getMarkerRouteProgress(marker);
  const point = ROUTE_CURVE.getPointAt(progress);
  const tangent = ROUTE_CURVE.getTangentAt(progress);
  const rotationY = Math.atan2(tangent.x, tangent.z);
  const startsAtLg = (marker.startLat ?? marker.lat) > 35.18;
  const color = startsAtLg ? "#ce0037" : "#0f172a";
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
          <ringGeometry args={[0.7, 0.94, 36]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.48} depthWrite={false} />
        </mesh>
      )}
      <group position={[0, 0.46, 0]}>
        <RoundedBox args={[0.92, 0.66, 1.7]} radius={0.16} smoothness={4} castShadow>
          <meshStandardMaterial color={color} roughness={0.36} metalness={0.1} />
        </RoundedBox>
        <RoundedBox args={[0.96, 0.72, 0.7]} radius={0.14} smoothness={4} position={[0, 0.03, 0.78]} castShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.08} />
        </RoundedBox>
        <mesh position={[0, 0.17, 1.14]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.62, 0.28]} />
          <meshStandardMaterial color="#93c5fd" roughness={0.15} metalness={0.2} />
        </mesh>
        {[-0.49, 0.49].map((wheelX) =>
          [-0.52, 0.58].map((wheelZ) => (
            <mesh key={`${wheelX}-${wheelZ}`} position={[wheelX, -0.3, wheelZ]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.18, 0.18, 0.12, 16]} />
              <meshStandardMaterial color="#111827" roughness={0.9} />
            </mesh>
          ))
        )}
      </group>

      {showInfo && (
        <Html position={[0, 2.45, 0]} center style={{ pointerEvents: "auto" }}>
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
              <small>{marker.driver || "기사 미지정"} · {progressPct}%</small>
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
  markers,
  focusedTitle,
  markerInfoMode,
  selectedMarkerIds,
  onMarkerClick,
}: { texture: THREE.CanvasTexture | null } & Required<Pick<Transport3DMapProps, "markers" | "markerInfoMode" | "selectedMarkerIds">> &
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
      <fog attach="fog" args={[mapColor.surfaceSubtle, 38, 78]} />
      <ambientLight color={mapColor.surface} intensity={1.15} />
      <hemisphereLight args={[mapColor.surface, mapColor.borderStrong, 1.0]} />
      <directionalLight
        position={[-14, 28, 18]}
        intensity={1.75}
        color={mapColor.surface}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />

      <GroundMap texture={texture} />
      <CityBlocks />
      <RouteLayer />
      <Facility point={ROUTE_CURVE.getPointAt(0)} name="LG전자" shortName="LG" color="#ce0037" />
      <Facility point={ROUTE_CURVE.getPointAt(1)} name="고모텍 부산" shortName="GMT" color="#2563eb" />

      {cars.map((marker, index) => {
        const markerId = String(marker.id || index);
        const showInfo = shouldShowInfo(marker);
        return (
          <Vehicle3D
            key={markerId}
            marker={marker}
            showInfo={showInfo}
            selected={selectedSet.has(markerId) || showInfo}
            onMarkerClick={onMarkerClick}
          />
        );
      })}

      <ContactShadows
        position={[0, -0.1, 0]}
        opacity={0.14}
        scale={62}
        blur={2.4}
        far={8}
        resolution={512}
        color={mapColor.ink3}
      />
      <CameraRig focusPoint={focusPoint} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={12}
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
  const { texture, status, retry } = useTransportMapTexture({ zoom: TILE_ZOOM, tileSize: TILE_SIZE, ...TILE_RANGE });

  return (
    <MapContainer className="transport-3d-map">
      <Canvas
        dpr={[1, 1.5]}
        shadows
        camera={{ position: [2, 24, 31], fov: 36, near: 0.1, far: 120 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onPointerMissed={() => onMapBlankClick?.()}
      >
        <Scene
          texture={texture}
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
      <MapAttribution />

      <style jsx global>{`
        .transport-3d-map canvas {
          display: block;
          outline: none;
        }
        .transport-3d-status {
          position: absolute;
          left: 24px;
          top: 20px;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #0f172a;
          border: 1px solid rgba(255,255,255,.76);
          background: rgba(255,255,255,.72);
          box-shadow: 0 10px 26px rgba(15,23,42,.12);
          backdrop-filter: blur(12px);
          border-radius: 14px;
          padding: 9px 12px;
          pointer-events: none;
        }
        .transport-3d-status .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 5px rgba(34,197,94,.14);
        }
        .transport-3d-status strong,
        .transport-3d-status small {
          display: block;
          white-space: nowrap;
        }
        .transport-3d-status strong {
          font-size: 11px;
          letter-spacing: .12em;
        }
        .transport-3d-status small {
          margin-top: 2px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }
        .transport-3d-help {
          position: absolute;
          z-index: 2;
          bottom: 18px;
          color: #475569;
          background: rgba(255,255,255,.7);
          border: 1px solid rgba(255,255,255,.78);
          backdrop-filter: blur(10px);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 700;
          pointer-events: none;
        }
        .transport-3d-help { left: 24px; }
        .transport-3d-facility-label {
          display: flex;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(226,232,240,.92);
          background: rgba(255,255,255,.94);
          box-shadow: 0 8px 22px rgba(15,23,42,.16);
          border-radius: 999px;
          padding: 5px 9px 5px 5px;
          color: #0f172a;
          white-space: nowrap;
        }
        .transport-3d-facility-label span {
          display: grid;
          place-items: center;
          min-width: 31px;
          height: 25px;
          padding: 0 5px;
          border-radius: 999px;
          color: white;
          font-size: 10px;
          font-weight: 800;
        }
        .transport-3d-facility-label strong {
          font-size: 11px;
          font-weight: 800;
        }
        .transport-3d-vehicle-label {
          min-width: 178px;
          display: grid;
          grid-template-columns: 8px 1fr auto;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(226,232,240,.96);
          background: rgba(255,255,255,.95);
          box-shadow: 0 9px 24px rgba(15,23,42,.16);
          border-radius: 15px;
          padding: 9px 10px;
          color: #0f172a;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
        }
        .transport-3d-vehicle-label:hover,
        .transport-3d-vehicle-label.is-selected {
          border-color: #94a3b8;
          transform: translateY(-1px);
        }
        .transport-3d-vehicle-label .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34,197,94,.12);
        }
        .transport-3d-vehicle-label .copy {
          display: block;
          min-width: 0;
        }
        .transport-3d-vehicle-label strong,
        .transport-3d-vehicle-label small {
          display: block;
        }
        .transport-3d-vehicle-label strong {
          font-size: 12px;
          font-weight: 800;
        }
        .transport-3d-vehicle-label small {
          margin-top: 2px;
          color: #64748b;
          font-size: 9px;
          font-weight: 700;
        }
        .transport-3d-vehicle-label .eta {
          color: #0369a1;
          background: #e0f2fe;
          border-radius: 999px;
          padding: 4px 6px;
          font-size: 9px;
          font-weight: 800;
        }
      `}</style>
    </MapContainer>
  );
}

const MapContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: ${mapColor.surfaceSubtle};
`;
