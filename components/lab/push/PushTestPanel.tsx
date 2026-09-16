'use client';

import { useState } from 'react';
import { AlertCircle, Bell, BellOff, ClipboardCopy, Download, Info, Loader2, RefreshCw, Send, X } from 'lucide-react';
import type { PushTestController } from '@/hooks/use-push-test';
import { motionDuration } from '@/styles/design-tokens';
import type { PushTestCertificateSetup } from '@/types/push-test';
import { Actions, Button, Copy, Disclaimer, Guide, GuideContent, Panel, PanelRow, PanelTitle, Spinner, StatusBadge, StatusLine } from './styles';
import PushTestLoginForm from './PushTestLoginForm';

const permissionLabels = {
  default: '미요청',
  granted: '허용',
  denied: '차단',
  unsupported: '미지원',
};

export default function PushTestPanel({ push, certificateSetup, apkDownloadPath = null }: {
  push: PushTestController;
  certificateSetup: PushTestCertificateSetup | null;
  apkDownloadPath?: string | null;
}) {
  const [certificateMessage, setCertificateMessage] = useState('');
  const blocked = push.browser.permission === 'denied';
  const enabled = push.status?.registered && push.browser.hasSubscription && push.browser.permission === 'granted';
  const busy = !!push.action || push.isLoading;
  const pending = push.status?.pending;
  const statusLabel = blocked ? '알림 차단' : enabled ? '알림 사용 중' : '알림 미등록';
  const pendingTime = pending ? new Date(pending.dueAt).toLocaleString('ko-KR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }) : '-';

  return (
    <Panel $inDialog={push.isNative} aria-labelledby="push-test-title" aria-busy={busy}>
      <PanelRow>
        <PanelTitle>
          <Bell size={18} aria-hidden="true" />
          <h2 id="push-test-title">{push.isNative ? '테스트 알림' : 'PWA 푸시 테스트'}</h2>
          <StatusBadge $tone={blocked ? 'danger' : enabled ? 'success' : 'neutral'}>{statusLabel}</StatusBadge>
          <Disclaimer>테스트 알림은 실제 CCTV 상태와 무관합니다.</Disclaimer>
        </PanelTitle>
        <Actions>
          {!push.isNative && <Button type="button" onClick={() => { void push.install(); }} disabled={!push.browser.checked}
            aria-expanded={push.showInstallGuide} aria-controls="push-install-guide"
            title={push.canPromptInstall ? '설치 안내창을 엽니다' : '기기별 앱 설치 방법을 확인합니다'}>
            <Download size={14} aria-hidden="true" />앱 설치 안내
          </Button>}
          {!push.isNative && apkDownloadPath && <Button as="a" href={apkDownloadPath} download="dxs-cctv-test.apk">
            <Download size={14} aria-hidden="true" />갤럭시 APK 다운로드
          </Button>}
          <Button type="button" onClick={() => { void push.enable(); }}
            disabled={busy || !push.browser.supported || blocked || !!enabled || push.requiresLogin || !push.status
              || (push.isNative ? push.status.fcmReady !== true : !push.status.publicKey)}>
            <Bell size={14} aria-hidden="true" />{push.action === 'enable' ? '등록 중...' : '알림 켜기'}
          </Button>
          <Button type="button" onClick={() => { void push.schedule(); }}
            disabled={busy || !enabled || !!pending || !push.status?.workerReady || push.requiresLogin
              || (push.isNative && push.status?.fcmReady !== true)}>
            <Send size={14} aria-hidden="true" />{push.action === 'schedule' ? '예약 중...' : pending ? '테스트 푸시 예약됨' : '테스트 푸시'}
          </Button>
          <Button type="button" onClick={() => { void push.disable(); }}
            disabled={busy || push.requiresLogin || !push.status}>
            <BellOff size={14} aria-hidden="true" />{push.action === 'disable' ? '해제 중...' : '알림 끄기'}
          </Button>
        </Actions>
      </PanelRow>

      {push.isLoading ? (
        <StatusLine role="status">
          <Spinner animate={{ rotate: 360 }} transition={{ duration: motionDuration.spin, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={16} aria-hidden="true" />
          </Spinner>
          <span>{push.isNative ? '앱의 알림 권한과 현재 기기 등록을 확인하는 중...' : 'PWA 지원, 알림 권한과 현재 기기 구독을 확인하는 중...'}</span>
        </StatusLine>
      ) : (
        <Copy>
          {push.isNative ? <>앱 푸시: {push.browser.supported ? '준비됨' : '확인 필요'}</>
            : <>PWA 푸시: {push.browser.supported ? '지원' : '사용 불가'} · 설치 상태: {push.browser.installed ? '홈 화면 앱으로 실행 중' : '브라우저 실행 중 (설치 여부 확인 불가)'}</>}
          {' · '}알림 권한: {permissionLabels[push.browser.permission]} · 현재 기기 구독: {push.status ? (push.status.registered && push.browser.hasSubscription ? '등록됨' : '미등록') : '확인 필요'}
        </Copy>
      )}

      {!push.isLoading && !push.browser.supported && <Copy>{push.browser.supportMessage}</Copy>}
      {blocked && <Copy>{push.isNative ? '휴대폰 설정 → 애플리케이션 → DXS CCTV → 알림에서 허용한 뒤 재시도해주세요.' : '브라우저 또는 기기 설정에서 이 앱의 알림을 허용한 뒤 재시도해주세요.'}</Copy>}

      {push.error && (
        <StatusLine $tone="danger" role="alert">
          <AlertCircle size={16} aria-hidden="true" /><span>{push.error}</span>
          <Button type="button" disabled={busy} onClick={() => { void push.refresh(); }}>
            <RefreshCw size={14} aria-hidden="true" />재시도
          </Button>
        </StatusLine>
      )}

      {push.requiresLogin && <PushTestLoginForm push={push} />}

      {!push.isLoading && !push.error && !enabled && !blocked && !push.message && (
        <StatusLine $empty><BellOff size={16} aria-hidden="true" /><span>등록된 알림이 없습니다. 알림 켜기를 누르면 현재 기기만 등록합니다.</span></StatusLine>
      )}

      {push.status && !push.status.workerReady && (
        <StatusLine $tone="warning"><Info size={16} aria-hidden="true" /><span>서버의 예약 발송 작업자가 준비되지 않았습니다. 관리자에게 실행 상태를 확인해주세요.</span>
          <Button type="button" disabled={busy} onClick={() => { void push.refresh(); }}>재시도</Button>
        </StatusLine>
      )}
      {push.isNative && push.status && push.status.fcmReady !== true && (
        <StatusLine $tone="warning"><Info size={16} aria-hidden="true" /><span>앱 알림 전송 설정이 준비되지 않았습니다. 관리자에게 확인해주세요.</span>
          <Button type="button" disabled={busy} onClick={() => { void push.refresh(); }}>재시도</Button>
        </StatusLine>
      )}
      {push.message && <StatusLine $tone="info" role="status"><Info size={16} aria-hidden="true" /><span>{push.message}</span></StatusLine>}
      {pending && <Copy>발송 예정 {pendingTime} · 현재 기기에 1회 예약되어 있습니다. 알림 끄기로 미발송 예약을 취소할 수 있습니다.</Copy>}

      {!push.isNative && push.showInstallGuide && (
        <Guide id="push-install-guide">
          <GuideContent>
            <Copy>{push.browser.installGuide}</Copy>
            {certificateSetup && <>
              <Copy>처음 테스트하는 휴대폰은 인증서 파일을 받은 뒤 설정에서 한 번 설치해주세요. USB 연결 없이 받을 수 있습니다.</Copy>
              <Actions>
                <Button as="a" href={certificateSetup.downloadPath} download="push-test-ca.crt">
                  <Download size={14} aria-hidden="true" />인증서 다운로드
                </Button>
                <Button type="button" onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(certificateSetup.mobileDownloadUrl);
                    setCertificateMessage('주소를 복사했습니다. 같은 내부망에 연결된 휴대폰의 Chrome 주소창에 붙여넣으세요.');
                  } catch {
                    setCertificateMessage('복사하지 못했습니다. 아래 주소를 직접 복사하거나 버튼을 다시 눌러주세요.');
                  }
                }}><ClipboardCopy size={14} aria-hidden="true" />휴대폰 다운로드 주소 복사</Button>
              </Actions>
              <Copy>{certificateSetup.mobileDownloadUrl}</Copy>
              <Copy>갤럭시에서 “CA 인증서를 설치할 수 없음”이 뜨면 확인을 눌러 닫고 휴대폰의 설정 앱을 여세요. 다운로드 파일을 바로 여는 방식으로는 CA 인증서를 설치할 수 없습니다.</Copy>
              <Copy>설정 → 보안 및 개인정보 보호 → 기타 보안 설정 → 기기에 저장된 인증서 설치 → CA 인증서 → Download에서 push-test-ca.crt를 선택하세요. 설치 후 브라우저를 완전히 종료하고 이 테스트 주소를 다시 열어주세요.</Copy>
              <Copy>인증서는 자동으로 설치되지 않습니다. 다운로드가 차단되면 USB 파일 복사를 이용하거나 관리자에게 신뢰되는 HTTPS 주소를 요청해주세요.</Copy>
              {certificateMessage && <Copy role="status">{certificateMessage}</Copy>}
            </>}
          </GuideContent>
          <Button type="button" onClick={push.closeInstallGuide} aria-label="앱 설치 안내 닫기"><X size={14} aria-hidden="true" /></Button>
        </Guide>
      )}
      <Copy>{push.isNative ? '알림을 누르면 앱의 CCTV 화면이 열립니다. 외부망에서는 내부 페이지에 접속되지 않을 수 있습니다.' : '알림을 누르면 /lab/push가 열립니다. 외부망에서는 내부 페이지에 접속되지 않을 수 있습니다.'}</Copy>
    </Panel>
  );
}
