'use client';
import { useCallback, useEffect, useState } from 'react';
import type { PushTestBrowserState, PushTestStatus } from '@/types/push-test';
/** 전시회용 화면 내 알림 시뮬레이션. */
export function usePushTest() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [delivered, setDelivered] = useState(0);
  const notify = useCallback(() => {
    setDelivered(previous => previous + 1);
    setMessage('전시회 데모 · CCTV 검사 알림이 도착했습니다.');
  }, []);
  useEffect(() => {
    if (!isEnabled) return;
    const first = window.setTimeout(notify, 300);
    const interval = window.setInterval(notify, 10000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, [isEnabled, notify]);
  const browser: PushTestBrowserState = {
    checked: true, supported: true, installed: true, permission: 'granted', hasSubscription: isEnabled,
    installGuide: '전시회 데모는 설치 없이 이 화면에서 사용할 수 있습니다.', supportMessage: '로컬 알림 시뮬레이션',
  };
  const status: PushTestStatus = {
    registered: isEnabled, repeating: isEnabled, publicKey: '', pending: null,
    lastJob: delivered ? { status: 'sent' } : null, workerReady: true, fcmReady: false,
  };
  const disable = async () => { setIsEnabled(false); setMessage('데모 알림이 중지되었습니다.'); };
  return {
    mode: 'web' as 'web' | 'native' | 'checking', isNative: false, isAuthenticated: true, isEnabled,
    isStartUncertain: false, browser, status, isLoading: false,
    action: null as 'enable' | 'disable' | 'schedule' | 'login' | null,
    error: null as string | null, message, requiresLogin: false, showInstallGuide, canPromptInstall: false,
    refresh: async () => { setMessage('전시회 데모 준비 완료'); },
    setEnabled: async (enabled: boolean) => { if (enabled) setIsEnabled(true); else await disable(); },
    enable: async () => { setIsEnabled(true); }, disable, schedule: async () => notify(),
    login: async (userId: string, password: string) => { void userId; void password; },
    install: async () => setShowInstallGuide(true), closeInstallGuide: () => setShowInstallGuide(false),
  };
}
export type PushTestController = ReturnType<typeof usePushTest>;
