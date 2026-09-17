import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { openPushTestStore, PUSH_TEST_DELAY_MS, PUSH_TEST_REPEAT_INTERVAL_MS, SENDING_UNKNOWN_AFTER_MS } from '../../lib/push-test/store';
import { PushDeliveryError } from '../../lib/push-test/send';
import { processNextPushJob } from '../../lib/push-test/worker';
import { PushTestError, type ValidatedPushSubscription } from '../../lib/push-test/validation';
import type { PushTestConfig } from '../../lib/push-test/config';

function subscription(device = 'device-one'): ValidatedPushSubscription {
  const key = createECDH('prime256v1');
  key.generateKeys();
  return { endpoint: `https://fcm.googleapis.com/fcm/send/${device}`, expirationTime: null,
    keys: { p256dh: key.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
}

const config: PushTestConfig = { origin: 'https://push.example.test', dbPath: ':memory:',
  vapidPublicKey: '', vapidPrivateKey: '', vapidSubject: 'mailto:push@example.test' };

test('a reservation requires a live worker and another owner cannot inspect, schedule, delete or acquire it', () => {
  let now = 1_000_000;
  const store = openPushTestStore(':memory:', () => now);
  try {
    const device = subscription();
    store.registerSubscription('owner-one', device);
    assert.throws(() => store.scheduleTestPush('owner-one', device.endpoint),
      (error: unknown) => error instanceof PushTestError && error.code === 'WORKER_UNAVAILABLE');
    store.workerHeartbeat('worker');
    assert.equal(store.getDeviceStatus('owner-one', device.endpoint).registered, true);
    assert.equal(store.getDeviceStatus('owner-two', device.endpoint).registered, false);
    assert.throws(() => store.registerSubscription('owner-two', device),
      (error: unknown) => error instanceof PushTestError && error.code === 'SUBSCRIPTION_OWNED');
    assert.throws(() => store.scheduleTestPush('owner-two', device.endpoint));
    assert.deepEqual(store.unsubscribe('owner-two', device.endpoint), { removed: false, cancelled: 0 });
    assert.equal(store.getDeviceStatus('owner-one', device.endpoint).registered, true);
    now += 10_001;
    assert.throws(() => store.scheduleTestPush('owner-one', device.endpoint));
  } finally { store.close(); }
});

test('duplicate requests reuse one immediately due job through a connection restart', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dxs-push-test-'));
  const dbPath = join(directory, 'queue.sqlite');
  const now = 1_000_000;
  let store = openPushTestStore(dbPath, () => now);
  try {
    const device = subscription();
    store.registerSubscription('owner', device);
    store.workerHeartbeat('worker-one');
    const first = store.scheduleTestPush('owner', device.endpoint);
    assert.equal(first.job.dueAt - first.job.createdAt, PUSH_TEST_DELAY_MS);
    assert.equal(first.job.dueAt, now);
    const concurrentStore = openPushTestStore(dbPath, () => now);
    try {
      const second = concurrentStore.scheduleTestPush('owner', device.endpoint);
      assert.equal(second.duplicate, true);
      assert.equal(second.job.id, first.job.id);
    } finally { concurrentStore.close(); }
    store.close();
    store = openPushTestStore(dbPath, () => now);
    assert.equal(store.getDeviceStatus('owner', device.endpoint).pending?.id, first.job.id);
    const claimed = store.claimDueJob('worker-two');
    assert.equal(claimed?.id, first.job.id);
    assert.equal(claimed?.payload.url, '/lab/push');
    assert.equal(claimed?.payload.title, '고모텍 CCTV');
    assert.match(claimed?.payload.body ?? '', /^(?:[1-9]|[1-9]\d|1\d\d|200)번 CCTV 영상 수신 오류가 발생했습니다\. \(test\)$/);
    assert.equal(store.claimDueJob('worker-three'), null);
    assert.equal(store.scheduleTestPush('owner', device.endpoint).job.id, first.job.id);
    store.finishJob(first.job.id, 'sent');
    assert.equal(store.getDeviceStatus('owner', device.endpoint).pending, null);
    assert.equal(store.getDeviceStatus('owner', device.endpoint).lastJob?.status, 'sent');
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('반복 ON은 즉시 한 건을 처리하고 재시작 후 10초마다 한 건만 예약한다', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dxs-push-repeating-'));
  const dbPath = join(directory, 'queue.sqlite');
  let now = 1_000_000;
  let store = openPushTestStore(dbPath, () => now);
  try {
    const device = subscription();
    store.registerSubscription('owner', device);
    store.workerHeartbeat('worker');
    const first = store.scheduleTestPush('owner', device.endpoint, true);
    assert.equal(first.job.dueAt, now);
    assert.equal(store.getDeviceStatus('owner', device.endpoint).repeating, true);
    assert.equal(store.getDeviceStatus('other-owner', device.endpoint).repeating, false);
    assert.equal(store.scheduleTestPush('owner', device.endpoint, true).job.id, first.job.id);
    assert.equal(store.claimDueJob('worker')?.id, first.job.id);
    store.finishJob(first.job.id, 'sent');
    const next = store.getDeviceStatus('owner', device.endpoint).pending;
    assert.ok(next);
    assert.equal(next.dueAt, now + PUSH_TEST_REPEAT_INTERVAL_MS);
    assert.equal(store.scheduleTestPush('owner', device.endpoint, true).job.id, next.id, '반복 ON 재요청은 이미 예약된 다음 알림을 유지한다');
    store.finishJob(first.job.id, 'sent');
    assert.equal(store.getDeviceStatus('owner', device.endpoint).pending?.id, next.id, '완료 중복 처리도 다음 예약을 중복 생성하지 않는다');
    store.close();
    store = openPushTestStore(dbPath, () => now);
    assert.equal(store.getDeviceStatus('owner', null).repeating, true);
    now += PUSH_TEST_REPEAT_INTERVAL_MS - 1;
    assert.equal(store.claimDueJob('worker'), null);
    now += 1;
    const second = store.claimDueJob('worker');
    assert.equal(second?.id, next.id);
    assert.match(second?.payload.body ?? '', /^(?:[1-9]|[1-9]\d|1\d\d|200)번 CCTV 영상 수신 오류가 발생했습니다\. \(test\)$/);
    assert.equal(store.claimDueJob('another-worker'), null);
    now += 60_000;
    store.finishJob(next.id, 'sent');
    assert.equal(store.getDeviceStatus('owner', device.endpoint).pending?.dueAt, now + PUSH_TEST_REPEAT_INTERVAL_MS);
    assert.equal(store.claimDueJob('worker'), null, '밀린 반복 알림을 한꺼번에 만들지 않는다');
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('반복 OFF·기기 교체는 현재 기기의 반복만 중단하고 전송 중 완료 뒤에도 다시 예약하지 않는다', () => {
  let now = 1_000_000;
  const store = openPushTestStore(':memory:', () => now);
  try {
    const one = subscription('one');
    const two = subscription('two');
    store.registerSubscription('one', one);
    store.registerSubscription('two', two);
    store.workerHeartbeat('worker');
    const first = store.scheduleTestPush('one', one.endpoint, true);
    store.scheduleTestPush('two', two.endpoint, true);
    assert.equal(store.claimDueJob('worker')?.id, first.job.id);
    store.unsubscribeDevice('one');
    assert.equal(store.getDeviceStatus('one', one.endpoint).repeating, false);
    assert.equal(store.getDeviceStatus('two', two.endpoint).repeating, true);
    store.finishJob(first.job.id, 'sent');
    assert.equal(store.getDeviceStatus('one', one.endpoint).pending, null);
    const second = store.claimDueJob('worker');
    assert.ok(second);
    store.finishJob(second.id, 'sent');
    store.registerSubscription('two', subscription('replacement'));
    assert.equal(store.getDeviceStatus('two', null).repeating, false);
    now += PUSH_TEST_REPEAT_INTERVAL_MS;
    assert.equal(store.claimDueJob('worker'), null);
  } finally { store.close(); }
});

test('반복 발송 실패·불명확한 전송·워커 중단은 반복을 멈추고 자동 재전송하지 않는다', () => {
  for (const outcome of ['failed', 'unknown', 'interrupted'] as const) {
    let now = 1_000_000;
    const store = openPushTestStore(':memory:', () => now);
    try {
      const device = subscription();
      store.registerSubscription('owner', device);
      store.workerHeartbeat('worker');
      store.scheduleTestPush('owner', device.endpoint, true);
      const sending = store.claimDueJob('worker');
      assert.ok(sending);
      if (outcome === 'interrupted') {
        now += SENDING_UNKNOWN_AFTER_MS;
        assert.equal(store.markStaleSending(), 1);
      } else store.finishJob(sending.id, outcome, 'TEST_FAILURE');
      assert.equal(store.getDeviceStatus('owner', device.endpoint).repeating, false);
      now += PUSH_TEST_REPEAT_INTERVAL_MS;
      assert.equal(store.claimDueJob('worker'), null);
      assert.equal(store.getDeviceStatus('owner', device.endpoint).lastJob?.status, outcome === 'interrupted' ? 'unknown' : outcome);
    } finally { store.close(); }
  }
});

test('unsubscribe atomically cancels a queued job without touching another device', () => {
  let now = 1_000_000;
  const store = openPushTestStore(':memory:', () => now);
  try {
    const one = subscription('one');
    const two = subscription('two');
    store.registerSubscription('owner-one', one);
    store.registerSubscription('owner-two', two);
    store.workerHeartbeat('worker');
    store.scheduleTestPush('owner-one', one.endpoint);
    const other = store.scheduleTestPush('owner-two', two.endpoint);
    assert.deepEqual(store.unsubscribe('owner-one', one.endpoint), { removed: true, cancelled: 1 });
    now += PUSH_TEST_DELAY_MS;
    assert.equal(store.claimDueJob('worker')?.id, other.job.id);
    assert.equal(store.claimDueJob('worker'), null);
  } finally { store.close(); }
});

test('a persisted sending attempt becomes unknown after interruption and is never reclaimed', () => {
  let now = 1_000_000;
  const store = openPushTestStore(':memory:', () => now);
  try {
    const device = subscription();
    store.registerSubscription('owner', device);
    store.workerHeartbeat('worker');
    store.scheduleTestPush('owner', device.endpoint);
    now += PUSH_TEST_DELAY_MS;
    const claimed = store.claimDueJob('dead-worker');
    assert.ok(claimed);
    now += SENDING_UNKNOWN_AFTER_MS;
    assert.equal(store.markStaleSending(), 1);
    assert.equal(store.claimDueJob('replacement-worker'), null);
    assert.equal(store.getDeviceStatus('owner', device.endpoint).lastJob?.status, 'unknown');
  } finally { store.close(); }
});

test('device-wide unsubscribe cancels reservations even when the browser lost its endpoint', () => {
  let now = 1_000_000;
  const store = openPushTestStore(':memory:', () => now);
  try {
    const device = subscription();
    store.registerSubscription('owner', device);
    store.workerHeartbeat('worker');
    store.scheduleTestPush('owner', device.endpoint);
    assert.ok(store.getDeviceStatus('owner', null).pending, '로컬 endpoint가 사라져도 현재 기기 예약은 표시한다');
    assert.deepEqual(store.unsubscribeDevice('owner'), { removed: true, cancelled: 1 });
    now += PUSH_TEST_DELAY_MS;
    assert.equal(store.claimDueJob('worker'), null);
    assert.equal(store.getDeviceStatus('owner', device.endpoint).registered, false);
    assert.deepEqual(store.unsubscribeDevice('owner'), { removed: false, cancelled: 0 });
  } finally { store.close(); }
});

test('a replacement subscription cancels the previous endpoint reservation for the same device', () => {
  let now = 1_000_000;
  const store = openPushTestStore(':memory:', () => now);
  try {
    const previous = subscription('previous');
    const replacement = subscription('replacement');
    store.registerSubscription('owner', previous);
    store.workerHeartbeat('worker');
    store.scheduleTestPush('owner', previous.endpoint);
    store.registerSubscription('owner', replacement);
    assert.equal(store.getDeviceStatus('owner', previous.endpoint).registered, false);
    assert.equal(store.getDeviceStatus('owner', replacement.endpoint).registered, true);
    now += PUSH_TEST_DELAY_MS;
    assert.equal(store.claimDueJob('worker'), null);
  } finally { store.close(); }
});

test('the worker sends only once without any browser and does not retry uncertain transport', async () => {
  let now = 1_000_000;
  const store = openPushTestStore(':memory:', () => now);
  try {
    const device = subscription();
    store.registerSubscription('owner', device);
    store.workerHeartbeat('worker');
    store.scheduleTestPush('owner', device.endpoint);
    now += PUSH_TEST_DELAY_MS;
    let attempts = 0;
    const transport = async () => { attempts += 1; throw new PushDeliveryError(null, true); };
    assert.equal(await processNextPushJob(store, 'worker', config, transport), true);
    assert.equal(await processNextPushJob(store, 'worker', config, transport), false);
    assert.equal(attempts, 1);
    assert.equal(store.getDeviceStatus('owner', device.endpoint).lastJob?.status, 'unknown');
  } finally { store.close(); }
});

test('만료된 구독을 삭제해도 실패 상태가 남고 다른 기기에 노출되지 않는다', async () => {
  let now = 1_000_000;
  const store = openPushTestStore(':memory:', () => now);
  try {
    const device = subscription();
    store.registerSubscription('owner', device);
    store.workerHeartbeat('worker');
    store.scheduleTestPush('owner', device.endpoint);
    now += PUSH_TEST_DELAY_MS;
    await processNextPushJob(store, 'worker', config, async () => { throw new PushDeliveryError(410, false); });
    const status = store.getDeviceStatus('owner', device.endpoint);
    assert.equal(status.registered, false);
    assert.equal(status.pending, null);
    assert.equal(status.lastJob?.status, 'failed');
    assert.equal(store.getDeviceStatus('other-device', device.endpoint).lastJob, null);
    assert.equal(store.getDeviceStatus('owner', null).lastJob?.status, 'failed');
  } finally { store.close(); }
});

test('login throttling is shared by database connections and expires after 15 minutes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dxs-push-throttle-test-'));
  const dbPath = join(directory, 'queue.sqlite');
  const store = openPushTestStore(dbPath);
  const other = openPushTestStore(dbPath);
  try {
    for (let index = 0; index < 10; index += 1) assert.equal(store.consumeLoginAttempt('account-hash', 1_000_000), true);
    assert.equal(other.consumeLoginAttempt('account-hash', 1_000_001), false);
    assert.equal(other.consumeLoginAttempt('another-account-hash', 1_000_001), true);
    assert.equal(other.consumeLoginAttempt('account-hash', 1_900_000), true);
    for (let index = 0; index < 100; index += 1) assert.equal(store.consumeLoginAttempt('global', 1_000_000, 100), true);
    assert.equal(other.consumeLoginAttempt('global', 1_000_001, 100), false);
  } finally { other.close(); store.close(); rmSync(directory, { recursive: true, force: true }); }
});
