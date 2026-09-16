import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { hasNativePushBridge, NativePushError, requestNativePush } from '../../utils/push-test-native';

function installBridge(context: TestContext) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const messages: Array<{ id: string; method: string }> = [];
  const bridge: NonNullable<Window['DxsNativePush']> = {
    onmessage: null,
    postMessage: message => messages.push(JSON.parse(message)),
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { DxsNativePush: bridge } });
  context.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  return {
    bridge,
    messages,
    reply: (id: string, result: unknown) => bridge.onmessage?.({ data: JSON.stringify({ id, result }) }),
  };
}

test('실제 postMessage 브릿지가 없으면 APK로 판단하지 않는다', context => {
  const { bridge } = installBridge(context);
  assert.equal(hasNativePushBridge(), true);
  Object.assign(bridge, { postMessage: undefined });
  assert.equal(hasNativePushBridge(), false);
});

test('네이티브 응답이 뒤바뀌어도 요청 ID에 맞게 현재 상태와 캐시 토큰을 받는다', async context => {
  const mock = installBridge(context);
  const status = requestNativePush('getStatus');
  const token = requestNativePush('getToken');
  assert.deepEqual(mock.messages.map(message => message.method), ['getStatus', 'getToken']);
  assert.notEqual(mock.messages[0].id, mock.messages[1].id);
  mock.reply('unrelated-request', { token: 'ignored' });
  mock.reply(mock.messages[1].id, { token: null });
  mock.reply(mock.messages[0].id, { permission: 'default', configured: true });
  assert.deepEqual(await token, { token: null });
  assert.deepEqual(await status, { permission: 'default', configured: true });
});

test('잘못된 토큰 응답과 네이티브 오류 원문은 UI로 전달하지 않는다', async context => {
  const mock = installBridge(context);
  const invalid = requestNativePush('register');
  mock.reply(mock.messages[0].id, { token: '' });
  await assert.rejects(invalid, error => error instanceof NativePushError && error.code === 'INVALID_RESPONSE');
  const failed = requestNativePush('unregister');
  mock.bridge.onmessage?.({ data: JSON.stringify({ id: mock.messages[1].id, error: { code: 'DEVICE_ERROR', message: 'internal-private-diagnostic' } }) });
  await assert.rejects(failed, error => error instanceof NativePushError && !error.message.includes('internal-private-diagnostic'));
});

test('끊어진 브릿지 호출은 제한 시간 후 실패하고 늦은 응답은 무시한다', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const mock = installBridge(context);
  const request = requestNativePush('getStatus');
  const rejected = assert.rejects(request, error => error instanceof NativePushError && error.code === 'TIMEOUT');
  context.mock.timers.tick(20_000);
  await rejected;
  assert.doesNotThrow(() => mock.reply(mock.messages[0].id, { permission: 'granted', configured: true }));
});
