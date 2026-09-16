'use client';

import { useState } from 'react';
import type { PushTestController } from '@/hooks/use-push-test';
import { Button, Copy, LoginForm } from './styles';

export default function PushTestLoginForm({ push }: { push: PushTestController }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const busy = !!push.action || push.isLoading;
  const autoRegisterOnLogin = push.browser.supported && push.browser.permission !== 'denied';

  return (
    <LoginForm $stacked={push.isNative} onSubmit={event => {
      event.preventDefault();
      const submittedPassword = password;
      setPassword('');
      void push.login(userId.trim(), submittedPassword);
    }}>
      <Copy>{autoRegisterOnLogin
        ? '로그인하면 현재 기기의 알림도 함께 등록합니다. 처음에는 휴대폰의 알림 요청에서 허용을 눌러주세요.'
        : push.isNative ? '테스트 계정으로 로그인해주세요. 알림은 휴대폰 설정을 확인한 뒤 등록할 수 있습니다.'
          : '테스트 계정으로 로그인해주세요. 알림은 기기와 브라우저 설정을 확인한 뒤 등록할 수 있습니다.'}</Copy>
      <label htmlFor="push-test-user">테스트 사용자
        <input id="push-test-user" name="username" autoComplete="username" value={userId}
          onChange={event => setUserId(event.target.value)} required disabled={busy} maxLength={128} />
      </label>
      <label htmlFor="push-test-password">비밀번호
        <input id="push-test-password" name="password" type="password" autoComplete="current-password" value={password}
          onChange={event => setPassword(event.target.value)} required disabled={busy} maxLength={256} />
      </label>
      <Button type="submit" disabled={busy || !userId.trim() || !password}>
        {push.action === 'login' ? (autoRegisterOnLogin ? '로그인·알림 등록 중...' : '인증 중...')
          : autoRegisterOnLogin ? '로그인 및 알림 등록' : '테스트 로그인'}
      </Button>
    </LoginForm>
  );
}
