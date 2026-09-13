'use client';

import { Suspense, useMemo } from 'react';
import { RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { color, mapPalette } from '@/styles/design-tokens';

const TRUCK_LENGTH = 4.4;
const TRUCK_DISPLAY_SCALE = .5;
const LOGO_URL = '/logo/gmt_logo_copy.png';
const LOGO_ASPECT = 1024 / 285;

/** GLB가 준비되는 동안에도 운행 위치와 차량 선택을 유지한다. */
function LoadingTruck() {
  return <group>
    <mesh position={[0, .34, 0]} castShadow><boxGeometry args={[.88, .15, 4.1]} /><meshStandardMaterial color={color.ink2} roughness={.8} /></mesh>
    <RoundedBox args={[1.04, 1.14, 3.35]} radius={.025} smoothness={2} position={[0, 1.07, -.525]} castShadow><meshStandardMaterial color={color.surface} metalness={.15} roughness={.42} /></RoundedBox>
    <RoundedBox args={[1.02, 1.0, .94]} radius={.08} smoothness={3} position={[0, .87, 1.72]} castShadow><meshStandardMaterial color={color.brand} metalness={.2} roughness={.3} /></RoundedBox>
    <mesh position={[0, 1.12, 2.196]}><planeGeometry args={[.8, .36]} /><meshStandardMaterial color={mapPalette.waterOutline} metalness={.5} roughness={.15} /></mesh>
    <mesh position={[0, .44, 2.15]}><boxGeometry args={[.98, .12, .08]} /><meshStandardMaterial color={color.borderStrong} metalness={.8} roughness={.25} /></mesh>
    {[-.54, .54].map(x => [-1.48, -.8, 1.69].map(z => <group key={`${x}-${z}`} position={[x, .26, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow><cylinderGeometry args={[.26, .26, .16, 20]} /><meshStandardMaterial color={color.ink} roughness={.95} /></mesh>
      <mesh position={[0, x > 0 ? -.086 : .086, 0]}><cylinderGeometry args={[.15, .15, .02, 16]} /><meshStandardMaterial color={color.borderStrong} metalness={.75} roughness={.3} /></mesh>
    </group>))}
  </group>;
}

function SideLogos({ positions, length }: { positions: [THREE.Vector3, THREE.Vector3]; length: number }) {
  const logo = useTexture(LOGO_URL, texture => { texture.colorSpace = THREE.SRGBColorSpace; });
  return <group>
    {positions.map((position, index) => <group key={index} position={position} rotation={[0, index === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
      <mesh><planeGeometry args={[length * 1.14, length / LOGO_ASPECT * 1.4]} /><meshStandardMaterial color={color.surface} roughness={.55} /></mesh>
      <mesh position={[0, 0, .012]}><planeGeometry args={[length, length / LOGO_ASPECT]} /><meshBasicMaterial map={logo} transparent toneMapped={false} depthWrite={false} /></mesh>
    </group>)}
  </group>;
}

export default function GmtTruckModel({ model }: { model: THREE.Group | null }) {
  const prepared = useMemo(() => {
    if (!model) return null;
    // 차량 인스턴스는 변환만 복제하고 큰 지오메트리와 텍스처는 공유한다.
    const instance = model.clone(true);
    const oriented = new THREE.Group();
    oriented.add(instance);
    const initialSize = new THREE.Box3().setFromObject(oriented).getSize(new THREE.Vector3());
    // 자산은 +Z 전방으로 제작하며 지도에서는 전체 길이만 맞춘다.
    if (initialSize.x > initialSize.z) instance.rotation.y += -Math.PI / 2;
    oriented.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(oriented);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = TRUCK_LENGTH / Math.max(size.x, size.z);
    instance.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
    oriented.scale.setScalar(scale);
    oriented.traverse(object => {
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    oriented.updateMatrixWorld(true);
    return oriented;
  }, [model]);

  const fallbackPositions: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(.528, 1.1, -.525), new THREE.Vector3(-.528, 1.1, -.525)];
  // 바닥 위치는 유지하고 실제 모델과 대체 차량·로고를 같은 비율로 줄인다.
  return <group position={[0, -.38, 0]} scale={TRUCK_DISPLAY_SCALE}>
    {prepared ? <primitive object={prepared} dispose={null} /> : <>
      <LoadingTruck />
      <Suspense fallback={null}><SideLogos positions={fallbackPositions} length={TRUCK_LENGTH * .45} /></Suspense>
    </>}
  </group>;
}
