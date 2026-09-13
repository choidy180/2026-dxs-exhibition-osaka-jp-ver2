'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BufferGeometry, Material, Mesh, SkinnedMesh, Texture } from 'three';
import type { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { MapLoadStatus } from '@/components/transport-map/MapTileStatus';

const GMT_TRUCK_MODEL_URL = '/models/transport/gmt-tripo-red-white-container-truck.glb';
const MODEL_REQUEST_TIMEOUT_MS = 30_000;

type TruckModelState = { model: Group | null; status: MapLoadStatus };

function hasRenderableMesh(scene: Group | undefined): boolean {
  if (!scene) return false;
  let hasMesh = false;
  scene.traverseVisible(node => {
    if (node instanceof Mesh && (node.geometry.getAttribute('position')?.count ?? 0) >= 3) hasMesh = true;
  });
  return hasMesh;
}

/** 공유되는 모델 자원과 ImageBitmap을 자원별로 한 번만 정리한다. */
function disposeModels(models: Iterable<GLTF>, disposed: WeakSet<object>) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const bitmaps = new Set<ImageBitmap>();

  for (const model of models) {
    const scenes = new Set([model.scene, ...model.scenes]);
    for (const scene of scenes) {
      if (!scene) continue;
      scene.traverse(node => {
        if ('geometry' in node && node.geometry instanceof BufferGeometry) {
          geometries.add(node.geometry);
        }
        if ('material' in node) {
          const nodeMaterials: unknown[] = Array.isArray(node.material) ? node.material : [node.material];
          nodeMaterials.forEach(material => {
            if (material instanceof Material) materials.add(material);
          });
        }
        if (node instanceof SkinnedMesh && node.skeleton.boneTexture) {
          textures.add(node.skeleton.boneTexture);
          node.skeleton.boneTexture = null;
        }
      });
    }
    // 여러 scene이나 사용되지 않는 재질에 걸쳐 로드된 텍스처도 함께 정리한다.
    for (const resource of model.parser.associations.keys()) {
      if (resource instanceof Material) materials.add(resource);
      if (resource instanceof Texture) textures.add(resource);
    }
  }

  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof Texture) textures.add(value);
    }
  }
  for (const texture of textures) {
    const images: unknown[] = Array.isArray(texture.source.data) ? texture.source.data : [texture.source.data];
    for (const image of images) {
      if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) bitmaps.add(image);
    }
  }

  for (const resource of [...geometries, ...materials, ...textures]) {
    if (disposed.has(resource)) continue;
    disposed.add(resource);
    resource.dispose();
  }
  for (const bitmap of bitmaps) {
    if (disposed.has(bitmap)) continue;
    disposed.add(bitmap);
    bitmap.close();
  }
}

/** 지도 root에서 한 번 호출하고 차량별 클론에는 dispose={null}을 적용한다. */
export function useGmtTruckModel() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<TruckModelState>({ model: null, status: 'loading' });
  const ownedModelsRef = useRef(new Set<GLTF>());
  const disposedRef = useRef(new WeakSet<object>());
  const requestRef = useRef<AbortController | null>(null);

  const retry = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setState({ model: null, status: 'loading' });
    setAttempt(previous => previous + 1);
  }, []);

  useEffect(() => {
    const ownedModels = ownedModelsRef.current;
    const disposed = disposedRef.current;
    return () => {
      const retiredModels = [...ownedModels];
      ownedModels.clear();
      // React의 차량 클론 정리가 끝난 뒤 공유 자원을 해제한다.
      queueMicrotask(() => disposeModels(retiredModels, disposed));
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    requestRef.current = controller;
    const isCurrent = () => active && requestRef.current === controller;
    const disposed = disposedRef.current;
    const timeout = window.setTimeout(() => {
      if (!isCurrent()) return;
      active = false;
      controller.abort();
      setState({ model: null, status: 'error' });
    }, MODEL_REQUEST_TIMEOUT_MS);

    const loadModel = async () => {
      if (!isCurrent()) return;
      const response = await fetch(GMT_TRUCK_MODEL_URL, { signal: controller.signal });
      if (!isCurrent()) return;
      if (!response.ok) throw new Error('Truck model request failed');
      const buffer = await response.arrayBuffer();
      if (!isCurrent()) return;
      if (buffer.byteLength === 0) {
        window.clearTimeout(timeout);
        setState({ model: null, status: 'empty' });
        return;
      }

      const resourcePath = new URL('./', new URL(GMT_TRUCK_MODEL_URL, window.location.href)).href;
      const model = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer, resourcePath);
      if (!isCurrent()) {
        // parseAsync는 취소할 수 없으므로 취소 뒤 늦게 생긴 GPU 자원도 회수한다.
        disposeModels([model], disposed);
        return;
      }
      window.clearTimeout(timeout);
      if (!hasRenderableMesh(model.scene)) {
        disposeModels([model], disposed);
        setState({ model: null, status: 'empty' });
        return;
      }

      // 재시도 전의 모델도 지도 생명주기 동안 보존해 이전 클론의 공유 자원이 끊기지 않게 한다.
      ownedModelsRef.current.add(model);
      setState({ model: model.scene, status: 'ready' });
    };

    queueMicrotask(() => {
      void loadModel().catch(() => {
        if (!isCurrent()) return;
        window.clearTimeout(timeout);
        setState({ model: null, status: 'error' });
      });
    });

    return () => {
      active = false;
      controller.abort();
      if (requestRef.current === controller) requestRef.current = null;
      window.clearTimeout(timeout);
    };
  }, [attempt]);

  return { ...state, retry };
}
