import assert from 'node:assert/strict';
import { createECDH, randomBytes, scryptSync } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import webPush from 'web-push';
import { POST } from '../../app/api/push-test/[action]/route';
import { openPushTestStore } from '../../lib/push-test/store';
import { requireTestOwner } from '../../lib/push-test/auth';

const handlePushTest = (action: string, request: NextRequest) => POST(request, {
  params: Promise.resolve({ action }),
});

test('API 인증·기기 격리·CSRF·중복 예약·취소·환경 차단', async () => {
  const keys = webPush.generateVAPIDKeys();
  const salt = randomBytes(16).toString('hex');
  const password = randomBytes(24).toString('hex');
  const dbPath = join(mkdtempSync(join(tmpdir(), 'dxs-push-api-')), 'test.sqlite');
  Object.assign(process.env, {
    APP_ENV: 'test', PUSH_TEST_ENABLED: 'true', PUSH_TEST_ORIGIN: 'https://push.example.test',
    PUSH_TEST_DB_PATH: dbPath, PUSH_TEST_VAPID_PUBLIC_KEY: keys.publicKey,
    PUSH_TEST_VAPID_PRIVATE_KEY: keys.privateKey, PUSH_TEST_VAPID_SUBJECT: 'mailto:testing@example.test',
    PUSH_TEST_SESSION_SECRET: randomBytes(48).toString('hex'),
    PUSH_TEST_USERS_JSON: JSON.stringify({ tester: `${salt}:${scryptSync(password, salt, 64).toString('hex')}` }),
  });
  const request = (body: unknown, cookie = '', origin = 'https://push.example.test') => new NextRequest('https://push.example.test/api/push-test/status', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin, cookie }, body: JSON.stringify(body),
  });
  for (const action of ['unknown', 'constructor', '__proto__']) {
    const response = await handlePushTest(action, request({}));
    assert.equal(response.status, 404);
    assert.equal((await response.json()).code, 'NOT_FOUND');
  }
  const login = async () => {
    const response = await handlePushTest('login', request({ userId: 'tester', password }));
    assert.equal(response.status, 200);
    for (const cookie of response.cookies.getAll()) {
      assert.equal(cookie.httpOnly, true);
      assert.equal(cookie.secure, true);
      assert.equal(cookie.sameSite, 'strict');
    }
    return response.cookies.getAll().map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  };

  assert.equal((await handlePushTest('status', request({ endpoint: null }))).status, 401);
  assert.equal((await handlePushTest('login', request({ userId: 'tester', password: 'wrong' }))).status, 401);
  assert.equal((await handlePushTest('login', request({ userId: 'constructor', password: 'wrong' }))).status, 401);
  assert.equal((await handlePushTest('login', request({}, '', 'https://attacker.example.test'))).status, 403);
  assert.equal((await handlePushTest('login', request({ tooLarge: 'a'.repeat(17_000) }))).status, 413);

  const first = await login();
  const second = await login();
  assert.notEqual(requireTestOwner(request({}, first)), requireTestOwner(request({}, second)), '같은 사용자도 기기별 소유권이 달라야 한다');
  const curve = createECDH('prime256v1'); curve.generateKeys();
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/api-test', expirationTime: null,
    keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
  const endpoint = subscription.endpoint;
  assert.equal((await handlePushTest('subscribe', request({ subscription }, first))).status, 200);
  assert.equal((await handlePushTest('subscribe', request({ subscription }, second))).status, 409);
  assert.equal((await (await handlePushTest('status', request({ endpoint }, second))).json()).registered, false);
  assert.equal((await handlePushTest('schedule', request({ endpoint }, second))).status, 404);
  assert.equal((await handlePushTest('schedule', request({ endpoint }, first))).status, 503, '워커 없이 예약 성공을 표시하면 안 된다');

  const workerStore = openPushTestStore(dbPath);
  try {
    workerStore.workerHeartbeat('test-worker');
    const before = Date.now();
    assert.equal((await handlePushTest('schedule', request({ endpoint, repeating: 'yes' }, first))).status, 400);
    const firstJob = await (await handlePushTest('schedule', request({ endpoint, repeating: true }, first))).json();
    const duplicate = await (await handlePushTest('schedule', request({ endpoint, repeating: true }, first))).json();
    assert.equal(firstJob.pending.id, duplicate.pending.id);
    assert.ok(firstJob.pending.dueAt >= before && firstJob.pending.dueAt <= Date.now());
    assert.equal(firstJob.repeating, true);
    await handlePushTest('unsubscribe', request({ endpoint }, second));
    assert.equal((await (await handlePushTest('status', request({ endpoint }, first))).json()).registered, true);
    assert.equal((await (await handlePushTest('status', request({ endpoint }, first))).json()).repeating, true);
    assert.equal((await handlePushTest('unsubscribe', request({ endpoint: null }, first))).status, 200);
    const disabled = await (await handlePushTest('status', request({ endpoint }, first))).json();
    assert.equal(disabled.registered, false);
    assert.equal(disabled.repeating, false);
    assert.equal(disabled.pending, null);
  } finally { workerStore.close(); }

  const tampered = first.replace('dxs_push_test_session=', 'dxs_push_test_session=invalid');
  assert.equal((await handlePushTest('status', request({ endpoint }, tampered))).status, 401);
  process.env.APP_ENV = 'production';
  for (const action of ['login', 'status', 'subscribe', 'schedule', 'unsubscribe'] as const) {
    assert.equal((await handlePushTest(action, request({}, first))).status, 404);
  }
});
