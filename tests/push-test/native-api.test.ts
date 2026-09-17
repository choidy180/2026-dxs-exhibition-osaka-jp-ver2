import assert from 'node:assert/strict';
import { createECDH, randomBytes, scryptSync } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { NextRequest } from 'next/server';
import webPush from 'web-push';
import { handlePushTest } from '../../lib/push-test/api';
import { openPushTestStore } from '../../lib/push-test/store';
import { androidSubscription, fcmFixture } from './fcm-fixtures';

test('네이티브 API는 FCM 준비상태·인증·기기격리·중복예약·취소를 지키며 Web Push와 공존한다', async () => {
  const keys = webPush.generateVAPIDKeys();
  const salt = randomBytes(16).toString('hex');
  const password = randomBytes(24).toString('hex');
  const dbPath = join(mkdtempSync(join(tmpdir(), 'dxs-push-native-api-')), 'test.sqlite');
  const values = {
    APP_ENV: 'test', PUSH_TEST_ENABLED: 'true', PUSH_TEST_ORIGIN: 'https://push.example.test',
    PUSH_TEST_DB_PATH: dbPath, PUSH_TEST_VAPID_PUBLIC_KEY: keys.publicKey,
    PUSH_TEST_VAPID_PRIVATE_KEY: keys.privateKey, PUSH_TEST_VAPID_SUBJECT: 'mailto:testing@example.test',
    PUSH_TEST_SESSION_SECRET: randomBytes(48).toString('hex'),
    PUSH_TEST_USERS_JSON: JSON.stringify({ tester: `${salt}:${scryptSync(password, salt, 64).toString('hex')}` }),
    PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON: '',
  };
  const previous = Object.fromEntries(Object.keys(values).map(name => [name, process.env[name]]));
  Object.assign(process.env, values);
  const request = (body: unknown, cookie = '', origin = 'https://push.example.test') => new NextRequest('https://push.example.test/api/push-test/status', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin, cookie }, body: JSON.stringify(body),
  });
  const login = async () => {
    const response = await handlePushTest('login', request({ userId: 'tester', password }));
    assert.equal(response.status, 200);
    return response.cookies.getAll().map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  };
  const worker = openPushTestStore(dbPath);
  try {
    assert.equal((await handlePushTest('subscribe', request({ subscription: androidSubscription }))).status, 401);
    const one = await login();
    const two = await login();
    const status = await (await handlePushTest('status', request({ endpoint: null }, one))).json();
    assert.equal(status.fcmReady, false);
    assert.equal((await handlePushTest('subscribe', request({ subscription: androidSubscription }, one))).status, 503);
    assert.equal((await handlePushTest('schedule', request({ endpoint: androidSubscription.endpoint }, one))).status, 503);

    // FCM 미구성/오류는 기존 브라우저 구독과 예약을 막지 않는다.
    const curve = createECDH('prime256v1'); curve.generateKeys();
    const web = { endpoint: 'https://fcm.googleapis.com/fcm/send/native-api-web-control', expirationTime: null,
      keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
    process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON = 'invalid-private-config';
    assert.equal((await handlePushTest('subscribe', request({ subscription: web }, two))).status, 200);
    worker.workerHeartbeat('fixture-worker');
    assert.equal((await handlePushTest('schedule', request({ endpoint: web.endpoint }, two))).status, 200);

    process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON = fcmFixture().raw;
    const registered = await (await handlePushTest('subscribe', request({ subscription: { platform: 'android', token: androidSubscription.token } }, one))).json();
    assert.equal(registered.fcmReady, true);
    assert.equal(registered.registered, true);
    assert.equal((await handlePushTest('subscribe', request({ subscription: androidSubscription }, two))).status, 409);
    assert.equal((await handlePushTest('schedule', request({ endpoint: androidSubscription.endpoint }, two))).status, 404);
    assert.equal((await handlePushTest('subscribe', request({ subscription: androidSubscription }, one, 'https://attacker.example'))).status, 403);
    const first = await (await handlePushTest('schedule', request({ endpoint: androidSubscription.endpoint, repeating: true }, one))).json();
    const duplicate = await (await handlePushTest('schedule', request({ endpoint: androidSubscription.endpoint, repeating: true }, one))).json();
    assert.equal(first.pending.id, duplicate.pending.id);
    assert.equal(first.repeating, true);
    assert.equal((await (await handlePushTest('status', request({ endpoint: androidSubscription.endpoint }, one))).json()).repeating, true);
    process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON = '';
    const cleared = await (await handlePushTest('unsubscribe', request({ endpoint: null }, one))).json();
    assert.equal(cleared.registered, false);
    assert.equal(cleared.repeating, false);
    assert.equal(cleared.pending, null);
    const webStatus = await (await handlePushTest('status', request({ endpoint: web.endpoint }, two))).json();
    assert.equal(webStatus.registered, true);
    assert.ok(webStatus.pending);
    process.env.APP_ENV = 'production';
    assert.equal((await handlePushTest('subscribe', request({ subscription: androidSubscription }, one))).status, 404);
  } finally {
    worker.close();
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
