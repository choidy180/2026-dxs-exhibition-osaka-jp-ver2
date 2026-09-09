'use client';

import { useCallback, useEffect, useState } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { getTransportTileUrl } from '@/constants/transport-basemap';
import { color } from '@/styles/design-tokens';

const TILE_LOAD_TIMEOUT_MS = 15_000;

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

export function useTransportMapTexture({
  zoom,
  tileSize,
  minX,
  maxX,
  minY,
  maxY,
}: TransportMapTileRange) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<TransportMapTextureState>({ texture: null, status: 'loading' });

  const retry = useCallback(() => {
    setState({ texture: null, status: 'loading' });
    setAttempt(previous => previous + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let generatedTexture: CanvasTexture | null = null;
    const cancelPending = new Set<() => void>();

    const loadTexture = async () => {
      if (!active) return;
      const columnCount = maxX - minX + 1;
      const rowCount = maxY - minY + 1;
      if (columnCount <= 0 || rowCount <= 0) {
        setState({ texture: null, status: 'empty' });
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = columnCount * tileSize;
      canvas.height = rowCount * tileSize;
      const context = canvas.getContext('2d');
      if (!context) {
        setState({ texture: null, status: 'error' });
        return;
      }
      context.fillStyle = color.surfaceSubtle;
      context.fillRect(0, 0, canvas.width, canvas.height);

      const jobs: Promise<boolean>[] = [];
      for (let tileY = minY; tileY <= maxY; tileY += 1) {
        for (let tileX = minX; tileX <= maxX; tileX += 1) {
          jobs.push(new Promise(resolve => {
            const image = new Image();
            let settled = false;
            const finish = (loaded: boolean) => {
              if (settled) return;
              settled = true;
              clearTimeout(timeout);
              image.onload = null;
              image.onerror = null;
              cancelPending.delete(cancel);
              if (!loaded) image.removeAttribute('src');
              resolve(loaded);
            };
            const cancel = () => finish(false);
            const timeout = setTimeout(cancel, TILE_LOAD_TIMEOUT_MS);
            cancelPending.add(cancel);
            image.crossOrigin = 'anonymous';
            image.referrerPolicy = 'origin-when-cross-origin';
            image.onload = () => {
              if (!active || settled) return;
              try {
                context.save();
                try {
                  // 배경 타일만 차분하게 낮추고 별도로 그리는 차량과 경로 색상은 유지한다.
                  context.filter = 'saturate(0.16) brightness(1.05) contrast(0.94)';
                  context.drawImage(image, (tileX - minX) * tileSize, (tileY - minY) * tileSize, tileSize, tileSize);
                } finally {
                  context.restore();
                }
                finish(true);
              } catch {
                finish(false);
              }
            };
            image.onerror = cancel;
            // 현재 지도 범위만 요청하며 URL을 바꾸지 않아 브라우저 HTTP 캐시를 그대로 사용한다.
            image.src = getTransportTileUrl(zoom, tileX, tileY);
          }));
        }
      }

      const results = await Promise.all(jobs);
      if (!active) return;
      const loadedCount = results.filter(Boolean).length;
      if (loadedCount > 0) {
        generatedTexture = new CanvasTexture(canvas);
        generatedTexture.colorSpace = SRGBColorSpace;
        generatedTexture.anisotropy = 8;
        generatedTexture.needsUpdate = true;
      }
      // 한 장이라도 빠지면 완료로 표시하지 않고 성공한 부분과 재시도 안내를 함께 보여준다.
      setState({ texture: generatedTexture, status: loadedCount === jobs.length ? 'ready' : 'error' });
    };

    // Strict Mode의 첫 effect 정리 후에는 화면에 쓰이지 않을 타일을 요청하지 않는다.
    queueMicrotask(() => {
      void loadTexture().catch(() => {
        if (!active) return;
        cancelPending.forEach(cancel => cancel());
        setState({ texture: null, status: 'error' });
      });
    });

    return () => {
      active = false;
      cancelPending.forEach(cancel => cancel());
      cancelPending.clear();
      generatedTexture?.dispose();
    };
  }, [attempt, zoom, tileSize, minX, maxX, minY, maxY]);

  return { ...state, retry };
}
