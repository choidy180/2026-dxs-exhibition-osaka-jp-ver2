import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type Hook = ReturnType<typeof import('../../hooks/use-push-test').usePushTest>;
type EffectCleanup = void | (() => void);
type EffectSlot = { dependencies?: readonly unknown[]; cleanup?: EffectCleanup };
type CallbackSlot<T> = { dependencies: readonly unknown[]; callback: T };
type Timer = { at: number; repeat: number | null; callback: () => void };

const compiled = ts.transpileModule(readFileSync('hooks/use-push-test.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const equalDependencies = (a: readonly unknown[] | undefined, b: readonly unknown[] | undefined) =>
  a !== undefined && b !== undefined && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

// 실제 훅의 상태·effect 생명주기를 실행한다. 시간만 수동으로 진행하고 외부 API는 호출 즉시 실패시킨다.
function createHarness(permission: NotificationPermission | 'unsupported' = 'default') {
  const slots: unknown[] = [];
  const pendingEffects: Array<() => void> = [];
  const timers = new Map<number, Timer>();
  const externalCalls: string[] = [];
  let cursor = 0;
  let clock = 0;
  let nextTimerId = 0;
  let dirty = true;
  let mounted = true;
  let current: Hook;
  const forbid = (name: string) => () => {
    externalCalls.push(name);
    throw new Error(`External action is unavailable in exhibition tests: ${name}`);
  };
  const createTimer = (callback: () => void, delay: number, repeat: boolean) => {
    const id = ++nextTimerId;
    timers.set(id, { at: clock + delay, repeat: repeat ? delay : null, callback });
    return id;
  };
  const react = {
    useState<T>(initial: T | (() => T)) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? (initial as () => T)() : initial;
      return [slots[index] as T, (next: T | ((previous: T) => T)) => {
        const value = typeof next === 'function' ? (next as (previous: T) => T)(slots[index] as T) : next;
        if (!Object.is(slots[index], value)) {
          slots[index] = value;
          dirty = true;
        }
      }];
    },
    useCallback<T>(callback: T, dependencies: readonly unknown[]) {
      const index = cursor++;
      const previous = slots[index] as CallbackSlot<T> | undefined;
      if (!previous || !equalDependencies(previous.dependencies, dependencies)) {
        slots[index] = { callback, dependencies };
      }
      return (slots[index] as CallbackSlot<T>).callback;
    },
    useEffect(effect: () => EffectCleanup, dependencies?: readonly unknown[]) {
      const index = cursor++;
      const previous = slots[index] as EffectSlot | undefined;
      if (!previous || !equalDependencies(previous.dependencies, dependencies)) {
        const slot: EffectSlot = { dependencies };
        slots[index] = slot;
        pendingEffects.push(() => {
          if (typeof previous?.cleanup === 'function') previous.cleanup();
          slot.cleanup = effect();
        });
      }
    },
  };
  const notification = {
    permission,
    requestPermission: forbid('notification permission'),
  };
  const hookModule = { exports: {} as { usePushTest: () => Hook } };
  runInNewContext(compiled, {
    module: hookModule, exports: hookModule.exports,
    require: (name: string) => {
      if (name === 'react') return react;
      return forbid(`dependency ${name}`)();
    },
    fetch: forbid('fetch'),
    Notification: permission === 'unsupported' ? undefined : notification,
    window: {
      Notification: permission === 'unsupported' ? undefined : notification,
      isSecureContext: false,
      AndroidPush: { postMessage: forbid('native push') },
      setTimeout: (callback: () => void, delay: number) => createTimer(callback, delay, false),
      clearTimeout: (id: number) => timers.delete(id),
      setInterval: (callback: () => void, delay: number) => createTimer(callback, delay, true),
      clearInterval: (id: number) => timers.delete(id),
      addEventListener: forbid('browser event subscription'),
      removeEventListener: forbid('browser event subscription'),
    },
    navigator: {
      serviceWorker: { register: forbid('service worker'), getRegistrations: forbid('service worker') },
      permissions: { query: forbid('permission query') },
    },
    document: { visibilityState: 'visible' },
  });

  const flush = () => {
    let renders = 0;
    while (dirty && mounted) {
      assert.ok(renders++ < 20, 'Hook must settle without a render loop');
      dirty = false;
      cursor = 0;
      current = hookModule.exports.usePushTest();
      pendingEffects.splice(0).forEach(effect => effect());
    }
    return current;
  };
  const advance = (milliseconds: number) => {
    const target = clock + milliseconds;
    let fired = 0;
    while (true) {
      const next = [...timers.entries()].filter(([, timer]) => timer.at <= target)
        .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
      if (!next) break;
      assert.ok(fired++ < 1000, 'Timer loop must be bounded');
      const [id, timer] = next;
      clock = timer.at;
      if (timer.repeat === null) timers.delete(id);
      else timer.at += timer.repeat;
      timer.callback();
      flush();
    }
    clock = target;
    return flush();
  };
  const unmount = () => {
    slots.forEach(slot => {
      if (slot && typeof slot === 'object' && 'cleanup' in slot && typeof slot.cleanup === 'function') {
        slot.cleanup();
      }
    });
    mounted = false;
  };
  flush();
  return { view: flush, advance, unmount, externalCalls, activeTimers: () => timers.size };
}

for (const permission of ['default', 'denied', 'granted', 'unsupported'] as const) {
  test(`전시 진입은 OS 알림 상태(${permission})와 관계없이 로그인·설치·기기 등록 없이 준비된다`, () => {
    const harness = createHarness(permission);
    const state = harness.view();
    assert.equal(state.isAuthenticated, true);
    assert.equal(state.requiresLogin, false);
    assert.equal(state.isEnabled, false);
    assert.equal(state.mode, 'web');
    assert.equal(state.isNative, false);
    assert.equal(state.isLoading, false);
    assert.equal(state.action, null);
    assert.equal(state.error, null);
    assert.equal(state.status?.fcmReady, false);
    assert.equal(state.status?.pending, null);
    assert.equal(state.status?.lastJob, null);
    assert.equal(state.browser.supported, true);
    assert.match(state.browser.supportMessage, /로컬 알림 시뮬레이션/);
    assert.equal(harness.activeTimers(), 0);
    assert.deepEqual(harness.externalCalls, []);
    harness.unmount();
  });
}

test('전시 로그인 호환 동작은 자격증명이나 서버 인증을 사용하지 않는다', async () => {
  const harness = createHarness();
  await harness.view().login('', '');
  await harness.view().login('exhibition', 'ignored-demo-value');
  assert.equal(harness.view().isAuthenticated, true);
  assert.equal(harness.view().isEnabled, false);
  assert.equal(harness.activeTimers(), 0);
  assert.deepEqual(harness.externalCalls, []);
  harness.unmount();
});

test('알림 ON은 300ms 뒤 화면 내 알림을 표시하고 10초 주기로 반복한다', async () => {
  const harness = createHarness('denied');
  await harness.view().setEnabled(true);
  const enabled = harness.view();
  assert.equal(enabled.isEnabled, true);
  assert.equal(enabled.status?.registered, true);
  assert.equal(enabled.status?.repeating, true);
  assert.equal(enabled.browser.hasSubscription, true);
  assert.equal(harness.activeTimers(), 2);
  assert.equal(harness.advance(299).message, null);
  assert.equal(harness.advance(1).message, '전시회 데모 · CCTV 검사 알림이 도착했습니다.');
  assert.equal(harness.view().status?.lastJob?.status, 'sent');
  assert.equal(harness.activeTimers(), 1);
  await harness.view().refresh();
  assert.equal(harness.view().message, '전시회 데모 준비 완료');
  assert.equal(harness.advance(9699).message, '전시회 데모 준비 완료');
  assert.equal(harness.advance(1).message, '전시회 데모 · CCTV 검사 알림이 도착했습니다.');
  assert.deepEqual(harness.externalCalls, []);
  harness.unmount();
});

test('중복 ON과 새로고침은 반복 타이머나 알림 발송 경로를 중복 생성하지 않는다', async () => {
  const harness = createHarness();
  await harness.view().enable();
  harness.view();
  await harness.view().enable();
  await harness.view().setEnabled(true);
  await harness.view().refresh();
  assert.equal(harness.activeTimers(), 2);
  harness.advance(300);
  assert.equal(harness.activeTimers(), 1);
  await harness.view().refresh();
  harness.advance(9700);
  assert.equal(harness.view().message, '전시회 데모 · CCTV 검사 알림이 도착했습니다.');
  assert.equal(harness.activeTimers(), 1);
  assert.deepEqual(harness.externalCalls, []);
  harness.unmount();
});

test('알림 OFF는 첫 알림이 도착하기 전에도 모든 예약을 취소한다', async () => {
  const harness = createHarness();
  await harness.view().enable();
  harness.view();
  harness.advance(100);
  await harness.view().disable();
  assert.equal(harness.view().isEnabled, false);
  assert.equal(harness.view().status?.registered, false);
  assert.equal(harness.view().status?.repeating, false);
  assert.equal(harness.view().browser.hasSubscription, false);
  assert.equal(harness.activeTimers(), 0);
  assert.equal(harness.advance(30000).message, '데모 알림이 중지되었습니다.');
  assert.equal(harness.view().status?.lastJob, null);
  assert.deepEqual(harness.externalCalls, []);
  harness.unmount();
});

test('알림 OFF는 반복을 중단하고 이미 표시한 발송 이력을 보존한다', async () => {
  const harness = createHarness();
  await harness.view().setEnabled(true);
  harness.view();
  harness.advance(300);
  await harness.view().setEnabled(false);
  assert.equal(harness.view().status?.lastJob?.status, 'sent');
  assert.equal(harness.activeTimers(), 0);
  await harness.view().refresh();
  assert.equal(harness.advance(30000).message, '전시회 데모 준비 완료');
  assert.deepEqual(harness.externalCalls, []);
  harness.unmount();
});

test('알림을 다시 켜면 새로운 첫 알림 예약 하나만 생성된다', async () => {
  const harness = createHarness();
  await harness.view().enable();
  harness.view();
  harness.advance(300);
  await harness.view().disable();
  harness.view();
  await harness.view().refresh();
  await harness.view().enable();
  harness.view();
  assert.equal(harness.activeTimers(), 2);
  assert.equal(harness.advance(299).message, '전시회 데모 준비 완료');
  assert.equal(harness.advance(1).message, '전시회 데모 · CCTV 검사 알림이 도착했습니다.');
  assert.equal(harness.activeTimers(), 1);
  assert.deepEqual(harness.externalCalls, []);
  harness.unmount();
});

test('단일 알림 체험은 반복 알림을 켜지 않고 즉시 화면에 표시한다', async () => {
  const harness = createHarness('unsupported');
  await harness.view().schedule();
  assert.equal(harness.view().message, '전시회 데모 · CCTV 검사 알림이 도착했습니다.');
  assert.equal(harness.view().status?.lastJob?.status, 'sent');
  assert.equal(harness.view().isEnabled, false);
  assert.equal(harness.view().status?.repeating, false);
  assert.equal(harness.activeTimers(), 0);
  assert.deepEqual(harness.externalCalls, []);
  harness.unmount();
});

test('화면을 닫으면 첫 알림과 반복 알림 타이머를 모두 해제한다', async () => {
  const harness = createHarness();
  await harness.view().enable();
  harness.view();
  assert.equal(harness.activeTimers(), 2);
  harness.unmount();
  assert.equal(harness.activeTimers(), 0);
  harness.advance(30000);
  assert.deepEqual(harness.externalCalls, []);
});

test('설치 체험은 브라우저 설치나 권한 요청 없이 안내창만 열고 닫는다', async () => {
  const harness = createHarness();
  assert.equal(harness.view().canPromptInstall, false);
  assert.equal(harness.view().showInstallGuide, false);
  await harness.view().install();
  assert.equal(harness.view().showInstallGuide, true);
  assert.match(harness.view().browser.installGuide, /설치 없이 이 화면/);
  harness.view().closeInstallGuide();
  assert.equal(harness.view().showInstallGuide, false);
  assert.equal(harness.activeTimers(), 0);
  assert.deepEqual(harness.externalCalls, []);
  harness.unmount();
});
