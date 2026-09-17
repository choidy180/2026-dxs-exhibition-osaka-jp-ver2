import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { verifyTestPassword } from '../../lib/push-test/auth';

const setupScript = resolve('scripts/push-test-setup.mjs');
const userId = 'password-fixture';

function runSetup(directory: string, password: string) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveResult, reject) => {
    const child = spawn(process.execPath, [setupScript], { cwd: directory, windowsHide: true });
    const answers: Array<[RegExp, string]> = [
      [/HTTPS 주소/, 'https://setup.example.test'],
      [/계정 ID/, userId],
      [/테스트 비밀번호/, password],
      [/VAPID 연락처/, 'mailto:setup@example.test'],
    ];
    let stdout = '';
    let stderr = '';
    let nextAnswer = 0;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; child.kill(); }, 10_000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      const answer = answers[nextAnswer];
      // readline은 다음 질문 전에 도착한 줄을 버릴 수 있어 질문마다 한 줄씩 보낸다.
      if (answer && answer[0].test(stdout)) {
        nextAnswer += 1;
        child.stdin.write(`${answer[1]}\n`);
      }
    });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('close', code => {
      clearTimeout(timeout);
      if (timedOut) reject(new Error('테스트 계정 설정이 제한 시간 안에 종료되지 않았습니다.'));
      else resolveResult({ code, stdout, stderr });
    });
  });
}

function temporarySettings() {
  const directory = mkdtempSync(join(tmpdir(), 'push-password-test-'));
  const path = join(directory, '.env.push-test.local');
  return {
    directory, path,
    cleanup() {
      if (existsSync(path)) unlinkSync(path);
      rmdirSync(directory);
    },
  };
}

for (const [label, password] of [['1자', 'a'], ['256자를 넘는 한글', '한'.repeat(300)]]) {
  test(`${label} 비밀번호로 계정을 설정하고 생성된 해시로 인증한다`, async () => {
    const settings = temporarySettings();
    const previousUsers = process.env.PUSH_TEST_USERS_JSON;
    try {
      const result = await runSetup(settings.directory, password);
      assert.equal(result.code, 0, result.stderr);
      assert.equal(result.stderr, '');
      const contents = readFileSync(settings.path, 'utf8');
      const users = /^PUSH_TEST_USERS_JSON='(.+)'$/m.exec(contents)?.[1];
      assert.ok(users, '설정 파일에 해시된 계정이 있어야 합니다.');
      process.env.PUSH_TEST_USERS_JSON = users;
      assert.equal(verifyTestPassword(userId, password), userId);
      assert.equal(verifyTestPassword(userId, `${password}!`), null);
      for (const invalid of ['', null, undefined, 123, {}]) {
        assert.equal(verifyTestPassword(userId, invalid), null);
      }
    } finally {
      if (previousUsers === undefined) delete process.env.PUSH_TEST_USERS_JSON;
      else process.env.PUSH_TEST_USERS_JSON = previousUsers;
      settings.cleanup();
    }
  });
}

test('빈 비밀번호는 거부하고 설정 파일을 만들지 않는다', async () => {
  const settings = temporarySettings();
  try {
    const result = await runSetup(settings.directory, '');
    assert.equal(result.code, 1);
    assert.match(result.stderr, /비밀번호/);
    assert.equal(existsSync(settings.path), false);
  } finally { settings.cleanup(); }
});

test('계정 설정을 다시 실행해도 기존 설정을 덮어쓰지 않는다', async () => {
  const settings = temporarySettings();
  const existing = 'fixture-existing-settings\n';
  try {
    writeFileSync(settings.path, existing);
    const result = await runSetup(settings.directory, 'a');
    assert.equal(result.code, 1);
    assert.match(result.stderr, /설정 파일이 이미 있습니다/);
    assert.equal(readFileSync(settings.path, 'utf8'), existing);
    assert.doesNotMatch(result.stdout, /테스트 비밀번호/);
  } finally { settings.cleanup(); }
});
