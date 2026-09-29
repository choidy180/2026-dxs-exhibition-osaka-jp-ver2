import { catalog, glossary } from './catalog';
import { templateCatalog } from './catalog-templates';

export type Locale = 'ja' | 'ko' | 'en';
export const DEFAULT_LOCALE: Locale = 'ja';
export const LOCALE_STORAGE_KEY = 'dxs.exhibition.locale';
let currentLocale: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export function getLocale(): Locale { return currentLocale; }
export function setCurrentLocale(locale: Locale) {
  if (currentLocale === locale) return;
  currentLocale = locale;
  listeners.forEach(listener => listener());
}
export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function isLocale(value: unknown): value is Locale {
  return value === 'ja' || value === 'ko' || value === 'en';
}

// Single-character weekday/unit labels are exact matches only: replacing 월/초 inside words corrupts copy.
const replacements = Object.keys(glossary).filter(key => key.length > 1).sort((a, b) => b.length - a.length);
const phrasePattern = replacements.length
  ? new RegExp(replacements.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')
  : null;

/** Presentation-only translation. Domain identifiers, form values and filters stay untouched. */
export function translateText(value: string, locale: Locale = currentLocale): string {
  if (locale === 'ko' || !/[가-힣]/.test(value)) return value;
  const normalized = value.replace(/\s+/g, ' ').trim();
  const exact = catalog[normalized] ?? glossary[normalized];
  if (exact) return value.replace(value.trim(), exact[locale]);
  for (const template of templateCatalog) {
    const match = normalized.match(template.pattern);
    if (!match) continue;
    const values = new Map(template.indexes.map((index, offset) => [index, match[offset + 1]]));
    return template[locale].replace(/\{(\d+)\}/g, (_, index: string) => values.get(Number(index)) ?? '');
  }
  // Whole messages keep word order natural when runtime values are interpolated.
  const arrival = normalized.match(/^(.*?)(도착 임박|(?:\d+시간\s*)?\d+분(?:\s*미만)?)\s*후 도착 (?:예정|예상)$/);
  if (arrival) {
    const prefix = arrival[1].trim();
    const eta = arrival[2];
    const message = eta === '도착 임박'
      ? (locale === 'ja' ? 'まもなく到着' : 'Arriving soon')
      : locale === 'ja' ? `${translateText(eta, locale)}後に到着予定` : `Arrives in ${translateText(eta, locale)}`;
    return prefix ? `${prefix} · ${message}` : message;
  }
  const moving = normalized.match(/^([\d,]+)대 운행\s*중$/);
  if (moving) return locale === 'ja' ? `${moving[1]}台が運行中` : `${moving[1]} ${moving[1] === '1' ? 'vehicle' : 'vehicles'} in transit`;
  const trip = normalized.match(/^(누적 )?([\d,]+)회차( 완료)?(.*)$/);
  if (trip) {
    const [, accumulated, count, completed, suffix] = trip;
    return locale === 'ja'
      ? `${accumulated ? '累計 ' : ''}${count}回${completed ? '完了' : ''}${suffix}`
      : `${accumulated ? 'Total: ' : ''}${count} ${count === '1' ? 'trip' : 'trips'}${completed ? ' completed' : ''}${suffix}`;
  }
  const units = locale === 'ja'
    ? { 년: '年', 월: '月', 일: '日', 시: '時', 시간: '時間', 분: '分', 초: '秒', 주: '週', 건: '件', 개: '個', 대: '台', 회: '回', 명: '名' }
    : { 년: ' yr', 월: ' mo', 일: ' d', 시: ':', 시간: ' h', 분: ' min', 초: ' s', 주: ' wk', 건: ' items', 개: ' units', 대: ' vehicles', 회: ' times', 명: ' people' };
  const dates = value.replace(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g, (_, year: string, month: string, day: string) =>
    locale === 'ja' ? `${year}年${month}月${day}日` : `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  const months = dates.replace(/(\d{4})년\s*(\d{1,2})월/g, (_, year: string, month: string) =>
    locale === 'ja' ? `${year}年${Number(month)}月` : `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(month) - 1]} ${year}`);
  const times = months.replace(/(\d{1,2})시\s*(\d{1,2})분\s*(\d{1,2})초/g, (_, hour: string, minute: string, second: string) =>
    `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`);
  const weekdays = { 일: ['日', 'Sun'], 월: ['月', 'Mon'], 화: ['火', 'Tue'], 수: ['水', 'Wed'], 목: ['木', 'Thu'], 금: ['金', 'Fri'], 토: ['土', 'Sat'] };
  const dated = times.replace(/([일월화수목금토])요일/g, (_, day: keyof typeof weekdays) =>
    locale === 'ja' ? weekdays[day][0] + '曜日' : weekdays[day][1])
    .replace(/\(([일월화수목금토])\)/g, (_, day: keyof typeof weekdays) => `(${weekdays[day][locale === 'ja' ? 0 : 1]})`);
  const measured = dated.replace(/(\d[\d,.]*)\s*(시간|년|월|일|시|분|초|주|건|개|대|회|명)(?=$|[\s.,)/~·-])/g,
    (_, amount: string, unit: keyof typeof units) => amount + units[unit]);
  if (!phrasePattern) return measured;
  return measured.replace(phrasePattern, match => glossary[match][locale]);
}

/** JSX render boundary: values retain their original type except visible text. */
export function localizeChildren<T>(value: T): T {
  if (typeof value === 'string') return translateText(value) as T;
  if (Array.isArray(value)) return value.map(item => localizeChildren(item)) as T;
  return value;
}

export function localizeAttribute<T>(value: T): T {
  return typeof value === 'string' ? translateText(value) as T : value;
}
