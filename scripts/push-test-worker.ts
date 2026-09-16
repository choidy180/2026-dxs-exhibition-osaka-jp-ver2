import { loadEnvConfig } from '@next/env';
import { runPushTestWorker } from '../lib/push-test/worker';
import { PushTestError } from '../lib/push-test/validation';
import { loadDedicatedTestEnv } from './push-test-env.mjs';

loadEnvConfig(process.cwd());
loadDedicatedTestEnv();
const controller = new AbortController();
process.once('SIGINT', () => controller.abort());
process.once('SIGTERM', () => controller.abort());

void runPushTestWorker(controller.signal).catch(error => {
  console.error(error instanceof PushTestError ? error.message : '푸시 테스트 워커가 중지되었습니다. 설정과 영속 저장소를 확인해 주세요.');
  process.exitCode = 1;
});
