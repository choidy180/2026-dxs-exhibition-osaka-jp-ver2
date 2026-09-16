import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import type { PushTestStatus } from '../../types/push-test';

type Hook = ReturnType<typeof import('../../hooks/use-push-test').usePushTest>;
type Options = {
  permission?: NotificationPermission;
  outcome?: NotificationPermission | 'reject' | 'throw';
  existing?: 'matching' | 'old-key';
  failLogin?: boolean;
  loginWait?: Promise<void>;
  native?: boolean;
  restoredSession?: boolean;
  fcmReady?: boolean;
  failUnsubscribe?: boolean;
};
const publicKey = Buffer.from([4, ...Array<number>(64).fill(1)]).toString('base64url');
const oldKey = Buffer.from([4, ...Array<number>(64).fill(2)]).toString('base64url');
const pending = { id: 'existing-reservation', dueAt: 12345 };
const compiled = ts.transpileModule(readFileSync('hooks/use-push-test.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const settle = () => new Promise<void>(resolve => setImmediate(resolve));

// 실제 훅을 실행하되 React 렌더러 대신 상태 슬롯과 브라우저/API 경계만 대체한다.
function createHarness(options: Options = {}) {
  const calls: string[] = [];
  const slots: unknown[] = [];
  const effects: Array<() => void | (() => void)> = [];
  let cursor = 0;
  let captureEffects = true;
  let authenticated = !!options.restoredSession;
  let permission = options.permission ?? 'default';
  let serverRegistered = !!options.existing;
  let reservation: PushTestStatus['pending'] = options.existing ? pending : null;
  let nativeToken = options.existing ? 'native-existing-token' : null;
  function makeSubscription(key: string, endpoint: string) {
    return {
      endpoint,
      options: { applicationServerKey: Uint8Array.from(Buffer.from(key, 'base64url')).buffer },
      toJSON: () => ({ endpoint }),
      unsubscribe: async () => { calls.push('browser-unsubscribe'); subscription = null; return true; },
    };
  }
  let subscription: ReturnType<typeof makeSubscription> | null = options.existing
    ? makeSubscription(options.existing === 'matching' ? publicKey : oldKey, 'https://push.test/existing') : null;
  const registration = {
    scope: 'https://app.test/lab/push',
    active: { scriptURL: 'https://app.test/lab/push/sw.js' },
    pushManager: {
      getSubscription: async () => subscription,
      subscribe: async ({ applicationServerKey }: { applicationServerKey: Uint8Array }) => {
        calls.push('browser-subscribe');
        assert.equal(authenticated, true);
        assert.equal(Buffer.from(applicationServerKey).toString('base64url'), publicKey);
        subscription = makeSubscription(publicKey, 'https://push.test/new');
        return subscription;
      },
    },
  };
  class ApiError extends Error {
    constructor(message: string, public status: number) { super(message); }
  }
  const status = (): PushTestStatus => ({ registered: serverRegistered, publicKey, pending: reservation, lastJob: null, workerReady: true, fcmReady: options.fcmReady ?? true });
  const api = {
    PushTestApiError: ApiError,
    loginPushTest: async () => {
      calls.push('login');
      await options.loginWait;
      if (options.failLogin) throw new ApiError('테스트 계정 또는 비밀번호를 확인해주세요.', 401);
      authenticated = true;
      calls.push('authenticated');
    },
    fetchPushTestStatus: async () => {
      calls.push('status');
      if (!authenticated) throw new ApiError('테스트 계정으로 로그인해주세요.', 401);
      return status();
    },
    subscribePushTest: async (value: unknown) => {
      calls.push('server-subscribe');
      assert.equal(authenticated, true);
      if (options.native) assert.equal(JSON.stringify(value), JSON.stringify({ platform: 'android', token: nativeToken }));
      serverRegistered = true;
      return status();
    },
    unsubscribePushTest: async () => {
      calls.push('server-unsubscribe');
      if (options.failUnsubscribe) throw new ApiError('예약 취소를 확인하지 못했습니다.', 503);
      serverRegistered = false;
      reservation = null;
      return status();
    },
    schedulePushTest: async () => { throw new Error('로그인 테스트에서 발송을 예약하면 안 됩니다.'); },
  };
  const react = {
    useState<T>(initial: T) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index] as T, (value: T | ((previous: T) => T)) => {
        slots[index] = typeof value === 'function' ? (value as (previous: T) => T)(slots[index] as T) : value;
      }];
    },
    useRef<T>(initial: T) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index] as { current: T };
    },
    useCallback: <T,>(callback: T) => callback,
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
    useEffect: (effect: () => void | (() => void)) => { if (captureEffects) effects.push(effect); },
  };
  const native = {
    hasNativePushBridge: () => !!options.native,
    subscribeNativePushBridge: () => () => undefined,
    nativePushEndpoint: (token: string) => `fcm:${token}`,
    NativePushError: class extends Error {},
    requestNativePush: async (method: string) => {
      calls.push(`native-${method}`);
      if (method === 'getStatus') return { permission, configured: true };
      if (method === 'getToken') return { token: nativeToken };
      if (method === 'requestPermission') {
        assert.equal(authenticated, true, '앱 권한 요청도 인증 성공 뒤에만 시작한다.');
        permission = options.outcome === 'denied' || options.outcome === 'default' ? options.outcome : 'granted';
        return { permission, configured: true };
      }
      if (method === 'register') {
        assert.equal(authenticated, true);
        assert.equal(permission, 'granted');
        nativeToken ??= 'native-new-token';
        return { token: nativeToken };
      }
      if (method === 'unregister') {
        nativeToken = null;
        return { unregistered: true };
      }
      throw new Error(`Unexpected native method: ${method}`);
    },
  };
  const notification = {
    get permission() { return permission; },
    requestPermission() {
      calls.push('permission');
      if (options.outcome === 'throw') throw new DOMException('fixture', 'SecurityError');
      if (options.outcome === 'reject') return Promise.reject(new DOMException('fixture', 'SecurityError'));
      permission = options.outcome ?? 'granted';
      return Promise.resolve(permission);
    },
  };
  const events = new Map<string, () => void>();
  const eventTarget = {
    addEventListener: (name: string, callback: () => void) => events.set(name, callback),
    removeEventListener: (name: string) => events.delete(name),
  };
  const hookModule = { exports: {} as { usePushTest: () => Hook } };
  runInNewContext(compiled, {
    module: hookModule, exports: hookModule.exports,
    require: (name: string) => {
      if (name === 'react') return react;
      if (name === '@/utils/push-test-api') return api;
      if (name === '@/utils/push-test-native') return native;
      throw new Error(`Unexpected hook dependency: ${name}`);
    },
    URL, Uint8Array, Promise, DOMException, Notification: notification,
    window: {
      ...eventTarget, isSecureContext: true, Notification: notification, PushManager: {},
      location: { origin: 'https://app.test' }, matchMedia: () => ({ matches: true }),
      atob: (value: string) => Buffer.from(value, 'base64').toString('binary'),
      setTimeout, clearTimeout, setInterval, clearInterval,
    },
    document: { ...eventTarget, visibilityState: 'visible' },
    navigator: {
      userAgent: 'Android', platform: 'Linux', maxTouchPoints: 5,
      serviceWorker: { getRegistrations: async () => {
        assert.notEqual(options.native, true, '앱에서는 서비스 워커를 사용하지 않는다.');
        return [registration];
      } },
    },
  });
  const render = () => { cursor = 0; return hookModule.exports.usePushTest(); };
  return {
    calls, render,
    async mount() {
      render();
      captureEffects = false;
      effects.forEach(effect => effect());
      await settle();
      return render();
    },
    async focus() { events.get('focus')?.(); await settle(); return render(); },
  };
}

test('로그인 클릭에서 권한 요청을 먼저 시작하고 인증 성공 후 현재 기기를 한 번 등록한다', async () => {
  const harness = createHarness();
  const mounted = await harness.mount();
  assert.equal(mounted.requiresLogin, true);
  assert.equal(harness.calls.includes('permission'), false);
  harness.calls.length = 0;
  const login = mounted.login('fixture-user', 'fixture-password');
  assert.deepEqual(harness.calls, ['permission', 'login']);
  await login;
  assert.deepEqual(harness.calls, ['permission', 'login', 'authenticated', 'status', 'browser-subscribe', 'server-subscribe']);
  const current = harness.render();
  assert.equal(current.requiresLogin, false);
  assert.equal(current.status?.registered, true);
  assert.equal(current.browser.hasSubscription, true);
});

test('이미 등록된 같은 구독은 권한 재요청과 서버 재등록 없이 기존 예약을 유지한다', async () => {
  const harness = createHarness({ permission: 'granted', existing: 'matching' });
  const mounted = await harness.mount();
  harness.calls.length = 0;
  await mounted.login('fixture-user', 'fixture-password');
  assert.deepEqual(harness.calls, ['login', 'authenticated', 'status']);
  assert.equal(harness.render().status?.pending?.id, pending.id);
});

test('로그인 실패 뒤에는 브라우저와 서버 어느 쪽에도 구독을 등록하지 않는다', async () => {
  const harness = createHarness({ failLogin: true });
  const mounted = await harness.mount();
  harness.calls.length = 0;
  await mounted.login('fixture-user', 'fixture-password');
  assert.deepEqual(harness.calls, ['permission', 'login']);
  assert.equal(harness.render().requiresLogin, true);
});

test('권한 거절과 닫기는 로그인 성공 상태를 유지하고 수동 등록을 안내한다', async () => {
  for (const outcome of ['denied', 'default'] as const) {
    const harness = createHarness({ outcome });
    const mounted = await harness.mount();
    harness.calls.length = 0;
    await mounted.login('fixture-user', 'fixture-password');
    assert.deepEqual(harness.calls, ['permission', 'login', 'authenticated', 'status']);
    const current = harness.render();
    assert.equal(current.requiresLogin, false);
    assert.equal(current.status?.publicKey, publicKey);
    assert.equal(current.browser.permission, outcome);
    assert.match(current.message ?? '', /알림 켜기/);
  }
});

test('인증 응답 전 권한 요청이 거절되거나 예외가 나도 처리하고 로그인 상태를 유지한다', async () => {
  for (const outcome of ['reject', 'throw'] as const) {
    let completeLogin!: () => void;
    const loginWait = new Promise<void>(resolve => { completeLogin = resolve; });
    const harness = createHarness({ outcome, loginWait });
    const mounted = await harness.mount();
    harness.calls.length = 0;
    const login = mounted.login('fixture-user', 'fixture-password');
    await settle(); // 처리되지 않은 rejection은 node:test가 이 시점에 실패로 보고한다.
    completeLogin();
    await login;
    assert.deepEqual(harness.calls, ['permission', 'login', 'authenticated', 'status']);
    assert.equal(harness.render().requiresLogin, false);
    assert.equal(harness.render().status?.publicKey, publicKey);
  }
});

test('키가 달라진 구독은 서버 예약 취소 후 교체하고 새 공개키로 등록한다', async () => {
  const harness = createHarness({ permission: 'granted', existing: 'old-key' });
  const mounted = await harness.mount();
  harness.calls.length = 0;
  await mounted.login('fixture-user', 'fixture-password');
  assert.deepEqual(harness.calls, ['login', 'authenticated', 'status', 'server-unsubscribe', 'browser-unsubscribe', 'browser-subscribe', 'server-subscribe']);
  assert.equal(harness.render().status?.pending, null);
});

test('알림 끄기 뒤 새로고침과 포커스 복귀가 알림을 다시 등록하지 않는다', async () => {
  const harness = createHarness({ permission: 'granted', existing: 'matching' });
  await (await harness.mount()).login('fixture-user', 'fixture-password');
  harness.calls.length = 0;
  await harness.render().disable();
  await harness.render().refresh();
  await harness.focus();
  assert.deepEqual(harness.calls, ['server-unsubscribe', 'browser-unsubscribe', 'status', 'status']);
  assert.equal(harness.render().status?.registered, false);
});

test('APK 진입은 권한 요청 없이 캐시 토큰과 서버 인증만 확인한다', async () => {
  const harness = createHarness({ native: true });
  const current = await harness.mount();
  assert.deepEqual(harness.calls, ['native-getStatus', 'native-getToken', 'status']);
  assert.equal(current.isNative, true);
  assert.equal(current.isAuthenticated, false);
  assert.equal(current.requiresLogin, true);
});

test('APK는 서버 인증 이후에만 네이티브 권한과 토큰을 등록한다', async () => {
  const harness = createHarness({ native: true });
  const current = await harness.mount();
  harness.calls.length = 0;
  await current.login('fixture-user', 'fixture-password');
  assert.deepEqual(harness.calls, ['login', 'authenticated', 'status', 'native-requestPermission', 'native-register', 'server-subscribe']);
  assert.equal(harness.render().status?.registered, true);
  assert.equal(harness.render().isAuthenticated, true);
});

test('APK 로그인 실패 또는 알림 권한 거절 시 토큰을 발급하지 않는다', async () => {
  for (const options of [{ failLogin: true }, { outcome: 'denied' as const }]) {
    const harness = createHarness({ native: true, ...options });
    await (await harness.mount()).login('fixture-user', 'fixture-password');
    assert.equal(harness.calls.includes('native-register'), false);
    assert.equal(harness.calls.includes('server-subscribe'), false);
    assert.equal(harness.render().isAuthenticated, !('failLogin' in options));
  }
});

test('APK 재실행과 포커스 복귀는 기존 토큰만 읽고 예약을 유지한다', async () => {
  const harness = createHarness({ native: true, restoredSession: true, permission: 'granted', existing: 'matching' });
  const current = await harness.mount();
  await harness.focus();
  assert.equal(current.isAuthenticated, true);
  assert.equal(harness.render().status?.pending?.id, pending.id);
  assert.equal(harness.calls.includes('native-register'), false);
  assert.equal(harness.calls.includes('native-requestPermission'), false);
  assert.equal(harness.calls.includes('server-subscribe'), false);
});

test('APK 알림 끄기는 서버 취소 후 기기를 해제하며 복귀 시 다시 등록하지 않는다', async () => {
  const harness = createHarness({ native: true, restoredSession: true, permission: 'granted', existing: 'matching' });
  const current = await harness.mount();
  harness.calls.length = 0;
  await current.disable();
  await harness.focus();
  assert.deepEqual(harness.calls, ['server-unsubscribe', 'native-unregister', 'native-getStatus', 'native-getToken', 'status']);
  assert.equal(harness.render().status?.registered, false);
});

test('APK 서버 취소가 실패하면 네이티브 토큰을 유지하여 재시도할 수 있다', async () => {
  const harness = createHarness({ native: true, restoredSession: true, permission: 'granted', existing: 'matching', failUnsubscribe: true });
  const current = await harness.mount();
  harness.calls.length = 0;
  await current.disable();
  assert.deepEqual(harness.calls, ['server-unsubscribe']);
  assert.equal(harness.render().browser.hasSubscription, true);
  assert.equal(harness.render().isAuthenticated, true);
});

test('APK 서버 전송 설정이 없으면 인증 상태를 유지하며 권한과 토큰을 요청하지 않는다', async () => {
  const harness = createHarness({ native: true, fcmReady: false });
  await (await harness.mount()).login('fixture-user', 'fixture-password');
  assert.equal(harness.render().isAuthenticated, true);
  assert.equal(harness.calls.includes('native-requestPermission'), false);
  assert.equal(harness.calls.includes('native-register'), false);
  assert.match(harness.render().error ?? '', /서버의 앱 알림 설정/);
});
