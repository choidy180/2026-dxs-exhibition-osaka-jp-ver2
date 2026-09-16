import assert from 'node:assert/strict';
import { createECDH } from 'node:crypto';
import { join } from 'node:path';
import test from 'node:test';
import { getPushTestConfig, isPushTestEnabled } from '../../lib/push-test/config';

test('설정은 명시적 테스트 환경, HTTPS, 일치하는 VAPID 키와 비공개 저장 위치를 요구한다', () => {
  const names = ['PUSH_TEST_ENABLED', 'APP_ENV', 'PUSH_TEST_ORIGIN', 'PUSH_TEST_VAPID_PUBLIC_KEY',
    'PUSH_TEST_VAPID_PRIVATE_KEY', 'PUSH_TEST_VAPID_SUBJECT', 'PUSH_TEST_DB_PATH'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const keys = createECDH('prime256v1');
  keys.generateKeys();
  try {
    process.env.PUSH_TEST_ENABLED = 'true';
    process.env.APP_ENV = 'production';
    assert.equal(isPushTestEnabled(), false);
    assert.throws(() => getPushTestConfig());
    process.env.APP_ENV = 'test';
    process.env.PUSH_TEST_ORIGIN = 'https://push.example.test';
    process.env.PUSH_TEST_VAPID_PUBLIC_KEY = keys.getPublicKey().toString('base64url');
    process.env.PUSH_TEST_VAPID_PRIVATE_KEY = keys.getPrivateKey().toString('base64url');
    process.env.PUSH_TEST_VAPID_SUBJECT = 'mailto:push@example.test';
    process.env.PUSH_TEST_DB_PATH = '.data/test.sqlite';
    assert.equal(getPushTestConfig().origin, 'https://push.example.test');
    process.env.PUSH_TEST_ORIGIN = 'http://push.example.test';
    assert.throws(() => getPushTestConfig());
    process.env.PUSH_TEST_ORIGIN = 'https://push.example.test';
    process.env.PUSH_TEST_DB_PATH = join('public', '..hidden', 'test.sqlite');
    assert.throws(() => getPushTestConfig());
    process.env.PUSH_TEST_DB_PATH = '.data/test.sqlite';
    const other = createECDH('prime256v1');
    other.generateKeys();
    process.env.PUSH_TEST_VAPID_PRIVATE_KEY = other.getPrivateKey().toString('base64url');
    assert.throws(() => getPushTestConfig());
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
