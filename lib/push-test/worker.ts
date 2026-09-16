import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { getPushTestConfig, isPushTestEnabled, type PushTestConfig } from './config';
import { openPushTestStore, type PushTestStore } from './store';
import { PushDeliveryError, sendPushNotification } from './send';
import { PushTestError } from './validation';

export async function processNextPushJob(
  store: PushTestStore,
  workerId: string,
  config: PushTestConfig,
  send: typeof sendPushNotification = sendPushNotification,
): Promise<boolean> {
  const job = store.claimDueJob(workerId);
  if (!job) return false;
  try {
    await send(job.subscription, job.payload, config);
    store.finishJob(job.id, 'sent');
  } catch (error) {
    if (error instanceof PushDeliveryError) {
      store.finishJob(job.id, error.uncertain ? 'unknown' : 'failed', error.code);
      if (error.removeSubscription) {
        store.unsubscribe(job.userId, job.subscription.endpoint);
      }
    } else {
      // 암호화나 로컬 검증 실패로 요청을 발송하지 못했다.
      store.finishJob(job.id, 'failed', error instanceof PushTestError && error.code === 'FCM_CONFIGURATION'
        ? 'FCM_CONFIGURATION' : 'INVALID_PUSH_CONFIGURATION');
    }
  }
  return true;
}

/** 상시 실행 전용 프로세스. API 요청 수명과 무관하게 SQLite 예약을 처리한다. */
export async function runPushTestWorker(signal: AbortSignal): Promise<void> {
  if (!isPushTestEnabled()) throw new PushTestError('DISABLED', '테스트 환경에서만 워커를 실행할 수 있습니다.', 404);
  const config = getPushTestConfig();
  const store = openPushTestStore(config.dbPath);
  const workerId = randomUUID();
  let heartbeatFailed = false;
  store.workerHeartbeat(workerId);
  store.markStaleSending();
  const heartbeat = setInterval(() => {
    try { store.workerHeartbeat(workerId); } catch { heartbeatFailed = true; }
  }, 1000);
  try {
    while (!signal.aborted && !heartbeatFailed) {
      // 전송 전에 시도를 저장하며 재시작하더라도 수신 여부가 불명확한 요청은 반복하지 않는다.
      const processed = await processNextPushJob(store, workerId, config);
      if (!processed) {
        try { await delay(1000, undefined, { signal }); } catch {
          if (!signal.aborted) throw new Error('Worker wait failed');
        }
      }
    }
    if (heartbeatFailed) throw new Error('Worker heartbeat failed');
  } finally {
    clearInterval(heartbeat);
    try { store.removeWorker(workerId); } finally { store.close(); }
  }
}
