import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import { localizeChildren, setCurrentLocale, translateText } from '../lib/i18n/translate';

const load = createRequire(import.meta.url);
const { translateSource } = load('../scripts/exhibition-i18n-loader.cjs') as {
  translateSource: (source: string, filename: string) => string;
};

test('all three locales preserve canonical data while translating display strings', () => {
  assert.equal(translateText('자재관리', 'ja'), '資材管理');
  assert.equal(translateText('자재관리', 'en'), 'Materials');
  assert.equal(translateText('자재관리', 'ko'), '자재관리');
  assert.equal(translateText('MX-2104 / NG', 'ja'), 'MX-2104 / NG');
  assert.equal(translateText('27분', 'en'), '27 min');
  assert.equal(translateText('0시간 26분', 'ja'), '0時間 26分');
  assert.equal(translateText('19시 56분 46초', 'en'), '19:56:46');
  assert.equal(translateText('2026년 9월 18일', 'en'), '2026-09-18');
  assert.equal(translateText('초점', 'en'), 'Focus');
  assert.equal(translateText('26분 후 도착 예정', 'en'), 'Arrives in 26 min');
  assert.equal(translateText('GMT-02 도착 임박 후 도착 예정', 'en'), 'GMT-02 · Arriving soon');
  assert.equal(translateText('GMT-02 26분 후 도착 예정', 'ja'), 'GMT-02 · 26分後に到着予定');
  assert.equal(translateText('1회차 · 13%', 'en'), '1 trip · 13%');
  assert.equal(translateText('5대 운행중', 'en'), '5 vehicles in transit');
  assert.equal(translateText('7건', 'en'), '7 items');
  assert.equal(translateText('품목 15개 · 계획일 22일', 'en'), '15 items · 22 planned days');
  assert.equal(translateText('2026년 09월', 'en'), 'September 2026');
  assert.equal(translateText('Rev 1 을 확정 처리했습니다.', 'en'), 'Revision 1 confirmed.');
  assert.equal(translateText('Rev 1 확정을 취소했습니다.', 'ja'), 'Rev 1 の確定を取り消しました。');
  assert.equal(translateText('plan.xlsx 업로드 완료 · 품목 3개 / 계획일 2일 · Rev 4 생성', 'en'), 'Uploaded plan.xlsx · 3 items / 2 planned days · Revision 4 created');
  const data = { status: '정상', value: 24 };
  assert.equal(localizeChildren(data), data);
  setCurrentLocale('en');
  assert.deepEqual(localizeChildren(['정상', 24, data]), ['Normal', 24, data]);
  setCurrentLocale('ja');
});

test('JSX loader preserves directives, entities, styled-jsx, keys, refs and form values', () => {
  const source = `// A leading comment must not move the client directive.
'use client';
export default function Example() {
  return <><style jsx>{\`body { color: red; }\`}</style>
    <input value="정상" placeholder="검색..." ref={inputRef} />
    <b key="정상" title="전체보기">전체보기 &gt; &#x26; {record.status}</b>
    {rows.map(row => <span key={row.id}>{row.label}</span>)}
  </>;
}`;
  const output = translateSource(source, 'D:/components/example.tsx');
  assert.ok(output.indexOf("'use client'") < output.indexOf('import {'));
  assert.ok(output.includes('<style jsx>{`body { color: red; }`}</style>'));
  assert.ok(output.includes('value="정상"'));
  assert.ok(output.includes('ref={inputRef}'));
  assert.ok(output.includes('key="정상"'));
  assert.ok(output.includes('"전체보기 > & "'));
  assert.ok(output.includes('__exhibitionLocalize(record.status)'));
  const result = ts.transpileModule(output, { reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } });
  assert.equal(result.diagnostics?.length, 0);
});

test('server routes and localization infrastructure remain unchanged', () => {
  const source = 'export default function Page() { return <p>자재관리</p>; }';
  assert.equal(translateSource(source, 'D:/app/example/page.tsx'), source);
  assert.equal(translateSource(source, 'D:/components/i18n/LocaleProvider.tsx'), source);
});
