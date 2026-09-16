import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadDedicatedTestEnv } from '../../scripts/push-test-env.mjs';

test('전용 파일을 읽되 기존 환경의 비활성화 설정과 다른 앱 설정을 덮어쓰지 않는다', () => {
  const directory = mkdtempSync(join(tmpdir(), 'push-test-env-'));
  const path = join(directory, '.env.push-test.local');
  const names = ['APP_ENV', 'PUSH_TEST_ENABLED', 'PUSH_TEST_USERS_JSON', 'PUSH_TEST_ORIGIN', 'UNRELATED_APP_VALUE'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    loadDedicatedTestEnv(directory);
    assert.equal(process.env.APP_ENV, undefined);
    process.env.APP_ENV = 'production';
    process.env.PUSH_TEST_ENABLED = 'false';
    writeFileSync(path, [
      'APP_ENV=test', 'PUSH_TEST_ENABLED=true',
      'PUSH_TEST_ORIGIN=https://example.test',
      `PUSH_TEST_USERS_JSON='{"tester":"fixture-only"}'`,
      'UNRELATED_APP_VALUE=ignore-this',
    ].join('\n'));
    loadDedicatedTestEnv(directory);
    assert.equal(process.env.APP_ENV, 'production');
    assert.equal(process.env.PUSH_TEST_ENABLED, 'false');
    assert.equal(process.env.PUSH_TEST_ORIGIN, 'https://example.test');
    assert.equal(process.env.PUSH_TEST_USERS_JSON, '{"tester":"fixture-only"}');
    assert.equal(process.env.UNRELATED_APP_VALUE, undefined);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
    unlinkSync(path);
    rmdirSync(directory);
  }
});

test('실제 Node 실행 명령이 설정을 읽고 잘못된 휴대폰 주소를 인증서 설치 전에 거부한다', () => {
  const result = spawnSync(process.execPath, ['scripts/push-test-server.mjs', '--phone', '--host=127.0.0.1'], {
    encoding: 'utf8',
    env: { ...process.env, APP_ENV: 'test', PUSH_TEST_ENABLED: 'true' },
    timeout: 10_000,
    windowsHide: true,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /내부 IPv4 주소만/);
  assert.doesNotMatch(result.stdout, /인증서를 준비합니다|갤럭시 푸시 테스트/);
});
