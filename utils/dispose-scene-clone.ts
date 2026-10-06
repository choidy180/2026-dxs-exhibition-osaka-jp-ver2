import type { BufferGeometry, Material, Object3D } from 'three';

/** GLTF 캐시는 유지하고 이 화면에서 만든 재질·윤곽선만 해제한다. */
export function disposeSceneClone(clone: Object3D, source: Object3D): void {
  const shared = new Set<BufferGeometry | Material>();
  const owned = new Set<BufferGeometry | Material>();
  const collect = (root: Object3D, target: Set<BufferGeometry | Material>) => {
    root.traverse(object => {
      const drawable = object as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };
      if (drawable.geometry) target.add(drawable.geometry);
      if (drawable.material) {
        (Array.isArray(drawable.material) ? drawable.material : [drawable.material]).forEach(material => target.add(material));
      }
    });
  };
  collect(source, shared); collect(clone, owned);
  owned.forEach(resource => { if (!shared.has(resource)) resource.dispose(); });
}
