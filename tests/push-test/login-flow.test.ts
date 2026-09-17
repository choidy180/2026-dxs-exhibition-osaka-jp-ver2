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
  failSubscribe?: boolean;
  failSchedule?: boolean;
  lostScheduleResponse?: boolean;
  lostScheduleStatus?: number;
  lostScheduleCode?: string;
  statusFailureAfterSchedule?: 0 | 401;
  failServiceWorker?: boolean;
  failServiceWorkerUpdate?: boolean;
  missingLocalSubscription?: boolean;
  failLocalCleanup?: boolean;
  scheduleWait?: Promise<void>;
  repeating?: boolean;
  workerReady?: boolean;
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
  let repeating = options.repeating ?? false;
  let localReadBlocked = false;
  let scheduleResponseLost = false;
  let statusFailure = options.statusFailureAfterSchedule;
  let workerUpdates = 0;
  let reservation: PushTestStatus['pending'] = options.existing ? pending : null;
  let nativeToken = options.existing && !options.missingLocalSubscription ? 'native-existing-token' : null;
  function makeSubscription(key: string, endpoint: string) {
    return {
      endpoint,
      options: { applicationServerKey: Uint8Array.from(Buffer.from(key, 'base64url')).buffer },
      toJSON: () => ({ endpoint }),
      unsubscribe: async () => { calls.push('browser-unsubscribe'); subscription = null; return true; },
    };
  }
  let subscription: ReturnType<typeof makeSubscription> | null = options.existing && !options.missingLocalSubscription
    ? makeSubscription(options.existing === 'matching' ? publicKey : oldKey, 'https://push.test/existing') : null;
  const registration = {
    scope: 'https://app.test/lab/push',
    active: { scriptURL: 'https://app.test/lab/push/sw.js' },
    update: async () => {
      workerUpdates += 1;
      if (options.failServiceWorkerUpdate) throw new DOMException('fixture', 'SecurityError');
    },
    pushManager: {
      getSubscription: async () => {
        if (localReadBlocked || (options.failLocalCleanup && !serverRegistered)) throw new DOMException('fixture', 'SecurityError');
        return subscription;
      },
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
    constructor(message: string, public status: number, public code = 'FIXTURE_ERROR') { super(message); }
  }
  const status = (): PushTestStatus => ({ registered: serverRegistered, repeating, publicKey, pending: reservation, lastJob: null, workerReady: options.workerReady ?? true, fcmReady: options.fcmReady ?? true });
  const api = {
    PushTestApiError: ApiError,
    loginPushTest: async () => {
      calls.push('login');
      await options.loginWait;
      if (options.failLogin) throw new ApiError('테스트 계정 또는 비밀번호를 확인해주세요.', 401);
      authenticated = true;
      calls.push('authenticated');
    },
    fetchPushTestStatus: async (endpoint: string | null) => {
      calls.push('status');
      if (!authenticated) throw new ApiError('테스트 계정으로 로그인해주세요.', 401);
      if (scheduleResponseLost && statusFailure !== undefined) throw new ApiError('상태를 확인하지 못했습니다.', statusFailure);
      return { ...status(), registered: !!endpoint && serverRegistered };
    },
    subscribePushTest: async (value: unknown) => {
      calls.push('server-subscribe');
      assert.equal(authenticated, true);
      if (options.native) assert.equal(JSON.stringify(value), JSON.stringify({ platform: 'android', token: nativeToken }));
      if (options.failSubscribe) throw new ApiError('기기 등록에 실패했습니다.', 503);
      serverRegistered = true;
      return status();
    },
    unsubscribePushTest: async () => {
      calls.push('server-unsubscribe');
      if (options.failUnsubscribe) throw new ApiError('예약 취소를 확인하지 못했습니다.', 503);
      serverRegistered = false;
      repeating = false;
      reservation = null;
      return status();
    },
    schedulePushTest: async (endpoint: string, repeat: boolean) => {
      calls.push(repeat ? 'schedule-repeat' : 'schedule-once');
      assert.equal(authenticated, true);
      assert.equal(serverRegistered, true);
      assert.equal(endpoint, options.native ? `fcm:${nativeToken}` : subscription?.endpoint);
      await options.scheduleWait;
      if (options.failSchedule) throw new ApiError('발송 요청에 실패했습니다.', 503);
      repeating = repeat;
      reservation = { id: 'new-reservation', dueAt: 12345 };
      if (options.lostScheduleResponse) {
        scheduleResponseLost = true;
        throw new ApiError('서버 응답을 확인하지 못했습니다.', options.lostScheduleStatus ?? 0, options.lostScheduleCode);
      }
      return { pending: reservation, repeating };
    },
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
        if (options.failLocalCleanup) throw new Error('fixture');
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
      assert.equal(authenticated, true, '알림 권한은 로그인 후 ON을 눌러야 요청한다.');
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
        if (options.failServiceWorker) throw new DOMException('fixture', 'SecurityError');
        return [registration];
      } },
    },
  });
  const render = () => { cursor = 0; return hookModule.exports.usePushTest(); };
  return {
    calls, render,
    workerUpdateCount: () => workerUpdates,
    restoreStatusReads: () => { statusFailure = undefined; },
    blockLocalSubscriptionReads: () => { localReadBlocked = true; },
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

for (const native of [false, true]) {
  const platform = native ? 'APK' : '웹';
  const reads = native ? ['native-getStatus', 'native-getToken', 'status'] : ['status'];
  const registrationCalls = native
    ? ['native-requestPermission', 'native-register', 'server-subscribe']
    : ['permission', 'browser-subscribe', 'server-subscribe'];

  test(`${platform} 로그인은 인증과 기존 상태 확인만 수행하며 알림을 켜지 않는다`, async () => {
    const harness = createHarness({ native });
    const mounted = await harness.mount();
    assert.equal(mounted.requiresLogin, true);
    await mounted.setEnabled(true);
    assert.deepEqual(harness.calls, reads);
    harness.calls.length = 0;
    const login = mounted.login('fixture-user', 'fixture-password');
    assert.deepEqual(harness.calls, ['login']);
    await login;
    assert.deepEqual(harness.calls, ['login', 'authenticated', ...reads]);
    assert.equal(harness.render().isAuthenticated, true);
    assert.equal(harness.render().requiresLogin, false);
    assert.equal(harness.render().isEnabled, false);
    assert.equal(harness.render().browser.hasSubscription, false);
  });

  test(`${platform} ON은 기기를 등록한 다음 즉시 반복 발송을 한 번 요청한다`, async () => {
    const harness = createHarness({ native });
    await (await harness.mount()).login('fixture-user', 'fixture-password');
    harness.calls.length = 0;
    const enable = harness.render().setEnabled(true);
    assert.deepEqual(harness.calls, [native ? 'native-requestPermission' : 'permission']);
    await enable;
    assert.deepEqual(harness.calls, [...registrationCalls, 'schedule-repeat']);
    assert.equal(harness.render().status?.registered, true);
    assert.equal(harness.render().isEnabled, true);
    harness.calls.length = 0;
    await harness.render().setEnabled(true);
    assert.deepEqual(harness.calls, []);
  });

  test(`${platform} 로그인 실패는 권한·기기 등록·발송을 모두 시작하지 않는다`, async () => {
    const harness = createHarness({ native, failLogin: true });
    const mounted = await harness.mount();
    harness.calls.length = 0;
    await mounted.login('fixture-user', 'fixture-password');
    await harness.render().setEnabled(true);
    assert.deepEqual(harness.calls, ['login']);
    assert.equal(harness.render().isAuthenticated, false);
    assert.equal(harness.render().isEnabled, false);
  });

  test(`${platform} ON 권한 거절 후에도 로그인과 CCTV 화면을 유지한다`, async () => {
    for (const outcome of ['denied', 'default'] as const) {
      const harness = createHarness({ native, outcome });
      await (await harness.mount()).login('fixture-user', 'fixture-password');
      harness.calls.length = 0;
      await harness.render().setEnabled(true);
      assert.deepEqual(harness.calls, [native ? 'native-requestPermission' : 'permission']);
      const current = harness.render();
      assert.equal(current.isAuthenticated, true);
      assert.equal(current.browser.permission, outcome);
      assert.equal(current.isEnabled, false);
      assert.match(current.message ?? '', /알림 켜기/);
    }
  });

  test(`${platform} 반복 발송 시작 실패는 등록을 유지하고 ON으로 표시하지 않는다`, async () => {
    const harness = createHarness({ native, failSchedule: true });
    await (await harness.mount()).login('fixture-user', 'fixture-password');
    await harness.render().setEnabled(true);
    assert.equal(harness.render().status?.registered, true);
    assert.equal(harness.render().browser.hasSubscription, true);
    assert.equal(harness.render().isEnabled, false);
    assert.match(harness.render().error ?? '', /기기는 등록했지만 CCTV 알림을 시작하지 못했습니다/);
  });

  test(`${platform} 기기 등록 실패 후에는 발송을 요청하지 않는다`, async () => {
    const harness = createHarness({ native, failSubscribe: true });
    await (await harness.mount()).login('fixture-user', 'fixture-password');
    harness.calls.length = 0;
    await harness.render().setEnabled(true);
    assert.deepEqual(harness.calls, registrationCalls);
    assert.equal(harness.render().status?.registered, false);
    assert.equal(harness.render().isEnabled, false);
  });

  test(`${platform} ON 중복 클릭과 포커스 복귀가 중복 발송을 만들지 않는다`, async () => {
    let completeSchedule!: () => void;
    const scheduleWait = new Promise<void>(resolve => { completeSchedule = resolve; });
    const harness = createHarness({ native, scheduleWait });
    await (await harness.mount()).login('fixture-user', 'fixture-password');
    harness.calls.length = 0;
    const first = harness.render().setEnabled(true);
    const second = harness.render().setEnabled(true);
    await settle();
    await harness.focus();
    assert.deepEqual(harness.calls, [...registrationCalls, 'schedule-repeat']);
    completeSchedule();
    await Promise.all([first, second]);
    assert.equal(harness.render().isEnabled, true);
  });

  test(`${platform} 기존 반복 발송은 재접속과 포커스 복귀에서 조회만 한다`, async () => {
    const harness = createHarness({ native, restoredSession: true, permission: 'granted', existing: 'matching', repeating: true });
    const current = await harness.mount();
    assert.equal(current.isEnabled, true);
    await harness.focus();
    await harness.render().refresh();
    assert.deepEqual(harness.calls, [...reads, ...reads, ...reads]);
    assert.equal(harness.render().status?.pending?.id, pending.id);
  });

  test(`${platform} 기존 단일 구독은 OFF이며 ON을 눌러야 반복 발송을 시작한다`, async () => {
    const harness = createHarness({ native, restoredSession: true, permission: 'granted', existing: 'matching' });
    const current = await harness.mount();
    assert.equal(current.status?.registered, true);
    assert.equal(current.isEnabled, false);
    harness.calls.length = 0;
    await current.setEnabled(true);
    assert.equal(harness.calls.filter(call => call === 'schedule-repeat').length, 1);
    assert.equal(harness.render().isEnabled, true);
  });

  test(`${platform} OFF는 서버 반복 발송을 취소한 후 기기 구독을 해제한다`, async () => {
    const harness = createHarness({ native, restoredSession: true, permission: 'granted', existing: 'matching', repeating: true });
    const current = await harness.mount();
    harness.calls.length = 0;
    await current.setEnabled(false);
    await harness.focus();
    await harness.render().refresh();
    assert.deepEqual(harness.calls, ['server-unsubscribe', native ? 'native-unregister' : 'browser-unsubscribe', ...reads, ...reads]);
    assert.equal(harness.render().status?.registered, false);
    assert.equal(harness.render().status?.pending, null);
    assert.equal(harness.render().isEnabled, false);
  });

  test(`${platform} OFF 서버 취소 실패는 토큰과 ON 상태를 유지해 재시도할 수 있다`, async () => {
    const harness = createHarness({ native, restoredSession: true, permission: 'granted', existing: 'matching', repeating: true, failUnsubscribe: true });
    const current = await harness.mount();
    harness.calls.length = 0;
    await current.setEnabled(false);
    assert.deepEqual(harness.calls, ['server-unsubscribe']);
    assert.equal(harness.render().browser.hasSubscription, true);
    assert.equal(harness.render().isEnabled, true);
    assert.equal(harness.render().isAuthenticated, true);
  });

  test(`${platform} 수신 권한을 잃어도 서버 반복 알림을 OFF로 전환할 수 있다`, async () => {
    const harness = createHarness({ native, restoredSession: true, permission: 'denied', existing: 'matching', repeating: true });
    const current = await harness.mount();
    assert.equal(current.browser.permission, 'denied');
    assert.equal(current.isEnabled, true);
    harness.calls.length = 0;
    await current.setEnabled(false);
    assert.deepEqual(harness.calls, ['server-unsubscribe', native ? 'native-unregister' : 'browser-unsubscribe']);
    assert.equal(harness.render().isEnabled, false);
    assert.equal(harness.render().status?.pending, null);
  });

  test(`${platform} 로컬 구독을 잃어도 서버에 남은 반복 알림을 표시하고 끌 수 있다`, async () => {
    const harness = createHarness({ native, restoredSession: true, permission: 'granted', existing: 'matching', repeating: true, missingLocalSubscription: true });
    const current = await harness.mount();
    assert.equal(current.browser.hasSubscription, false);
    assert.equal(current.status?.registered, false);
    assert.equal(current.isEnabled, true);
    harness.calls.length = 0;
    await current.setEnabled(false);
    assert.deepEqual(harness.calls, native ? ['server-unsubscribe', 'native-unregister'] : ['server-unsubscribe']);
    assert.equal(harness.render().isEnabled, false);
    await harness.focus();
    assert.equal(harness.render().isEnabled, false);
  });

  test(`${platform} 로컬 구독 정리에 실패해도 서버 반복 취소가 먼저 완료된다`, async () => {
    const harness = createHarness({ native, restoredSession: true, permission: 'granted', existing: 'matching', repeating: true, failLocalCleanup: true });
    const current = await harness.mount();
    harness.calls.length = 0;
    harness.blockLocalSubscriptionReads();
    await current.setEnabled(false);
    assert.deepEqual(harness.calls, native ? ['server-unsubscribe', 'native-unregister'] : ['server-unsubscribe']);
    assert.equal(harness.render().isEnabled, false);
    assert.equal(harness.render().status?.pending, null);
    assert.match(harness.render().error ?? '', /서버의 CCTV 알림은 껐습니다/);
  });

  test(`${platform} ON 응답이 유실되어도 상태 재조회로 서버 반복 시작을 확인한다`, async () => {
    const harness = createHarness({ native, lostScheduleResponse: true });
    await (await harness.mount()).login('fixture-user', 'fixture-password');
    harness.calls.length = 0;
    await harness.render().setEnabled(true);
    assert.deepEqual(harness.calls, [...registrationCalls, 'schedule-repeat', 'status']);
    assert.equal(harness.render().isEnabled, true);
    assert.equal(harness.render().isStartUncertain, false);
    assert.equal(harness.render().error, null);
    assert.equal(harness.render().status?.pending?.id, 'new-reservation');
  });

  for (const failure of [
    { label: '성공 응답의 JSON 손상', status: 200, code: 'INVALID_RESPONSE' },
    { label: '상위 프록시 502 응답', status: 502, code: 'REQUEST_FAILED' },
  ]) {
    test(`${platform} ${failure.label}도 시작 실패로 추측하지 않고 서버 상태로 확인한다`, async () => {
      const harness = createHarness({ native, lostScheduleResponse: true, lostScheduleStatus: failure.status, lostScheduleCode: failure.code });
      await (await harness.mount()).login('fixture-user', 'fixture-password');
      harness.calls.length = 0;
      await harness.render().setEnabled(true);
      assert.deepEqual(harness.calls, [...registrationCalls, 'schedule-repeat', 'status']);
      assert.equal(harness.render().isEnabled, true);
      assert.equal(harness.render().isStartUncertain, false);
      assert.equal(harness.render().error, null);
      assert.equal(harness.render().status?.pending?.id, 'new-reservation');
    });
  }

  test(`${platform} ON 응답과 재조회 모두 실패하면 상태 확인 필요로 표시하고 중단할 수 있다`, async () => {
    const harness = createHarness({ native, lostScheduleResponse: true, statusFailureAfterSchedule: 0, failLocalCleanup: native });
    await (await harness.mount()).login('fixture-user', 'fixture-password');
    await harness.render().setEnabled(true);
    assert.equal(harness.render().isEnabled, false);
    assert.equal(harness.render().isStartUncertain, true);
    assert.match(harness.render().error ?? '', /알림 중단/);
    harness.calls.length = 0;
    await harness.render().setEnabled(true);
    assert.deepEqual(harness.calls, []);
    harness.blockLocalSubscriptionReads();
    await harness.render().setEnabled(false);
    assert.deepEqual(harness.calls, native ? ['server-unsubscribe', 'native-unregister'] : ['server-unsubscribe']);
    assert.equal(harness.render().status?.repeating, false);
    assert.equal(harness.render().isStartUncertain, false);
    assert.match(harness.render().error ?? '', /서버의 CCTV 알림은 껐습니다/);
  });

  test(`${platform} 불확실한 ON 상태는 성공한 상태 조회로 해소한다`, async () => {
    const harness = createHarness({ native, lostScheduleResponse: true, statusFailureAfterSchedule: 0 });
    await (await harness.mount()).login('fixture-user', 'fixture-password');
    await harness.render().setEnabled(true);
    assert.equal(harness.render().isStartUncertain, true);
    harness.restoreStatusReads();
    await harness.render().refresh();
    assert.equal(harness.render().isStartUncertain, false);
    assert.equal(harness.render().isEnabled, true);
  });

  test(`${platform} ON 결과 재조회에서 인증이 만료되면 불확실 상태를 정리한다`, async () => {
    const harness = createHarness({ native, lostScheduleResponse: true, statusFailureAfterSchedule: 401 });
    await (await harness.mount()).login('fixture-user', 'fixture-password');
    await harness.render().setEnabled(true);
    assert.equal(harness.render().isAuthenticated, false);
    assert.equal(harness.render().requiresLogin, true);
    assert.equal(harness.render().isStartUncertain, false);
    assert.equal(harness.render().isEnabled, false);
  });
}

test('웹 권한 요청 예외를 처리하고 로그인 상태를 유지한다', async () => {
  for (const outcome of ['reject', 'throw'] as const) {
    const harness = createHarness({ outcome });
    await (await harness.mount()).login('fixture-user', 'fixture-password');
    harness.calls.length = 0;
    await harness.render().setEnabled(true);
    await settle();
    assert.deepEqual(harness.calls, ['permission']);
    assert.equal(harness.render().isAuthenticated, true);
    assert.equal(harness.render().isEnabled, false);
    assert.match(harness.render().error ?? '', /HTTPS 인증서/);
  }
});

test('웹 키 변경은 로그인에서 유지하고 ON에서 기존 예약 취소 후 교체한다', async () => {
  const harness = createHarness({ permission: 'granted', existing: 'old-key' });
  const mounted = await harness.mount();
  harness.calls.length = 0;
  await mounted.login('fixture-user', 'fixture-password');
  assert.deepEqual(harness.calls, ['login', 'authenticated', 'status']);
  assert.equal(harness.render().isEnabled, false);
  harness.calls.length = 0;
  await harness.render().setEnabled(true);
  assert.deepEqual(harness.calls, ['server-unsubscribe', 'browser-unsubscribe', 'browser-subscribe', 'server-subscribe', 'schedule-repeat']);
  assert.equal(harness.render().isEnabled, true);
});

test('인증서나 서비스 워커 오류가 있어도 로그인 화면과 인증 상태를 정상 처리한다', async () => {
  const harness = createHarness({ failServiceWorker: true });
  const current = await harness.mount();
  assert.equal(current.requiresLogin, true);
  await current.login('fixture-user', 'fixture-password');
  assert.equal(harness.render().isAuthenticated, true);
  assert.equal(harness.render().requiresLogin, false);
  assert.equal(harness.render().status?.publicKey, publicKey);
  assert.match(harness.render().error ?? '', /HTTPS 인증서/);
  await harness.focus();
  assert.equal(harness.render().isAuthenticated, true);
});

test('로그인 중복 클릭을 직렬화하고 알림 요청 없이 완료한다', async () => {
  let completeLogin!: () => void;
  const loginWait = new Promise<void>(resolve => { completeLogin = resolve; });
  const harness = createHarness({ loginWait });
  const current = await harness.mount();
  harness.calls.length = 0;
  const first = current.login('fixture-user', 'fixture-password');
  const second = current.login('fixture-user', 'fixture-password');
  await current.setEnabled(true);
  assert.deepEqual(harness.calls, ['login']);
  completeLogin();
  await Promise.all([first, second]);
  assert.deepEqual(harness.calls, ['login', 'authenticated', 'status']);
});

test('APK 서버 전송 설정이 없으면 로그인은 성공하고 ON에서 준비 오류를 안내한다', async () => {
  const harness = createHarness({ native: true, fcmReady: false });
  await (await harness.mount()).login('fixture-user', 'fixture-password');
  assert.equal(harness.render().isAuthenticated, true);
  assert.equal(harness.render().error, null);
  harness.calls.length = 0;
  await harness.render().setEnabled(true);
  assert.deepEqual(harness.calls, []);
  assert.match(harness.render().error ?? '', /서버의 앱 알림 설정/);
});

test('발송 작업자가 준비되지 않으면 등록은 유지하고 반복 발송은 켜지 않는다', async () => {
  const harness = createHarness({ workerReady: false });
  await (await harness.mount()).login('fixture-user', 'fixture-password');
  await harness.render().setEnabled(true);
  assert.equal(harness.calls.includes('schedule-repeat'), false);
  assert.equal(harness.render().status?.registered, true);
  assert.equal(harness.render().isEnabled, false);
  assert.match(harness.render().error ?? '', /발송 준비/);
});

test('기존 enable과 schedule은 단일 테스트 발송 기능을 유지한다', async () => {
  const harness = createHarness();
  await (await harness.mount()).login('fixture-user', 'fixture-password');
  harness.calls.length = 0;
  await harness.render().enable();
  assert.deepEqual(harness.calls, ['permission', 'browser-subscribe', 'server-subscribe']);
  await harness.render().schedule();
  assert.equal(harness.calls.at(-1), 'schedule-once');
  assert.equal(harness.render().isEnabled, false);
});

test('기존 서비스 워커는 첫 진입에서만 갱신하고 로그인·포커스·조회는 재사용한다', async () => {
  const harness = createHarness();
  const current = await harness.mount();
  assert.equal(harness.workerUpdateCount(), 1);
  await current.login('fixture-user', 'fixture-password');
  await harness.focus();
  await harness.render().refresh();
  assert.equal(harness.workerUpdateCount(), 1);
});

test('기존 서비스 워커 갱신 실패도 인증을 가로막지 않는다', async () => {
  const harness = createHarness({ failServiceWorkerUpdate: true });
  const current = await harness.mount();
  assert.equal(current.requiresLogin, true);
  await current.login('fixture-user', 'fixture-password');
  assert.equal(harness.render().isAuthenticated, true);
  assert.equal(harness.render().requiresLogin, false);
  assert.match(harness.render().error ?? '', /HTTPS 인증서/);
});
