import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import test from 'node:test';
import { decodeBase64Url, validatePushEndpoint, validatePushSubscription } from '../../lib/push-test/validation';

test('endpoint validation allows the supported browser push services only', () => {
  for (const endpoint of [
    'https://fcm.googleapis.com/fcm/send/test-device',
    'https://updates.push.services.mozilla.com/wpush/v2/test-device',
    'https://updates.push.services.mozilla.com:443/wpush/v2/test-device',
    'https://web.push.apple.com/test-device',
    'https://wns2-bl2p.notify.windows.com/w/?token=device',
  ]) assert.ok(validatePushEndpoint(endpoint));
  for (const endpoint of [
    'http://fcm.googleapis.com/fcm/send/test-device',
    'https://127.0.0.1/internal',
    'https://192.168.2.147/internal',
    'https://fcm.googleapis.com.evil.test/fcm/send/test-device',
    'https://web.push.apple.com@127.0.0.1/internal',
    'https://user:password@web.push.apple.com/test-device',
    'https://fcm.googleapis.com:8443/fcm/send/test-device',
    'https://fcm.googleapis.com/not-a-push-endpoint',
    'https://fcm.googleapis.com/fcm/send/',
    'https://push.services.mozilla.com.evil.test/device',
    'https://wns2-bl2p.notify.windows.com.evil.test/device',
    'https://web.push.apple.com/test-device#fragment',
    'https://web.push.apple.com/',
  ]) assert.throws(() => validatePushEndpoint(endpoint));
});

test('subscriptions require canonical keys, a valid P-256 point, and nonexpired metadata', () => {
  const key = createECDH('prime256v1');
  key.generateKeys();
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/device', expirationTime: null,
    keys: { p256dh: key.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') },
  };
  assert.deepEqual(validatePushSubscription(subscription), subscription);
  assert.throws(() => validatePushSubscription({ ...subscription, expirationTime: Date.now() - 1 }));
  assert.throws(() => validatePushSubscription({ ...subscription, keys: { ...subscription.keys, auth: `${subscription.keys.auth}=` } }));
  assert.throws(() => validatePushSubscription({ ...subscription, keys: { ...subscription.keys, p256dh: Buffer.alloc(65, 4).toString('base64url') } }));
  assert.throws(() => decodeBase64Url(randomBytes(15).toString('base64url'), 16));
  assert.throws(() => decodeBase64Url('AA+/==', 16));
});
