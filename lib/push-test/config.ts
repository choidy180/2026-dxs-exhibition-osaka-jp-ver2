import { createECDH, createHash, createPrivateKey, timingSafeEqual, type KeyObject } from 'node:crypto';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { decodeBase64Url, PushTestError } from './validation';

export interface PushTestConfig {
  origin: string;
  dbPath: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
}

export interface FcmConfig {
  projectId: string;
  clientEmail: string;
  privateKeyId: string;
  privateKey: KeyObject;
  cacheKey: string;
}

/** FCM 구성 오류가 기존 Web Push 설정과 발송에 영향을 주지 않도록 별도로 읽는다. */
export function getFcmConfig(): FcmConfig {
  try {
    const raw = process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON ?? '';
    if (!raw || Buffer.byteLength(raw) > 32_768) throw new Error('Invalid credentials');
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.type !== 'service_account'
      || typeof value.project_id !== 'string' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value.project_id)
      || typeof value.client_email !== 'string'
      || !/^[a-z0-9-]+@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$/.test(value.client_email)
      || !value.client_email.endsWith(`@${value.project_id}.iam.gserviceaccount.com`)
      || typeof value.private_key_id !== 'string' || !/^[a-f0-9]{40}$/.test(value.private_key_id)
      || typeof value.private_key !== 'string'
      || (value.token_uri !== undefined && value.token_uri !== 'https://oauth2.googleapis.com/token')
      || (value.universe_domain !== undefined && value.universe_domain !== 'googleapis.com')) {
      throw new Error('Invalid credentials');
    }
    const privateKey = createPrivateKey(value.private_key);
    if (privateKey.asymmetricKeyType !== 'rsa' || (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
      throw new Error('Invalid signing key');
    }
    return {
      projectId: value.project_id, clientEmail: value.client_email, privateKeyId: value.private_key_id,
      privateKey, cacheKey: createHash('sha256').update(raw).digest('hex'),
    };
  } catch {
    throw new PushTestError('FCM_CONFIGURATION', 'Android 앱 알림 서버 설정이 없습니다. 관리자에게 FCM 서비스 계정 설정을 요청해주세요.', 503);
  }
}

export function isFcmReady(): boolean {
  try { getFcmConfig(); return true; } catch { return false; }
}

export function isPushTestEnabled(): boolean {
  return process.env.PUSH_TEST_ENABLED === 'true' && process.env.APP_ENV === 'test';
}

export function getPushTestConfig(): PushTestConfig {
  if (!isPushTestEnabled()) {
    throw new PushTestError('DISABLED', '푸시 테스트가 비활성화되어 있습니다.', 404);
  }
  try {
    const origin = new URL(process.env.PUSH_TEST_ORIGIN?.trim() || '');
    if (origin.protocol !== 'https:' || origin.username || origin.password
      || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Invalid origin');
    const vapidPublicKey = process.env.PUSH_TEST_VAPID_PUBLIC_KEY?.trim() || '';
    const vapidPrivateKey = process.env.PUSH_TEST_VAPID_PRIVATE_KEY?.trim() || '';
    const publicKey = decodeBase64Url(vapidPublicKey, 65);
    const privateKey = decodeBase64Url(vapidPrivateKey, 32);
    const keyPair = createECDH('prime256v1');
    keyPair.setPrivateKey(privateKey);
    if (!timingSafeEqual(keyPair.getPublicKey(), publicKey)) throw new Error('Mismatched keys');
    const vapidSubject = process.env.PUSH_TEST_VAPID_SUBJECT?.trim() || '';
    const subjectUrl = new URL(vapidSubject);
    if (!['mailto:', 'https:'].includes(subjectUrl.protocol) || subjectUrl.username || subjectUrl.password
      || (subjectUrl.protocol === 'mailto:' && !/^[^\s@]+@[^\s@]+$/.test(subjectUrl.pathname))) {
      throw new Error('Invalid subject');
    }
    const dbPath = resolve(process.env.PUSH_TEST_DB_PATH?.trim() || '.data/push-test.sqlite');
    const publicRelative = relative(resolve('public'), dbPath);
    if (!publicRelative || (!(publicRelative === '..' || publicRelative.startsWith(`..${sep}`)) && !isAbsolute(publicRelative))) {
      throw new Error('Public database path');
    }
    return { origin: origin.origin, dbPath, vapidPublicKey, vapidPrivateKey, vapidSubject };
  } catch {
    throw new PushTestError('CONFIGURATION', '푸시 테스트 서버 환경변수를 확인해 주세요.', 503);
  }
}
