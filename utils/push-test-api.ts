import type { PushTestScheduleResult, PushTestStatus } from '@/types/push-test';

export class PushTestApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message);
    this.name = 'PushTestApiError';
  }
}

async function request<T>(action: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`/api/push-test/${action}`, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(caught => {
      if (controller.signal.aborted) throw caught;
      return null;
    });
    if (!response.ok) {
      // 서버의 푸시 전용 API는 내부 오류 원문 대신 한국어 안내만 반환한다.
      throw new PushTestApiError(
        typeof data?.error === 'string' ? data.error : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
        response.status,
        typeof data?.code === 'string' ? data.code : 'REQUEST_FAILED',
      );
    }
    if (!data) throw new PushTestApiError('서버 응답을 확인하지 못했습니다. 다시 시도해주세요.', response.status, 'INVALID_RESPONSE');
    return data as T;
  } catch (caught) {
    if (caught instanceof PushTestApiError) throw caught;
    if (controller.signal.aborted) {
      throw new PushTestApiError('서버 응답 시간이 초과되었습니다. 재시도로 현재 등록·예약 상태를 확인해주세요.', 0, 'REQUEST_TIMEOUT');
    }
    throw new PushTestApiError('푸시 테스트 서버에 연결하지 못했습니다. 내부망 연결을 확인하고 다시 시도해주세요.', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

export const fetchPushTestStatus = (endpoint: string | null) => request<PushTestStatus>('status', { endpoint });
export const subscribePushTest = (subscription: PushSubscriptionJSON | { platform: 'android'; token: string }) => request<PushTestStatus>('subscribe', { subscription });
export const schedulePushTest = (endpoint: string) => request<PushTestScheduleResult>('schedule', { endpoint });
export const unsubscribePushTest = (endpoint: string | null) => request<PushTestStatus>('unsubscribe', { endpoint });
export const loginPushTest = (userId: string, password: string) => request<unknown>('login', { userId, password });
