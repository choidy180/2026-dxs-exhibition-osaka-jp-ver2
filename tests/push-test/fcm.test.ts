import assert from 'node:assert/strict';
import { verify } from 'node:crypto';
import test from 'node:test';
import { getFcmConfig, isFcmReady } from '../../lib/push-test/config';
import { buildAndroidFcmMessage, createFcmSender, type FcmHttpRequest } from '../../lib/push-test/fcm';
import { PushDeliveryError } from '../../lib/push-test/send';
import { PushTestError, validatePushEndpoint, validatePushTarget, validatePushTargetEndpoint } from '../../lib/push-test/validation';
import { androidPayload, androidSubscription, androidToken, fcmFixture } from './fcm-fixtures';

const oauthResponse = { status: 200, body: { access_token: 'fixture-access-token', token_type: 'Bearer', expires_in: 3600 } };
const successResponse = { status: 200, body: { name: 'projects/push-test-project/messages/fixture' } };

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

test('FCM payload에는 앱 종료 중 표시할 notification과 고정 앱 경로가 함께 들어간다', () => {
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

test('RS256 JWT를 검증하고 Google 고정 URL과 캐시된 OAuth 토큰으로만 발송한다', async () => {
  const fixture = fcmFixture();
  const calls: string[] = [];
  const now = 1_700_000_000_000;
  const httpRequest: FcmHttpRequest = async (url, options) => {
    calls.push(url);
    if (url === 'https://oauth2.googleapis.com/token') {
      const form = new URLSearchParams(options.body);
      assert.equal(form.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
      const [headerText, claimsText, signature] = (form.get('assertion') ?? '').split('.');
      const header = JSON.parse(Buffer.from(headerText, 'base64url').toString());
      const claims = JSON.parse(Buffer.from(claimsText, 'base64url').toString());
      assert.equal(header.alg, 'RS256');
      assert.equal(header.kid, fixture.account.private_key_id);
      assert.equal(claims.iss, fixture.account.client_email);
      assert.equal(claims.aud, url);
      assert.equal(claims.scope, 'https://www.googleapis.com/auth/firebase.messaging');
      assert.equal(claims.iat, now / 1000);
      assert.equal(claims.exp - claims.iat, 3600);
      assert.equal(verify('RSA-SHA256', Buffer.from(`${headerText}.${claimsText}`), fixture.publicKey, Buffer.from(signature, 'base64url')), true);
      return oauthResponse;
    }
    assert.equal(url, 'https://fcm.googleapis.com/v1/projects/push-test-project/messages:send');
    assert.equal(options.headers.Authorization, 'Bearer fixture-access-token');
    assert.deepEqual(JSON.parse(options.body), buildAndroidFcmMessage(androidToken, androidPayload));
    return successResponse;
  };
  const send = createFcmSender({ httpRequest, now: () => now });
  await send(androidSubscription, androidPayload, fixture.config);
  await send(androidSubscription, androidPayload, fixture.config);
  assert.deepEqual(calls, [
    'https://oauth2.googleapis.com/token',
    'https://fcm.googleapis.com/v1/projects/push-test-project/messages:send',
    'https://fcm.googleapis.com/v1/projects/push-test-project/messages:send',
  ]);
});

test('만료 직전 토큰과 다른 서비스 계정의 토큰은 다시 발급한다', async () => {
  const first = fcmFixture();
  const second = fcmFixture('another-test-project');
  let now = 1_700_000_000_000;
  let oauthCalls = 0;
  const send = createFcmSender({ now: () => now, httpRequest: async url => {
    if (url === 'https://oauth2.googleapis.com/token') { oauthCalls += 1; return oauthResponse; }
    return successResponse;
  } });
  await send(androidSubscription, androidPayload, first.config);
  now += 3541_000;
  await send(androidSubscription, androidPayload, first.config);
  await send(androidSubscription, androidPayload, second.config);
  assert.equal(oauthCalls, 3);
});

test('OAuth 오류나 리다이렉트 뒤에는 FCM 요청을 보내지 않는다', async () => {
  const fixture = fcmFixture();
  for (const response of [
    { status: 302, body: { location: 'https://attacker.example/token' } },
    { status: 400, body: { error: 'invalid_grant', error_description: 'private details' } },
    { status: 200, body: { access_token: 'invalid\ntoken', token_type: 'Bearer', expires_in: 3600 } },
  ]) {
    let calls = 0;
    const send = createFcmSender({ httpRequest: async url => {
      calls += 1;
      assert.equal(url, 'https://oauth2.googleapis.com/token');
      return response;
    } });
    await assert.rejects(send(androidSubscription, androidPayload, fixture.config),
      (error: unknown) => error instanceof PushDeliveryError && !error.uncertain && !error.removeSubscription
        && !error.message.includes('private details'));
    assert.equal(calls, 1);
  }
});

test('네트워크 발송 결과가 불명확해도 요청을 재시도하거나 기기 구독을 삭제하지 않는다', async () => {
  const fixture = fcmFixture();
  let sends = 0;
  const send = createFcmSender({ httpRequest: async url => {
    if (url === 'https://oauth2.googleapis.com/token') return oauthResponse;
    sends += 1;
    throw new Error('raw response may contain a device token');
  } });
  await assert.rejects(send(androidSubscription, androidPayload, fixture.config), (error: unknown) =>
    error instanceof PushDeliveryError && error.uncertain && error.code === 'FCM_TRANSPORT_UNKNOWN' && !error.removeSubscription);
  assert.equal(sends, 1);
});

test('네이티브 UNREGISTERED만 구독 삭제 대상으로 표시하고 일반 HTTP 404는 보존한다', async () => {
  const fixture = fcmFixture();
  for (const code of [null, 'UNREGISTERED', 'SENDER_ID_MISMATCH']) {
    const send = createFcmSender({ httpRequest: async url => url === 'https://oauth2.googleapis.com/token' ? oauthResponse : {
      status: 404, body: { error: { details: code ? [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: code }] : [] } },
    } });
    await assert.rejects(send(androidSubscription, androidPayload, fixture.config), (error: unknown) =>
      error instanceof PushDeliveryError && error.removeSubscription === (code === 'UNREGISTERED') && !error.uncertain);
  }
});

test('OAuth와 FCM 전송은 하나의 전체 제한시간을 공유한다', async () => {
  const fixture = fcmFixture();
  let requests = 0;
  const send = createFcmSender({ timeoutMs: 25, httpRequest: async (url, options) => {
    requests += 1;
    if (url === 'https://oauth2.googleapis.com/token') return oauthResponse;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  } });
  await assert.rejects(send(androidSubscription, androidPayload, fixture.config), (error: unknown) =>
    error instanceof PushDeliveryError && error.code === 'FCM_TRANSPORT_UNKNOWN');
  assert.equal(requests, 2);
});
