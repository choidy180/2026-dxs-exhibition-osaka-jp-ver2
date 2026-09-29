import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { getFcmConfig, isFcmReady } from '../../lib/push-test/config';
import { buildAndroidFcmMessage, createFcmSender, sendAndroidPushNotification, type FcmHttpRequest } from '../../lib/push-test/fcm';
import { PushTestError, validatePushEndpoint, validatePushTarget, validatePushTargetEndpoint } from '../../lib/push-test/validation';
import { androidPayload, androidSubscription, androidToken, fcmFixture } from './fcm-fixtures';

test('Android 구독은 네이티브 토큰으로 검증하며 URL을 전송 대상으로 받아들이지 않는다', () => {
  assert.deepEqual(validatePushTarget({ platform: 'android', token: androidToken }), androidSubscription);
  assert.equal(validatePushTargetEndpoint(androidSubscription.endpoint), androidSubscription.endpoint);
  assert.throws(() => validatePushEndpoint(androidSubscription.endpoint));
  for (const token of ['https://internal.example/secret', 'localhost', 'a'.repeat(4093), 'x'.repeat(30) + '\n', 'x'.repeat(30) + '?key=1']) {
    assert.throws(() => validatePushTarget({ platform: 'android', token }));
    assert.throws(() => validatePushTargetEndpoint(`fcm:${token}`));
  }
  assert.throws(() => validatePushTarget({ ...androidSubscription, endpoint: 'fcm:another-device-token' }));
  assert.throws(() => validatePushTarget({ platform: 'ios', token: androidToken }));
});

test('FCM 설정은 프로젝트와 서버키를 검증하고 잘못된 값에 원문 비밀을 노출하지 않는다', () => {
  const previous = process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON;
  const fixture = fcmFixture();
  try {
    delete process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON;
    assert.equal(isFcmReady(), false);
    process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON = fixture.raw;
    assert.equal(isFcmReady(), true);
    assert.equal(getFcmConfig().projectId, fixture.config.projectId);
    for (const changes of [
      { project_id: '../other-project' },
      { client_email: 'attacker@other-project.iam.gserviceaccount.com' },
      { token_uri: 'https://attacker.example/token' },
      { universe_domain: 'attacker.example' },
      { private_key: 'secret-invalid-key' },
      { private_key_id: 'not-a-google-key-id' },
      { type: 'authorized_user' },
    ]) {
      process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON = JSON.stringify({ ...fixture.account, ...changes });
      assert.equal(isFcmReady(), false);
      assert.throws(() => getFcmConfig(), (error: unknown) => error instanceof PushTestError
        && error.code === 'FCM_CONFIGURATION' && error.status === 503 && !error.message.includes('secret-invalid-key'));
    }
  } finally {
    if (previous === undefined) delete process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON;
    else process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON = previous;
  }
});

test('기존 FCM 메시지 형식은 로컬 미리보기 호환을 위해 유지한다', () => {
  const { message } = buildAndroidFcmMessage(androidToken, androidPayload);
  assert.equal(message.token, androidToken);
  assert.deepEqual(message.notification, { title: androidPayload.title, body: androidPayload.body });
  assert.deepEqual(message.data, { url: '/lab/push', tag: androidPayload.tag, title: androidPayload.title, body: androidPayload.body });
  assert.equal(message.android.priority, 'HIGH');
  assert.equal(message.android.ttl, '300s');
  assert.equal(message.android.notification.channel_id, 'push_test');
  assert.equal(message.android.notification.icon, 'ic_gomotec_notification');
  assert.equal(message.android.notification.tag, androidPayload.tag);
  assert.equal(JSON.stringify(message).includes('image'), false);
});

test('전시용 발송기는 기존 설정과 주입 전송기를 받아도 네트워크를 호출하지 않는다', async () => {
  const fixture = fcmFixture();
  let requestCalls = 0;
  let clockCalls = 0;
  const httpRequest: FcmHttpRequest = async () => {
    requestCalls += 1;
    throw new Error('External transport must not be called');
  };
  const send = createFcmSender({
    httpRequest,
    now: () => { clockCalls += 1; return 1_700_000_000_000; },
    timeoutMs: 1,
  });
  await send(androidSubscription, androidPayload, fixture.config);
  await send(androidSubscription, androidPayload, fixture.config);
  assert.equal(requestCalls, 0);
  assert.equal(clockCalls, 0);
});

test('전시용 기본 발송기는 서비스 계정 설정 없이도 로컬에서 완료된다', async () => {
  const previous = process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON;
  const fetchMock = mock.method(globalThis, 'fetch', async () => {
    throw new Error('Exhibition sender must not use fetch');
  });
  try {
    for (const value of [undefined, 'invalid-service-account-config']) {
      if (value === undefined) delete process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON;
      else process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON = value;
      await createFcmSender()(androidSubscription, androidPayload);
      await sendAndroidPushNotification(androidSubscription, androidPayload);
    }
    assert.equal(fetchMock.mock.callCount(), 0);
  } finally {
    fetchMock.mock.restore();
    if (previous === undefined) delete process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON;
    else process.env.PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON = previous;
  }
});

test('동시 전시 알림은 입력을 변경하거나 주입 전송기를 실행하지 않는다', async () => {
  let requests = 0;
  const send = createFcmSender({ httpRequest: async () => {
    requests += 1;
    return { status: 500, body: { error: 'Must not be requested' } };
  } });
  const subscription = Object.freeze({ ...androidSubscription });
  const payload = Object.freeze({ ...androidPayload });
  const results = await Promise.all(Array.from({ length: 10 }, () => send(subscription, payload)));
  assert.ok(results.every(result => result === undefined));
  assert.equal(requests, 0);
  assert.deepEqual(subscription, androidSubscription);
  assert.deepEqual(payload, androidPayload);
});

test('전시용 발송기도 잘못된 기기 토큰을 검증하며 외부 요청을 보내지 않는다', async () => {
  let requests = 0;
  const send = createFcmSender({ httpRequest: async () => {
    requests += 1;
    throw new Error('External transport must not be called');
  } });
  for (const token of ['', 'short-token', 'https://example.invalid/device', 'invalid token with spaces']) {
    await assert.rejects(
      send({ ...androidSubscription, token }, androidPayload),
      (error: unknown) => error instanceof PushTestError && error.code === 'INVALID_FCM_TOKEN',
    );
  }
  assert.equal(requests, 0);
});
