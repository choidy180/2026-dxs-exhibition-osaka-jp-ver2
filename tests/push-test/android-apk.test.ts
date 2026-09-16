import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { GET } from '../../app/lab/push/android.apk/route';
import { ANDROID_APK_DOWNLOAD_PATH, getAndroidApkDownloadPath } from '../../lib/push-test/android-apk';

test('APK 다운로드는 테스트 활성화·고정 경로·파일 크기·ZIP 표식을 확인하고 첨부파일로만 제공한다', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'dxs-push-apk-route-'));
  const artifactDirectory = join(directory, '.data', 'push-test-apk');
  const apk = join(artifactDirectory, 'dxs-cctv-test.apk');
  const previousDirectory = process.cwd();
  const names = ['APP_ENV', 'PUSH_TEST_ENABLED'] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const fixture = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('test-only-apk-fixture')]);
  mkdirSync(artifactDirectory, { recursive: true });
  writeFileSync(apk, fixture);
  try {
    process.chdir(directory);
    for (const [environment, enabled] of [
      [undefined, undefined], ['production', 'true'], ['test', undefined], ['test', 'false'], ['test', 'TRUE'],
    ]) {
      if (environment === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = environment;
      if (enabled === undefined) delete process.env.PUSH_TEST_ENABLED;
      else process.env.PUSH_TEST_ENABLED = enabled;
      assert.equal(getAndroidApkDownloadPath(), null);
      const response = await GET();
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal((await response.arrayBuffer()).byteLength, 0);
    }

    process.env.APP_ENV = 'test';
    process.env.PUSH_TEST_ENABLED = 'true';
    assert.equal(getAndroidApkDownloadPath(), ANDROID_APK_DOWNLOAD_PATH);
    const response = await GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'application/vnd.android.package-archive');
    assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="dxs-cctv-test.apk"');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fixture);

    writeFileSync(apk, 'not-an-apk');
    assert.equal((await GET()).status, 404);
    writeFileSync(apk, Buffer.alloc(0));
    assert.equal(getAndroidApkDownloadPath(), null);
    assert.equal((await GET()).status, 404);
    writeFileSync(apk, fixture);
    truncateSync(apk, 100 * 1024 * 1024 + 1);
    assert.equal(getAndroidApkDownloadPath(), null);
    assert.equal((await GET()).status, 404);
    rmSync(apk);

    // 이름이 다른 APK나 디렉터리를 다운로드 파일로 대체하지 않는다.
    writeFileSync(join(artifactDirectory, 'other.apk'), fixture);
    assert.equal((await GET()).status, 404);
    mkdirSync(apk);
    assert.equal(getAndroidApkDownloadPath(), null);
    assert.equal((await GET()).status, 404);
  } finally {
    process.chdir(previousDirectory);
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
    rmSync(directory, { recursive: true, force: true });
  }
});
