import { NextRequest, NextResponse } from 'next/server';
import { handlePushTest } from '@/lib/push-test/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 기존 URL을 유지하면서 Hobby 배포의 서버 함수 수를 줄인다.
export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  switch (action) {
    case 'login':
    case 'status':
    case 'subscribe':
    case 'schedule':
    case 'unsubscribe':
      return handlePushTest(action, request);
    default:
      return NextResponse.json(
        { error: '요청한 API를 찾을 수 없습니다.', code: 'NOT_FOUND' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
  }
}
