import assert from 'node:assert/strict';
import { X509Certificate } from 'node:crypto';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { createServer, request, type IncomingHttpHeaders } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { rootCertificates } from 'node:tls';
import { createCertificateDownloadHandler, readPublicCertificate, startCertificateDownload } from '../../scripts/push-test-certificate.mjs';

const certificatePem = rootCertificates.find(pem => {
  const certificate = new X509Certificate(pem);
  return certificate.ca && Date.parse(certificate.validFrom) < Date.now() && Date.parse(certificate.validTo) > Date.now();
});
assert.ok(certificatePem);
const certificateDer = new X509Certificate(certificatePem).raw;

test('공개 인증서는 최대 크기를 제한하고 덧붙은 데이터 없이 DER만 내보낸다', () => {
  const directory = mkdtempSync(join(tmpdir(), 'push-test-certificate-'));
  const path = join(directory, 'fixture.pem');
  try {
    writeFileSync(path, `${certificatePem}\n-----BEGIN PRIVATE KEY-----\nfixture-only-not-a-key\n-----END PRIVATE KEY-----\n`);
    assert.deepEqual(readPublicCertificate(path), certificateDer);
    writeFileSync(path, certificateDer);
    assert.deepEqual(readPublicCertificate(path), certificateDer);
    for (const invalid of ['', 'not-a-certificate', Buffer.alloc(64 * 1024 + 1)]) {
      writeFileSync(path, invalid);
      assert.throws(() => readPublicCertificate(path), /공개 인증서를 읽을 수 없습니다/);
    }
    assert.throws(() => readPublicCertificate(directory), /공개 인증서를 읽을 수 없습니다/);
  } finally {
    unlinkSync(path);
    rmdirSync(directory);
  }
});

test('다운로드는 정확한 경로와 Host의 GET/HEAD만 허용하며 테스트 활성화를 매번 확인한다', async () => {
  const previous = { APP_ENV: process.env.APP_ENV, PUSH_TEST_ENABLED: process.env.PUSH_TEST_ENABLED };
  const server = createServer();
  try {
    process.env.APP_ENV = 'test';
    process.env.PUSH_TEST_ENABLED = 'true';
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const host = `127.0.0.1:${address.port}`;
    server.on('request', createCertificateDownloadHandler({ host: '127.0.0.1', port: address.port, certificate: certificateDer }));
    const fetchCertificate = (path = '/lab/push/test-ca.crt', method = 'GET', requestHost = host) => new Promise<{
      status: number | undefined; headers: IncomingHttpHeaders; body: Buffer;
    }>((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port: address.port, path, method, headers: { Host: requestHost } }, response => {
        const chunks: Buffer[] = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
        response.on('error', reject);
      });
      req.on('error', reject);
      req.end();
    });
    const get = await fetchCertificate();
    assert.equal(get.status, 200);
    assert.deepEqual(get.body, certificateDer);
    assert.equal(get.headers['content-type'], 'application/x-x509-ca-cert');
    assert.equal(get.headers['content-disposition'], 'attachment; filename="push-test-ca.crt"');
    assert.match(get.headers['cache-control'] ?? '', /no-store/);
    assert.equal(get.headers['x-content-type-options'], 'nosniff');
    const head = await fetchCertificate('/lab/push/test-ca.crt', 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    assert.equal(Number(head.headers['content-length']), certificateDer.length);
    const post = await fetchCertificate('/lab/push/test-ca.crt', 'POST');
    assert.equal(post.status, 405);
    assert.equal(post.headers.allow, 'GET, HEAD');
    for (const path of ['/', '/lab/push', '/api/push-test/status', '/lab/push/../test-ca.crt', '/lab/push/test-ca.crt?file=key.pem', '/lab/push/test-ca.crt/', '/.data/push-test.sqlite']) {
      assert.equal((await fetchCertificate(path)).status, 404);
    }
    assert.equal((await fetchCertificate('/lab/push/test-ca.crt', 'GET', 'example.test')).status, 404);
    process.env.PUSH_TEST_ENABLED = 'false';
    assert.equal((await fetchCertificate()).status, 404);
    process.env.PUSH_TEST_ENABLED = 'true';
    process.env.APP_ENV = 'production';
    assert.equal((await fetchCertificate()).status, 404);
    await assert.rejects(startCertificateDownload({ host: '127.0.0.1', port: 3001, certificatePath: 'unused' }), /테스트 환경/);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
