'use client';

import { createRef, useCallback, useEffect, useState } from 'react';
import type { MaterialCameraPlayback } from '@/types/material-camera-video';
import { MAX_CAMERA_COUNT } from '@/constants/material-monitoring';
import { MATERIAL_CAMERA_RESET_MS, MATERIAL_CAMERA_VIDEOS } from '@/constants/material-camera-videos';

function pickVideo(occupied: (string | null)[]) {
  const candidates = MATERIAL_CAMERA_VIDEOS.filter(src => !occupied.includes(src));
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

export function useMaterialCameraVideos() {
  const [cameras, setCameras] = useState<MaterialCameraPlayback[]>(() =>
    Array.from({ length: MAX_CAMERA_COUNT }, () => ({
      src: null, resetUntil: null, remainingSeconds: 0, revision: 0,
      videoRef: createRef<HTMLVideoElement>(),
    })),
  );

  useEffect(() => {
    // 첫 선택은 브라우저에서만 실행해 서버 렌더링과 무작위 값이 달라지는 것을 방지한다.
    const initialTimer = window.setTimeout(() => setCameras(previous => {
      const occupied: (string | null)[] = [];
      return previous.map(camera => {
        const src = pickVideo(occupied);
        occupied.push(src);
        return { ...camera, src, revision: camera.revision + 1 };
      });
    }), 0);

    const timer = window.setInterval(() => setCameras(previous => {
      const now = Date.now();
      const occupied = previous.map(camera => camera.src);
      let changed = false;
      const next = previous.map((camera, index) => {
        if (camera.resetUntil === null) return camera;
        const remainingSeconds = Math.max(0, Math.ceil((camera.resetUntil - now) / 1000));
        if (remainingSeconds > 0) {
          if (remainingSeconds === camera.remainingSeconds) return camera;
          changed = true;
          return { ...camera, remainingSeconds };
        }
        changed = true;
        // 직전 영상과 다른 카메라의 현재 영상을 제외해 여섯 화면이 겹치지 않게 한다.
        const src = pickVideo(occupied);
        occupied[index] = src;
        return { ...camera, src, resetUntil: null, remainingSeconds: 0, revision: camera.revision + 1 };
      });
      return changed ? next : previous;
    }), 250);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  const finishVideo = useCallback((index: number, revision: number) => {
    setCameras(previous => previous.map((camera, position) => {
      if (position !== index || camera.revision !== revision || camera.resetUntil !== null) return camera;
      return { ...camera, resetUntil: Date.now() + MATERIAL_CAMERA_RESET_MS, remainingSeconds: MATERIAL_CAMERA_RESET_MS / 1000 };
    }));
  }, []);

  const retryVideo = useCallback((index: number) => {
    setCameras(previous => previous.map((camera, position) => position === index
      ? { ...camera, revision: camera.revision + 1 }
      : camera));
  }, []);

  return { cameras, finishVideo, retryVideo };
}
