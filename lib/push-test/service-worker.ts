/**
 * 이 워커는 알림만 처리한다. CCTV 영상·API·페이지를 가로채거나 캐시하지 않는다.
 * 문자열로 제공해 Next.js의 빌드 결과와 무관하게 고정된 URL로 등록한다.
 */
export const PUSH_TEST_SERVICE_WORKER = String.raw`
'use strict';

const PUSH_PAGE = '/lab/push';

function safeText(value, fallback, maxLength) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    const parsed = event.data ? event.data.json() : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      payload = parsed;
    }
  } catch {
    // 잘못된 데이터도 내부 서버 조회 없이 명확한 테스트 알림으로 표시한다.
  }

  const title = safeText(payload.title, '[테스트] PWA 푸시 수신 확인', 160);
  const body = safeText(
    payload.body,
    '푸시 수신 확인용 가상 이벤트입니다. 실제 CCTV 상태와 무관합니다.',
    500,
  );

  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: safeText(payload.tag, 'dxs-push-test', 100),
    data: { url: PUSH_PAGE },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    // 수신 데이터에 외부 URL이 있어도 알림은 항상 내부 테스트 페이지로 연다.
    const target = new URL(PUSH_PAGE, self.location.origin);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      const current = new URL(client.url);
      if (current.origin === target.origin &&
          (current.pathname === PUSH_PAGE || current.pathname === PUSH_PAGE + '/')) {
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(target.href);
  })());
});
`;
