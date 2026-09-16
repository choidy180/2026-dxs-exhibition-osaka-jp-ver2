import { statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isPushTestEnabled } from './config';

export const ANDROID_APK_DOWNLOAD_PATH = '/lab/push/android.apk';
const apkPath = () => resolve('.data', 'push-test-apk', 'dxs-cctv-test.apk');
const MAX_APK_BYTES = 100 * 1024 * 1024;

export function getAndroidApkDownloadPath(): string | null {
  if (!isPushTestEnabled()) return null;
  try {
    const file = statSync(apkPath());
    return file.isFile() && file.size > 0 && file.size <= MAX_APK_BYTES ? ANDROID_APK_DOWNLOAD_PATH : null;
  } catch { return null; }
}

export async function readAndroidTestApk(): Promise<Buffer | null> {
  if (!getAndroidApkDownloadPath()) return null;
  try {
    const data = await readFile(apkPath());
    return data.length <= MAX_APK_BYTES && data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ? data : null;
  } catch { return null; }
}
