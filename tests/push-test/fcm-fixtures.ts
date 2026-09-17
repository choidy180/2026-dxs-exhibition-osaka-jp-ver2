import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import type { FcmConfig } from '../../lib/push-test/config';

const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });

export function fcmFixture(projectId = 'push-test-project') {
  const account = {
    type: 'service_account', project_id: projectId,
    private_key_id: randomBytes(20).toString('hex'),
    private_key: pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    client_email: `push-worker@${projectId}.iam.gserviceaccount.com`,
    token_uri: 'https://oauth2.googleapis.com/token', universe_domain: 'googleapis.com',
  };
  const raw = JSON.stringify(account);
  const config: FcmConfig = {
    projectId, clientEmail: account.client_email, privateKeyId: account.private_key_id,
    privateKey: pair.privateKey, cacheKey: createHash('sha256').update(raw).digest('hex'),
  };
  return { account, raw, config, publicKey: pair.publicKey };
}

export const androidToken = 'fixture-device-token_abcdefghijklmnopqrstuvwxyz:0123456789';
export const androidSubscription = { platform: 'android' as const, token: androidToken, endpoint: `fcm:${androidToken}` };
export const androidPayload = {
  title: '고모텍 CCTV',
  body: '3번 CCTV 영상 수신 오류가 발생했습니다. (test)',
  url: '/lab/push' as const, tag: 'push-test-fixture-job',
};
