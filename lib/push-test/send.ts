import { request } from 'node:https';
import webPush from 'web-push';
import type { PushTestConfig } from './config';
import type { PushPayload } from './store';
import { isAndroidPushSubscription, validatePushTarget, type ValidatedPushTarget } from './validation';

export const PUSH_TRANSPORT_TIMEOUT_MS = 10_000;

export class PushDeliveryError extends Error {
  constructor(
    public readonly statusCode: number | null,
    public readonly uncertain: boolean,
    public readonly code = statusCode === null ? 'TRANSPORT_UNKNOWN' : `PUSH_HTTP_${statusCode}`,
    public readonly removeSubscription = statusCode === 404 || statusCode === 410,
  ) {
    super(code);
    this.name = 'PushDeliveryError';
  }
}

/** 단일 기기에 완성된 알림 내용을 암호화해 발송한다. 실제 CCTV를 조회하지 않는다. */
export async function sendPushNotification(
  subscription: ValidatedPushTarget,
  payload: PushPayload,
  config: Pick<PushTestConfig, 'vapidPublicKey' | 'vapidPrivateKey' | 'vapidSubject'>,
): Promise<void> {
  const validated = validatePushTarget(subscription);
  if (isAndroidPushSubscription(validated)) {
    const { sendAndroidPushNotification } = await import('./fcm');
    await sendAndroidPushNotification(validated, payload);
    return;
  }
  const details = webPush.generateRequestDetails(validated, JSON.stringify(payload), {
    TTL: 300,
    urgency: 'high',
    contentEncoding: 'aes128gcm',
    vapidDetails: { subject: config.vapidSubject, publicKey: config.vapidPublicKey, privateKey: config.vapidPrivateKey },
  });

  // DNS/TLS를 포함한 전체 요청을 제한하고 제공자 리다이렉트는 따라가지 않는다.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PUSH_TRANSPORT_TIMEOUT_MS);
  try {
    await new Promise<void>((resolve, reject) => {
      const outgoing = request(details.endpoint, {
        method: details.method,
        headers: details.headers,
        signal: controller.signal,
      }, response => {
        response.on('error', () => reject(new PushDeliveryError(null, true)));
        response.on('end', () => {
          const status = response.statusCode ?? 0;
          if (status >= 200 && status < 300) resolve();
          else reject(new PushDeliveryError(status || null, status === 0));
        });
        response.resume();
      });
      outgoing.on('error', () => reject(new PushDeliveryError(null, true)));
      outgoing.end(details.body);
    });
  } finally {
    clearTimeout(timeout);
  }
}
