'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PushTestBrowserState, PushTestInstallPrompt, PushTestStatus } from '@/types/push-test';
import {
  fetchPushTestStatus,
  loginPushTest,
  PushTestApiError,
  schedulePushTest,
  subscribePushTest,
  unsubscribePushTest,
} from '@/utils/push-test-api';
import {
  hasNativePushBridge, nativePushEndpoint, NativePushError,
  requestNativePush, subscribeNativePushBridge,
} from '@/utils/push-test-native';

const SERVICE_WORKER_PATH = '/lab/push/sw.js';
const SERVICE_WORKER_SCOPE = '/lab/push';

class PushTestBrowserError extends Error {}

type PermissionOutcome = { ok: true; permission: NotificationPermission } | { ok: false; error: unknown };

function requestPermissionForAction(): Promise<PermissionOutcome> {
  try {
    const permission = Notification.permission === 'default'
      ? Notification.requestPermission() : Promise.resolve(Notification.permission);
    // 사용자 동작에서 시작한 권한 요청의 예외도 모두 처리한다.
    return permission.then(
      allowed => ({ ok: true, permission: allowed }),
      error => ({ ok: false, error }),
    );
  } catch (error) {
    return Promise.resolve({ ok: false, error });
  }
}

const initialBrowserState: PushTestBrowserState = {
  checked: false,
  supported: false,
  installed: false,
  permission: 'unsupported',
  hasSubscription: false,
  installGuide: '',
  supportMessage: '',
};

function inspectBrowser(): PushTestBrowserState {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const supported = window.isSecureContext && 'serviceWorker' in navigator
    && 'PushManager' in window && 'Notification' in window && (!ios || installed);
  const installGuide = installed
    ? '홈 화면에 추가한 앱으로 실행 중입니다. 이 화면에서 알림을 등록해주세요.'
    : ios
      ? 'iPhone·iPad에서는 Safari로 이 주소를 연 뒤 공유 → 홈 화면에 추가를 선택하세요. 추가한 앱을 홈 화면에서 실행해야 푸시 알림을 등록할 수 있습니다. iOS·iPadOS 16.4 이상이 필요합니다.'
      : /Android/.test(navigator.userAgent)
        ? 'Android에서는 Chrome 또는 지원 브라우저의 메뉴 → 앱 설치 / 홈 화면에 추가를 선택하세요. 설치 안내창을 지원하면 이 버튼으로 바로 열 수 있습니다.'
        : /Edg\//.test(navigator.userAgent)
          ? 'Microsoft Edge의 주소창 앱 설치 아이콘 또는 메뉴 → 앱 → 이 사이트를 앱으로 설치를 선택하세요.'
          : /Chrome\//.test(navigator.userAgent)
            ? 'Chrome의 주소창 설치 아이콘 또는 메뉴 → 전송, 저장 및 공유 → 페이지를 앱으로 설치를 선택하세요.'
            : /Safari\//.test(navigator.userAgent)
              ? '지원되는 macOS Safari에서는 파일 → Dock에 추가를 선택하세요. 설치 메뉴가 없다면 최신 지원 브라우저를 사용해주세요.'
              : '브라우저에 앱 설치 / 홈 화면에 추가 메뉴가 있는지 확인하세요. 메뉴가 없으면 설치를 지원하는 Chrome, Edge 또는 Safari를 사용해주세요.';
  const supportMessage = !window.isSecureContext
    ? '신뢰할 수 있는 HTTPS 주소에서 열어야 PWA와 푸시를 사용할 수 있습니다.'
    : ios && !installed
      ? 'iPhone·iPad는 홈 화면에 추가한 앱에서 푸시를 사용할 수 있습니다.'
      : supported ? '이 환경은 PWA 푸시를 지원합니다.' : '이 브라우저는 푸시를 지원하지 않습니다. 최신 지원 브라우저에서 확인해주세요.';
  return {
    checked: true,
    supported,
    installed,
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
    hasSubscription: false,
    installGuide,
    supportMessage,
  };
}

function waitForActive(registration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (registration.active) return Promise.resolve(registration);
  const worker = registration.installing ?? registration.waiting;
  if (!worker) return Promise.reject(new PushTestBrowserError('푸시 서비스 워커를 시작하지 못했습니다. 다시 시도해주세요.'));
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      worker.removeEventListener('statechange', onChange);
      if (error) reject(error);
      else resolve(registration);
    };
    const onChange = () => {
      if (worker.state === 'activated') finish();
      if (worker.state === 'redundant') finish(new PushTestBrowserError('푸시 서비스 워커가 활성화되지 않았습니다. 다시 시도해주세요.'));
    };
    const timeout = window.setTimeout(() => finish(new PushTestBrowserError('푸시 준비 시간이 초과되었습니다. 다시 시도해주세요.')), 15_000);
    worker.addEventListener('statechange', onChange);
    onChange();
  });
}

async function getTestRegistration(): Promise<ServiceWorkerRegistration> {
  const expectedScript = new URL(SERVICE_WORKER_PATH, window.location.origin).href;
  const expectedScope = new URL(SERVICE_WORKER_SCOPE, window.location.origin).href;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const overlapping = registrations.filter(registration => expectedScope.startsWith(registration.scope)
    || registration.scope.startsWith(`${expectedScope}/`) || registration.scope === expectedScope);
  const existing = overlapping.find(registration => registration.scope === expectedScope);
  const conflicting = overlapping.some(registration => registration.scope !== expectedScope
    || [registration.active, registration.waiting, registration.installing]
      .some(worker => worker && worker.scriptURL !== expectedScript));
  if (conflicting) throw new PushTestBrowserError('기존 앱의 서비스 워커가 이 경로를 사용 중입니다. 기존 설정과 충돌하지 않도록 관리자 확인이 필요합니다.');
  const registration = existing ?? await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
    scope: SERVICE_WORKER_SCOPE,
    updateViaCache: 'none',
  });
  // 앱 재진입 때 이전에 설치된 워커의 알림 로고·문구도 갱신한다.
  if (existing) await registration.update();
  return waitForActive(registration);
}

function applicationServerKey(publicKey: string): Uint8Array<ArrayBuffer> {
  const decoded = window.atob(publicKey.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(publicKey.length / 4) * 4, '='));
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}

function subscriptionMatchesKey(subscription: PushSubscription, publicKey: string): boolean {
  const existingKey = subscription.options.applicationServerKey;
  if (!existingKey) return false;
  const actual = new Uint8Array(existingKey);
  const expected = applicationServerKey(publicKey);
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function errorMessage(error: unknown): string {
  if (error instanceof PushTestApiError || error instanceof NativePushError) return error.message;
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return '알림이 허용되지 않았습니다. 기기와 브라우저의 알림 설정을 확인해주세요.';
    if (error.name === 'SecurityError') return '브라우저가 푸시 준비를 차단했습니다. HTTPS 인증서가 신뢰되는지 확인해주세요. 테스트 인증서를 기기 설정에서 설치했다면 브라우저를 완전히 종료한 뒤 다시 접속해주세요.';
    return '기기의 푸시 설정을 변경하지 못했습니다. 네트워크와 브라우저 설정을 확인하고 다시 시도해주세요.';
  }
  return error instanceof PushTestBrowserError ? error.message : '푸시 설정을 확인하지 못했습니다. 내부망 연결과 브라우저 설정을 확인하고 다시 시도해주세요.';
}

export function usePushTest() {
  const mode = useSyncExternalStore(subscribeNativePushBridge,
    () => hasNativePushBridge() ? 'native' : 'web', () => 'checking');
  const isNative = mode === 'native';
  const [browser, setBrowser] = useState(initialBrowserState);
  const [status, setStatus] = useState<PushTestStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<'enable' | 'disable' | 'schedule' | 'login' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStartUncertain, setIsStartUncertain] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [canPromptInstall, setCanPromptInstall] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const nativeEndpointRef = useRef<string | null>(null);
  const installPromptRef = useRef<PushTestInstallPrompt | null>(null);
  const busyRef = useRef(false);
  const refreshRef = useRef(false);
  const revisionRef = useRef(0);
  const mountedRef = useRef(true);

  const reportError = useCallback((caught: unknown, isStatusCheck = false) => {
    if (!mountedRef.current) return;
    // 첫 방문의 로그인 필요 응답은 오류 경고 없이 로그인 폼으로 안내한다.
    setError(isStatusCheck && caught instanceof PushTestApiError && caught.status === 401 ? null : errorMessage(caught));
    // 전송 실패가 이미 성공한 기기 등록까지 해제된 것으로 표시되지 않도록 유지한다.
    setMessage(null);
    if (caught instanceof PushTestApiError && caught.status === 401) {
      setRequiresLogin(true);
      setIsAuthenticated(false);
      setStatus(null);
      setIsStartUncertain(false);
    }
  }, []);

  const readCurrentState = useCallback(async (revision: number) => {
    let currentBrowser = hasNativePushBridge()
      ? { ...initialBrowserState, checked: true, installed: true }
      : inspectBrowser();
    let subscription: PushSubscription | null = null;
    let endpoint: string | null = null;
    let deviceError: unknown = null;
    try {
      if (hasNativePushBridge()) {
        // 재진입과 로그인은 기존 토큰 조회만 하며 권한 요청이나 등록을 하지 않는다.
        const [nativeStatus, tokenResult] = await Promise.all([
          requestNativePush('getStatus'), requestNativePush('getToken'),
        ]);
        endpoint = tokenResult.token ? nativePushEndpoint(tokenResult.token) : null;
        currentBrowser = {
          checked: true, installed: true, supported: nativeStatus.configured,
          permission: nativeStatus.permission, hasSubscription: !!tokenResult.token,
          installGuide: '', supportMessage: nativeStatus.configured
            ? '이 기기의 앱 알림을 사용할 수 있습니다.' : '앱 알림 설정이 준비되지 않았습니다. 관리자에게 확인해주세요.',
        };
      } else if (currentBrowser.supported) {
        const registration = registrationRef.current ?? await getTestRegistration();
        subscription = await registration.pushManager.getSubscription();
        if (revision === revisionRef.current) registrationRef.current = registration;
        endpoint = subscription?.endpoint ?? null;
        currentBrowser = { ...currentBrowser, hasSubscription: !!subscription };
      }
    } catch (caught) {
      // 인증서·서비스 워커 문제가 있어도 인증 확인과 CCTV 화면 진입은 진행한다.
      deviceError = caught;
    }
    if (!mountedRef.current || revision !== revisionRef.current) return;
    setBrowser(currentBrowser);
    if (hasNativePushBridge()) nativeEndpointRef.current = endpoint;
    const result = await fetchPushTestStatus(endpoint);
    if (!mountedRef.current || revision !== revisionRef.current) return;
    const needsNewKey = subscription && !subscriptionMatchesKey(subscription, result.publicKey);
    setStatus(needsNewKey ? { ...result, registered: false } : result);
    setIsStartUncertain(false);
    setIsAuthenticated(true);
    setRequiresLogin(false);
    setError(deviceError ? errorMessage(deviceError) : null);
    if (needsNewKey) setMessage('서버의 푸시 설정이 변경되었습니다. 알림 켜기로 현재 기기를 다시 등록해주세요. 기존 미발송 예약은 재등록할 때 취소됩니다.');
    else if (!result.pending && result.lastJob?.status === 'sent') setMessage('CCTV 알림을 발송했습니다. 기기의 알림 센터를 확인해주세요.');
    else if (!result.pending && ['failed', 'expired', 'unknown'].includes(result.lastJob?.status ?? '')) {
      setMessage('최근 알림의 발송을 확인하지 못했습니다. 기기 등록과 서버 연결을 확인한 뒤 다시 시도해주세요.');
    }
  }, []);

  const refresh = useCallback(async (showLoading = false) => {
    if (busyRef.current || refreshRef.current) return;
    refreshRef.current = true;
    const revision = revisionRef.current;
    if (showLoading) setIsLoading(true);
    try {
      await readCurrentState(revision);
    } catch (caught) {
      if (revision === revisionRef.current) reportError(caught, true);
    } finally {
      refreshRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  }, [readCurrentState, reportError]);

  useEffect(() => {
    mountedRef.current = true;
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPromptRef.current = event as PushTestInstallPrompt;
      setCanPromptInstall(true);
    };
    const onInstalled = () => {
      installPromptRef.current = null;
      setCanPromptInstall(false);
      setMessage('앱 설치를 완료했습니다. 홈 화면의 앱을 열어 알림을 등록해주세요.');
      void refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const onFocus = () => { void refresh(); };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    void refresh(true);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!status?.pending && !isStartUncertain) return;
    // 이 타이머는 상태 조회 전용이며, 예약 발송은 독립적인 서버 작업자가 수행한다.
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 5_000);
    return () => window.clearInterval(poll);
  }, [isStartUncertain, refresh, status?.pending]);

  const runAction = useCallback(async (nextAction: NonNullable<typeof action>, work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    revisionRef.current += 1;
    setAction(nextAction);
    setError(null);
    setMessage(null);
    try {
      await work();
    } catch (caught) {
      reportError(caught);
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setAction(null);
    }
  }, [reportError]);

  const finishPermissionRequest = useCallback(async (request: Promise<PermissionOutcome>) => {
    const outcome = await request;
    if (!outcome.ok) {
      setError(errorMessage(outcome.error));
      setMessage('알림 켜기를 눌러 다시 시도해주세요.');
      return false;
    }
    setBrowser(current => ({ ...current, permission: outcome.permission }));
    if (outcome.permission !== 'granted') {
      setMessage(outcome.permission === 'denied'
        ? '알림이 차단되어 있습니다. 기기와 브라우저 설정에서 허용한 뒤 알림 켜기를 눌러주세요.'
        : '알림 켜기를 눌러 허용하면 현재 기기가 등록됩니다.');
      return false;
    }
    return true;
  }, []);

  const registerCurrentDevice = useCallback(async (currentStatus: PushTestStatus, registeredEndpoint: string | null = null) => {
    if (hasNativePushBridge()) {
      if (currentStatus.fcmReady !== true) throw new PushTestBrowserError('서버의 앱 알림 설정이 준비되지 않았습니다. 관리자에게 확인해주세요.');
      const nativeStatus = await requestNativePush('requestPermission');
      setBrowser(current => ({ ...current, supported: nativeStatus.configured, permission: nativeStatus.permission }));
      if (!nativeStatus.configured) throw new PushTestBrowserError('앱 알림 설정이 준비되지 않았습니다. 관리자에게 확인해주세요.');
      if (nativeStatus.permission !== 'granted') {
        setMessage('알림이 허용되지 않았습니다. 휴대폰 설정에서 이 앱의 알림을 허용한 뒤 알림 켜기를 눌러주세요.');
        return null;
      }
      const { token } = await requestNativePush('register');
      const endpoint = nativePushEndpoint(token);
      nativeEndpointRef.current = endpoint;
      setBrowser(current => ({ ...current, hasSubscription: true }));
      if (currentStatus.registered && endpoint === registeredEndpoint) {
        setStatus(currentStatus);
        setMessage('현재 기기는 이미 알림을 사용 중입니다. 테스트 푸시로 수신을 확인해주세요.');
        return { status: currentStatus, endpoint };
      }
      const result = await subscribePushTest({ platform: 'android', token });
      setStatus(result);
      setMessage('현재 기기에 앱 알림을 등록했습니다. 테스트 푸시로 수신을 확인해주세요.');
      return { status: result, endpoint };
    }
    const registration = registrationRef.current ?? await getTestRegistration();
    registrationRef.current = registration;
    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !subscriptionMatchesKey(subscription, currentStatus.publicKey)) {
      // 키 변경도 서버 예약을 먼저 취소한 뒤 기기 구독을 교체한다.
      const cleared = await unsubscribePushTest(subscription.endpoint);
      setStatus(cleared);
      await subscription.unsubscribe();
      if (await registration.pushManager.getSubscription()) {
        throw new PushTestBrowserError('기존 푸시 구독을 해제하지 못했습니다. 알림 끄기 후 다시 등록해주세요.');
      }
      subscription = null;
      setBrowser(current => ({ ...current, hasSubscription: false }));
    }
    subscription ??= await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(currentStatus.publicKey),
    });
    setBrowser(current => ({ ...current, hasSubscription: true }));
    // 같은 기기의 서버 등록이 확인되면 기존 예약을 유지하고 재등록하지 않는다.
    if (currentStatus.registered && subscription.endpoint === registeredEndpoint) {
      setStatus(currentStatus);
      setMessage('현재 기기는 이미 알림을 사용 중입니다. 테스트 푸시로 수신을 확인해주세요.');
      return { status: currentStatus, endpoint: subscription.endpoint };
    }
    const result = await subscribePushTest(subscription.toJSON());
    setStatus(result);
    setMessage('현재 기기에 알림을 등록했습니다. 테스트 푸시로 수신을 확인해주세요.');
    return { status: result, endpoint: subscription.endpoint };
  }, []);

  const requestTestNotification = useCallback(async (currentStatus: PushTestStatus, endpoint: string, repeating = false) => {
    if (!repeating && currentStatus.pending) return;
    if (!currentStatus.workerReady) throw new PushTestBrowserError('서버의 알림 발송 준비가 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
    const result = await schedulePushTest(endpoint, repeating);
    setStatus(current => current ? { ...current, pending: result.pending, repeating: result.repeating } : current);
    setIsStartUncertain(false);
    setMessage(repeating
      ? 'CCTV 알림을 켰습니다. 지금부터 10초마다 테스트 알림을 보냅니다.'
      : '테스트 알림을 바로 발송합니다. 알림 센터를 확인해주세요.');
  }, []);

  const turnOn = useCallback(async (sendTest: boolean) => {
    if (busyRef.current || !isAuthenticated || requiresLogin || isStartUncertain) return;
    return runAction('enable', async () => {
      if (!browser.supported) throw new PushTestBrowserError(browser.supportMessage || '이 기기에서는 푸시 알림을 사용할 수 없습니다.');
      if (!status) throw new PushTestBrowserError('알림 상태를 다시 확인한 뒤 시도해주세요.');
      if (!hasNativePushBridge()) {
        if (!status.publicKey) throw new PushTestBrowserError('서버의 푸시 설정을 확인해주세요.');
        // ON 클릭의 사용자 제스처 안에서, 다른 비동기 작업보다 먼저 권한을 요청한다.
        const permission = requestPermissionForAction();
        if (!await finishPermissionRequest(permission)) return;
      }
      const device = await registerCurrentDevice(status, nativeEndpointRef.current);
      if (!device || !sendTest) return;
      try {
        await requestTestNotification(device.status, device.endpoint, true);
      } catch (caught) {
        if (caught instanceof PushTestApiError && caught.status === 401) throw caught;
        if (caught instanceof PushTestApiError && (caught.status === 0 || caught.code === 'INVALID_RESPONSE'
          || (caught.status >= 500 && caught.status < 600))) {
          // 응답만 유실된 경우 서버에서 반복이 시작됐을 수 있어 등록 상태로 추측하지 않는다.
          setIsStartUncertain(true);
          try {
            const confirmed = await fetchPushTestStatus(device.endpoint);
            setStatus(confirmed);
            setIsStartUncertain(false);
            if (confirmed.repeating) {
              setError(null);
              setMessage('서버에서 CCTV 알림이 켜진 것을 확인했습니다. OFF를 누르면 알림이 멈춥니다.');
              return;
            }
          } catch (confirmationError) {
            if (confirmationError instanceof PushTestApiError && confirmationError.status === 401) throw confirmationError;
            setError('알림 시작 요청의 결과를 확인하지 못했습니다. 서버에서 알림이 발송 중일 수 있습니다. 상태를 다시 확인하거나 알림 중단을 눌러주세요.');
            setMessage(null);
            return;
          }
        }
        // 기기 등록과 반복 발송 시작을 구분하여 실패 시 ON으로 오인하지 않게 한다.
        setError(`기기는 등록했지만 CCTV 알림을 시작하지 못했습니다. ${errorMessage(caught)}`);
        setMessage(null);
      }
    });
  }, [browser.supportMessage, browser.supported, finishPermissionRequest, isAuthenticated, isStartUncertain, registerCurrentDevice, requestTestNotification, requiresLogin, runAction, status]);

  const enable = useCallback(() => turnOn(false), [turnOn]);

  const disable = useCallback(() => runAction('disable', async () => {
    if (hasNativePushBridge()) {
      const result = await unsubscribePushTest(nativeEndpointRef.current);
      setStatus(result);
      setIsStartUncertain(false);
      try {
        await requestNativePush('unregister');
      } catch (caught) {
        throw new PushTestBrowserError(`서버의 CCTV 알림은 껐습니다. 기기 알림 설정을 정리하지 못했습니다. ${errorMessage(caught)}`);
      }
      nativeEndpointRef.current = null;
      setBrowser(current => ({ ...current, hasSubscription: false }));
      setMessage('현재 기기의 앱 알림을 끄고 미발송 테스트 예약을 취소했습니다.');
      return;
    }
    // 서버는 인증된 기기의 모든 예약을 취소한다. 로컬 구독을 읽지 못해도 OFF를 보장한다.
    const result = await unsubscribePushTest(null);
    setStatus(result);
    setIsStartUncertain(false);
    try {
      const subscription = await registrationRef.current?.pushManager.getSubscription() ?? null;
      if (subscription) {
        await subscription.unsubscribe();
        const remaining = await registrationRef.current?.pushManager.getSubscription();
        if (remaining) throw new PushTestBrowserError('기기 구독이 남아 있습니다. 브라우저의 알림 설정을 확인해주세요.');
      }
    } catch (caught) {
      throw new PushTestBrowserError(`서버의 CCTV 알림은 껐습니다. 기기 알림 설정을 정리하지 못했습니다. ${errorMessage(caught)}`);
    }
    setBrowser(current => ({ ...current, hasSubscription: false }));
    setMessage('현재 기기의 알림을 끄고 미발송 테스트 예약을 취소했습니다.');
  }), [runAction]);

  // 수신 권한·로컬 토큰을 잃어도 서버 반복이 켜져 있으면 OFF 동작을 제공해야 한다.
  const isEnabled = isAuthenticated && status?.repeating === true;

  const setEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    if (busyRef.current || !isAuthenticated || requiresLogin) return;
    if (enabled) {
      if (!isEnabled) await turnOn(true);
    } else {
      await disable();
    }
  }, [disable, isAuthenticated, isEnabled, requiresLogin, turnOn]);

  const schedule = useCallback(() => {
    if (!isAuthenticated || requiresLogin || !status?.registered || status.pending) return;
    return runAction('schedule', async () => {
      const endpoint = hasNativePushBridge() ? nativeEndpointRef.current
        : (await registrationRef.current?.pushManager.getSubscription())?.endpoint;
      if (!endpoint) throw new PushTestBrowserError('현재 기기의 알림 등록을 확인한 뒤 다시 시도해주세요.');
      await requestTestNotification(status, endpoint);
    });
  }, [isAuthenticated, requestTestNotification, requiresLogin, runAction, status]);

  const login = useCallback((userId: string, password: string) => runAction('login', async () => {
    await loginPushTest(userId, password);
    setRequiresLogin(false);
    setIsAuthenticated(true);
    // 로그인은 인증과 기존 상태 확인만 수행한다. 알림은 ON을 누를 때 시작한다.
    await readCurrentState(revisionRef.current);
  }), [readCurrentState, runAction]);

  const install = useCallback(async () => {
    if (hasNativePushBridge()) return;
    setShowInstallGuide(true);
    const prompt = installPromptRef.current;
    if (!prompt) return;
    installPromptRef.current = null;
    setCanPromptInstall(false);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'dismissed') setMessage('설치를 취소했습니다. 앱 설치 안내에서 다시 확인할 수 있습니다.');
    } catch {
      setMessage('설치 안내창을 열지 못했습니다. 아래 브라우저 메뉴 안내를 따라 설치해주세요.');
    }
  }, []);

  return {
    mode, isNative, isAuthenticated, isEnabled, isStartUncertain, browser, status, isLoading, action, error, message, requiresLogin,
    showInstallGuide, canPromptInstall,
    refresh: () => refresh(true), setEnabled, enable, disable, schedule, login, install,
    closeInstallGuide: () => setShowInstallGuide(false),
  };
}

export type PushTestController = ReturnType<typeof usePushTest>;
