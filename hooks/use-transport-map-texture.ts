'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import VectorTile from 'ol/VectorTile';
import VectorTileLayer from 'ol/layer/VectorTile';
import { getCenter, getHeight, getWidth, intersects } from 'ol/extent';
import { unByKey } from 'ol/Observable';
import { createXYZ } from 'ol/tilegrid';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { useTransportBasemap } from '@/hooks/use-transport-basemap';
import { createTransportMapStyle } from '@/utils/transport-map-style';
import { mapPalette } from '@/styles/design-tokens';

const MAX_TEXTURE_SIZE = 4096;
const MAX_PIXEL_RATIO = 4;
const TILE_LOAD_TIMEOUT_MS = 15_000;
const RENDER_TIMEOUT_MS = 30_000;

interface TransportMapTileRange {
  zoom: number;
  tileSize: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface TransportMapTextureState {
  texture: CanvasTexture | null;
  status: 'loading' | 'ready' | 'error' | 'empty';
}

export function useTransportMapTexture({ zoom, tileSize, minX, maxX, minY, maxY }: TransportMapTileRange) {
  const basemap = useTransportBasemap();
  const { source, retry: retryBasemap } = basemap;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const resetRef = useRef<() => void>(() => {});
  const clearDeadlineRef = useRef<() => void>(() => {});
  const basemapStatusRef = useRef(basemap.status);
  const [state, setState] = useState<TransportMapTextureState>({ texture: null, status: 'loading' });
  const rawWidth = (maxX - minX + 1) * tileSize;
  const rawHeight = (maxY - minY + 1) * tileSize;
  const validRange = [zoom, tileSize, minX, maxX, minY, maxY].every(Number.isInteger) &&
    zoom >= 0 && zoom <= 22 && tileSize > 0 && rawWidth > 0 && rawHeight > 0;
  // 논리 크기를 유지해 4배 해상도에서도 도로와 지명의 표시 크기를 보존한다.
  const logicalScale = validRange ? Math.min(1, MAX_TEXTURE_SIZE / Math.max(rawWidth, rawHeight)) : 1;
  const width = validRange ? Math.max(1, Math.round(rawWidth * logicalScale)) : 1;
  const height = validRange ? Math.max(1, Math.round(rawHeight * logicalScale)) : 1;
  const pixelRatio = Math.min(MAX_PIXEL_RATIO, MAX_TEXTURE_SIZE / Math.max(width, height));

  const retry = useCallback(() => {
    resetRef.current();
    retryBasemap();
  }, [retryBasemap]);

  useEffect(() => {
    basemapStatusRef.current = basemap.status;
    if (basemap.status === 'ready') {
      // 타일 완료 이벤트가 React 상태 반영보다 먼저 도착할 수 있다.
      mapRef.current?.render();
    } else {
      if (basemap.status === 'error' || basemap.status === 'empty') clearDeadlineRef.current();
      setState(previous => ({ ...previous, status: basemap.status }));
    }
  }, [basemap.status]);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let loadedTileCount = 0;
    let hasVisibleFeatures = false;
    let generatedTexture: CanvasTexture | null = null;
    let renderDeadline: ReturnType<typeof setTimeout> | undefined;
    const pending = new Set<AbortController>();
    const target = surfaceRef.current;
    if (!validRange || !target) {
      queueMicrotask(() => {
        if (active) setState({ texture: null, status: validRange ? 'error' : 'empty' });
      });
      return () => { active = false; };
    }

    const tileGrid = createXYZ({ maxZoom: zoom, tileSize });
    const northWest = tileGrid.getTileCoordExtent([zoom, minX, minY]);
    const southEast = tileGrid.getTileCoordExtent([zoom, maxX, maxY]);
    const extent = [northWest[0], southEast[1], southEast[2], northWest[3]];
    const resolution = Math.max(getWidth(extent) / width, getHeight(extent) / height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    const context = canvas.getContext('2d');
    if (!context) {
      queueMicrotask(() => { if (active) setState({ texture: null, status: 'error' }); });
      return () => { active = false; };
    }

    const startDeadline = () => {
      clearTimeout(renderDeadline);
      renderDeadline = setTimeout(() => {
        if (!active) return;
        pending.forEach(request => request.abort());
        setState(previous => ({ ...previous, status: 'error' }));
      }, RENDER_TIMEOUT_MS);
    };
    clearDeadlineRef.current = () => clearTimeout(renderDeadline);

    // 2D와 같은 소스를 사용하고, 3D 해제·재시도 시 진행 중인 PBF 요청을 취소한다.
    source.setTileLoadFunction((rawTile, url) => {
      if (!(rawTile instanceof VectorTile)) return;
      const tile = rawTile;
      tile.setLoader((tileExtent, _resolution, projection) => {
        const request = new AbortController();
        const requestGeneration = generation;
        const timeout = setTimeout(() => request.abort(), TILE_LOAD_TIMEOUT_MS);
        pending.add(request);
        void (async () => {
          try {
            const response = await fetch(url, { signal: request.signal });
            if (!response.ok) throw new Error('Vector map tile request failed');
            const data = await response.arrayBuffer();
            if (!active || requestGeneration !== generation || request.signal.aborted) return;
            const features = tile.getFormat().readFeatures(data, {
              extent: tileExtent,
              featureProjection: projection,
            });
            loadedTileCount += 1;
            tile.setFeatures(features);
          } catch {
            if (active && requestGeneration === generation) tile.onError();
          } finally {
            clearTimeout(timeout);
            pending.delete(request);
          }
        })();
      });
    });

    const baseStyle = createTransportMapStyle();
    const layer = new VectorTileLayer({
      source,
      background: mapPalette.land,
      declutter: true,
      renderMode: 'vector',
      style: (feature, featureResolution) => {
        const styles = baseStyle(feature, featureResolution);
        const geometry = feature.getGeometry();
        if (styles && geometry && intersects(geometry.getExtent(), extent)) hasVisibleFeatures = true;
        return styles;
      },
    });
    const map = new Map({
      target,
      layers: [layer],
      controls: [],
      interactions: [],
      pixelRatio,
      view: new View({
        projection: 'EPSG:3857',
        center: getCenter(extent),
        resolution,
        constrainResolution: false,
        enableRotation: false,
      }),
    });
    mapRef.current = map;
    map.setSize([width, height]);

    const capture = () => {
      if (!active || basemapStatusRef.current !== 'ready' || pending.size || !loadedTileCount) return;
      clearTimeout(renderDeadline);
      if (!hasVisibleFeatures) {
        setState(previous => ({ ...previous, status: 'empty' }));
        return;
      }
      try {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = 1;
        context.fillStyle = mapPalette.land;
        context.fillRect(0, 0, canvas.width, canvas.height);
        const layers = target.querySelectorAll<HTMLCanvasElement>('.ol-layer canvas');
        let paintedLayers = 0;
        layers.forEach(layerCanvas => {
          if (!layerCanvas.width || !layerCanvas.height) return;
          const opacity = layerCanvas.parentElement?.style.opacity || layerCanvas.style.opacity;
          context.globalAlpha = opacity ? Number(opacity) : 1;
          const transform = layerCanvas.style.transform;
          const matrix = transform ? new DOMMatrix(transform) : new DOMMatrix([
            width / layerCanvas.width, 0, 0, height / layerCanvas.height, 0, 0,
          ]);
          context.setTransform(
            matrix.a * pixelRatio, matrix.b * pixelRatio,
            matrix.c * pixelRatio, matrix.d * pixelRatio,
            matrix.e * pixelRatio, matrix.f * pixelRatio,
          );
          context.drawImage(layerCanvas, 0, 0);
          paintedLayers += 1;
        });
        if (!paintedLayers) throw new Error('Vector map canvas is empty');
        if (!generatedTexture) {
          generatedTexture = new CanvasTexture(canvas);
          generatedTexture.colorSpace = SRGBColorSpace;
          generatedTexture.anisotropy = 16;
        }
        generatedTexture.needsUpdate = true;
        const texture = generatedTexture;
        setState(previous => previous.texture === texture && previous.status === 'ready'
          ? previous : { texture, status: 'ready' });
      } catch {
        setState(previous => ({ ...previous, status: 'error' }));
      }
    };
    const renderListener = map.on('rendercomplete', capture);
    resetRef.current = () => {
      generation += 1;
      pending.forEach(request => request.abort());
      pending.clear();
      loadedTileCount = 0;
      hasVisibleFeatures = false;
      basemapStatusRef.current = 'loading';
      setState(previous => ({ ...previous, status: 'loading' }));
      startDeadline();
    };
    startDeadline();
    queueMicrotask(() => {
      if (!active) return;
      setState({ texture: null, status: 'loading' });
      map.render();
    });
    void document.fonts.ready.then(() => { if (active) map.render(); });

    return () => {
      active = false;
      generation += 1;
      clearTimeout(renderDeadline);
      resetRef.current = () => {};
      clearDeadlineRef.current = () => {};
      pending.forEach(request => request.abort());
      pending.clear();
      unByKey(renderListener);
      mapRef.current = null;
      map.setTarget(undefined);
      map.dispose();
      layer.dispose();
      source.clear();
      generatedTexture?.dispose();
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [source, zoom, tileSize, minX, maxX, minY, maxY, width, height, pixelRatio, validRange]);

  return {
    ...state,
    status: validRange ? state.status : 'empty' as const,
    retry,
    surfaceRef,
    surfaceSize: { width, height },
  };
}
