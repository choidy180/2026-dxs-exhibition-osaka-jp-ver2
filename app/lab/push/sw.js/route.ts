import { isPushTestEnabled } from '@/lib/push-test/config';
import { PUSH_TEST_SERVICE_WORKER } from '@/lib/push-test/service-worker';

export const dynamic = 'force-dynamic';

export function GET() {
  if (!isPushTestEnabled()) {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  return new Response(PUSH_TEST_SERVICE_WORKER, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'Service-Worker-Allowed': '/lab/push',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
