import { resolve } from 'node:path';
import type { PushTestCertificateSetup } from '@/types/push-test';
import { readPublicCertificate } from '../../scripts/push-test-certificate.mjs';
import { isPushTestEnabled } from './config';

export const CERTIFICATE_DOWNLOAD_PATH = '/lab/push/test-ca.crt';

export function getPushTestCertificateSetup(): PushTestCertificateSetup | null {
  if (!isPushTestEnabled() || process.env.PUSH_TEST_LOCAL_CERTIFICATE !== 'true') return null;
  try {
    const download = new URL(process.env.PUSH_TEST_CERTIFICATE_DOWNLOAD_URL || '');
    const site = new URL(process.env.PUSH_TEST_ORIGIN || '');
    if (download.protocol !== 'http:' || download.hostname !== site.hostname
      || download.pathname !== CERTIFICATE_DOWNLOAD_PATH || download.username || download.password
      || download.search || download.hash) return null;
    return { downloadPath: CERTIFICATE_DOWNLOAD_PATH, mobileDownloadUrl: download.href };
  } catch { return null; }
}

export async function getPushTestPublicCertificate(): Promise<Buffer | null> {
  if (!getPushTestCertificateSetup()) return null;
  try { return await readPublicCertificate(resolve('.data', 'push-test-ca.crt')); }
  catch { return null; }
}
