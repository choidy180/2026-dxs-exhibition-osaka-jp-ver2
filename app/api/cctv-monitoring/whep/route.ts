import { NextResponse } from 'next/server';
import { CCTV_WHEP_REQUEST_TIMEOUT_MS } from '@/constants/cctv-monitoring';
import {
  resolveCctvWhepSessionUrl,
  resolveCctvWhepUrl,
} from '@/utils/cctv-monitoring-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** 브라우저가 세션 종료에 쓸 수 있도록 자원 주소를 이 헤더로 돌려준다 */
const RESOURCE_HEADER = 'x-whep-resource';

/**
 * WHEP 신호 교환(SDP Offer → Answer)을 중계한다.
 *
 * 영상 자체는 WebRTC 로 브라우저와 카메라 서버가 직접 주고받고,
 * 여기서는 최초 신호 교환만 대신해 CORS 와 혼합 콘텐츠 문제를 없앤다.
 */
export async function POST(request: Request) {
  try {
    const streamPath = new URL(request.url).searchParams.get('path')?.trim();
    if (!streamPath) {
      return NextResponse.json(
        { message: '스트림 경로가 필요합니다.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const offerSdp = await request.text();
    if (!offerSdp.trim()) {
      return NextResponse.json(
        { message: 'SDP 오퍼가 비어 있습니다.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const upstreamUrl = resolveCctvWhepUrl(streamPath);
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/sdp', Accept: 'application/sdp' },
      body: offerSdp,
      signal: AbortSignal.timeout(CCTV_WHEP_REQUEST_TIMEOUT_MS),
    });

    const answerSdp = await response.text();

    if (!response.ok || !answerSdp.trim()) {
      throw new Error(`CCTV WHEP upstream responded with ${response.status}`);
    }

    // 세션 자원 주소는 절대 주소로 만들어 돌려준다 (종료 요청에 사용)
    const location = response.headers.get('location');
    const resourceUrl = location ? new URL(location, upstreamUrl).toString() : '';

    return new NextResponse(answerSdp, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/sdp',
        [RESOURCE_HEADER]: resourceUrl,
        'Access-Control-Expose-Headers': RESOURCE_HEADER,
      },
    });
  } catch (error) {
    console.error('[api/cctv-monitoring/whep] WHEP 신호 교환 실패', error);
    return NextResponse.json(
      { message: '실시간 영상 서버와 연결하지 못했습니다.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

/** 재생을 끝낼 때 WHEP 세션을 정리한다. 실패해도 화면 동작에는 영향이 없다. */
export async function DELETE(request: Request) {
  try {
    const resource = new URL(request.url).searchParams.get('resource')?.trim();
    if (!resource) {
      return NextResponse.json(
        { message: '세션 자원 주소가 필요합니다.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    await fetch(resolveCctvWhepSessionUrl(resource), {
      method: 'DELETE',
      cache: 'no-store',
      signal: AbortSignal.timeout(CCTV_WHEP_REQUEST_TIMEOUT_MS),
    });

    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[api/cctv-monitoring/whep] WHEP 세션 종료 실패', error);
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }
}
