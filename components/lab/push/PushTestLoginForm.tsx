'use client';

import { useState } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import type { PushTestController } from '@/hooks/use-push-test';
import { LoginButton, LoginFields, PasswordField } from './app-shell.styles';

export default function PushTestLoginForm({ push }: { push: PushTestController }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const busy = !!push.action || push.isLoading;

  return <LoginFields onSubmit={event => {
    event.preventDefault();
    const submittedPassword = password;
    setPassword('');
    void push.login(userId.trim(), submittedPassword);
  }}>
    <label htmlFor="push-test-user">아이디
      <input id="push-test-user" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
        placeholder="아이디" value={userId} onChange={event => setUserId(event.target.value)} required disabled={busy} maxLength={64} />
    </label>
    <label htmlFor="push-test-password">비밀번호
      <PasswordField>
        <input id="push-test-password" name="password" aria-label="비밀번호" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
          placeholder="비밀번호" value={password} onChange={event => setPassword(event.target.value)} required disabled={busy} />
        <button type="button" aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} aria-pressed={showPassword}
          disabled={busy} onClick={() => setShowPassword(value => !value)}>
          {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </PasswordField>
    </label>
    <LoginButton type="submit" disabled={busy || !userId.trim() || !password}>
      {push.action === 'login' ? '로그인 중...' : '로그인'}<ArrowRight size={17} aria-hidden="true" />
    </LoginButton>
  </LoginFields>;
}
