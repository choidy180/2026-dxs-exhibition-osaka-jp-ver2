import assert from 'node:assert/strict';
import type { NetworkInterfaceInfo } from 'node:os';
import test from 'node:test';
import { resolvePrivateHost, selectPrivateHost } from '../../scripts/push-test-local.mjs';

function entry(address: string, internal = false): NetworkInterfaceInfo {
  return { address, internal, family: 'IPv4', netmask: '255.255.255.0', mac: '00:00:00:00:00:00', cidr: null };
}

test('공인 주소, 자동 할당 주소, 루프백을 제외하고 유일한 내부 주소를 선택한다', () => {
  assert.equal(selectPrivateHost({
    public: [entry('203.0.113.2')],
    automatic: [entry('169.254.10.2')],
    loopback: [entry('127.0.0.1', true)],
    wifi: [entry('192.168.10.4')],
    duplicate: [entry('192.168.10.4')],
  }), '192.168.10.4');
});

test('RFC1918 세 범위를 허용하고 경계 밖 주소는 제외한다', () => {
  for (const address of ['10.0.0.2', '172.16.0.2', '172.31.255.2', '192.168.0.2']) {
    assert.equal(selectPrivateHost({ wifi: [entry(address)] }), address);
  }
  for (const address of ['172.15.255.2', '172.32.0.2', '100.64.0.2', '192.169.0.2', '0.0.0.0', '192.168.999.1']) {
    assert.throws(() => selectPrivateHost({ wifi: [entry(address)] }), /같은 공유기/);
  }
});

test('내부 주소가 없으면 공유기 연결 방법을 안내하고 공인 주소를 노출하지 않는다', () => {
  assert.throws(() => selectPrivateHost({
    public: [entry('203.0.113.2')],
    internal: [entry('10.0.0.2', true)],
    ipv6: [{ ...entry('fd00::2'), family: 'IPv6', scopeid: 0 }],
    inactive: undefined,
  }), error => error instanceof Error && /Wi-Fi 또는 랜선/.test(error.message)
    && !error.message.includes('203.0.113.2'));
});

test('여러 내부 주소가 있으면 추측하지 않고 내부 후보와 명시적 선택 방법을 안내한다', () => {
  assert.throws(() => selectPrivateHost({
    public: [entry('203.0.113.2')],
    wifi: [entry('192.168.1.4')],
    ethernet: [entry('10.0.0.4')],
  }), error => error instanceof Error && error.message.includes('192.168.1.4')
    && error.message.includes('10.0.0.4') && error.message.includes('--host=IP')
    && !error.message.includes('203.0.113.2'));
});

test('명시적 주소는 PC에 할당된 내부 주소만 허용한다', () => {
  const interfaces = { wifi: [entry('192.168.1.4')], ethernet: [entry('10.0.0.4')] };
  assert.equal(resolvePrivateHost('10.0.0.4', interfaces), '10.0.0.4');
  assert.throws(() => resolvePrivateHost('192.168.1.5', interfaces), /현재 PC에 없습니다/);
  for (const requested of ['', '0.0.0.0', '127.0.0.1', '203.0.113.2', 'localhost', '10.0.0.4 & whoami']) {
    assert.throws(() => resolvePrivateHost(requested, interfaces), /내부 IPv4/);
  }
  assert.equal(resolvePrivateHost(undefined, { wifi: [entry('192.168.1.4')] }), '192.168.1.4');
});
