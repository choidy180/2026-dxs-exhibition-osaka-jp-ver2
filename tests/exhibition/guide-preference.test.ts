import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  createExhibitionGuidePreferenceStore,
  EXHIBITION_GUIDE_STORAGE_KEY,
  useExhibitionGuidePreference,
} from '../../hooks/use-exhibition-guide-preference';

function createBrowser(initial: string | null = null) {
  const values = new Map<string, string>();
  if (initial !== null) values.set(EXHIBITION_GUIDE_STORAGE_KEY, initial);
  const listeners = new Set<(event: StorageEvent) => void>();
  let denyAccess = false;
  let denyReads = false;
  let denyWrites = false;
  const storage = {
    getItem: (key: string) => {
      if (denyReads) throw new Error('Storage read denied');
      return values.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (denyWrites) throw new Error('Storage write denied');
      values.set(key, value);
    },
  };
  const browser = {
    get localStorage() {
      if (denyAccess) throw new Error('Storage unavailable');
      return storage;
    },
    addEventListener: (_type: 'storage', listener: (event: StorageEvent) => void) => { listeners.add(listener); },
    removeEventListener: (_type: 'storage', listener: (event: StorageEvent) => void) => { listeners.delete(listener); },
  };
  const remoteChange = (value: string | null, key: string | null = EXHIBITION_GUIDE_STORAGE_KEY, local = true) => {
    if (local) {
      if (key === null) values.clear();
      else if (value === null) values.delete(key);
      else values.set(key, value);
    }
    const event = { key, newValue: value, storageArea: local ? storage : {} } as StorageEvent;
    listeners.forEach(listener => listener(event));
  };
  return {
    browser, values, listeners, remoteChange,
    denyAccess: () => { denyAccess = true; },
    denyReads: () => { denyReads = true; },
    denyWrites: () => { denyWrites = true; },
    allowStorage: () => { denyAccess = false; denyReads = false; denyWrites = false; },
  };
}

test('guide defaults ON and only a stored false disables it', () => {
  for (const [stored, expected] of [[null, true], ['true', true], ['false', false], ['invalid', true]] as const) {
    const { browser } = createBrowser(stored);
    const store = createExhibitionGuidePreferenceStore(() => browser);
    assert.equal(store.getSnapshot(), expected);
  }
});

test('same-tab consumers update immediately and persist true/false strings', () => {
  const { browser, values, listeners } = createBrowser();
  const store = createExhibitionGuidePreferenceStore(() => browser);
  const nav: boolean[] = [];
  const mascot: boolean[] = [];
  const stopNav = store.subscribe(() => nav.push(store.getSnapshot()));
  const stopMascot = store.subscribe(() => mascot.push(store.getSnapshot()));
  assert.equal(listeners.size, 1);
  store.setEnabled(false);
  assert.equal(values.get(EXHIBITION_GUIDE_STORAGE_KEY), 'false');
  store.setEnabled(true);
  assert.equal(values.get(EXHIBITION_GUIDE_STORAGE_KEY), 'true');
  assert.deepEqual(nav, [false, true]);
  assert.deepEqual(mascot, [false, true]);
  stopNav();
  assert.equal(listeners.size, 1);
  stopMascot();
  assert.equal(listeners.size, 0);
});

test('a fresh store reloads the saved preference and remounts retain it', () => {
  const { browser, listeners } = createBrowser();
  const store = createExhibitionGuidePreferenceStore(() => browser);
  const unmount = store.subscribe(() => {});
  store.setEnabled(false);
  unmount();
  const remount = store.subscribe(() => {});
  assert.equal(store.getSnapshot(), false);
  assert.equal(listeners.size, 1);
  const reloaded = createExhibitionGuidePreferenceStore(() => browser);
  assert.equal(reloaded.getSnapshot(), false);
  remount();
});

test('cross-tab changes, removeItem and clear synchronize; unrelated/session storage is ignored', () => {
  const harness = createBrowser();
  const store = createExhibitionGuidePreferenceStore(() => harness.browser);
  const observed: boolean[] = [];
  const stop = store.subscribe(() => observed.push(store.getSnapshot()));
  harness.remoteChange('false');
  harness.remoteChange('true', 'unrelated');
  harness.remoteChange('true', EXHIBITION_GUIDE_STORAGE_KEY, false);
  assert.equal(store.getSnapshot(), false);
  assert.deepEqual(observed, [false]);
  harness.remoteChange(null);
  harness.remoteChange('false');
  harness.remoteChange(null, null);
  assert.deepEqual(observed, [false, true, false, true]);
  stop();
  harness.remoteChange('false');
  assert.equal(observed.length, 4);
  // useSyncExternalStore rechecks the snapshot after re-subscribing, including an idle interval.
  const remount = store.subscribe(() => observed.push(store.getSnapshot()));
  assert.equal(store.getSnapshot(), false);
  remount();
});

for (const deny of ['denyAccess', 'denyReads', 'denyWrites'] as const) {
  test(`${deny} falls back to memory and survives locale remounts`, () => {
    const harness = createBrowser('true');
    harness[deny]();
    const store = createExhibitionGuidePreferenceStore(() => harness.browser);
    assert.equal(store.getSnapshot(), true);
    const observed: boolean[] = [];
    const unmount = store.subscribe(() => observed.push(store.getSnapshot()));
    store.setEnabled(false);
    assert.equal(store.getSnapshot(), false);
    unmount();
    const remount = store.subscribe(() => observed.push(store.getSnapshot()));
    assert.equal(store.getSnapshot(), false);
    store.setEnabled(true);
    assert.deepEqual(observed, [false, true]);
    remount();
  });
}

test('a failed write does not allow stale storage to undo the choice; a later write recovers', () => {
  const harness = createBrowser('true');
  const store = createExhibitionGuidePreferenceStore(() => harness.browser);
  harness.denyWrites();
  store.setEnabled(false);
  assert.equal(harness.values.get(EXHIBITION_GUIDE_STORAGE_KEY), 'true');
  assert.equal(store.getSnapshot(), false);
  harness.allowStorage();
  assert.equal(store.getSnapshot(), false);
  store.setEnabled(false);
  assert.equal(harness.values.get(EXHIBITION_GUIDE_STORAGE_KEY), 'false');
  assert.equal(store.getSnapshot(), false);
});

test('SSR and hydration start ON without browser access, then the client snapshot applies storage', () => {
  const harness = createBrowser('false');
  let browserReads = 0;
  const store = createExhibitionGuidePreferenceStore(() => { browserReads += 1; return harness.browser; });
  assert.equal(store.getServerSnapshot(), true);
  assert.equal(browserReads, 0);
  assert.equal(store.getSnapshot(), false);
  assert.equal(store.getServerSnapshot(), true);
  const serverStore = createExhibitionGuidePreferenceStore(() => undefined);
  assert.equal(serverStore.getSnapshot(), true);
  const unmount = serverStore.subscribe(() => {});
  serverStore.setEnabled(false);
  assert.equal(serverStore.getSnapshot(), false);
  assert.equal(serverStore.getServerSnapshot(), true);
  unmount();
  function GuidePreferenceProbe() {
    const { enabled } = useExhibitionGuidePreference();
    return createElement('span', null, String(enabled));
  }
  assert.equal(renderToString(createElement(GuidePreferenceProbe)), '<span>true</span>');
});
