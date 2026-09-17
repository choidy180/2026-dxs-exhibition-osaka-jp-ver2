import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { PushTestError } from './validation';

const SESSION_COOKIE = 'dxs_push_test_session';
const DEVICE_COOKIE = 'dxs_push_test_device';
const SESSION_SECONDS = 12 * 60 * 60;
const DEVICE_SECONDS = 180 * 24 * 60 * 60;

function secret(): string {
  const value = process.env.PUSH_TEST_SESSION_SECRET ?? '';
  if (Buffer.byteLength(value) < 32) {
    throw new PushTestError('AUTH_CONFIG', '테스트 인증 설정을 확인해주세요.', 503);
  }
  return value;
}

function sign(kind: string, value: object): string {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  const signature = createHmac('sha256', secret()).update(`${kind}.${payload}`).digest('base64url');
  return `${payload}.${signature}`;
}

function verify(kind: string, token: string | undefined): Record<string, unknown> | null {
  if (!token || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = createHmac('sha256', secret()).update(`${kind}.${payload}`).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch { return null; }
}

function accounts(): Record<string, string> {
  try {
    const parsed = JSON.parse(process.env.PUSH_TEST_USERS_JSON ?? '');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !Object.keys(parsed).length) throw new Error();
    for (const [id, hash] of Object.entries(parsed)) {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || typeof hash !== 'string' || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash)) throw new Error();
    }
    return parsed;
  } catch {
    throw new PushTestError('AUTH_CONFIG', '테스트 계정 설정을 확인해주세요.', 503);
  }
}

export function verifyTestPassword(userId: unknown, password: unknown): string | null {
  if (typeof userId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(userId) || typeof password !== 'string' || !password) return null;
  const users = accounts();
  const hash = Object.hasOwn(users, userId) ? users[userId] : undefined;
  // 없는 계정도 같은 비용으로 계산해 계정 존재 여부를 응답 시간으로 드러내지 않는다.
  const [salt, expected] = hash?.split(':') ?? ['0'.repeat(32), '0'.repeat(128)];
  const actual = scryptSync(password, salt, 64);
  return hash && timingSafeEqual(actual, Buffer.from(expected, 'hex')) ? userId : null;
}

export function issueTestSession(request: NextRequest, response: NextResponse, userId: string, origin: string): void {
  const existing = verify('device', request.cookies.get(DEVICE_COOKIE)?.value);
  const deviceId = typeof existing?.id === 'string' && /^[a-f0-9]{64}$/.test(existing.id)
    ? existing.id : randomBytes(32).toString('hex');
  const options = { httpOnly: true, secure: new URL(origin).protocol === 'https:', sameSite: 'strict' as const, path: '/api/push-test' };
  response.cookies.set(DEVICE_COOKIE, sign('device', { id: deviceId, expiresAt: Date.now() + DEVICE_SECONDS * 1000 }), { ...options, maxAge: DEVICE_SECONDS });
  response.cookies.set(SESSION_COOKIE, sign('session', { userId, deviceId, expiresAt: Date.now() + SESSION_SECONDS * 1000 }), { ...options, maxAge: SESSION_SECONDS });
}

export function requireTestOwner(request: NextRequest): string {
  const session = verify('session', request.cookies.get(SESSION_COOKIE)?.value);
  const device = verify('device', request.cookies.get(DEVICE_COOKIE)?.value);
  if (!session || !device || typeof session.userId !== 'string' || session.deviceId !== device.id || !Object.hasOwn(accounts(), session.userId)) {
    throw new PushTestError('AUTH_REQUIRED', '테스트 계정으로 로그인해주세요.', 401);
  }
  // 클라이언트가 보낸 사용자/기기 ID 대신 서명된 세션의 두 값을 함께 묶는다.
  return createHash('sha256').update(JSON.stringify([session.userId, device.id])).digest('hex');
}

export function loginRateLimitKey(userId: unknown): string {
  return createHmac('sha256', secret()).update(typeof userId === 'string' ? userId.slice(0, 64) : 'invalid').digest('hex');
}
