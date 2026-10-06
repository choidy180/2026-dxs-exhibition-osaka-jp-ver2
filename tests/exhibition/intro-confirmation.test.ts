import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { EXHIBITION_DEMO_PAGES } from '../../constants/exhibition-demo';
import { dismissDemoTargets } from '../../utils/exhibition-playback';

const linePage = EXHIBITION_DEMO_PAGES.find(page => page.path === '/production/line-monitoring')!;

function confirmationFixture(t: TestContext, onClick?: () => void) {
  let open = !!onClick;
  const target = {
    getBoundingClientRect: () => ({ width: open ? 100 : 0, height: open ? 40 : 0 }),
    matches: () => false,
    click: () => onClick?.(),
  };
  const overrides = {
    document: { hidden: false, querySelectorAll: () => open ? [target] : [] },
    getComputedStyle: () => ({ visibility: 'visible' }),
  };
  for (const [key, value] of Object.entries(overrides)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  return { close: () => { open = false; } };
}

test('line monitoring confirms an alert and waits for it to close before introducing the page', async t => {
  const events: string[] = [];
  const fixture = confirmationFixture(t, () => {
    events.push('confirmed');
    setTimeout(() => { fixture.close(); events.push('closed'); }, 0);
  });
  await dismissDemoTargets(linePage.dismissBeforeIntro!, new AbortController().signal, 1_000);
  events.push('intro');
  assert.deepEqual(events, ['confirmed', 'closed', 'intro']);
});

test('a missing confirmation does not delay or prevent the page introduction', async t => {
  confirmationFixture(t);
  await dismissDemoTargets(linePage.dismissBeforeIntro!, new AbortController().signal, 1_000);
});

test('OFF cancels a pending confirmation and prevents the introduction or any later click', async t => {
  let clicks = 0;
  confirmationFixture(t, () => { clicks++; });
  const controller = new AbortController();
  const reason = new Error('OFF before confirmation closed');
  const pending = dismissDemoTargets(linePage.dismissBeforeIntro!, controller.signal, 1_000);
  controller.abort(reason);
  await assert.rejects(pending, error => error === reason);
  await assert.rejects(dismissDemoTargets(linePage.dismissBeforeIntro!, controller.signal, 1_000), error => error === reason);
  assert.equal(clicks, 1);
});

test('an alert that cannot close fails preparation instead of explaining a blocked page', async t => {
  confirmationFixture(t, () => {});
  await assert.rejects(dismissDemoTargets(linePage.dismissBeforeIntro!, new AbortController().signal, 100), /did not close/);
});
