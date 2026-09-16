import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

// 테스트 전용 실행 명령에서만 읽는다. 일반 앱 실행에는 적용하지 않는다.
export function loadDedicatedTestEnv(directory = process.cwd()) {
  const path = resolve(directory, '.env.push-test.local');
  if (!existsSync(path)) return;
  const settings = parseEnv(readFileSync(path, 'utf8'));
  for (const [name, value] of Object.entries(settings)) {
    if (name === 'APP_ENV' || name.startsWith('PUSH_TEST_')) process.env[name] ??= value;
  }
}
