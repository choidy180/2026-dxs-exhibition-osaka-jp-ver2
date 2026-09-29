import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { getPageGuide } from '../../data/exhibition-page-guides';

const locales = ['ko', 'en', 'ja'] as const;
const appDirectory = path.resolve(process.cwd(), 'app');

function findPageRoutes(directory: string, segments: string[] = []): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) {
      return findPageRoutes(path.join(directory, entry.name), [...segments, entry.name]);
    }
    if (entry.name !== 'page.tsx') return [];
    return [segments.length ? '/' + segments.join('/') : '/'];
  });
}

test('every actual page has two authored guide steps in all three languages', () => {
  const routes = findPageRoutes(appDirectory);
  assert.ok(routes.length >= 43, 'discover actual pages rather than only an authored list');
  for (const route of routes) {
    const titles = new Set<string>();
    for (const locale of locales) {
      const guide = getPageGuide(route, locale);
      assert.notEqual(guide.id, 'fallback', route + ': missing ' + locale + ' guide');
      assert.ok(guide.title.trim().length > 0, route + ': title');
      assert.equal(guide.steps.length, 2, route + ': two concise steps');
      assert.ok(guide.steps.every(step => step.trim().length > 0 && step.length <= 180), route);
      if (locale === 'en') {
        assert.doesNotMatch(guide.title + guide.steps.join(' '), /[가-힣ぁ-ゖァ-ヺ]/);
      }
      if (locale === 'ko') assert.match(guide.steps.join(' '), /[가-힣]/);
      if (locale === 'ja') assert.match(guide.steps.join(' '), /[ぁ-ゖァ-ヺ]/);
      assert.equal(guide.id, getPageGuide(route, 'ko').id, route + ': stable identity');
      titles.add(guide.title);
    }
    assert.equal(titles.size, 3, route + ': localized titles');
  }
});

test('legacy, development and redirect routes resolve to their actual canonical screen', () => {
  const aliases: Record<string, string> = {
  "/transport/realtime-status-backup": "/transport/realtime-status",
  "/transport/realtime-status/dev": "/transport/realtime-status",
  "/transport/warehouse-management-dev": "/transport/warehouse-management",
  "/material/warehouse-dev": "/material/warehouse",
  "/material/inbound-inspection-backup": "/material/inbound-inspection",
  "/production/film-attachment-backup": "/production/film-attachment",
  "/production/film-attachment-dev": "/production/film-attachment",
  "/production/gasket-check-backup": "/production/gasket-check",
  "/production/gasket-check-dev": "/production/gasket-check",
  "/production/glass-gap-check-backup": "/production/glass-gap-check",
  "/production/glass-gap-check-dev": "/production/glass-gap-check",
  "/production/leak-detection-dev": "/production/leak-detection",
  "/production/line-monitoring-backup": "/production/line-monitoring",
  "/production/foaming-inspection-dev": "/production/foaming-inspection",
  "/production/foaming-cart-potisiton-dev": "/production/foaming-inspection",
  "/production/production-plan": "/lab/production-plan"
};
  for (const [alias, canonical] of Object.entries(aliases)) {
    for (const locale of locales) {
      assert.deepEqual(getPageGuide(alias, locale), getPageGuide(canonical, locale), alias);
    }
  }
});

test('query strings, fragments and trailing separators preserve the guide', () => {
  const expected = getPageGuide('/material/inbound-inspection', 'ja');
  assert.deepEqual(getPageGuide('/material/inbound-inspection/?camera=2#preview', 'ja'), expected);
  assert.deepEqual(getPageGuide('//material//inbound-inspection/', 'ja'), expected);
  assert.equal(getPageGuide('/?welcome=1', 'en').id, '/');
});

test('unknown pages receive a localized fallback without matching a partial route', () => {
  for (const locale of locales) {
    const guide = getPageGuide('/material/inbound-inspection/unknown', locale);
    assert.equal(guide.id, 'fallback');
    assert.equal(guide.steps.length, 2);
    assert.ok(guide.title.trim());
    assert.deepEqual(getPageGuide('/unknown', locale), guide);
  }
  const copied = getPageGuide('/unknown', 'en');
  (copied.steps as string[])[0] = 'changed by consumer';
  assert.notEqual(getPageGuide('/unknown', 'en').steps[0], copied.steps[0]);
});
