import { CCTV_MOCK_LATENCY_MS } from '@/constants/cctv-monitoring';
import { DUMMY_CCTV_CAMERAS } from '@/data/dummy-cctv-monitoring';
import { DEMO_CAMERA_VIDEO, DEMO_FACTORY_IMAGE } from '@/data/exhibition-inspection';
import type { CctvMonitoringSnapshot } from '@/types/cctv-monitoring';

let revision = 0;

export function createCctvDemoSnapshot(): CctvMonitoringSnapshot {
  const generatedAt = new Date().toISOString();
  revision += 1;
  return {
    generatedAt, revision,
    cameras: DUMMY_CCTV_CAMERAS.map(camera => ({
      ...camera,
      status: 'online',
      ipAddress: null,
      thumbnailUrl: DEMO_FACTORY_IMAGE,
      thumbnailVersion: revision,
      thumbnailUpdatedAt: generatedAt,
      lastSeenAt: generatedAt,
      stream: { transport: 'local', path: DEMO_CAMERA_VIDEO },
    })),
  };
}

/** 기존 비동기 상태 계약은 유지하면서 전시 자료를 메모리에서 읽는다. */
export async function fetchCctvMonitoringSnapshot(signal?: AbortSignal): Promise<CctvMonitoringSnapshot> {
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('취소됨', 'AbortError')); return; }
    const onAbort = () => { clearTimeout(timer); reject(new DOMException('취소됨', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, CCTV_MOCK_LATENCY_MS);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
  return createCctvDemoSnapshot();
}
