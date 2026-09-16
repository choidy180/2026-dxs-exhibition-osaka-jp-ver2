import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { PUSH_TEST_SERVICE_WORKER } from '../../lib/push-test/service-worker';

type WorkerEvent = {
  data?: { json: () => unknown };
  notification?: { close: () => void; data?: { url: string } };
  waitUntil?: (promise: Promise<unknown>) => void;
};

function createWorker(windows: { url: string; focus: () => Promise<void> }[] = []) {
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const notifications: { title: string; options: NotificationOptions }[] = [];
  const opened: string[] = [];
  let networkCalls = 0;

  runInNewContext(PUSH_TEST_SERVICE_WORKER, {
    URL,
    fetch: () => {
      networkCalls += 1;
      throw new Error('푸시 표시에는 서버 조회가 없어야 합니다.');
    },
    self: {
      location: { origin: 'https://internal.example' },
      addEventListener: (name: string, handler: (event: WorkerEvent) => void) => listeners.set(name, handler),
      skipWaiting: async () => undefined,
      registration: {
        showNotification: async (title: string, options: NotificationOptions) => {
          notifications.push({ title, options });
        },
      },
      clients: {
        claim: async () => undefined,
        matchAll: async () => windows,
        openWindow: async (url: string) => { opened.push(url); },
      },
    },
  });

  return {
    listeners,
    notifications,
    opened,
    get networkCalls() { return networkCalls; },
    async dispatch(name: string, event: WorkerEvent = {}) {
      const pending: Promise<unknown>[] = [];
      const listener = listeners.get(name);
      assert.ok(listener, `${name} 이벤트가 등록되어야 합니다.`);
      listener({ ...event, waitUntil: (promise) => { pending.push(promise); } });
      await Promise.all(pending);
    },
  };
}

test('푸시 데이터만으로 시스템 알림을 표시하고 CCTV 요청을 가로채지 않는다', async () => {
  const worker = createWorker();
  const payload = {
    title: '[테스트] TEST-CAM-03 영상 수신 중단',
    body: '푸시 수신 확인용 가상 이벤트입니다. 실제 장애가 아닙니다.',
    tag: 'test-job-123',
    url: 'https://external.example/untrusted',
  };
  await worker.dispatch('push', { data: { json: () => payload } });
  assert.equal(worker.notifications.length, 1);
  assert.equal(worker.notifications[0].title, payload.title);
  assert.equal(worker.notifications[0].options.body, payload.body);
  assert.equal(worker.notifications[0].options.tag, payload.tag);
  assert.equal(worker.notifications[0].options.data.url, '/lab/push');
  assert.equal(worker.notifications[0].options.icon, undefined, '수신 시 내부 아이콘 서버에도 의존하지 않는다');
  assert.equal(worker.networkCalls, 0);
  assert.equal(worker.listeners.has('fetch'), false);
});

test('같은 작업을 재수신해도 같은 알림 태그를 사용한다', async () => {
  const worker = createWorker();
  const event = { data: { json: () => ({ title: '테스트', body: '테스트 본문', tag: 'same-job' }) } };
  await worker.dispatch('push', event);
  await worker.dispatch('push', event);
  assert.equal(worker.notifications[0].options.tag, worker.notifications[1].options.tag);
});

test('비정상 데이터는 서버 조회 없이 안전한 테스트 안내로 대체한다', async () => {
  const worker = createWorker();
  await worker.dispatch('push', { data: { json: () => { throw new SyntaxError('invalid'); } } });
  await worker.dispatch('push', { data: { json: () => ({ title: 10, body: null, tag: [] }) } });
  await worker.dispatch('push');
  for (const notification of worker.notifications) {
    assert.equal(notification.title, '[테스트] PWA 푸시 수신 확인');
    assert.match(notification.options.body ?? '', /실제 CCTV 상태와 무관/);
    assert.equal(notification.options.tag, 'dxs-push-test');
  }
  assert.equal(worker.networkCalls, 0);
});

test('과도하게 긴 푸시 필드를 제한한다', async () => {
  const worker = createWorker();
  await worker.dispatch('push', {
    data: { json: () => ({ title: '가'.repeat(300), body: '나'.repeat(800), tag: 'a'.repeat(200) }) },
  });
  assert.equal(worker.notifications[0].title.length, 160);
  assert.equal(worker.notifications[0].options.body?.length, 500);
  assert.equal(worker.notifications[0].options.tag?.length, 100);
});

test('알림을 누르면 기존 테스트 페이지에 포커스를 둔다', async () => {
  let focused = false;
  let closed = false;
  const worker = createWorker([{ url: 'https://internal.example/lab/push?existing=true', focus: async () => { focused = true; } }]);
  await worker.dispatch('notificationclick', { notification: { close: () => { closed = true; } } });
  assert.equal(focused, true);
  assert.equal(closed, true);
  assert.equal(worker.opened.length, 0);
});

test('기존 CCTV 화면과 외부 URL은 선택하지 않고 정확한 테스트 페이지를 연다', async () => {
  const worker = createWorker([
    { url: 'https://internal.example/lab/cctv-monitoring', focus: async () => { assert.fail('원본 CCTV 화면에 포커스를 두면 안 됩니다.'); } },
    { url: 'https://external.example/lab/push', focus: async () => { assert.fail('외부 페이지에 포커스를 두면 안 됩니다.'); } },
    { url: 'https://internal.example/lab/push-other', focus: async () => { assert.fail('다른 페이지에 포커스를 두면 안 됩니다.'); } },
  ]);
  await worker.dispatch('notificationclick', {
    notification: { close: () => undefined, data: { url: 'https://external.example/untrusted' } },
  });
  assert.deepEqual(worker.opened, ['https://internal.example/lab/push']);
});
