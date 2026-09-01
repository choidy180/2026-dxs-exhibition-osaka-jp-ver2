import { NextResponse } from 'next/server';
import {
  CCTV_MONITORING_UPSTREAM_TIMEOUT_MS,
  fetchCctvCameraIpMap,
  getCctvMonitoringUpstreamUrl,
} from '@/utils/cctv-monitoring-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** CORS와 혼합 콘텐츠 문제 없이 사내 카메라 목록을 전달한다. */
export async function GET() {
  try {
    const response = await fetch(getCctvMonitoringUpstreamUrl(), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(CCTV_MONITORING_UPSTREAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`CCTV upstream responded with ${response.status}`);
    }

    const text = await response.text();
    let payload: unknown;

    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error('CCTV upstream response is not JSON');
    }

    if (!isRecord(payload) || !Array.isArray(payload.cameras)) {
      throw new Error('CCTV upstream response has an invalid shape');
    }

    // 목록 API 는 카메라 IP 를 주지 않으므로 영상 서버 설정에서 찾아 채운다
    const ipByPath = await fetchCctvCameraIpMap();
    const cameras = payload.cameras.map(camera => {
      if (!isRecord(camera) || camera.ip) return camera;

      const pathName = String(camera.webrtcPath ?? camera.streamPath ?? camera.id ?? '')
        .replace(/^\/+|\/+$/g, '')
        .replace(/\/whep$/, '');
      const ip = pathName ? ipByPath.get(pathName) : undefined;

      return ip ? { ...camera, ip } : camera;
    });

    return NextResponse.json(
      {
        ...payload,
        cameras,
        generatedAt: new Date().toISOString(),
        // 화면에서 IP 가 비어 보일 때 원인을 바로 확인할 수 있게 남긴다
        cameraIpSource: ipByPath.size > 0 ? 'mediamtx' : 'unavailable',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[api/cctv-monitoring] 카메라 목록 중계 실패', error);
    return NextResponse.json(
      { message: '카메라 목록을 불러오지 못했습니다.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
