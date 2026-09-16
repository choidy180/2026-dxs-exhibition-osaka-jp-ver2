import type { NextRequest } from 'next/server';
import { handlePushTest } from '@/lib/push-test/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(request: NextRequest) {
  return handlePushTest('subscribe', request);
}
