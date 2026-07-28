import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAMERA_RECHECK_INTERVAL_MS,
  DEFAULT_STREAM_HOSTS,
  MAX_CAMERA_COUNT,
  PORT
} from '@/constants/material-monitoring';

export type CameraHost = string | null;

const EMPTY_CAMERA_HOSTS: CameraHost[] = Array.from(
  { length: MAX_CAMERA_COUNT },
  () => null
);

export function useCameraHosts() {
  const [hosts, setHosts] = useState<CameraHost[]>(EMPTY_CAMERA_HOSTS);
  const [isScanning, setIsScanning] = useState(true);
  const [scanMessage, setScanMessage] = useState('');
  const isScanningRef = useRef(false);

  // 설정된 순서를 CAM 01~06에 그대로 매핑해 각 카메라의 연결 상태를 확인한다.
  const scan = useCallback(async () => {
    if (isScanningRef.current) return;

    const candidates = DEFAULT_STREAM_HOSTS.split(',')
      .map(ip => ip.trim())
      .slice(0, MAX_CAMERA_COUNT);

    if (!candidates.some(Boolean)) {
      setHosts(EMPTY_CAMERA_HOSTS);
      setScanMessage('IP를 입력해주세요.');
      setIsScanning(false);
      return;
    }

    isScanningRef.current = true;
    setIsScanning(true);
    setScanMessage('카메라 신호를 찾는 중...');

    const checkConnection = async (ip: string): Promise<CameraHost> => {
      if (!ip) return null;

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 2000);

      try {
        await fetch(`http://${ip}:${PORT}/`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
        return ip;
      } catch (error) {
        console.log(`Failed to connect to ${ip}`, error);
        return null;
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    try {
      const checkedHosts = await Promise.all(candidates.map(checkConnection));
      const nextHosts = Array.from(
        { length: MAX_CAMERA_COUNT },
        (_, index) => checkedHosts[index] ?? null
      );
      const connectedCount = nextHosts.filter(Boolean).length;

      setHosts(nextHosts);
      setScanMessage(
        connectedCount
          ? `${connectedCount}개 카메라 연결됨`
          : '연결 가능한 카메라가 없습니다.'
      );
    } finally {
      isScanningRef.current = false;
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    void scan();

    const intervalId = window.setInterval(() => {
      void scan();
    }, CAMERA_RECHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [scan]);

  return {
    hosts,
    connectedIp: hosts.find((host): host is string => Boolean(host)) ?? null,
    isScanning,
    scanMessage,
    retry: scan
  };
}
