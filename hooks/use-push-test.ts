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
    // 인증 응답을 기다리는 동안 권한 요청이 실패해도 처리되지 않은 거절을 남기지 않는다.
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
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [canPromptInstall, setCanPromptInstall] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const nativeEndpointRef = useRef<string | null>(null);
  const installPromptRef = useRef<PushTestInstallPrompt | null>(null);
  const busyRef = useRef(false);
  const refreshRef = useRef(false);
  const revisionRef = useRef(0);
  const mountedRef = useRef(true);

  const reportError = useCallback((caught: unknown) => {
    if (!mountedRef.current) return;
    setError(errorMessage(caught));
    // 요청 실패 뒤 이전 등록 상태로 다시 예약하지 않도록 서버 재확인을 요구한다.
    setStatus(null);
    setMessage(null);
    if (caught instanceof PushTestApiError && caught.status === 401) {
      setRequiresLogin(true);
      setIsAuthenticated(false);
    }
  }, []);

  const refresh = useCallback(async (showLoading = false) => {
    if (busyRef.current || refreshRef.current) return;
    refreshRef.current = true;
    const revision = revisionRef.current;
    if (showLoading) setIsLoading(true);
    try {
      if (hasNativePushBridge()) {
        // 앱 재진입 시 캐시된 토큰만 조회하며 권한 요청이나 토큰 발급은 하지 않는다.
        const [nativeStatus, tokenResult] = await Promise.all([
          requestNativePush('getStatus'), requestNativePush('getToken'),
        ]);
        if (!mountedRef.current || revision !== revisionRef.current) return;
        nativeEndpointRef.current = tokenResult.token ? nativePushEndpoint(tokenResult.token) : null;
        setBrowser({
          checked: true, installed: true, supported: nativeStatus.configured,
          permission: nativeStatus.permission, hasSubscription: !!tokenResult.token,
          installGuide: '', supportMessage: nativeStatus.configured
            ? '이 기기의 앱 알림을 사용할 수 있습니다.' : '앱 알림 설정이 준비되지 않았습니다. 관리자에게 확인해주세요.',
        });
        const result = await fetchPushTestStatus(nativeEndpointRef.current);
        if (!mountedRef.current || revision !== revisionRef.current) return;
        setStatus(result);
        setIsAuthenticated(true);
        setRequiresLogin(false);
        setError(null);
        if (!result.pending && result.lastJob?.status === 'sent') setMessage('테스트 알림을 발송했습니다. 휴대폰의 알림 센터를 확인해주세요.');
        else if (!result.pending && ['failed', 'expired', 'unknown'].includes(result.lastJob?.status ?? '')) {
          setMessage('최근 테스트 알림의 발송을 확인하지 못했습니다. 기기 등록과 서버 연결을 확인한 뒤 다시 테스트해주세요.');
        }
        return;
      }
      const currentBrowser = inspectBrowser();
      if (mountedRef.current) setBrowser(current => ({ ...currentBrowser, hasSubscription: current.hasSubscription }));
      let subscription: PushSubscription | null = null;
      if (currentBrowser.supported) {
        registrationRef.current = await getTestRegistration();
        subscription = await registrationRef.current.pushManager.getSubscription();
      }
      if (!mountedRef.current || revision !== revisionRef.current) return;
      setBrowser({ ...currentBrowser, hasSubscription: !!subscription });
      const result = await fetchPushTestStatus(subscription?.endpoint ?? null);
      if (!mountedRef.current || revision !== revisionRef.current) return;
      const needsNewKey = subscription && !subscriptionMatchesKey(subscription, result.publicKey);
      setStatus(needsNewKey ? { ...result, registered: false } : result);
      setIsAuthenticated(true);
      setRequiresLogin(false);
      setError(null);
      if (needsNewKey) setMessage('서버의 푸시 설정이 변경되었습니다. 알림 켜기로 현재 기기를 다시 등록해주세요. 기존 미발송 예약은 재등록할 때 취소됩니다.');
      else if (!result.pending && result.lastJob?.status === 'sent') setMessage('테스트 푸시를 발송했습니다. 기기의 알림 센터에서 수신을 확인해주세요.');
      else if (!result.pending && ['failed', 'expired', 'unknown'].includes(result.lastJob?.status ?? '')) {
        setMessage('최근 테스트 푸시의 발송을 확인하지 못했습니다. 기기 등록과 서버 발송 상태를 확인한 뒤 다시 테스트해주세요.');
      }
    } catch (caught) {
      if (revision === revisionRef.current) reportError(caught);
    } finally {
      refreshRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  }, [reportError]);

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
    if (!status?.pending) return;
    // 이 타이머는 상태 조회 전용이며, 예약 발송은 독립적인 서버 작업자가 수행한다.
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 5_000);
    return () => window.clearInterval(poll);
  }, [refresh, status?.pending]);

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

  const finishPermissionRequest = useCallback(async (request: Promise<PermissionOutcome>, afterLogin = false) => {
    const outcome = await request;
    const prefix = afterLogin ? '로그인했습니다. ' : '';
    if (!outcome.ok) {
      setError(errorMessage(outcome.error));
      setMessage(`${prefix}알림 켜기를 눌러 다시 시도해주세요.`);
      return false;
    }
    setBrowser(current => ({ ...current, permission: outcome.permission }));
    if (outcome.permission !== 'granted') {
      setMessage(outcome.permission === 'denied'
        ? `${prefix}알림이 차단되어 있습니다. 기기와 브라우저 설정에서 허용한 뒤 알림 켜기를 눌러주세요.`
        : `${prefix}알림 켜기를 눌러 허용하면 현재 기기가 등록됩니다.`);
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
        return;
      }
      const { token } = await requestNativePush('register');
      const endpoint = nativePushEndpoint(token);
      nativeEndpointRef.current = endpoint;
      setBrowser(current => ({ ...current, hasSubscription: true }));
      if (currentStatus.registered && endpoint === registeredEndpoint) {
        setStatus(currentStatus);
        setMessage('현재 기기는 이미 알림을 사용 중입니다. 테스트 푸시로 수신을 확인해주세요.');
        return;
      }
      const result = await subscribePushTest({ platform: 'android', token });
      setStatus(result);
      setMessage('현재 기기에 앱 알림을 등록했습니다. 테스트 푸시로 수신을 확인해주세요.');
      return;
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
      return;
    }
    const result = await subscribePushTest(subscription.toJSON());
    setStatus(result);
    setMessage('현재 기기에 알림을 등록했습니다. 테스트 푸시로 수신을 확인해주세요.');
  }, []);

  const enable = useCallback(() => {
    if (busyRef.current || !browser.supported || !status || requiresLogin) return;
    if (hasNativePushBridge()) return runAction('enable', () => registerCurrentDevice(status, nativeEndpointRef.current));
    if (!status.publicKey) return;
    return runAction('enable', async () => {
      const permission = requestPermissionForAction();
      if (await finishPermissionRequest(permission)) await registerCurrentDevice(status);
    });
  }, [browser.supported, finishPermissionRequest, registerCurrentDevice, requiresLogin, runAction, status]);

  const disable = useCallback(() => runAction('disable', async () => {
    if (hasNativePushBridge()) {
      const result = await unsubscribePushTest(nativeEndpointRef.current);
      setStatus(result);
      await requestNativePush('unregister');
      nativeEndpointRef.current = null;
      setBrowser(current => ({ ...current, hasSubscription: false }));
      setMessage('현재 기기의 앱 알림을 끄고 미발송 테스트 예약을 취소했습니다.');
      return;
    }
    const subscription = await registrationRef.current?.pushManager.getSubscription() ?? null;
    // 서버 예약 취소가 성공한 뒤 브라우저 구독을 해제해야 실패 시 재시도가 가능하다.
    const result = await unsubscribePushTest(subscription?.endpoint ?? null);
    setStatus(result);
    if (subscription) {
      await subscription.unsubscribe();
      const remaining = await registrationRef.current?.pushManager.getSubscription();
      if (remaining) throw new PushTestBrowserError('서버 알림과 예약은 해제했습니다. 기기 구독 해제를 위해 알림 끄기를 다시 눌러주세요.');
    }
    setBrowser(current => ({ ...current, hasSubscription: false }));
    setMessage('현재 기기의 알림을 끄고 미발송 테스트 예약을 취소했습니다.');
  }), [runAction]);

  const schedule = useCallback(() => {
    if (!status?.registered || status.pending || !status.workerReady) return;
    return runAction('schedule', async () => {
      if (hasNativePushBridge()) {
        if (status.fcmReady !== true || !nativeEndpointRef.current) throw new PushTestBrowserError('현재 기기의 앱 알림 등록을 확인한 뒤 다시 시도해주세요.');
        const result = await schedulePushTest(nativeEndpointRef.current);
        setStatus(current => current ? { ...current, pending: result.pending } : current);
        setMessage('30초 후 발송됩니다. 화면을 닫고 확인해보세요.');
        return;
      }
      const subscription = await registrationRef.current?.pushManager.getSubscription();
      if (!subscription) throw new PushTestBrowserError('현재 기기에 등록된 구독이 없습니다. 알림 켜기로 다시 등록해주세요.');
      const result = await schedulePushTest(subscription.endpoint);
      setStatus(current => current ? { ...current, pending: result.pending } : current);
      setMessage('30초 후 발송됩니다. 화면을 닫고 확인해보세요.');
    });
  }, [runAction, status]);

  const login = useCallback((userId: string, password: string) => runAction('login', async () => {
    if (hasNativePushBridge()) {
      // 네이티브 토큰 발급과 서버 구독 등록은 사용자 인증 성공 뒤에만 진행한다.
      await loginPushTest(userId, password);
      setRequiresLogin(false);
      setIsAuthenticated(true);
      const result = await fetchPushTestStatus(nativeEndpointRef.current);
      setStatus(result);
      await registerCurrentDevice(result, nativeEndpointRef.current);
      return;
    }
    const currentBrowser = inspectBrowser();
    setBrowser(current => ({ ...currentBrowser, hasSubscription: current.hasSubscription }));
    // 로그인 클릭의 사용자 제스처가 끝나기 전에 권한 요청만 시작한다. 등록은 인증 후에 한다.
    const permission = currentBrowser.supported ? requestPermissionForAction() : null;
    await loginPushTest(userId, password);
    setRequiresLogin(false);
    setIsAuthenticated(true);
    const registration = currentBrowser.supported ? registrationRef.current ?? await getTestRegistration() : null;
    if (registration) registrationRef.current = registration;
    const subscription = await registration?.pushManager.getSubscription() ?? null;
    const result = await fetchPushTestStatus(subscription?.endpoint ?? null);
    const needsNewKey = subscription && !subscriptionMatchesKey(subscription, result.publicKey);
    const currentStatus = needsNewKey ? { ...result, registered: false } : result;
    setStatus(currentStatus);
    setBrowser(current => ({ ...current, hasSubscription: !!subscription }));
    if (!permission) {
      setMessage(`로그인했습니다. ${currentBrowser.supportMessage}`);
      return;
    }
    if (await finishPermissionRequest(permission, true)) {
      await registerCurrentDevice(currentStatus, subscription?.endpoint ?? null);
    }
  }), [finishPermissionRequest, registerCurrentDevice, runAction]);

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
    mode, isNative, isAuthenticated, browser, status, isLoading, action, error, message, requiresLogin,
    showInstallGuide, canPromptInstall,
    refresh: () => refresh(true), enable, disable, schedule, login, install,
    closeInstallGuide: () => setShowInstallGuide(false),
  };
}

export type PushTestController = ReturnType<typeof usePushTest>;
