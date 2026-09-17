import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isPushTestEnabled } from '@/lib/push-test/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ size: string }> }) {
  const { size: requestedSize } = await context.params;
  if (!isPushTestEnabled() || !['180', '192', '512'].includes(requestedSize)) {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const icon = await readFile(join(process.cwd(), 'public', 'push-brand', `gomotec-${requestedSize}.png`));
  return new Response(new Uint8Array(icon), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
  });
}
