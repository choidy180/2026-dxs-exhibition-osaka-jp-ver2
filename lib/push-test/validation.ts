import { ECDH } from 'node:crypto';

/** 사용자 오류에는 엔드포인트, 구독 키, 인증 정보를 포함하지 않는다. */
export class PushTestError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = 'PushTestError';
  }
}

export interface ValidatedPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

export interface ValidatedAndroidSubscription {
  platform: 'android';
  token: string;
  endpoint: string;
}

export type ValidatedPushTarget = ValidatedPushSubscription | ValidatedAndroidSubscription;

export function isAndroidPushSubscription(value: ValidatedPushTarget): value is ValidatedAndroidSubscription {
  return 'platform' in value && value.platform === 'android';
}

export function validateFcmToken(value: unknown): string {
  if (typeof value !== 'string' || value.length < 20 || value.length > 4092 || !/^[A-Za-z0-9:_-]+$/.test(value)) {
    throw new PushTestError('INVALID_FCM_TOKEN', 'Android 앱의 푸시 등록 정보를 다시 확인해주세요.');
  }
  return value;
}

/** 네이티브 토큰은 URL로 요청하지 않고 고정된 FCM API의 데이터로만 전달한다. */
export function validatePushTargetEndpoint(value: unknown): string {
  if (typeof value === 'string' && value.startsWith('fcm:')) return `fcm:${validateFcmToken(value.slice(4))}`;
  return validatePushEndpoint(value);
}

export function validatePushTarget(input: unknown): ValidatedPushTarget {
  if (input && typeof input === 'object' && !Array.isArray(input) && 'platform' in input) {
    const value = input as Record<string, unknown>;
    if (value.platform !== 'android') {
      throw new PushTestError('INVALID_PLATFORM', '지원하지 않는 앱의 푸시 등록입니다.');
    }
    const token = validateFcmToken(value.token);
    const endpoint = `fcm:${token}`;
    if (value.endpoint !== undefined && value.endpoint !== endpoint) {
      throw new PushTestError('INVALID_FCM_TOKEN', 'Android 앱의 푸시 등록 정보가 일치하지 않습니다.');
    }
    return { platform: 'android', token, endpoint };
  }
  return validatePushSubscription(input);
}

export function decodeBase64Url(value: unknown, length: number): Buffer {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new PushTestError('INVALID_KEY', '푸시 키 형식이 올바르지 않습니다.');
  }
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length !== length || decoded.toString('base64url') !== value) {
    throw new PushTestError('INVALID_KEY', '푸시 키 형식이 올바르지 않습니다.');
  }
  return decoded;
}

export function validatePushEndpoint(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4096) {
    throw new PushTestError('INVALID_ENDPOINT', '지원하지 않는 푸시 주소입니다.');
  }
  let url: URL;
  try { url = new URL(value); } catch {
    throw new PushTestError('INVALID_ENDPOINT', '지원하지 않는 푸시 주소입니다.');
  }
  const host = url.hostname.toLowerCase();
  const allowed = (host === 'fcm.googleapis.com' && url.pathname.startsWith('/fcm/send/') && url.pathname.length > '/fcm/send/'.length)
    || host === 'updates.push.services.mozilla.com'
    || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.push\.services\.mozilla\.com$/.test(host)
    || host === 'web.push.apple.com'
    || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.notify\.windows\.com$/.test(host);
  if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password
    || url.hash || url.pathname.length < 2 || value.trim() !== value) {
    throw new PushTestError('INVALID_ENDPOINT', '지원하지 않는 푸시 주소입니다.');
  }
  return url.href;
}

export function validatePushSubscription(input: unknown): ValidatedPushSubscription {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new PushTestError('INVALID_SUBSCRIPTION', '푸시 구독 정보가 올바르지 않습니다.');
  }
  const value = input as Record<string, unknown>;
  const endpoint = validatePushEndpoint(value.endpoint);
  if (!value.keys || typeof value.keys !== 'object' || Array.isArray(value.keys)) {
    throw new PushTestError('INVALID_KEY', '푸시 키 형식이 올바르지 않습니다.');
  }
  const keys = value.keys as Record<string, unknown>;
  const publicKey = decodeBase64Url(keys.p256dh, 65);
  decodeBase64Url(keys.auth, 16);
  try {
    if (publicKey[0] !== 4) throw new Error('Invalid point');
    ECDH.convertKey(publicKey, 'prime256v1');
  } catch {
    throw new PushTestError('INVALID_KEY', '푸시 공개키가 올바르지 않습니다.');
  }
  const expirationTime = value.expirationTime ?? null;
  if (expirationTime !== null && (typeof expirationTime !== 'number'
    || !Number.isFinite(expirationTime) || expirationTime <= Date.now())) {
    throw new PushTestError('EXPIRED_SUBSCRIPTION', '만료된 푸시 구독입니다. 알림을 다시 등록해 주세요.');
  }
  return {
    endpoint,
    expirationTime: expirationTime as number | null,
    keys: { p256dh: keys.p256dh as string, auth: keys.auth as string },
  };
}
