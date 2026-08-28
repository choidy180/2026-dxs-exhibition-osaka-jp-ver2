import { NextResponse } from 'next/server';
import {
  CCTV_MONITORING_UPSTREAM_TIMEOUT_MS,
  resolveCctvThumbnailUpstreamUrl,
} from '@/utils/cctv-monitoring-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** 허용된 카메라 썸네일만 동일 출처 이미지로 중계한다. */
export async function GET(request: Request) {
  try {
    const source = new URL(request.url).searchParams.get('source')?.trim();
    if (!source) {
      return NextResponse.json(
        { message: '썸네일 경로가 필요합니다.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const response = await fetch(resolveCctvThumbnailUpstreamUrl(source), {
      cache: 'no-store',
      headers: { Accept: 'image/*' },
      signal: AbortSignal.timeout(CCTV_MONITORING_UPSTREAM_TIMEOUT_MS),
    });

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    const contentLengthHeader = response.headers.get('content-length');
    const contentLength = contentLengthHeader === null ? null : Number(contentLengthHeader);
    if (
      !response.ok
      || !response.body
      || !contentType.startsWith('image/')
      || contentLength === 0
    ) {
      throw new Error(`CCTV thumbnail upstream response is invalid (${response.status})`);
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error('[api/cctv-monitoring/thumbnail] 썸네일 중계 실패', error);
    return NextResponse.json(
      { message: '썸네일을 불러오지 못했습니다.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
