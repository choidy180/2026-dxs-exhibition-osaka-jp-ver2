import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { BoxGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial } from 'three';
import { DEMO_TIMING, EXHIBITION_DEMO_PAGES, getNextDemoPage } from '../../constants/exhibition-demo';
import { getPageGuide } from '../../data/exhibition-page-guides';
import { getDemoFeatureText } from '../../data/exhibition-demo-copy';
import { demoDelay, demoVisibleDelay, withDemoCleanup } from '../../utils/exhibition-playback';
import { startVisibleInterval } from '../../utils/visible-interval';
import { disposeSceneClone } from '../../utils/dispose-scene-clone';

test('PC tour has existing localized screens, slow authored focus steps and a complete loop', () => {
  assert.equal(EXHIBITION_DEMO_PAGES[0].path, '/master-dashboard');
  const visited = new Set<string>();
  let index = 0;
  for (let count = 0; count < EXHIBITION_DEMO_PAGES.length; count++) {
    const page = EXHIBITION_DEMO_PAGES[index];
    assert.ok(!visited.has(page.path)); visited.add(page.path);
    assert.ok(existsSync(`app${page.path}/page.tsx`));
    for (const locale of ['ko', 'ja', 'en'] as const) {
      assert.notEqual(getPageGuide(page.path, locale).id, 'fallback');
      for (const step of page.steps) {
        if (step.action === 'focus') assert.equal(step.duration, 5_000);
        assert.ok(getDemoFeatureText(step.target, locale), `${step.target}: ${locale}`);
      }
    }
    for (const step of page.steps) {
      if (step.action === 'click') {
        assert.equal(step.duration, step.close ? 5_000 : 3_000);
        assert.doesNotMatch(step.target, /upload|download|save|send|plan-demo|camera-permission/);
      }
    }
    index = getNextDemoPage(index);
  }
  assert.equal(index, 0); assert.equal(DEMO_TIMING.button, 3_000);
});

test('OFF while the tab is hidden releases the visibility listener and rejects the pending tour', async t => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const listeners = new Set<() => void>();
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    hidden: true,
    addEventListener: (_name: string, listener: () => void) => { listeners.add(listener); },
    removeEventListener: (_name: string, listener: () => void) => { listeners.delete(listener); },
  } });
  t.after(() => {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  });
  const controller = new AbortController();
  const reason = new Error('hidden OFF');
  const pending = demoVisibleDelay(10_000, controller.signal);
  assert.equal(listeners.size, 1);
  controller.abort(reason);
  await assert.rejects(pending, error => error === reason);
  assert.equal(listeners.size, 0);
});

test('OFF cancels pending action delay immediately and always closes a demo modal', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const controller = new AbortController();
  const reason = new Error('demo OFF');
  let closed = 0;
  let executed = false;
  const pending = withDemoCleanup(async () => {
    await demoDelay(10_000, controller.signal);
    executed = true;
  }, () => { closed++; });
  controller.abort(reason);
  await assert.rejects(pending, error => error === reason);
  t.mock.timers.tick(20_000);
  assert.equal(executed, false); assert.equal(closed, 1);
  await assert.rejects(demoDelay(3_000, controller.signal), error => error === reason);
});

test('modal cleanup also runs after a successful feature preview and after a failure', async () => {
  let closed = 0;
  await withDemoCleanup(async () => {}, () => { closed++; });
  await assert.rejects(withDemoCleanup(async () => { throw new Error('not ready'); }, () => { closed++; }));
  assert.equal(closed, 2);
});

test('hidden-tab timers stop, resume once and leave no timer or listener after unmount', t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const listeners = new Set<() => void>();
  const host = {
    hidden: false,
    addEventListener: (_name: 'visibilitychange', listener: () => void) => { listeners.add(listener); },
    removeEventListener: (_name: 'visibilitychange', listener: () => void) => { listeners.delete(listener); },
  };
  let updates = 0;
  const dispose = startVisibleInterval(() => { updates++; }, 1_000, host);
  t.mock.timers.tick(2_000); assert.equal(updates, 2);
  host.hidden = true; listeners.forEach(listener => listener());
  t.mock.timers.tick(60_000); assert.equal(updates, 2);
  host.hidden = false;
  listeners.forEach(listener => listener()); listeners.forEach(listener => listener());
  t.mock.timers.tick(1_000); assert.equal(updates, 3);
  dispose(); t.mock.timers.tick(10_000);
  assert.equal(updates, 3); assert.equal(listeners.size, 0);
});

test('repeated 3D page visits dispose owned materials and edges while preserving shared GLTF assets', () => {
  const geometry = new BoxGeometry();
  const material = new MeshBasicMaterial();
  const source = new Group(); source.add(new Mesh(geometry, material));
  let sharedDisposed = 0;
  geometry.addEventListener('dispose', () => { sharedDisposed++; });
  material.addEventListener('dispose', () => { sharedDisposed++; });
  for (let visit = 0; visit < 20; visit++) {
    const clone = source.clone(true);
    const edgeGeometry = new BoxGeometry();
    const edgeMaterial = new LineBasicMaterial();
    let ownedDisposed = 0;
    edgeGeometry.addEventListener('dispose', () => { ownedDisposed++; });
    edgeMaterial.addEventListener('dispose', () => { ownedDisposed++; });
    clone.add(new LineSegments(edgeGeometry, edgeMaterial));
    clone.add(new LineSegments(edgeGeometry, edgeMaterial));
    disposeSceneClone(clone, source);
    assert.equal(ownedDisposed, 2);
    assert.equal(sharedDisposed, 0);
  }
});
