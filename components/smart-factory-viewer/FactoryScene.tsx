'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import {
  Center,
  Html,
  OrbitControls,
  Stage,
  useGLTF,
} from '@react-three/drei';
import { AlertOctagon, Wrench } from 'lucide-react';
import * as THREE from 'three';
import LocalEnvironment from '@/components/common/local-environment/LocalEnvironment';
import { usePageVisible } from '@/hooks/use-page-visible';
import { disposeSceneClone } from '@/utils/dispose-scene-clone';
import { FLOOR_MODEL_PATH, JIG_MODEL_PATH, PROCESS_CONFIG } from '@/constants/smartFactoryViewer';
import type {
  ApiDataItem,
  EquipmentPositionItem,
  UnitData,
  ViewerLayoutType,
} from '@/types/smartFactoryViewer';
import {
  findGr2EquipmentPosition,
  formatUnitName,
  getGr2LineOffset,
  isDefectResult,
} from '@/utils/smartFactoryViewer';
import {
  BubbleAction,
  BubbleText,
  BubbleTitle,
  ErrorBubble,
  ModelErrorPointer,
  ModelLabelBadge,
  ModelLabelRoot,
  ProcessDot,
  ProcessLabelContainer,
  ProcessText,
} from '@/styles/smartFactoryViewer.styles';

interface FactorySceneProps {
  layout: ViewerLayoutType;
  apiData: ApiDataItem[];
  equipmentPositions: EquipmentPositionItem[];
  onHoverChange: (data: UnitData | null) => void;
  onInjectUnitChange: (unit: ApiDataItem | null) => void;
}

interface JigModelProps {
  url: string;
  highContrast: boolean;
  apiData: ApiDataItem[];
  equipmentPositions: EquipmentPositionItem[];
  onHoverChange: (data: UnitData | null) => void;
  onInjectUnitChange: (unit: ApiDataItem | null) => void;
}

interface MeshLocation {
  position: THREE.Vector3;
  localPosition: THREE.Vector3;
  inwardFacingYaw: number;
  facingOffset: number;
  stationGeometry: THREE.BufferGeometry;
  stationEdgeGeometry: THREE.BufferGeometry | null;
  neutralColor: THREE.Color;
  edgeOpacity: number;
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  edge: THREE.LineSegments | null;
  edgeMaterial: THREE.LineBasicMaterial | null;
}

interface ProcessLabelLocation {
  position: THREE.Vector3;
  name: string;
  color: string;
}

interface SceneRuntimeState {
  meshLocations: MeshLocation[];
  processLabelLocations: ProcessLabelLocation[];
}

interface LineMotionState {
  fromOffset: number;
  toOffset: number;
  startedAt: number;
  duration: number;
}

type Vector3Tuple = [number, number, number];

interface SceneViewConfig {
  cameraPosition: Vector3Tuple;
  modelPosition: Vector3Tuple;
  controlTarget: Vector3Tuple;
  cameraFov: number;
  modelScale: number;
}

const SCENE_VIEW_CONFIG: Record<ViewerLayoutType, SceneViewConfig> = {
  modelOnly: {
    // 카메라 위치 [좌우, 높이, 앞뒤]
    cameraPosition: [-22, 15, -20],

    // 모델 전체 위치 [좌우, 상하, 앞뒤]
    modelPosition: [4, -2.05, 3],

    // 카메라가 바라보는 중심점 [좌우, 높이, 앞뒤]
    controlTarget: [0.5, 0.25, 0.8],

    // 카메라 화각. 값이 커지면 넓게 보이고 모델은 작아짐
    cameraFov: 14,

    // 모델 크기
    modelScale: 0.88,
  },

  balanced: {
    cameraPosition: [-22, 18, -20],
    modelPosition: [3.4, -2.05, 3],
    controlTarget: [0.5, 0.25, 0.8],
    cameraFov: 14,
    modelScale: 0.82,
  },

  detailRight: {
    cameraPosition: [-26, 20, -26],
    modelPosition: [0, 0.15, 0],
    controlTarget: [0, 0.1, 0],
    cameraFov: 16,
    modelScale: 1.15,
  },
};

const SOFT_EDGE_NAME = '__soft-object-edge__';

const CART_BASE_POSITION_OFFSET: Vector3Tuple = [0, 0, 0];
const CART_BASE_OFFSET_VECTOR = new THREE.Vector3(...CART_BASE_POSITION_OFFSET);

const CART_LABEL_OFFSET: Vector3Tuple = [0.5, 0.35, 0];

const CART_LABEL_OFFSETS: Partial<Record<string, Vector3Tuple>> = {
  // 개별 조정이 필요한 라벨만 여기에 추가
  // 'OP1': [0.1, 1.1, 0],
  // 'OP2': [-0.1, 1.05, 0],
};

const JIG_FACING_OFFSETS: Readonly<Record<string, number>> = {
  jig2: -Math.PI / 2 + THREE.MathUtils.degToRad(12),
  jig3: -Math.PI / 2 + THREE.MathUtils.degToRad(12),
  jig4: -Math.PI / 2 + THREE.MathUtils.degToRad(12),
  jig5: -Math.PI / 2 + THREE.MathUtils.degToRad(12),
  jig6: -Math.PI / 6,
  jig21: Math.PI / 6,
};

const PROCESS_COLORS = PROCESS_CONFIG.map((process) => new THREE.Color(process.color));
const INSERTION_STATION_INDEX = PROCESS_CONFIG.findIndex((process) => process.name === '삽입');
const LINE_MOVE_DURATION_MS = 1200;

const getReversedLineStationIndex = (
  cartIndex: number,
  lineOffset: number,
  stationCount: number,
) => {
  // 삽입 공정의 대차 매핑은 유지하면서 라인 진행 방향만 반전한다.
  const mirroredIndex = (INSERTION_STATION_INDEX * 2) - cartIndex - lineOffset;
  return ((mirroredIndex % stationCount) + stationCount) % stationCount;
};

const getMotionProgress = (motion: LineMotionState) => {
  if (motion.duration <= 0) return 1;

  const progress = Math.min(Math.max((performance.now() - motion.startedAt) / motion.duration, 0), 1);
  return progress * progress * (3 - 2 * progress);
};

function SceneCameraController({ config }: { config: SceneViewConfig }) {
  const { camera } = useThree();
  const { cameraPosition, cameraFov, controlTarget } = config;
  const cameraRef = useRef(camera);
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const initializedRef = useRef(false);
  const transitioningRef = useRef(false);
  const transitionStartedAtRef = useRef(0);
  const fromPositionRef = useRef(new THREE.Vector3());
  const toPositionRef = useRef(new THREE.Vector3());
  const fromTargetRef = useRef(new THREE.Vector3());
  const toTargetRef = useRef(new THREE.Vector3());
  const fromFovRef = useRef(config.cameraFov);
  const toFovRef = useRef(config.cameraFov);

  const resetCamera = useCallback(() => {
    const activeCamera = cameraRef.current;
    transitioningRef.current = false;
    activeCamera.position.set(...cameraPosition);

    if (activeCamera instanceof THREE.PerspectiveCamera) {
      activeCamera.fov = cameraFov;
    }

    activeCamera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.enabled = true;
      controlsRef.current.target.set(...controlTarget);
      controlsRef.current.update();
      controlsRef.current.saveState();
    }
  }, [cameraFov, cameraPosition, controlTarget]);

  useEffect(() => {
    const activeCamera = cameraRef.current;
    const controls = controlsRef.current;

    if (!initializedRef.current || !controls) {
      initializedRef.current = true;
      resetCamera();
    } else {
      fromPositionRef.current.copy(activeCamera.position);
      toPositionRef.current.set(...cameraPosition);
      fromTargetRef.current.copy(controls.target);
      toTargetRef.current.set(...controlTarget);
      fromFovRef.current = activeCamera instanceof THREE.PerspectiveCamera
        ? activeCamera.fov
        : cameraFov;
      toFovRef.current = cameraFov;
      transitionStartedAtRef.current = performance.now();
      transitioningRef.current = true;
      controls.enabled = false;
    }

    const handlePageShow = () => {
      resetCamera();
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [cameraFov, cameraPosition, controlTarget, resetCamera]);

  useFrame(() => {
    if (!transitioningRef.current) return;

    const activeCamera = cameraRef.current;
    const controls = controlsRef.current;
    if (!controls) return;

    const progress = Math.min((performance.now() - transitionStartedAtRef.current) / 700, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    activeCamera.position.lerpVectors(
      fromPositionRef.current,
      toPositionRef.current,
      easedProgress,
    );
    controls.target.lerpVectors(
      fromTargetRef.current,
      toTargetRef.current,
      easedProgress,
    );

    if (activeCamera instanceof THREE.PerspectiveCamera) {
      activeCamera.fov = THREE.MathUtils.lerp(
        fromFovRef.current,
        toFovRef.current,
        easedProgress,
      );
      activeCamera.updateProjectionMatrix();
    }

    controls.update();

    if (progress >= 1) {
      transitioningRef.current = false;
      controls.enabled = true;
      controls.saveState();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}

const addSoftObjectEdge = (
  mesh: THREE.Mesh,
  isStaticPart: boolean,
  highContrast = false,
) => {
  if (!mesh.geometry || mesh.children.some((child) => child.name === SOFT_EDGE_NAME)) return;

  const edgeGeometry = new THREE.EdgesGeometry(mesh.geometry, isStaticPart ? 52 : 36);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: highContrast
      ? (isStaticPart ? '#273531' : '#31423d')
      : (isStaticPart ? '#94a3b8' : '#475569'),
    transparent: true,
    opacity: highContrast ? (isStaticPart ? 0.24 : 0.42) : (isStaticPart ? 0.08 : 0.18),
    depthTest: true,
    depthWrite: false,
  });
  const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);

  edgeLines.name = SOFT_EDGE_NAME;
  edgeLines.renderOrder = 2;
  mesh.add(edgeLines);
};

class ModelErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('3D Model Loading Failed:', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function FloorModel({ highContrast }: { highContrast: boolean }) {
  const { scene } = useGLTF(FLOOR_MODEL_PATH, '/draco/');
  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    const contrastTarget = new THREE.Color('#34433f');

    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      mesh.castShadow = false;
      mesh.receiveShadow = true;

      if (highContrast && mesh.material) {
        const updateMaterial = (source: THREE.Material) => {
          const material = source.clone() as THREE.MeshStandardMaterial;

          if (material.color) material.color.lerp(contrastTarget, 0.84);
          material.roughness = 0.68;
          material.metalness = 0.18;

          return material;
        };

        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(updateMaterial)
          : updateMaterial(mesh.material);
      }

      addSoftObjectEdge(mesh, true, highContrast);
    });

    return cloned;
  }, [highContrast, scene]);

  useEffect(() => () => disposeSceneClone(clonedScene, scene), [clonedScene, scene]);
  return <primitive object={clonedScene} raycast={() => null} />;
}

const MovingLabel = React.memo(({
  labelIndex,
  locations,
  lineMotionRef,
  errorIndices,
  apiData,
}: {
  labelIndex: number;
  locations: MeshLocation[];
  lineMotionRef: React.RefObject<LineMotionState>;
  errorIndices: number[];
  apiData: ApiDataItem[];
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentLabelPositionRef = useRef(new THREE.Vector3());
  const nextLabelPositionRef = useRef(new THREE.Vector3());

  const labelText = useMemo(() => {
    return formatUnitName(labelIndex + 1);
  }, [labelIndex]);

  const labelOffset = useMemo(() => {
    const offset = CART_LABEL_OFFSETS[labelText] ?? CART_LABEL_OFFSET;

    return new THREE.Vector3(offset[0], offset[1], offset[2]);
  }, [labelText]);

  useFrame(() => {
    if (!groupRef.current || locations.length === 0) return;

    const motion = lineMotionRef.current;
    if (!motion) return;
    const currentIndex = getReversedLineStationIndex(
      labelIndex,
      motion.fromOffset,
      locations.length,
    );
    const nextIndex = getReversedLineStationIndex(
      labelIndex,
      motion.toOffset,
      locations.length,
    );
    const currentPos = locations[currentIndex].position;
    const nextPos = locations[nextIndex].position;
    const currentLabelPosition = currentLabelPositionRef.current.copy(currentPos).add(labelOffset);
    const nextLabelPosition = nextLabelPositionRef.current.copy(nextPos).add(labelOffset);
    const progress = getMotionProgress(motion);

    groupRef.current.position.lerpVectors(currentLabelPosition, nextLabelPosition, progress);
  });

  const isError = errorIndices.includes(labelIndex);
  const errorReason = useMemo(() => {
    if (!isError) {
      return {
        problem: '',
        solution: '',
      };
    }

    const matched = apiData.find((item) => Number.parseInt(item.대차번호, 10) === labelIndex + 1);

    if (matched && isDefectResult(matched.RESULT002)) {
      return {
        problem: matched.RESULT002,
        solution: '관리자 점검 요망',
      };
    }

    return {
      problem: '시스템 오류 감지',
      solution: '현장 확인 요망',
    };
  }, [apiData, isError, labelIndex]);

  return (
    <group ref={groupRef}>
      <Html center distanceFactor={15} zIndexRange={isError ? [45, 0] : [30, 0]}>
        <ModelLabelRoot>
          <ModelLabelBadge $isError={isError}>{labelText}</ModelLabelBadge>
          {isError && (
            <ModelErrorPointer>
              <ErrorBubble>
                <BubbleTitle>
                  <AlertOctagon size={12} />
                  Error Detected
                </BubbleTitle>
                <BubbleText>
                  <span>PROBLEM</span>
                  {errorReason.problem}
                </BubbleText>
                <BubbleText>
                  <span>SOLUTION</span>
                  <BubbleAction>
                    <Wrench size={10} color="#34d399" />
                    {errorReason.solution}
                  </BubbleAction>
                </BubbleText>
              </ErrorBubble>
            </ModelErrorPointer>
          )}
        </ModelLabelRoot>
      </Html>
    </group>
  );
});

MovingLabel.displayName = 'MovingLabel';

const ProcessLabel = React.memo(({
  position,
  name,
  color,
}: ProcessLabelLocation) => {
  return (
    <Html
      position={position}
      center
      zIndexRange={[42, 31]}
      wrapperClass="process-station-label"
    >
      <ProcessLabelContainer $color={color}>
        <ProcessDot $color={color} />
        <ProcessText>{name}</ProcessText>
      </ProcessLabelContainer>
    </Html>
  );
});

ProcessLabel.displayName = 'ProcessLabel';

function InteractiveJigModel({
  url,
  highContrast,
  apiData,
  equipmentPositions,
  onHoverChange,
  onInjectUnitChange,
}: JigModelProps) {
  const { scene } = useGLTF(url, '/draco/');
  const modelScene = useMemo(() => scene.clone(true), [scene]);
  const activeIdRef = useRef<string | null>(null);
  const lastInjectKeyRef = useRef<string | null>(null);
  const hasAppliedEquipmentPositionRef = useRef(false);
  const lineMotionRef = useRef<LineMotionState>({
    fromOffset: 0,
    toOffset: 0,
    startedAt: 0,
    duration: 0,
  });
  const lineCenterRef = useRef(new THREE.Vector3());
  const facingStartRef = useRef(new THREE.Quaternion());
  const facingEndRef = useRef(new THREE.Quaternion());
  const normalHighlightColor = useMemo(() => new THREE.Color('#10b981'), []);
  const errorColor = useMemo(() => new THREE.Color('#ff0000'), []);
  const contrastColor = useMemo(() => new THREE.Color('#70827e'), []);
  const [{ meshLocations, processLabelLocations }, setSceneRuntime] = useState<SceneRuntimeState>({
    meshLocations: [],
    processLabelLocations: [],
  });
  const offsetStartIndex = 6;

  const activeErrorIndices = useMemo(() => {
    return apiData
      .filter((item) => isDefectResult(item.RESULT002))
      .map((item) => Number.parseInt(item.대차번호, 10) - 1);
  }, [apiData]);
  const activeErrorIndexSet = useMemo(() => new Set(activeErrorIndices), [activeErrorIndices]);
  const apiDataByCartNumber = useMemo(() => {
    return new Map(apiData.map((item) => [Number.parseInt(item.대차번호, 10), item]));
  }, [apiData]);
  const meshIndexByUuid = useMemo(() => {
    return new Map(meshLocations.map((location, index) => [location.mesh.uuid, index]));
  }, [meshLocations]);

  useEffect(() => {
    const stationCount = meshLocations.length;
    const targetOffset = getGr2LineOffset(
      equipmentPositions,
      stationCount,
      INSERTION_STATION_INDEX,
    );

    if (targetOffset === null) return;

    const currentMotion = lineMotionRef.current;
    if (hasAppliedEquipmentPositionRef.current && currentMotion.toOffset === targetOffset) return;

    const isFirstEquipmentPosition = !hasAppliedEquipmentPositionRef.current;
    const forwardDistance = (targetOffset - currentMotion.toOffset + stationCount) % stationCount;
    const backwardDistance = (currentMotion.toOffset - targetOffset + stationCount) % stationCount;
    const isSingleStep = forwardDistance === 1 || backwardDistance === 1;
    const shouldAnimate = !isFirstEquipmentPosition && isSingleStep;

    lineMotionRef.current = {
      fromOffset: shouldAnimate ? currentMotion.toOffset : targetOffset,
      toOffset: targetOffset,
      startedAt: performance.now(),
      duration: shouldAnimate ? LINE_MOVE_DURATION_MS : 0,
    };
    hasAppliedEquipmentPositionRef.current = true;
  }, [equipmentPositions, meshLocations.length]);

  useEffect(() => {
    const injectionPosition = findGr2EquipmentPosition(equipmentPositions, 'OP3')
      ?? findGr2EquipmentPosition(equipmentPositions, '주입');
    const injectionCartNumber = Number.parseInt(injectionPosition?.CartNo ?? '', 10);

    if (!Number.isInteger(injectionCartNumber) || injectionCartNumber < 1) return;

    const matchedUnit = apiDataByCartNumber.get(injectionCartNumber) ?? null;
    const nextKey = matchedUnit?.대차번호 ?? null;

    if (nextKey !== lastInjectKeyRef.current) {
      lastInjectKeyRef.current = nextKey;
      onInjectUnitChange(matchedUnit);
    }
  }, [apiDataByCartNumber, equipmentPositions, onInjectUnitChange]);

  useEffect(() => {
    meshLocations.forEach((location, labelIndex) => {
      if (location.mesh.uuid === activeIdRef.current) {
        location.material.emissive.copy(
          activeErrorIndexSet.has(labelIndex) ? errorColor : normalHighlightColor,
        );
        location.material.emissiveIntensity = 2;
      } else if (!activeErrorIndexSet.has(labelIndex)) {
        location.material.emissiveIntensity = 0;
      }
    });
  }, [activeErrorIndexSet, errorColor, meshLocations, normalHighlightColor]);

  useEffect(() => {
    let cancelled = false;
    const meshes: { mesh: THREE.Mesh; position: THREE.Vector3 }[] = [];

    modelScene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      const name = mesh.name.toLowerCase();
      const isStaticPart = [
        'floor',
        'ground',
        'plane',
        'base',
        'plate',
        'bottom',
        'stand',
        'support',
        'frame',
        'line',
        'rail',
      ].some((keyword) => name.includes(keyword));

      mesh.castShadow = !isStaticPart;
      mesh.receiveShadow = true;
      addSoftObjectEdge(mesh, isStaticPart, highContrast);

      if (isStaticPart) return;

      if (mesh.material) {
        const baseMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const standardMaterial = baseMaterial as THREE.MeshStandardMaterial;
        const originalColor = standardMaterial.color?.clone() ?? new THREE.Color(0xffffff);

        if (highContrast) originalColor.lerp(contrastColor, 0.62);

        mesh.material = new THREE.MeshPhysicalMaterial({
          color: originalColor,
          metalness: highContrast ? 0.18 : 0.1,
          roughness: highContrast ? 0.42 : 0.2,
          clearcoat: highContrast ? 0.48 : 1,
          clearcoatRoughness: highContrast ? 0.28 : 0.1,
          side: THREE.DoubleSide,
        });
      }

      const worldPosition = new THREE.Vector3();
      mesh.getWorldPosition(worldPosition);
      meshes.push({ mesh, position: worldPosition });
    });

    if (meshes.length === 0) return () => disposeSceneClone(modelScene, scene);

    const center = meshes.reduce(
      (acc, item) => ({
        x: acc.x + item.position.x,
        z: acc.z + item.position.z,
      }),
      { x: 0, z: 0 },
    );
    center.x /= meshes.length;
    center.z /= meshes.length;

    meshes.sort((a, b) => {
      let angleA = Math.atan2(a.position.z - center.z, a.position.x - center.x);
      let angleB = Math.atan2(b.position.z - center.z, b.position.x - center.x);

      if (angleA < 0) angleA += Math.PI * 2;
      if (angleB < 0) angleB += Math.PI * 2;

      return angleB - angleA;
    });

    const sliceIndex = offsetStartIndex % meshes.length;
    const sortedMeshes = [...meshes.slice(sliceIndex), ...meshes.slice(0, sliceIndex)];

    if (sortedMeshes.length > 12) {
      sortedMeshes.splice(12, 1);
    }

    lineCenterRef.current.set(0, 0, 0);
    sortedMeshes.forEach((item) => {
      lineCenterRef.current.add(item.mesh.position);
    });
    lineCenterRef.current.divideScalar(sortedMeshes.length);
    const inwardFacingYaws = sortedMeshes.map((item, index) => {
      const previous = sortedMeshes[(index - 1 + sortedMeshes.length) % sortedMeshes.length].mesh.position;
      const next = sortedMeshes[(index + 1) % sortedMeshes.length].mesh.position;
      const tangentX = next.x - previous.x;
      const tangentZ = next.z - previous.z;
      let normalX = -tangentZ;
      let normalZ = tangentX;
      const centerX = lineCenterRef.current.x - item.mesh.position.x;
      const centerZ = lineCenterRef.current.z - item.mesh.position.z;

      if (normalX * centerX + normalZ * centerZ < 0) {
        normalX *= -1;
        normalZ *= -1;
      }

      return Math.atan2(normalX, normalZ);
    });

    const processLabels: ProcessLabelLocation[] = [];

    sortedMeshes.forEach((item, index) => {
      if (index >= PROCESS_CONFIG.length) return;

      const config = PROCESS_CONFIG[index];
      const geometry = item.mesh.geometry;

      if (!geometry.boundingBox) geometry.computeBoundingBox();

      const labelPosition = item.mesh.position.clone();
      const objectTop = (geometry.boundingBox?.max.y ?? 0.8) * Math.abs(item.mesh.scale.y);

      labelPosition.y += objectTop + 0.08;

      processLabels.push({
        position: labelPosition,
        name: config.name,
        color: config.color,
      });
    });

    const nextMeshLocations = sortedMeshes.map((item, index) => {
      const material = item.mesh.material as THREE.MeshPhysicalMaterial;
      const edge = item.mesh.children.find(
        (child) => child.name === SOFT_EDGE_NAME,
      ) as THREE.LineSegments | undefined;
      const edgeMaterial = edge?.material as THREE.LineBasicMaterial | undefined;

      material.transparent = false;

      return {
        position: item.mesh.position.clone().add(CART_BASE_OFFSET_VECTOR),
        localPosition: item.mesh.position.clone(),
        // 1~4번은 같은 직선 구간이므로 곡선 접선값을 섞지 않고
        // 완전히 동일한 정면 방향을 사용한다.
        inwardFacingYaw: index < 4 ? 0 : inwardFacingYaws[index],
        facingOffset: JIG_FACING_OFFSETS[item.mesh.name.toLowerCase()] ?? 0,
        stationGeometry: item.mesh.geometry,
        stationEdgeGeometry: edge?.geometry ?? null,
        neutralColor: material.color.clone(),
        edgeOpacity: edgeMaterial?.opacity ?? 0,
        mesh: item.mesh,
        material,
        edge: edge ?? null,
        edgeMaterial: edgeMaterial ?? null,
      };
    });

    queueMicrotask(() => {
      if (!cancelled) {
        setSceneRuntime({
          meshLocations: nextMeshLocations,
          processLabelLocations: processLabels,
        });
      }
    });

    return () => {
      cancelled = true;
      disposeSceneClone(modelScene, scene);
    };
  }, [contrastColor, highContrast, modelScene, scene]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (meshLocations.length === 0) return;

    const total = meshLocations.length;
    const motion = lineMotionRef.current;
    const moveProgress = getMotionProgress(motion);

    meshLocations.forEach((movingLocation, labelIndex) => {
      const currentStationIndex = getReversedLineStationIndex(
        labelIndex,
        motion.fromOffset,
        total,
      );
      const nextStationIndex = getReversedLineStationIndex(
        labelIndex,
        motion.toOffset,
        total,
      );
      const currentLocation = meshLocations[currentStationIndex];
      const nextLocation = meshLocations[nextStationIndex];
      const movingMesh = movingLocation.mesh;

      movingMesh.position.lerpVectors(
        currentLocation.localPosition,
        nextLocation.localPosition,
        moveProgress,
      );

      facingStartRef.current.setFromAxisAngle(
        THREE.Object3D.DEFAULT_UP,
        currentLocation.inwardFacingYaw,
      );
      facingEndRef.current.setFromAxisAngle(
        THREE.Object3D.DEFAULT_UP,
        nextLocation.inwardFacingYaw,
      );
      movingMesh.quaternion.slerpQuaternions(
        facingStartRef.current,
        facingEndRef.current,
        moveProgress,
      );
      movingMesh.rotateY(THREE.MathUtils.lerp(
        currentLocation.facingOffset,
        nextLocation.facingOffset,
        moveProgress,
      ));

      const appliedLocation = moveProgress < 1 ? currentLocation : nextLocation;
      if (movingMesh.geometry !== appliedLocation.stationGeometry) {
        movingMesh.geometry = appliedLocation.stationGeometry;
      }

      const edge = movingLocation.edge;

      if (
        edge &&
        appliedLocation.stationEdgeGeometry &&
        edge.geometry !== appliedLocation.stationEdgeGeometry
      ) {
        edge.geometry = appliedLocation.stationEdgeGeometry;
      }

      const material = movingLocation.material;
      const currentColor = PROCESS_COLORS[currentStationIndex] ?? movingLocation.neutralColor;
      const nextColor = PROCESS_COLORS[nextStationIndex] ?? movingLocation.neutralColor;

      material.color.lerpColors(currentColor, nextColor, moveProgress);
      material.opacity = 1;
      material.depthWrite = true;
      if (movingLocation.edgeMaterial) {
        movingLocation.edgeMaterial.opacity = movingLocation.edgeOpacity;
      }
    });

    const flashIntensity = 1.5 + Math.sin(time * 12) * 1.0;

    if (activeErrorIndices.length > 0) {
      meshLocations.forEach((location, labelIndex) => {
        if (location.mesh.uuid === activeIdRef.current) return;

        if (activeErrorIndexSet.has(labelIndex)) {
          location.material.emissive.set(errorColor);
          location.material.emissiveIntensity = flashIntensity;
        } else {
          location.material.emissiveIntensity = 0;
        }
      });
    }

  });

  const handlePointerOver = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = 'pointer';

    const mesh = event.object as THREE.Mesh;
    if (!mesh.isMesh) return;

    activeIdRef.current = mesh.uuid;
    const meshIndex = meshIndexByUuid.get(mesh.uuid);
    if (meshIndex === undefined) return;

    const foundLabelIndex = meshIndex;
    const name = formatUnitName(foundLabelIndex + 1);
    const matchedData = apiDataByCartNumber.get(foundLabelIndex + 1);

    const isError = matchedData ? isDefectResult(matchedData.RESULT002) : false;
    const material = mesh.material as THREE.MeshPhysicalMaterial;

    if (material.emissive) {
      material.emissive.copy(isError ? errorColor : normalHighlightColor);
      material.emissiveIntensity = 2;
    }

    onHoverChange({
      name,
      status: isError ? 'error' : 'normal',
      temp: matchedData ? Number.parseFloat(matchedData['가조립온도(℃)']) : 0,
      load: matchedData ? Number.parseFloat(matchedData['R액 압력(kg/㎥)']) : 0,
      problem: matchedData?.RESULT002,
      uuid: mesh.uuid,
    });
  }, [apiDataByCartNumber, errorColor, meshIndexByUuid, normalHighlightColor, onHoverChange]);

  const handlePointerOut = useCallback((event: ThreeEvent<PointerEvent>) => {
    const mesh = event.object as THREE.Mesh;

    if (activeIdRef.current !== mesh.uuid) return;

    document.body.style.cursor = 'auto';
    activeIdRef.current = null;

    const material = mesh.material as THREE.MeshPhysicalMaterial;
    material.emissiveIntensity = 0;

    onHoverChange(null);
  }, [onHoverChange]);

  return (
    <group>
      <primitive object={modelScene} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} />
      {meshLocations.map((_, index) => (
        <MovingLabel
          key={`cart-label-${index}`}
          labelIndex={index}
          locations={meshLocations}
          lineMotionRef={lineMotionRef}
          errorIndices={activeErrorIndices}
          apiData={apiData}
        />
      ))}
      {processLabelLocations.map((location) => (
        <ProcessLabel
          key={`proc-${location.name}`}
          position={location.position}
          name={location.name}
          color={location.color}
        />
      ))}
    </group>
  );
}

function FactoryModelLayer({
  config,
  apiData,
  equipmentPositions,
  onHoverChange,
  onInjectUnitChange,
}: {
  config: SceneViewConfig;
  apiData: ApiDataItem[];
  equipmentPositions: EquipmentPositionItem[];
  onHoverChange: (data: UnitData | null) => void;
  onInjectUnitChange: (unit: ApiDataItem | null) => void;
}) {
  const models = (
    <group scale={config.modelScale}>
      <ModelErrorBoundary fallback={null}>
        <FloorModel highContrast={false} />
      </ModelErrorBoundary>
      <ModelErrorBoundary fallback={null}>
        <InteractiveJigModel
          url={JIG_MODEL_PATH}
          highContrast={false}
          apiData={apiData}
          equipmentPositions={equipmentPositions}
          onHoverChange={onHoverChange}
          onInjectUnitChange={onInjectUnitChange}
        />
      </ModelErrorBoundary>
    </group>
  );

  return <Center position={config.modelPosition}>{models}</Center>;
}

export function FactoryScene({
  layout,
  apiData,
  equipmentPositions,
  onHoverChange,
  onInjectUnitChange,
}: FactorySceneProps) {
  const sceneConfig = SCENE_VIEW_CONFIG[layout];
  const visible = usePageVisible();

  const {
    cameraPosition,
    cameraFov,
  } = sceneConfig;

  return (
    <Canvas
      frameloop={visible ? 'always' : 'never'}
      dpr={[1, 1.25]}
      camera={{ position: cameraPosition, fov: cameraFov }}
      shadows="basic"
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
      }}
    >
      <LocalEnvironment />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[-20, 30, -20]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.05}
      >
        <orthographicCamera attach="shadow-camera" args={[-8, 8, 8, -8]} />
      </directionalLight>

      <Suspense fallback={null}>
        <Stage environment={null} intensity={2} adjustCamera={false} shadows={false}>
          <FactoryModelLayer
            config={sceneConfig}
            apiData={apiData}
            equipmentPositions={equipmentPositions}
            onHoverChange={onHoverChange}
            onInjectUnitChange={onInjectUnitChange}
          />
        </Stage>
      </Suspense>

      <SceneCameraController config={sceneConfig} />
    </Canvas>
  );
}

useGLTF.preload(JIG_MODEL_PATH, '/draco/');
useGLTF.preload(FLOOR_MODEL_PATH, '/draco/');
