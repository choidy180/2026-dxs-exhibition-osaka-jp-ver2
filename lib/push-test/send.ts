import type { PushTestConfig } from './config';
import type { PushPayload } from './store';
import { validatePushTarget, type ValidatedPushTarget } from './validation';

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
  validatePushTarget(subscription);
  void payload;
  void config;
  // Local exhibition simulation: never deliver to an external device.
}
