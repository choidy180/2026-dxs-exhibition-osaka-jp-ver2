import assert from 'node:assert/strict';
import { X509Certificate } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rootCertificates } from 'node:tls';
import test from 'node:test';
import { GET } from '../../app/lab/push/test-ca.crt/route';
import { getPushTestCertificateSetup } from '../../lib/push-test/certificate';

test('인증서 경로는 명시적인 로컬 테스트에서 공개 CA만 제공하고 비활성화 또는 파일 오류 시 닫힌다', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'push-test-certificate-route-'));
  const data = join(directory, '.data');
  const path = join(data, 'push-test-ca.crt');
  const previousDirectory = process.cwd();
  const names = ['APP_ENV', 'PUSH_TEST_ENABLED', 'PUSH_TEST_LOCAL_CERTIFICATE', 'PUSH_TEST_CERTIFICATE_DOWNLOAD_URL', 'PUSH_TEST_ORIGIN'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  mkdirSync(data);
  writeFileSync(path, rootCertificates[0]);
  try {
    process.chdir(directory);
    process.env.APP_ENV = 'test';
    process.env.PUSH_TEST_ENABLED = 'true';
    process.env.PUSH_TEST_LOCAL_CERTIFICATE = 'true';
    process.env.PUSH_TEST_ORIGIN = 'https://192.168.10.2:3000';
    process.env.PUSH_TEST_CERTIFICATE_DOWNLOAD_URL = 'http://192.168.10.2:3001/lab/push/test-ca.crt';
    assert.equal(getPushTestCertificateSetup()?.downloadPath, '/lab/push/test-ca.crt');
    const response = await GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.match(response.headers.get('Content-Disposition') ?? '', /attachment/);
    assert.equal(new X509Certificate(Buffer.from(await response.arrayBuffer())).ca, true);
    process.env.APP_ENV = 'production';
    assert.equal((await GET()).status, 404);
    process.env.APP_ENV = 'test';
    process.env.PUSH_TEST_LOCAL_CERTIFICATE = 'false';
    assert.equal((await GET()).status, 404);
    process.env.PUSH_TEST_LOCAL_CERTIFICATE = 'true';
    process.env.PUSH_TEST_CERTIFICATE_DOWNLOAD_URL = 'http://other.example/lab/push/test-ca.crt';
    assert.equal(getPushTestCertificateSetup(), null);
    process.env.PUSH_TEST_CERTIFICATE_DOWNLOAD_URL = 'http://192.168.10.2:3001/lab/push/test-ca.crt';
    writeFileSync(path, 'not a certificate');
    assert.equal((await GET()).status, 404);
  } finally {
    process.chdir(previousDirectory);
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
    unlinkSync(path);
    rmdirSync(data);
    rmdirSync(directory);
  }
});
