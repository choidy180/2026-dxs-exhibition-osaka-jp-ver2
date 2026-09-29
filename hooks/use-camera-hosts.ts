'use client';

import { useCallback, useState } from 'react';
import { MAX_CAMERA_COUNT } from '@/constants/material-monitoring';

export type CameraHost = string | null;
const DEMO_HOSTS = Array.from({ length: MAX_CAMERA_COUNT }, (_, index) => `DEMO-CAM-${index + 1}`);

/** 전시 카메라는 로컬 영상으로 재생하므로 사내망 검색을 실행하지 않는다. */
export function useCameraHosts() {
  const [hosts, setHosts] = useState<CameraHost[]>(DEMO_HOSTS);
  const retry = useCallback(() => setHosts([...DEMO_HOSTS]), []);
  return {
    hosts, connectedIp: hosts[0] ?? null, isScanning: false,
    scanMessage: `${hosts.length}개 카메라 연결됨`, retry,
  };
}
