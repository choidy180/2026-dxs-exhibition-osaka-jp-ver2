import assert from 'node:assert/strict';
import test from 'node:test';
import { GET as getIcon } from '../../app/lab/push/icon/[size]/route';
import { GET as getManifest } from '../../app/lab/push/manifest.webmanifest/route';
import { GET as getWorker } from '../../app/lab/push/sw.js/route';

test('PWA 자산은 명시적으로 활성화한 테스트 환경에서만 제공한다', async (context) => {
  const savedEnabled = process.env.PUSH_TEST_ENABLED;
  const savedEnvironment = process.env.APP_ENV;
  context.after(() => {
    if (savedEnabled === undefined) delete process.env.PUSH_TEST_ENABLED;
    else process.env.PUSH_TEST_ENABLED = savedEnabled;
    if (savedEnvironment === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = savedEnvironment;
  });

  process.env.PUSH_TEST_ENABLED = 'true';
  process.env.APP_ENV = 'production';
  assert.equal(getWorker().status, 404);
  assert.equal(getManifest().status, 404);
  assert.equal((await getIcon(new Request('https://internal.example/lab/push/icon/192'), {
    params: Promise.resolve({ size: '192' }),
  })).status, 404);

  process.env.APP_ENV = 'test';
  const worker = getWorker();
  assert.equal(worker.status, 200);
  assert.equal(worker.headers.get('Service-Worker-Allowed'), '/lab/push');
  assert.equal(worker.headers.get('Cache-Control'), 'no-store');
  assert.match(worker.headers.get('Content-Type') ?? '', /application\/javascript/);

  const manifest = await getManifest().json();
  assert.equal(manifest.start_url, '/lab/push');
  assert.equal(manifest.scope, '/lab/push');
  assert.equal(manifest.id, '/lab/push');
  assert.equal(manifest.display, 'standalone');

  for (const size of [180, 192, 512]) {
    const icon = await getIcon(new Request(`https://internal.example/lab/push/icon/${size}`), {
      params: Promise.resolve({ size: String(size) }),
    });
    assert.equal(icon.status, 200);
    assert.equal(icon.headers.get('Content-Type'), 'image/png');
    assert.equal(icon.headers.get('Cache-Control'), 'no-store');
    const png = Buffer.from(await icon.arrayBuffer());
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  assert.equal((await getIcon(new Request('https://internal.example/lab/push/icon/999'), {
    params: Promise.resolve({ size: '999' }),
  })).status, 404);
});
