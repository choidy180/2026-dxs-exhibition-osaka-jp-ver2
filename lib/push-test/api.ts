import { NextRequest, NextResponse } from 'next/server';
import { getFcmConfig, getPushTestConfig, isFcmReady, isPushTestEnabled } from './config';
import { openPushTestStore } from './store';
import { isAndroidPushSubscription, PushTestError, validatePushTarget, validatePushTargetEndpoint } from './validation';
import { issueTestSession, loginRateLimitKey, requireTestOwner, verifyTestPassword } from './auth';

type Action = 'login' | 'status' | 'subscribe' | 'schedule' | 'unsubscribe';
const stores = new Map<string, ReturnType<typeof openPushTestStore>>();

async function readBody(request: NextRequest, origin: string): Promise<Record<string, unknown>> {
  if (request.headers.get('origin') !== origin) {
    throw new PushTestError('INVALID_ORIGIN', '같은 테스트 앱에서 다시 시도해주세요.', 403);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new PushTestError('INVALID_BODY', '요청 형식을 확인해주세요.', 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new PushTestError('INVALID_BODY', '요청 내용을 확인해주세요.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16_384) {
        await reader.cancel();
        throw new PushTestError('BODY_TOO_LARGE', '요청 내용이 너무 큽니다.', 413);
      }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch (error) {
    if (error instanceof PushTestError) throw error;
    throw new PushTestError('INVALID_BODY', '요청 내용을 확인해주세요.');
  } finally { reader.releaseLock(); }
}

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'Vary': 'Cookie, Origin' } });
}

export async function handlePushTest(action: Action, request: NextRequest): Promise<NextResponse> {
  if (!isPushTestEnabled()) return json({ error: '사용할 수 없는 테스트 기능입니다.', code: 'DISABLED' }, 404);
  try {
    const config = getPushTestConfig();
    const body = await readBody(request, config.origin);
    let store = stores.get(config.dbPath);
    if (!store) { store = openPushTestStore(config.dbPath); stores.set(config.dbPath, store); }

    if (action === 'login') {
      if (!store.consumeLoginAttempt('global', undefined, 100) || !store.consumeLoginAttempt(loginRateLimitKey(body.userId))) {
        throw new PushTestError('RATE_LIMITED', '로그인 시도가 많습니다. 15분 후 다시 시도해주세요.', 429);
      }
      const userId = verifyTestPassword(body.userId, body.password);
      if (!userId) throw new PushTestError('INVALID_LOGIN', '테스트 계정 또는 비밀번호를 확인해주세요.', 401);
      const response = json({ authenticated: true });
      issueTestSession(request, response, userId, config.origin);
      return response;
    }

    const owner = requireTestOwner(request);
    let endpoint = body.endpoint;
    if (action === 'subscribe') {
      const subscription = validatePushTarget(body.subscription);
      if (isAndroidPushSubscription(subscription)) getFcmConfig();
      endpoint = store.registerSubscription(owner, subscription).endpoint;
    }
    if (endpoint !== null && endpoint !== undefined && (typeof endpoint !== 'string' || endpoint.length > 4096)) {
      throw new PushTestError('INVALID_SUBSCRIPTION', '현재 기기 알림 등록을 다시 확인해주세요.');
    }
    const currentEndpoint = typeof endpoint === 'string' ? validatePushTargetEndpoint(endpoint) : null;
    if (action === 'schedule') {
      if (body.repeating !== undefined && typeof body.repeating !== 'boolean') {
        throw new PushTestError('INVALID_BODY', '알림 반복 설정을 확인해주세요.');
      }
      if (!currentEndpoint) throw new PushTestError('NOT_REGISTERED', '먼저 현재 기기의 알림을 켜주세요.', 409);
      if (currentEndpoint.startsWith('fcm:')) getFcmConfig();
      const { job } = store.scheduleTestPush(owner, currentEndpoint, body.repeating === true);
      return json({ pending: { id: job.id, dueAt: job.dueAt }, repeating: store.getDeviceStatus(owner, currentEndpoint).repeating });
    }
    if (action === 'unsubscribe') store.unsubscribeDevice(owner);
    return json({ ...store.getDeviceStatus(owner, currentEndpoint), publicKey: config.vapidPublicKey, fcmReady: isFcmReady() });
  } catch (error) {
    if (error instanceof PushTestError) return json({ error: error.message, code: error.code }, error.status);
    // 구독 endpoint, 키, 인증정보가 예외에 섞일 수 있어 원문을 기록하지 않는다.
    console.error('[push-test] request failed');
    return json({ error: '푸시 테스트 요청을 처리하지 못했습니다. 잠시 후 재시도해주세요.', code: 'INTERNAL' }, 500);
  }
}
