import { X509Certificate } from 'node:crypto';
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolvePrivateHost } from './push-test-local.mjs';

const MAX_CERTIFICATE_BYTES = 64 * 1024;
const CERTIFICATE_PATH = '/lab/push/test-ca.crt';

function testEnabled() {
  return process.env.APP_ENV === 'test' && process.env.PUSH_TEST_ENABLED === 'true';
}

function publicDer(contents) {
  const certificate = new X509Certificate(contents);
  const now = Date.now();
  if (!certificate.ca || Date.parse(certificate.validFrom) > now || Date.parse(certificate.validTo) <= now) {
    throw new Error('사용할 수 없는 공개 인증서입니다.');
  }
  return certificate.raw;
}

export function readPublicCertificate(path) {
  let descriptor;
  try {
    descriptor = openSync(path, 'r');
    const file = fstatSync(descriptor);
    if (!file.isFile() || file.size > MAX_CERTIFICATE_BYTES) throw new Error('Invalid certificate file');
    const contents = Buffer.alloc(MAX_CERTIFICATE_BYTES + 1);
    let length = 0;
    while (length < contents.length) {
      const count = readSync(descriptor, contents, length, contents.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length === 0 || length > MAX_CERTIFICATE_BYTES) throw new Error('Invalid certificate size');
    // PEM 뒤에 다른 내용이 있어도 공개 인증서의 DER 바이트만 반환한다.
    return publicDer(contents.subarray(0, length));
  } catch {
    throw new Error('공개 인증서를 읽을 수 없습니다. HTTPS 준비 후 다시 실행하세요.');
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

export function createCertificateDownloadHandler({ host, port, certificate }) {
  const expectedHost = `${host}:${port}`;
  const publicCertificate = publicDer(certificate);
  return (request, response) => {
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!testEnabled() || request.headers.host !== expectedHost || request.url !== CERTIFICATE_PATH) {
      response.writeHead(404).end();
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      response.writeHead(405).end();
      return;
    }
    response.setHeader('Content-Type', 'application/x-x509-ca-cert');
    response.setHeader('Content-Disposition', 'attachment; filename="push-test-ca.crt"');
    response.setHeader('Content-Length', publicCertificate.length);
    response.writeHead(200);
    response.end(request.method === 'HEAD' ? undefined : publicCertificate);
  };
}

export async function startCertificateDownload({ host, port, certificatePath }) {
  if (!testEnabled()) throw new Error('인증서 다운로드는 활성화한 테스트 환경에서만 실행할 수 있습니다.');
  const privateHost = resolvePrivateHost(host);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('인증서 다운로드 포트는 1024~65535 사이의 숫자여야 합니다.');
  }
  const certificate = readPublicCertificate(certificatePath);
  const server = createServer(createCertificateDownloadHandler({ host: privateHost, port, certificate }));
  await new Promise((resolve, reject) => {
    const onError = () => reject(new Error('인증서 다운로드 서버를 시작하지 못했습니다. 포트와 내부 연결을 확인해주세요.'));
    server.once('error', onError);
    server.listen(port, privateHost, () => {
      server.removeListener('error', onError);
      resolve();
    });
  });
  return server;
}
