import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { randomBytes, scryptSync } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import webPush from 'web-push';
import { resolvePrivateHost } from './push-test-local.mjs';

// 비밀번호를 화면·명령행 인수·평문 파일에 남기지 않는다.
let hidden = false;
const output = new Writable({ write(chunk, encoding, callback) { if (!hidden) process.stdout.write(chunk, encoding); callback(); } });
const prompt = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
try {
  if (existsSync('.env.push-test.local')) throw Object.assign(new Error('기존 설정 파일'), { code: 'EEXIST' });
  const phone = process.argv.includes('--phone');
  const host = phone ? resolvePrivateHost(process.argv.find(arg => arg.startsWith('--host='))?.slice(7)) : null;
  const origin = new URL(phone ? `https://${host}:${process.env.PORT || '3000'}` : await prompt.question('내부 HTTPS 주소 (예: https://dxs-test.internal): '));
  if (phone) process.stdout.write(`휴대폰 접속 주소를 자동으로 정했습니다: ${origin.origin}/lab/push\n`);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('경로 없는 HTTPS origin을 입력해주세요.');
  const userId = (await prompt.question('테스트 계정 ID (영문/숫자/_/-): ')).trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(userId)) throw new Error('계정 ID 형식을 확인해주세요.');
  process.stdout.write('테스트 비밀번호 (12자 이상, 입력 숨김): ');
  hidden = true;
  const password = await prompt.question('');
  hidden = false;
  process.stdout.write('\n');
  if (password.length < 12 || password.length > 256) throw new Error('비밀번호는 12~256자로 입력해주세요.');
  const subject = (await prompt.question('VAPID 연락처 (mailto:관리자메일): ')).trim();
  if (!/^mailto:[^\s@]+@[^\s@]+$/.test(subject)) throw new Error('mailto: 연락처를 확인해주세요.');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  const keys = webPush.generateVAPIDKeys();
  const settings = [
    'APP_ENV=test', 'PUSH_TEST_ENABLED=true', `PUSH_TEST_ORIGIN=${origin.origin}`,
    'PUSH_TEST_DB_PATH=./.data/push-test.sqlite',
    `PUSH_TEST_VAPID_SUBJECT=${subject}`, `PUSH_TEST_VAPID_PUBLIC_KEY=${keys.publicKey}`,
    `PUSH_TEST_VAPID_PRIVATE_KEY=${keys.privateKey}`,
    `PUSH_TEST_SESSION_SECRET=${randomBytes(48).toString('base64url')}`,
    `PUSH_TEST_USERS_JSON='${JSON.stringify({ [userId]: `${salt}:${hash}` })}'`, '',
  ].join('\n');
  await writeFile('.env.push-test.local', settings, { flag: 'wx', mode: 0o600 });
  process.stdout.write('.env.push-test.local 생성 완료. 테스트 실행 명령에서 자동으로 읽습니다.\n');
  process.stdout.write(phone ? `이제 npm run push:phone -- --host=${host} 을 실행하세요.\n` : '기존 HTTPS 서버: npm run push:dev / 같은 공유기의 휴대폰: npm run push:phone\n');
} catch (error) {
  process.stderr.write(`${error.code === 'EEXIST' ? '설정 파일이 이미 있습니다. 다시 만들 필요 없이 npm run push:phone 을 실행하세요. 기존 계정과 키는 그대로 유지됩니다.' : error.message}\n`);
  process.exitCode = 1;
} finally { prompt.close(); }
