import { NextResponse } from 'next/server';
import { createDemoAdvisorReply } from '@/data/demo-advisor';
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ ok: true, answer: createDemoAdvisorReply(String(body.message ?? '')).answer });
}
