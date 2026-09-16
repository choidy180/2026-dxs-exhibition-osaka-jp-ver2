import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { PushTestConfig } from '../../lib/push-test/config';
import { PushDeliveryError } from '../../lib/push-test/send';
import { openPushTestStore, PUSH_TEST_DELAY_MS } from '../../lib/push-test/store';
import { processNextPushJob } from '../../lib/push-test/worker';
import { PushTestError, type ValidatedPushTarget } from '../../lib/push-test/validation';
import { androidSubscription } from './fcm-fixtures';

const config: PushTestConfig = { origin: 'https://push.example.test', dbPath: ':memory:',
  vapidPublicKey: '', vapidPrivateKey: '', vapidSubject: 'mailto:push@example.test' };

test('기존 Web Push rows를 보존한 DB에 Android 기기·예약을 저장하고 재시작 후 한 번 처리한다', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'dxs-push-native-store-'));
  const dbPath = join(directory, 'queue.sqlite');
  let now = 1_000_000;
  let store = openPushTestStore(dbPath, () => now);
  try {
    const key = createECDH('prime256v1'); key.generateKeys();
    const web = { endpoint: 'https://fcm.googleapis.com/fcm/send/existing-web-device', expirationTime: null,
      keys: { p256dh: key.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
    store.registerSubscription('web-owner', web);
    store.registerSubscription('android-owner', androidSubscription);
    store.workerHeartbeat('worker');
    const job = store.scheduleTestPush('android-owner', androidSubscription.endpoint);
    assert.equal(job.job.dueAt - job.job.createdAt, 30_000);
    assert.equal(store.scheduleTestPush('android-owner', androidSubscription.endpoint).job.id, job.job.id);
    assert.throws(() => store.registerSubscription('another-owner', androidSubscription),
      (error: unknown) => error instanceof PushTestError && error.code === 'SUBSCRIPTION_OWNED');
    assert.throws(() => store.scheduleTestPush('another-owner', androidSubscription.endpoint));
    assert.equal(store.getDeviceStatus('another-owner', androidSubscription.endpoint).registered, false);
    assert.deepEqual(store.unsubscribeDevice('another-owner'), { removed: false, cancelled: 0 });
    store.close();
    store = openPushTestStore(dbPath, () => now);
    assert.deepEqual(store.getSubscription('web-owner', web.endpoint), web);
    assert.deepEqual(store.getSubscription('android-owner', androidSubscription.endpoint), androidSubscription);
    assert.equal(store.getDeviceStatus('android-owner', androidSubscription.endpoint).pending?.id, job.job.id);
    now += PUSH_TEST_DELAY_MS;
    let attempts = 0;
    const transport = async (subscription: ValidatedPushTarget) => {
      attempts += 1;
      assert.deepEqual(subscription, androidSubscription);
    };
    assert.equal(await processNextPushJob(store, 'worker', config, transport), true);
    assert.equal(await processNextPushJob(store, 'worker', config, transport), false);
    assert.equal(attempts, 1);
    assert.equal(store.getDeviceStatus('android-owner', androidSubscription.endpoint).lastJob?.status, 'sent');
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('Android 토큰 갱신·알림 끄기는 현재 기기의 기존 미발송 예약만 취소한다', () => {
  let now = 1_000_000;
  const store = openPushTestStore(':memory:', () => now);
  try {
    store.registerSubscription('owner', androidSubscription);
    store.workerHeartbeat('worker');
    store.scheduleTestPush('owner', androidSubscription.endpoint);
    const replacement = { platform: 'android', token: `${androidSubscription.token}-new` };
    const registered = store.registerSubscription('owner', replacement);
    assert.equal(store.getDeviceStatus('owner', androidSubscription.endpoint).lastJob?.status, 'cancelled');
    store.scheduleTestPush('owner', registered.endpoint);
    assert.deepEqual(store.unsubscribeDevice('owner'), { removed: true, cancelled: 1 });
    now += PUSH_TEST_DELAY_MS;
    assert.equal(store.claimDueJob('worker'), null);
  } finally { store.close(); }
});

test('FCM 일반404는 구독을 유지하고 명시적 UNREGISTERED만 제거한다', async () => {
  for (const invalidSubscription of [false, true]) {
    let now = 1_000_000;
    const store = openPushTestStore(':memory:', () => now);
    try {
      store.registerSubscription('owner', androidSubscription);
      store.workerHeartbeat('worker');
      store.scheduleTestPush('owner', androidSubscription.endpoint);
      now += PUSH_TEST_DELAY_MS;
      await processNextPushJob(store, 'worker', config, async () => {
        throw new PushDeliveryError(404, false, invalidSubscription ? 'FCM_UNREGISTERED' : 'FCM_HTTP_404', invalidSubscription);
      });
      const status = store.getDeviceStatus('owner', androidSubscription.endpoint);
      assert.equal(status.registered, !invalidSubscription);
      assert.equal(status.lastJob?.status, 'failed');
    } finally { store.close(); }
  }
});
