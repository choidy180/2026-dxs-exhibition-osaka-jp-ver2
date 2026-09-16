'use client';

import { useCallback, useState } from 'react';
import { AlertCircle, Cctv, Loader2, RefreshCw, Settings } from 'lucide-react';
import CctvMonitoringClient from '@/components/lab/cctv-monitoring/CctvMonitoringClient';
import { usePushTest } from '@/hooks/use-push-test';
import { motionDuration } from '@/styles/design-tokens';
import PushTestPanel from './PushTestPanel';
import PushTestLoginForm from './PushTestLoginForm';
import NativePushSettings from './NativePushSettings';
import type { PushTestCertificateSetup } from '@/types/push-test';
import {
  Actions, AppEntryCard, AppHeader, AppIdentity, AppMonitor, AppScreen,
  Button, Copy, Spinner, StatusBadge, StatusLine,
} from './styles';

export default function PushTestClient({ certificateSetup, apkDownloadPath = null }: {
  certificateSetup: PushTestCertificateSetup | null;
  apkDownloadPath?: string | null;
}) {
  const push = usePushTest();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  if (push.mode === 'checking' || (push.isNative && !push.isAuthenticated)) {
    return <AppScreen>
      <AppEntryCard aria-busy={push.isLoading || !!push.action}>
        <AppIdentity><Cctv size={24} aria-hidden="true" /><div><strong>DXS CCTV</strong><Copy>CCTV 관제 · 테스트 앱</Copy></div></AppIdentity>
        {push.mode === 'checking' || push.isLoading ? <StatusLine role="status">
          <Spinner animate={{ rotate: 360 }} transition={{ duration: motionDuration.spin, repeat: Infinity, ease: 'linear' }}><Loader2 size={18} aria-hidden="true" /></Spinner>
          <span>앱 연결과 로그인 상태를 확인하는 중...</span>
        </StatusLine> : push.requiresLogin ? <>
          <h2>로그인</h2>
          {push.error && <StatusLine $tone="danger" role="alert"><AlertCircle size={16} aria-hidden="true" /><span>{push.error}</span></StatusLine>}
          <PushTestLoginForm push={push} />
        </> : <>
          <StatusLine $tone="danger" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{push.error ?? '서버 연결을 확인하지 못했습니다.'}</span></StatusLine>
          <Copy>내부망 연결을 확인한 뒤 다시 시도해주세요.</Copy>
          <Button type="button" onClick={() => { void push.refresh(); }} disabled={!!push.action}><RefreshCw size={16} aria-hidden="true" />다시 연결</Button>
        </>}
      </AppEntryCard>
    </AppScreen>;
  }

  if (!push.isNative) return <CctvMonitoringClient testPanel={<PushTestPanel push={push} certificateSetup={certificateSetup} apkDownloadPath={apkDownloadPath} />} />;

  const blocked = push.browser.permission === 'denied';
  const enabled = push.status?.registered && push.browser.hasSubscription && push.browser.permission === 'granted';
  const label = push.action === 'login' || push.action === 'enable' ? '알림 등록 중'
    : push.action === 'disable' ? '알림 해제 중'
      : push.isLoading ? '알림 확인 중'
        : push.error ? '알림 확인 필요' : blocked ? '알림 차단' : enabled ? '알림 사용 중' : '알림 미등록';
  return <>
    <AppMonitor inert={settingsOpen || undefined} aria-hidden={settingsOpen || undefined}>
      <CctvMonitoringClient testPanel={<AppHeader>
        <AppIdentity><Cctv size={20} aria-hidden="true" /><strong>DXS CCTV</strong></AppIdentity>
        <Actions>
          <StatusBadge role="status" $tone={push.error || blocked ? 'warning' : enabled ? 'success' : 'neutral'}>{label}</StatusBadge>
          <Button type="button" onClick={() => setSettingsOpen(true)} aria-haspopup="dialog" aria-expanded={settingsOpen}>
            <Settings size={16} aria-hidden="true" />알림 설정
          </Button>
        </Actions>
      </AppHeader>} />
    </AppMonitor>
    <NativePushSettings open={settingsOpen} onClose={closeSettings} push={push} />
  </>;
}
