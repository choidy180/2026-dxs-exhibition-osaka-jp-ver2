import type { MetadataRoute } from 'next';
import { isPushTestEnabled } from '@/lib/push-test/config';
import { color } from '@/styles/design-tokens';

export const dynamic = 'force-dynamic';

export function GET() {
  if (!isPushTestEnabled()) {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const manifest: MetadataRoute.Manifest = {
    id: '/lab/push',
    name: '고모텍 CCTV',
    short_name: '고모텍 CCTV',
    description: '고모텍 CCTV 목록과 푸시 알림 테스트',
    start_url: '/lab/push',
    scope: '/lab/push',
    display: 'standalone',
    lang: 'ko-KR',
    background_color: color.pageBg,
    theme_color: color.surface,
    icons: [
      { src: '/lab/push/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/lab/push/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/lab/push/icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  return Response.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
