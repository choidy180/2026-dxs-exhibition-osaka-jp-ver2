import { sign } from 'node:crypto';
import { request } from 'node:https';
import { getFcmConfig, type FcmConfig } from './config';
import { PUSH_TRANSPORT_TIMEOUT_MS, PushDeliveryError } from './send';
import type { PushPayload } from './store';
import { validateFcmToken, type ValidatedAndroidSubscription } from './validation';

const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const RESPONSE_LIMIT_BYTES = 65_536;

export interface FcmHttpResult { status: number; body: unknown }
export type FcmHttpRequest = (
  url: string,
  options: { headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<FcmHttpResult>;

/** 리다이렉트 없이 고정된 Google API에만 사용하고 원문 응답은 로그에 남기지 않는다. */
const postGoogle: FcmHttpRequest = (url, options) => new Promise((resolve, reject) => {
  const outgoing = request(url, {
    method: 'POST', headers: options.headers, signal: options.signal,
  }, response => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    response.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > RESPONSE_LIMIT_BYTES) {
        outgoing.destroy(new Error('FCM_RESPONSE_LIMIT'));
        return;
      }
      chunks.push(chunk);
    });
    response.on('error', () => reject(new Error('FCM_RESPONSE_FAILED')));
    response.on('end', () => {
      let body: unknown = null;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* 오류 원문은 반환하지 않는다. */ }
      resolve({ status: response.statusCode ?? 0, body });
    });
  });
  outgoing.on('error', () => reject(new Error('FCM_REQUEST_FAILED')));
  outgoing.end(options.body);
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function fcmErrorCode(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body.error) || !Array.isArray(body.error.details)) return null;
  const allowed = new Set(['UNREGISTERED', 'INVALID_ARGUMENT', 'SENDER_ID_MISMATCH', 'QUOTA_EXCEEDED',
    'UNAVAILABLE', 'INTERNAL', 'THIRD_PARTY_AUTH_ERROR', 'UNSPECIFIED_ERROR']);
  for (const detail of body.error.details) {
    if (isRecord(detail) && detail['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError'
      && typeof detail.errorCode === 'string' && allowed.has(detail.errorCode)) return detail.errorCode;
  }
  return null;
}

export function buildAndroidFcmMessage(token: string, payload: PushPayload) {
  return {
    message: {
      token: validateFcmToken(token),
      // notification 필드가 있어야 앱이 닫혀 있어도 FCM SDK가 시스템 알림을 표시한다.
      notification: { title: payload.title, body: payload.body },
      data: { url: '/lab/push', tag: payload.tag, title: payload.title, body: payload.body },
      android: {
        priority: 'HIGH',
        ttl: '300s',
        notification: { channel_id: 'push_test', icon: 'ic_gomotec_notification', tag: payload.tag, default_sound: true },
      },
    },
  };
}

/** 자격증명별 단기 OAuth 토큰만 메모리에 보관하며 알림 요청은 자동 재시도하지 않는다. */
export function createFcmSender({
  httpRequest = postGoogle,
  now = Date.now,
  timeoutMs = PUSH_TRANSPORT_TIMEOUT_MS,
}: { httpRequest?: FcmHttpRequest; now?: () => number; timeoutMs?: number } = {}) {
  const tokens = new Map<string, { token: string; expiresAt: number }>();

  async function accessToken(config: FcmConfig, signal: AbortSignal): Promise<string> {
    const cached = tokens.get(config.cacheKey);
    if (cached && cached.expiresAt > now() + 60_000) return cached.token;
    const issuedAt = Math.floor(now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: config.privateKeyId })).toString('base64url');
    const claims = Buffer.from(JSON.stringify({
      iss: config.clientEmail, scope: FCM_SCOPE, aud: OAUTH_URL, iat: issuedAt, exp: issuedAt + 3600,
    })).toString('base64url');
    const unsigned = `${header}.${claims}`;
    const assertion = `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), config.privateKey).toString('base64url')}`;
    let response: FcmHttpResult;
    try {
      response = await httpRequest(OAUTH_URL, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
        signal,
      });
    } catch {
      // OAuth 실패 단계에서는 기기에 보내는 FCM 요청을 아직 하지 않았다.
      throw new PushDeliveryError(null, false, 'FCM_AUTH_UNAVAILABLE', false);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new PushDeliveryError(response.status || null, false, 'FCM_AUTH_FAILED', false);
    }
    const value = response.body;
    if (!isRecord(value) || typeof value.access_token !== 'string' || !/^[\x21-\x7E]{1,8192}$/.test(value.access_token)
      || typeof value.token_type !== 'string' || value.token_type.toLowerCase() !== 'bearer'
      || typeof value.expires_in !== 'number' || !Number.isInteger(value.expires_in)
      || value.expires_in < 60 || value.expires_in > 3600) {
      throw new PushDeliveryError(null, false, 'FCM_AUTH_RESPONSE', false);
    }
    for (const [key, token] of tokens) if (token.expiresAt <= now()) tokens.delete(key);
    if (tokens.size >= 4) tokens.delete(tokens.keys().next().value as string);
    tokens.set(config.cacheKey, { token: value.access_token, expiresAt: now() + value.expires_in * 1000 });
    return value.access_token;
  }

  return async function sendAndroidPushNotification(
    subscription: ValidatedAndroidSubscription,
    payload: PushPayload,
    config: FcmConfig = getFcmConfig(),
  ): Promise<void> {
    const body = JSON.stringify(buildAndroidFcmMessage(subscription.token, payload));
    const controller = new AbortController();
    // OAuth 발급과 FCM 요청을 합친 전체 제한이다. 예약 타이머로 사용하지 않는다.
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const token = await accessToken(config, controller.signal);
      if (controller.signal.aborted) throw new PushDeliveryError(null, false, 'FCM_AUTH_UNAVAILABLE', false);
      let response: FcmHttpResult;
      try {
        response = await httpRequest(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
          headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${token}` },
          body, signal: controller.signal,
        });
      } catch {
        throw new PushDeliveryError(null, true, 'FCM_TRANSPORT_UNKNOWN', false);
      }
      if (response.status >= 200 && response.status < 300) return;
      if (response.status === 401) tokens.delete(config.cacheKey);
      const code = fcmErrorCode(response.body);
      throw new PushDeliveryError(response.status || null, response.status === 0,
        code ? `FCM_${code}` : response.status ? `FCM_HTTP_${response.status}` : 'FCM_TRANSPORT_UNKNOWN',
        code === 'UNREGISTERED');
    } finally { clearTimeout(timeout); }
  };
}

export const sendAndroidPushNotification = createFcmSender();
