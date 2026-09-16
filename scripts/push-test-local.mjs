import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { isIPv4 } from 'node:net';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';

function isPrivateIPv4(address) {
  if (typeof address !== 'string' || !isIPv4(address)) return false;
  const [first, second] = address.split('.').map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

function privateHosts(interfaces) {
  return [...new Set(Object.values(interfaces).flatMap(entries => (entries ?? [])
    .filter(entry => !entry.internal && isPrivateIPv4(entry.address))
    .map(entry => entry.address)))];
}

export function selectPrivateHost(interfaces = networkInterfaces()) {
  const hosts = privateHosts(interfaces);
  if (hosts.length === 0) {
    throw new Error('휴대폰에서 접속할 내부 주소가 없습니다. PC와 갤럭시를 같은 공유기에 연결하세요. PC는 Wi-Fi 또는 랜선을 사용할 수 있습니다. 연결한 뒤 명령을 다시 실행하세요.');
  }
  if (hosts.length > 1) {
    throw new Error(`내부 주소가 여러 개입니다: ${hosts.join(', ')}. 갤럭시와 같은 공유기에 연결된 PC 주소를 선택해 --host=IP 옵션으로 입력하세요. 예: --host=${hosts[0]}`);
  }
  return hosts[0];
}

export function resolvePrivateHost(requested, interfaces = networkInterfaces()) {
  if (requested === undefined) return selectPrivateHost(interfaces);
  if (!isPrivateIPv4(requested)) {
    throw new Error('--host에는 PC의 내부 IPv4 주소만 입력할 수 있습니다. 10.*, 172.16~31.*, 192.168.* 주소를 사용하세요.');
  }
  if (!privateHosts(interfaces).includes(requested)) {
    throw new Error('입력한 내부 주소가 현재 PC에 없습니다. PC와 갤럭시를 같은 공유기에 연결한 뒤 PC에 할당된 주소를 사용하세요.');
  }
  return requested;
}

export async function prepareLocalHttps(host) {
  const verifiedHost = resolvePrivateHost(host);
  const require = createRequire(import.meta.url);
  const { createSelfSignedCertificate } = require('next/dist/lib/mkcert');
  const certificate = await createSelfSignedCertificate(verifiedHost);
  if (!certificate?.key || !certificate.cert || !certificate.rootCA) {
    throw new Error('HTTPS 인증서를 준비하지 못했습니다. 인증서 설치 안내와 PC 권한을 확인한 뒤 다시 실행하세요. HTTP 서버로 전환하지 않습니다.');
  }
  const key = resolve(certificate.key);
  const cert = resolve(certificate.cert);
  const rootCA = resolve(certificate.rootCA);
  const publicCertificate = resolve('.data', 'push-test-ca.crt');
  await mkdir(resolve('.data'), { recursive: true });
  // 휴대폰으로 옮기는 것은 공개 CA 인증서뿐이다. 비밀키는 복사하지 않는다.
  await copyFile(rootCA, publicCertificate);
  return { key, cert, rootCA, publicCertificate };
}
