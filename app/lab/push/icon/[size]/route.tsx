import { ImageResponse } from 'next/og';
import { Cctv } from 'lucide-react';
import { isPushTestEnabled } from '@/lib/push-test/config';
import { color } from '@/styles/design-tokens';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ size: string }> }) {
  const { size: requestedSize } = await context.params;
  if (!isPushTestEnabled() || !['180', '192', '512'].includes(requestedSize)) {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const size = Number(requestedSize);
  return new ImageResponse(
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill={color.surface} />
      <Cctv x="128" y="128" width="256" height="256" color={color.brand} strokeWidth={1.5} />
    </svg>,
    { width: size, height: size, headers: { 'Cache-Control': 'no-store' } },
  );
}
