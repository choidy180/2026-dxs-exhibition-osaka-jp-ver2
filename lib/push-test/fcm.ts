import type { FcmConfig } from './config';
import type { PushPayload } from './store';
import { validateFcmToken, type ValidatedAndroidSubscription } from './validation';

/** 이전 테스트 및 호출부의 타입 계약만 유지한다. */
export interface FcmHttpResult { status: number; body: unknown }
export type FcmHttpRequest = (
  url: string,
  options: { headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<FcmHttpResult>;

export function buildAndroidFcmMessage(token: string, payload: PushPayload) {
  return {
    message: {
      token: validateFcmToken(token),
      // 기존 알림 미리보기와 테스트가 사용하는 데이터 구조만 보존한다.
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


/** 전시판에서는 자격증명을 읽거나 외부 기기로 발송하지 않는다. */
export function createFcmSender(options: {
  httpRequest?: FcmHttpRequest; now?: () => number; timeoutMs?: number;
} = {}) {
  void options;
  return async function simulateAndroidPushNotification(
    subscription: ValidatedAndroidSubscription,
    payload: PushPayload,
    config?: FcmConfig,
  ): Promise<void> {
    void config;
    buildAndroidFcmMessage(subscription.token, payload);
  };
}

export const sendAndroidPushNotification = createFcmSender();
