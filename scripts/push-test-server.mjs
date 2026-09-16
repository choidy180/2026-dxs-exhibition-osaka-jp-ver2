import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import nextEnv from '@next/env';
import { loadDedicatedTestEnv } from './push-test-env.mjs';
import { prepareLocalHttps, resolvePrivateHost } from './push-test-local.mjs';
import { startCertificateDownload } from './push-test-certificate.mjs';

const phone = process.argv.includes('--phone');
const dev = phone || process.argv.includes('--dev');
process.env.NODE_ENV ??= dev ? 'development' : 'production';
nextEnv.loadEnvConfig(process.cwd(), dev);
loadDedicatedTestEnv();
const require = createRequire(import.meta.url);
const children = new Set();
let stopping = false;
let certificateServer;

function launch(name, args) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env, windowsHide: true });
  children.add(child);
  child.on('error', () => { process.stderr.write(`[push-test] ${name} 실행 실패\n`); stop(1); });
  child.on('exit', () => {
    children.delete(child);
    if (!stopping) {
      process.stderr.write(`[push-test] ${name} 종료, 3초 후 재시작\n`);
      setTimeout(() => { if (!stopping) launch(name, args); }, 3000);
    }
  });
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  certificateServer?.close();
  for (const child of children) child.kill('SIGTERM');
  const deadline = setTimeout(() => process.exit(code), 12_000);
  Promise.all([...children].map(child => new Promise(resolve => child.once('exit', resolve))))
    .then(() => { clearTimeout(deadline); process.exit(code); });
}
async function main() {
  if (process.env.APP_ENV !== 'test' || process.env.PUSH_TEST_ENABLED !== 'true') {
    throw new Error('테스트 설정이 없습니다. 휴대폰 테스트는 npm run push:setup -- --phone 을 먼저 실행하세요. APP_ENV=test 및 PUSH_TEST_ENABLED=true인 환경에서만 실행합니다.');
  }
  const args = [require.resolve('next/dist/bin/next'), dev ? 'dev' : 'start'];
  if (phone) {
    const host = resolvePrivateHost(process.argv.find(arg => arg.startsWith('--host='))?.slice(7));
    const port = process.env.PORT || '3000';
    if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65534) {
      throw new Error('휴대폰 테스트 PORT는 1024~65534 사이의 숫자로 설정하세요. 기본값은 3000이며, 다음 포트는 인증서 다운로드에 사용합니다.');
    }
    process.stdout.write('\n휴대폰 연결을 위한 테스트 인증서를 준비합니다. 처음에는 Windows 인증서 설치 확인 창이 나타날 수 있습니다.\n');
    const certificate = await prepareLocalHttps(host);
    process.env.PUSH_TEST_ORIGIN = `https://${host}:${port}`;
    process.env.NODE_EXTRA_CA_CERTS ??= certificate.rootCA;
    const downloadPort = Number(port) + 1;
    certificateServer = await startCertificateDownload({ host, port: downloadPort, certificatePath: certificate.publicCertificate });
    process.env.PUSH_TEST_LOCAL_CERTIFICATE = 'true';
    process.env.PUSH_TEST_CERTIFICATE_DOWNLOAD_URL = `http://${host}:${downloadPort}/lab/push/test-ca.crt`;
    args.push('--hostname', host, '--port', port, '--experimental-https',
      '--experimental-https-key', certificate.key, '--experimental-https-cert', certificate.cert,
      '--experimental-https-ca', certificate.rootCA);
    process.stdout.write([
      '', '======== 갤럭시 푸시 테스트 ========',
      `접속 주소: ${process.env.PUSH_TEST_ORIGIN}/lab/push`,
      `휴대폰 인증서 다운로드: ${process.env.PUSH_TEST_CERTIFICATE_DOWNLOAD_URL}`,
      `휴대폰에 복사할 인증서: ${certificate.publicCertificate}`,
      '컴퓨터와 갤럭시 모두 위 주소로 접속하세요. 휴대폰에는 위 .crt 파일을 CA 인증서로 설치해야 합니다.',
      '아래 Ready 표시가 나오면 접속하세요. 테스트 중에는 이 창을 켜 두세요. 종료: Ctrl+C',
      '===================================', '',
    ].join('\n'));
  } else {
    args.push('--hostname', '127.0.0.1');
  }
  process.on('SIGINT', () => stop());
  process.on('SIGTERM', () => stop());
  launch('웹 서버', args);
  launch('푸시 워커', [require.resolve('tsx/cli'), 'scripts/push-test-worker.ts']);
}

main().catch(error => {
  certificateServer?.close();
  process.stderr.write(`[push-test] ${error.message}\n`);
  process.exitCode = 1;
});
