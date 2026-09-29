'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, BellOff, CircleCheck, Download, Info, Loader2, RefreshCw, ShieldCheck, Timer, X } from 'lucide-react';
import { usePushTest } from '@/hooks/use-push-test';
import { motionDuration } from '@/styles/design-tokens';
import type { PushTestCertificateSetup } from '@/types/push-test';
import PushTestLoginForm from './PushTestLoginForm';
import {
  AppContent, AppFootnote, BellTile, BrandHeader, BrandIdentity, Card, CardHead,
  EntryState, Feedback, HelpActions, Hint, LoginCard, MobileApp,
  PushDetails, PushIdentity, PushSwitch, SoftButton, TestChip,
} from './app-shell.styles';

const MobileCctvList = dynamic(() => import('./MobileCctvList'), {
  loading: () => <Card><EntryState role="status"><Loader2 size={24} aria-hidden="true" />CCTV 목록을 준비하고 있습니다.</EntryState></Card>,
});

export default function PushTestClient({ certificateSetup, apkDownloadPath = null }: {
  certificateSetup: PushTestCertificateSetup | null;
  apkDownloadPath?: string | null;
}) {
  const push = usePushTest();
  const reducedMotion = useReducedMotion();
  const checking = push.mode === 'checking' || (push.isLoading && !push.isAuthenticated);
  const enabled = push.isEnabled;
  const busy = !!push.action || push.isLoading;
  const blocked = push.browser.permission === 'denied' || !push.browser.supported;
  const label = push.action === 'enable' || push.action === 'schedule' ? '알림을 켜는 중...'
    : push.action === 'disable' ? '알림을 끄는 중...'
      : push.isStartUncertain ? '알림 상태 확인 필요'
        : enabled ? (push.status?.workerReady ? 'ON · 알림이 켜져 있어요' : 'ON · 발송 서버 확인 필요') : 'OFF · 알림이 꺼져 있어요';
  const entrance = {
    initial: reducedMotion ? false as const : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reducedMotion ? 0 : motionDuration.enter },
  };

  return <MobileApp><AppContent>
    <BrandHeader>
      <BrandIdentity>
        <Image src="/logo/gmt_logo.png" alt="고모텍" width={72} height={22} priority />
        <div><strong>CCTV</strong><span>현장을 더 가까이</span></div>
      </BrandIdentity>
      {!push.isNative && !push.browser.installed && <SoftButton type="button" onClick={() => { void push.install(); }} disabled={!push.browser.checked}
        aria-controls="push-install-guide" aria-expanded={push.showInstallGuide}>
        <Download size={16} aria-hidden="true" />앱 설치
      </SoftButton>}
    </BrandHeader>

    <AnimatePresence>
      {!push.isNative && push.showInstallGuide && <Card id="push-install-guide" key="install-guide" {...entrance} exit={{ opacity: 0 }}>
        <CardHead><h2>앱 설치 안내</h2><SoftButton type="button" aria-label="앱 설치 안내 닫기" onClick={push.closeInstallGuide}><X size={18} /></SoftButton></CardHead>
        <Hint>{push.browser.installGuide}</Hint>
        {certificateSetup && <Hint>회사 PC에서 처음 접속한다면 이 PC의 인증서를 휴대폰 설정에서 CA 인증서로 설치해주세요.</Hint>}
        <HelpActions>
          {apkDownloadPath && <SoftButton as="a" href={apkDownloadPath}><Download size={16} aria-hidden="true" />Android 앱 다운로드</SoftButton>}
          {certificateSetup && <SoftButton as="a" href={certificateSetup.mobileDownloadUrl}><ShieldCheck size={16} aria-hidden="true" />휴대폰 인증서 받기</SoftButton>}
        </HelpActions>
      </Card>}
    </AnimatePresence>

    {!push.isAuthenticated ? <LoginCard {...entrance} aria-busy={checking || !!push.action}>
      {checking ? <EntryState role="status">
        <motion.span aria-hidden="true" animate={{ rotate: reducedMotion ? 0 : 360 }} transition={{ duration: motionDuration.spin, repeat: Infinity, ease: 'linear' }}><Loader2 size={26} /></motion.span>
        연결 상태를 확인하고 있습니다.
      </EntryState> : <>
        <TestChip><ShieldCheck size={14} aria-hidden="true" />고모텍 CCTV</TestChip>
        <h1>우리 현장의 CCTV,<br />한눈에 확인하세요.</h1>
        <p>아이디와 비밀번호로 로그인하면<br />CCTV 확인과 알림 설정을 시작할 수 있어요.</p>
        {push.error && <Feedback $error role="alert"><Info size={18} aria-hidden="true" /><span>{push.error}</span>
          {!push.requiresLogin && <SoftButton type="button" onClick={() => { void push.refresh(); }} disabled={busy}>다시 연결</SoftButton>}
        </Feedback>}
        <PushTestLoginForm push={push} />
      </>}
    </LoginCard> : <>
      <Card {...entrance} aria-label="CCTV 알림 설정">
        <CardHead>
          <PushIdentity>
            <BellTile $enabled={enabled}>{enabled ? <Bell size={23} aria-hidden="true" /> : <BellOff size={23} aria-hidden="true" />}</BellTile>
            <div><h2>CCTV Push</h2><p id="push-test-status" role="status">{label}</p></div>
          </PushIdentity>
          <PushSwitch type="button" role="switch" aria-label="CCTV Push" aria-checked={enabled} aria-describedby="push-test-status push-test-description"
            $enabled={enabled} disabled={busy || push.isStartUncertain || (!enabled && (!push.browser.supported || !push.status))}
            onClick={() => { void push.setEnabled(!enabled); }}>
            <span aria-hidden="true"><motion.i layout transition={{ duration: reducedMotion ? 0 : motionDuration.fast }} /></span>
          </PushSwitch>
        </CardHead>
        <PushDetails><span><Timer size={15} aria-hidden="true" />ON 즉시 · 이후 10초 간격</span><TestChip>알림 테스트</TestChip></PushDetails>
        <Hint id="push-test-description">전시회 데모 알림을 이 화면에 표시합니다.<br />OFF를 누르면 알림 시뮬레이션이 멈춥니다.</Hint>
        {!push.error && push.status && !push.status.workerReady && <Feedback $error role="status"><Info size={18} aria-hidden="true" /><span>알림 발송 서버에 연결되지 않았습니다. PC의 테스트 서버가 켜져 있는지 확인해주세요.</span>
          <SoftButton type="button" onClick={() => { void push.refresh(); }} disabled={busy}>다시 확인</SoftButton>
        </Feedback>}
        {blocked && <Feedback $error role="status"><Info size={18} aria-hidden="true" /><span>{push.browser.permission === 'denied' ? '휴대폰 설정에서 알림을 허용한 뒤 다시 확인해주세요.' : push.browser.supportMessage}</span>
          <SoftButton type="button" onClick={() => { void push.refresh(); }} disabled={busy}>다시 확인</SoftButton>
        </Feedback>}
        {push.isStartUncertain ? <Feedback $error role="alert"><Info size={18} aria-hidden="true" /><span>{push.error ?? '알림 시작 여부를 확인하지 못했습니다. 상태를 다시 확인하거나 알림을 중단해주세요.'}</span>
          <SoftButton type="button" onClick={() => { void push.refresh(); }} disabled={busy}>상태 재확인</SoftButton>
          <SoftButton type="button" onClick={() => { void push.setEnabled(false); }} disabled={busy}>알림 중단</SoftButton>
        </Feedback> : push.error && <Feedback $error role="alert"><Info size={18} aria-hidden="true" /><span>{push.error}</span>
          <SoftButton type="button" onClick={() => { void push.refresh(); }} disabled={busy}><RefreshCw size={14} aria-hidden="true" />재시도</SoftButton>
        </Feedback>}
        {!push.error && push.message && <Feedback role="status"><CircleCheck size={18} aria-hidden="true" /><span>{push.message}</span></Feedback>}
      </Card>
      <MobileCctvList />
    </>}
    <AppFootnote>고모텍 · CCTV 모니터링{push.isAuthenticated ? ' · 알림 테스트' : ''}</AppFootnote>
  </AppContent></MobileApp>;
}
