"use client";

import React, { useState, Suspense, useRef, useMemo, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { Canvas, useThree, useFrame, type ThreeEvent } from "@react-three/fiber"; 
import { useGLTF, Stage, OrbitControls, Html, useProgress, Center, Resize } from "@react-three/drei";
import { Box as LucideBox, Activity, Thermometer, Cpu, Scan, BarChart3, TrendingUp } from "lucide-react";
import * as THREE from "three";
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';

import { GR2_DATA } from "@/data/gr2";
import LocalEnvironment from '@/components/common/local-environment/LocalEnvironment';

// -----------------------------------------------------------------------------
// [설정] 불러올 파일 경로
const FIXED_MODEL_PATH = "/model.glb"; 
// -----------------------------------------------------------------------------

// --- Styled Components ---

const PageContainer = styled.div`
  display: flex; flex-direction: column; width: 100%; height: 100vh;
  background-color: #1a1a1a; color: #f5f5f5;
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
`;

const Header = styled.header`
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.5rem; border-bottom: 1px solid rgba(132, 204, 22, 0.2);
  background-color: rgba(26, 26, 26, 0.9); backdrop-filter: blur(8px);
  position: fixed; top: 0; width: 100%; box-sizing: border-box;
  z-index: 200;
`;

const HeaderLeft = styled.div`
  display: flex; align-items: center; gap: 0.5rem;
  h1 { font-size: 1.125rem; font-weight: 700; margin: 0; color: #fff; letter-spacing: -0.5px; }
`;

const MainContent = styled.main`
  flex: 1; width: 100%; height: 100%; position: relative;
  display: flex; flex-direction: column;
`;

const ViewerContainer = styled.div<{ $visible: boolean }>`
  width: 100%; height: 100%; padding-top: 3.5rem;
  background: radial-gradient(circle at center, #262626 0%, #111111 100%);
  position: relative;
  opacity: ${props => (props.$visible ? 1 : 0)};
  transition: opacity 1s cubic-bezier(0.19, 1, 0.22, 1);
`;

const InstructionBadge = styled.div`
  position: fixed; bottom: 8rem; left: 50%; transform: translateX(-50%);
  padding: 0.6rem 1.2rem; background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px; font-size: 0.8rem; color: #a3a3a3;
  pointer-events: none; white-space: nowrap; 
  z-index: 90; 
`;

// --- [수정됨] Graph Overlay Components (Absolute Layout) ---

const GraphPanel = styled.div`
  position: fixed; 
  left: 50%; transform: translateX(-50%);
  width: 90%; max-width: 1200px; 
  height: 220px; /* 패널 높이 고정 */
  background: rgba(10, 15, 20, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(132, 204, 22, 0.3);
  border-radius: 12px;
  /* Flex 제거, 일반 Block 레이아웃 사용 */
  display: block; 
  z-index: 100; /* 3D Canvas보다 무조건 위에 */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  pointer-events: auto;

`;

const TopGraphPanel = styled(GraphPanel)`
  top: 5rem;
`;

const BottomGraphPanel = styled(GraphPanel)`
  bottom: 2rem;
  height: 180px; 
`;

const PanelTitle = styled.div`
  /* 제목 영역 고정 */
  position: absolute; top: 16px; left: 20px; right: 20px; height: 24px;
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 700; color: #84cc16; text-transform: uppercase; letter-spacing: 1px;
  
  span.sub { font-size: 11px; color: #888; margin-left: auto; text-transform: none; font-weight: 400; }
`;

// [핵심 수정] 차트 영역을 절대 위치로 강제 지정하여 높이 0 문제 해결
const ChartContainerAbsolute = styled.div`
  position: absolute;
  top: 50px; /* 제목 아래 */
  bottom: 16px; /* 패널 하단 여백 */
  left: 16px; 
  right: 16px;
  /* 이 영역 안에서 ResponsiveContainer가 100%를 차지 */
`;


// --- Styled Components for 3D Labels & Popups (기존 유지) ---

const FloatingLabel = styled.div`
  padding: 4px 8px; background-color: rgba(0, 0, 0, 0.8);
  border: 1px solid #84cc16; border-radius: 4px; color: #84cc16;
  font-size: 11px; font-weight: 700; white-space: nowrap;
  box-shadow: 0 4px 6px rgba(0,0,0,0.4); pointer-events: none;
  user-select: none; opacity: 0.7;
`;

const popupFadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const growLine = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;

const pulse = keyframes`
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; box-shadow: 0 0 0 0 rgba(132, 204, 22, 0.7); }
  70% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; box-shadow: 0 0 0 10px rgba(132, 204, 22, 0); }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
`;

const InfoWrapper = styled.div`
  display: flex; align-items: stretch; gap: 8px;
  opacity: 0; 
  animation: ${popupFadeIn} 0.4s ease-out 0.4s forwards; 
  pointer-events: none;
  
  &::after {
    content: ''; position: absolute; bottom: -6px; left: 50%;
    transform: translateX(-50%); width: 0; height: 0; 
    border-left: 6px solid transparent; border-right: 6px solid transparent;
    border-top: 6px solid #84cc16;
  }
`;

const PreviewBox = styled.div`
  width: 100px; background: rgba(10, 15, 20, 0.95);
  border: 1px solid #84cc16; backdrop-filter: blur(12px);
  position: relative; overflow: hidden;
  box-shadow: 0 0 20px rgba(132, 204, 22, 0.1);
  display: flex; align-items: center; justify-content: center;
`;

const PopupContainer = styled.div`
  width: 200px; background: rgba(15, 20, 25, 0.95);
  border: 1px solid #84cc16; backdrop-filter: blur(12px);
  padding: 0; color: white; font-family: "Consolas", "Monaco", monospace;
  box-shadow: 0 0 30px rgba(132, 204, 22, 0.2);
`;

const PopupHeader = styled.div`
  background: rgba(132, 204, 22, 0.15); padding: 8px 12px;
  border-bottom: 1px solid #84cc16; font-size: 13px; font-weight: bold;
  color: #84cc16; display: flex; align-items: center; gap: 8px;
  text-transform: uppercase; letter-spacing: 1px;
`;

const PopupBody = styled.div`
  padding: 12px; display: flex; flex-direction: column; gap: 8px;
`;

const StatRow = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; color: #e5e5e5;
  border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 4px;
  span.label { color: #a3a3a3; display: flex; align-items: center; gap: 4px; }
  span.value { font-weight: bold; color: #fff; font-family: "Menlo", monospace; }
  span.status-ok { color: #84cc16; }
`;

const LineContainer = styled.div`
  position: absolute; top: 0; left: 0;
  height: 2px; transform-origin: 0 0; 
  pointer-events: none; z-index: 1000;
`;

const AnimatedLine = styled.div`
  width: 100%; height: 100%; background-color: #84cc16;
  box-shadow: 0 0 8px #84cc16; transform-origin: 0 50%; 
  animation: ${growLine} 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
`;

const RingEffect = styled.div`
  position: absolute; width: 12px; height: 12px;
  background: #84cc16; border-radius: 50%;
  transform: translate(-50%, -50%); z-index: 1002;
  box-shadow: 0 0 10px #84cc16;
  opacity: 0; animation: ${keyframes`to{opacity:1}`} 0.1s linear 0.4s forwards;

  &::after {
    content: ''; position: absolute; top: 50%; left: 50%;
    width: 100%; height: 100%; border-radius: 50%;
    background: transparent; border: 2px solid #84cc16;
    transform: translate(-50%, -50%); animation: ${pulse} 2s infinite 0.4s;
  }
`;

// --- Loader Components ---
const LoaderOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background-color: #1a1a1a; z-index: 2147483647; 
`;

const ProgressContainer = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 1.2rem;
  width: 320px; padding: 2.5rem; background-color: #262626;
  border-radius: 20px; border: 1px solid #333;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
`;

const ProgressText = styled.div`
  font-size: 1rem; font-weight: 600; color: #e5e5e5;
  display: flex; justify-content: space-between; width: 100%; margin-bottom: 0.5rem;
  span.percent { color: #84cc16; font-variant-numeric: tabular-nums; }
`;

const ProgressBarTrack = styled.div`
  width: 100%; height: 8px; background-color: #333; border-radius: 9999px; overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $progress: number }>`
  height: 100%; width: ${props => props.$progress}%;
  background-color: #84cc16; border-radius: 9999px;
  transition: width 0.2s linear; 
  box-shadow: 0 0 20px rgba(132, 204, 22, 0.5);
`;

// --- Preview & Model Components (기존과 동일) ---

function PreviewObject({ name }: { name: string }) {
  const { scene } = useGLTF(FIXED_MODEL_PATH, '/draco/');
  const groupRef = useRef<THREE.Group>(null);
  
  const targetMesh = useMemo(() => {
    let found: THREE.Mesh | null = null;
    scene.traverse((child) => {
      if (child.uuid === name && (child as THREE.Mesh).isMesh) {
        found = (child as THREE.Mesh).clone();
        if (found.material) {
          const mat = Array.isArray(found.material) 
            ? found.material.map(m => m.clone()) 
            : found.material.clone();
            
          if (Array.isArray(mat)) {
            mat.forEach(m => { 
              if ((m as THREE.MeshStandardMaterial).emissive) {
                (m as THREE.MeshStandardMaterial).emissive.setHex(0x000000); 
              }
            });
          } else {
            if ((mat as THREE.MeshStandardMaterial).emissive) {
              (mat as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            }
          }
          found.material = mat;
        }
      }
    });
    return found;
  }, [scene, name]);

  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.2;
  });

  if (!targetMesh) return null;

  return (
    <group key={name} ref={groupRef}>
      <Resize scale={1.2}>
        <Center>
          <primitive object={targetMesh} />
        </Center>
      </Resize>
    </group>
  );
}

interface UnitPopupData {
  id: string;
  name: string;
  temp: number;
  load: number;
  position: [number, number, number];
}

function StatusPopup({ data, position }: { data: UnitPopupData, position: [number, number, number] }) {
  const { camera } = useThree();
  const vec = new THREE.Vector3(...position);
  vec.project(camera);
  const isRightSide = vec.x > 0; 
  const dx = isRightSide ? -250 : 250; 
  const dy = -250; 
  const lineLength = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI); 
  const totalWidth = 310;
  const popupLeft = dx - (totalWidth / 2); 
  const popupTop = dy;

  if (!data) return null;

  return (
    <Html 
      position={position} 
      center 
      zIndexRange={[999999, 0]} 
      occlude={false} 
      style={{ pointerEvents: 'none', width: 0, height: 0, overflow: 'visible' }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: -4, top: -4, width: 8, height: 8,
          background: '#84cc16', borderRadius: '50%', boxShadow: '0 0 10px #84cc16',
          zIndex: 1001
        }} />
        <LineContainer style={{ width: `${lineLength}px`, transform: `rotate(${angle}deg)` }}>
          <AnimatedLine />
        </LineContainer>
        <RingEffect style={{ left: dx, top: dy }} />
        <div style={{
          position: 'absolute', left: popupLeft + 'px', top: popupTop + 'px',
          width: totalWidth + 'px', transform: 'translateY(-100%)', paddingBottom: '16px' 
        }}>
          <InfoWrapper>
            <PreviewBox>
              <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 3], fov: 50 }}>
                <LocalEnvironment />
                <Suspense fallback={null}>
                  <directionalLight position={[4, 6, 3]} intensity={2} /> 
                  <ambientLight intensity={1} />
                  <PreviewObject name={data.id} />
                </Suspense>
              </Canvas>
            </PreviewBox>
            <PopupContainer>
              <PopupHeader>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <Scan size={14} />
                  {data.name}
                </div>
              </PopupHeader>
              <PopupBody>
                <StatRow>
                  <span className="label"><Activity size={12} /> STATUS</span>
                  <span className="value status-ok">OPERATIONAL</span>
                </StatRow>
                <StatRow>
                  <span className="label"><Thermometer size={12} /> TEMP</span>
                  <span className="value">{data.temp}°C</span>
                </StatRow>
                <StatRow>
                  <span className="label"><Cpu size={12} /> LOAD</span>
                  <span className="value">{data.load}%</span>
                </StatRow>
              </PopupBody>
            </PopupContainer>
          </InfoWrapper>
        </div>
      </div>
    </Html>
  );
}

function Loader({ onFinished }: { onFinished: () => void }) {
  const { active, progress } = useProgress();
  const [visualProgress, setVisualProgress] = useState(0);
  const [shouldUnmount, setShouldUnmount] = useState(false);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      setVisualProgress(prev => {
        const target = active ? progress : 100;
        const next = prev + (target - prev) * 0.1;
        if (Math.abs(target - next) < 0.1) return target;
        return next;
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [active, progress]);

  useEffect(() => {
    if (visualProgress >= 99.9) {
      const timer = setTimeout(() => {
        onFinished();
        setShouldUnmount(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visualProgress, onFinished]);

  if (shouldUnmount) return null;

  return (
    <LoaderOverlay>
      <ProgressContainer>
        <ProgressText>
          <span>시스템 초기화 중...</span>
          <span className="percent">{visualProgress.toFixed(0)}%</span>
        </ProgressText>
        <ProgressBarTrack><ProgressBarFill $progress={visualProgress} /></ProgressBarTrack>
      </ProgressContainer>
    </LoaderOverlay>
  );
}

type EmissiveData = { color: THREE.Color; intensity: number; };
type LabelInfo = { id: string; text: string; position: [number, number, number]; };

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url, '/draco/');
  const originalEmissives = useRef<Map<string, EmissiveData>>(new Map());
  const highlightColor = useMemo(() => new THREE.Color("#84cc16"), []); 
  const [labels, setLabels] = useState<LabelInfo[]>([]);
  const [hoveredData, setHoveredData] = useState<UnitPopupData | null>(null);

  useEffect(() => {
    const generatedLabels: LabelInfo[] = [];
    let grCount = 1;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true; mesh.receiveShadow = true;
        if (mesh.material) {
          mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
        }
        mesh.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(mesh);
        if (!box.isEmpty()) {
          const center = new THREE.Vector3();
          box.getCenter(center);
          const labelText = `GR${grCount.toString().padStart(2, '0')}`;
          mesh.userData = { 
            name: labelText,
            temp: Math.floor(Math.random() * 30) + 40, 
            load: Math.floor(Math.random() * 40) + 20
          };
          generatedLabels.push({ id: mesh.uuid, text: labelText, position: [center.x, box.max.y + 0.1, center.z] });
          grCount++;
        }
      }
    });
    const frame = window.requestAnimationFrame(() => setLabels(generatedLabels));
    return () => window.cancelAnimationFrame(frame);
  }, [scene]);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;
    document.body.style.cursor = "pointer";
    if (mesh.isMesh) {
      if (mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          if (!originalEmissives.current.has(mesh.uuid)) {
            originalEmissives.current.set(mesh.uuid, { color: mat.emissive.clone(), intensity: mat.emissiveIntensity ?? 1 });
          }
          mat.emissive.copy(highlightColor);
          mat.emissiveIntensity = 2.0;
        }
      }
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const center = new THREE.Vector3();
      box.getCenter(center); 
      setHoveredData({
        id: mesh.uuid,
        name: mesh.userData.name || "Unknown Unit",
        temp: mesh.userData.temp || 45,
        load: mesh.userData.load || 30,
        position: [center.x, center.y, center.z] 
      });
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    const mesh = e.object as THREE.Mesh;
    document.body.style.cursor = "auto";
    if (mesh.isMesh && originalEmissives.current.has(mesh.uuid)) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const originalData = originalEmissives.current.get(mesh.uuid)!;
      mat.emissive.copy(originalData.color);
      mat.emissiveIntensity = originalData.intensity;
    }
    setHoveredData(null);
  };

  return (
    <group>
      <primitive object={scene} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} />
      {labels.map((label) => (
        <Html key={label.id} position={label.position} center zIndexRange={[100, 0]} distanceFactor={12} style={{pointerEvents: 'none'}}>
          <FloatingLabel>{label.text}</FloatingLabel>
        </Html>
      ))}
      {hoveredData && <StatusPopup data={hoveredData} position={hoveredData.position} />}
    </group>
  );
}

// --- Custom Graph Tooltip ---
interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly { color?: string; name?: string | number; value?: string | number | readonly (string | number)[]; unit?: string | number }[];
  label?: string | number;
}
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(10, 15, 20, 0.95)', border: '1px solid #84cc16', 
        padding: '8px 12px', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
        fontFamily: 'monospace', fontSize: '12px', zIndex: 1000
      }}>
        <p style={{ color: '#84cc16', fontWeight: 'bold', margin: '0 0 4px 0' }}>{label}</p>
        {payload.map((p, idx) => (
          <p key={idx} style={{ color: p.color, margin: 0 }}>
            {p.name}: {p.value}{p.unit || ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// --- Main Page Component ---

export default function GlbViewerPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <PageContainer>
      <Header>
        <HeaderLeft>
          <LucideBox size={24} color="#84cc16" />
          <h1>GLB Viewer (Studio)</h1>
        </HeaderLeft>
      </Header>

      <MainContent>
        <Loader onFinished={() => setIsLoaded(true)} />

        <ViewerContainer $visible={isLoaded}>
          
          {/* 상단 그래프: 검사수 & 불량수 */}
          <TopGraphPanel>
            <PanelTitle>
              <BarChart3 size={16} /> 
              Production Inspection & Error
              <span className="sub">GR2 LINE / MES DATA (2024.01 - 12)</span>
            </PanelTitle>
            
            {/* ChartContainerAbsolute: 그래프 영역을 절대 좌표로 강제 고정 */}
            <ChartContainerAbsolute>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={GR2_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: '#666'}} interval={2} />
                  <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#666'}} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(132, 204, 22, 0.1)' }} />
                  {/* isAnimationActive={false}로 데이터 로드 시 렌더링 누락 방지 */}
                  <Bar yAxisId="left" dataKey="inspection" name="검사수" fill="#3f6212" barSize={12} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  <Line yAxisId="left" type="monotone" dataKey="error" name="불량수" stroke="#ef4444" strokeWidth={2} dot={{r: 2, fill: '#ef4444'}} activeDot={{r: 4}} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainerAbsolute>
          </TopGraphPanel>

          {/* 하단 그래프: 불량률 */}
          <BottomGraphPanel>
            <PanelTitle>
              <TrendingUp size={16} /> 
              Defect Rate Analysis
              <span className="sub">WEEKLY TREND %</span>
            </PanelTitle>
            
            <ChartContainerAbsolute>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={GR2_DATA}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#84cc16" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: '#666'}} interval={2} />
                  <YAxis tick={{fontSize: 10, fill: '#666'}} unit="%" />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#84cc16', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="rate" name="불량률" unit="%" stroke="#84cc16" fillOpacity={1} fill="url(#colorRate)" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainerAbsolute>
          </BottomGraphPanel>

          {/* 3D Canvas */}
          <Canvas dpr={[1, 2]} camera={{ position: [0, 15.54, 10.25], fov: 45, zoom: 1.3 }} shadows>
            <LocalEnvironment />
            <Suspense fallback={null}>
              <Stage environment={null} intensity={1} adjustCamera={0.7} shadows="contact">
                <Center>
                  <Model url={FIXED_MODEL_PATH} />
                </Center>
              </Stage>
            </Suspense>
            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
          </Canvas>

          <InstructionBadge>
            좌클릭/휠: 시점 조작 / 마우스 오버: 상세 정보
          </InstructionBadge>

        </ViewerContainer>
      </MainContent>
    </PageContainer>
  );
}
