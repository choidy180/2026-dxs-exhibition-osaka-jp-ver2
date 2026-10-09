import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { ADVISOR_SCENARIOS } from '../../data/advisor-knowledge';
import { createDemoAdvisorMetadata, createReviewedAdvisorReply as createDemoAdvisorReply } from '../../data/demo-advisor';
import { parseAdvisorChatRequest, parseAdvisorChatResponse } from '../../utils/ai-advisor-contract';
import { formatAdvisorTableCell } from '../../utils/ai-advisor-format';
import { getAdvisorExamples } from '../../constants/ai-advisor';

// 첨부 검수본의 원문을 별도로 보존해 호환 한자·줄바꿈·오탈자도 확인한다.
const japaneseQuestions = [
  '本⽇の⾞両別の梱包件数と納品数量を表示てください。',
  '本日納品予定の製品と合計数量を教えてください。',
  '製品ADC30068403の納品先はどこですか。',
  '資材ADX72910333は、  いつ不⾜する⾒込みですか。',
  '資材ADX72910333は、  8⽉21⽇の⽣産後にどのくらい在庫が残る\n⾒込みですか。',
  '安全在庫を下回る⾒込みの資材を、  不⾜量が多い順に表⽰してく\nださい。',
  '製品ADC30068403の⽣産計画数量を100個増やす場合、 追加で必要な資材は何ですか。',
  '8⽉27⽇に製品ADC30068403を8⼈で⽣産する場合、 何分かかりますか。',
  'ADC30068402を7⼈で300個⽣産する場合、  何分かかりますか。',
  '不⾜している資材ごとの推奨発注数量‧ 発注⽇‧ 概算⾦額と、 合計金額を表で表⽰してください。',
  '来週の⽣産計画どおりに全量を⽣産するには、  何をどれくらい発注\nする必要がありますか。',
  'MGJ67712807の推奨発注数量と仕⼊先を教えてください。',
];

test('all 12 reviewed Korean and original Japanese questions have accurate source coverage', () => {
  const expected = ['unavailable', 'unavailable', 'success', 'success', 'success', 'partial', 'partial', 'success', 'success', 'partial', 'partial', 'success'];
  for (const [index, scenario] of ADVISOR_SCENARIOS.entries()) {
    for (const query of [scenario.question.ko, japaneseQuestions[index], scenario.question.en]) {
      const reply = createDemoAdvisorReply(query, 'ko');
      assert.equal(reply.status, expected[index], query);
      assert.equal(reply.source?.slide, scenario.slide, query);
      assert.ok(parseAdvisorChatResponse(reply), query);
      assert.ok(reply.suggestions?.length, query);
      for (const suggestion of reply.suggestions ?? []) {
        assert.equal(createDemoAdvisorReply(suggestion.query).status, 'success', suggestion.query);
      }
      if (query === japaneseQuestions[index]) assert.doesNotMatch(reply.answer, /[가-힣]/);
    }
  }
});

test('verified numbers, identifiers and currency limitations remain distinct', () => {
  const answer = (id: string) => createDemoAdvisorReply(ADVISOR_SCENARIOS.find(scenario => scenario.id === id)!.question.ja);
  assert.match(answer('material-shortage').answer, /2026年8月27日.*618\.0/);
  assert.match(answer('material-stock').answer, /385\.0/);
  assert.match(answer('planned-duration').answer, /180\.0.*8人.*166\.38.*2時間46分/);
  assert.match(answer('quantity-duration').answer, /571\.97.*9時間31分/);
  assert.match(answer('purchase-supplier').answer, /310\.0.*LG電子/);
  assert.match(answer('purchase-shortages').answer, /28,660,080ウォン/);
  assert.match(answer('purchase-week').answer, /48,388,500ウォン/);
  for (const id of ['purchase-shortages', 'purchase-week']) {
    assert.match(answer(id).answer, /6件/);
    assert.match(answer(id).answer, /4件.*算出が必要/);
  }
  for (const id of ['safety-stock', 'additional-materials', 'purchase-shortages', 'purchase-week']) {
    const scenario = ADVISOR_SCENARIOS.find(item => item.id === id)!;
    assert.deepEqual(answer(id).table?.rows, scenario.facts?.map(fact => [fact.label.ja, fact.value.ja]));
    assert.deepEqual(answer(id).table?.columns, ['概要項目', '値']);
  }
  assert.equal(answer('delivery-vehicles').table, null);
  assert.equal(answer('delivery-products').table, null);
  assert.deepEqual(createDemoAdvisorMetadata(), { as_of_date: '2026-09-18', snapshot_date: '2026-08-21', forecast_end_date: '2026-08-31' });
});

test('natural Japanese and Korean paraphrases, fullwidth codes and Japanese numerals match', () => {
  const cases = [
    ['ＡＤＣ３００６８４０３の納品先を教えて', 'LG電子'],
    ['adx72910333 はいつ不足しますか？', '618.0'],
    ['ADX72910333の８月２１日生産後の在庫は？', '385.0'],
    ['八月二十七日、ADC30068403を八人で生産すると何分かかる？', '166.38'],
    ['ADC30068402を七人で三百個生産する時の所要時間は？', '571.97'],
    ['MGJ67712807の仕入れ先は？', '310.0'],
    ['ADC30068403 납품처 알려줘', '엘지전자'],
    ['2026-08-21 ADX72910333 생산 후 재고 알려줘', '385.0'],
    ['ADC30068403 8월 27일 8명 생산 시간 알려줘', '166.38'],
    ['ADC30068402 7명 300개 생산 시간 알려줘', '571.97'],
  ];
  for (const [query, value] of cases) {
    const reply = createDemoAdvisorReply(query);
    assert.equal(reply.status, 'success', query);
    assert.ok(reply.answer.includes(value), query);
  }
});

test('unknown questions, mutated conditions and unsupported actions never return a guessed result', () => {
  const queries = [
    '오늘 날씨 알려줘', '今日の天気は？', '품질 불량률 알려줘', '재고 알려줘', '그럼 그건 언제야?', 'それはいくつですか？',
    'ADC99999999の納品先は？', 'ADX72910333の8月22日生産後の在庫は？',
    'ADX72910333の2027年8月21日生産後の在庫は？',
    'ADC30068403を9人で8月27日に生産すると何分？',
    'ADC30068402を8人で300個生産する時間は？', 'ADC30068402を7人で400個生産する時間は？',
    'ADC30068402を300人で7個生産する時間は？',
    'ADC30068403の生産計画を200個増やす場合、追加資材は？',
    'ADC30068403 제품 생산계획을 -100개 늘리면 추가로 필요한 자재가 뭐야?',
    '安全在庫を下回る資材を上位3件表示して', 'MGJ67712807の仕入先の住所は？',
    'MGJ67712807を発注して', 'ADC30068403の納品先と今日の天気を教えて',
    '現在、ADX72910333はいつ不足する？', '来月の生産計画の発注数量は？',
  ];
  for (const query of queries) {
    const reply = createDemoAdvisorReply(query);
    assert.equal(reply.status, 'unsupported', query);
    assert.equal(reply.table, null, query);
    assert.equal(reply.source, undefined, query);
    assert.ok(reply.suggestions?.length, query);
    assert.ok(reply.answer.includes(reply.suggestions![0].query), query);
    for (const suggestion of reply.suggestions ?? []) {
      assert.equal(createDemoAdvisorReply(suggestion.query).status, 'success', suggestion.query);
    }
  }
});

test('ambiguous requests ask for clarification and return selectable supported questions', () => {
  const reply = createDemoAdvisorReply('MGJ67712807の仕入先とADC30068403の納品先は？');
  assert.equal(reply.status, 'clarification');
  assert.equal(reply.table, null);
  assert.ok(reply.suggestions?.length);
  assert.ok(reply.answer.includes(reply.suggestions![0].query));
});

test('guide examples are complete answers and Japanese recovery does not depend on page language', () => {
  const topicQueries = [
    ['자재는?', 'material-shortage'], ['資材について', 'material-shortage'],
    ['구매 요약', 'purchase-supplier'], ['発注数量は？', 'purchase-supplier'],
    ['생산 계획', 'planned-duration'], ['納品について', 'delivery-destination'],
  ];
  for (const [query, id] of topicQueries) {
    const reply = createDemoAdvisorReply(query);
    assert.equal(reply.suggestions?.[0].id, id, query);
    assert.ok(reply.answer.includes(reply.suggestions![0].query), query);
  }
  for (const locale of ['ko', 'ja', 'en'] as const) {
    for (const suggestion of getAdvisorExamples(locale)) assert.equal(createDemoAdvisorReply(suggestion.query).status, 'success');
    const unknown = createDemoAdvisorReply('今日の天気は？', locale);
    assert.doesNotMatch(unknown.answer, /[가-힣]/);
    assert.ok(unknown.suggestions?.every(suggestion => /[\u3040-\u30ff]/.test(suggestion.query)));
  }
});

test('request/response contracts preserve guidance and reject invalid additions', () => {
  assert.equal(parseAdvisorChatRequest({ query: ' ', locale: 'ja' }), null);
  assert.equal(parseAdvisorChatRequest({ query: 'あ'.repeat(2001) }), null);
  assert.equal(parseAdvisorChatRequest({ query: '質問', locale: 'de' }), null);
  assert.equal(parseAdvisorChatRequest({ query: '質問', locale: 'ja' })?.locale, 'ja');
  const reply = createDemoAdvisorReply('今日の天気は？');
  assert.deepEqual(parseAdvisorChatResponse(reply), reply);
  assert.equal(parseAdvisorChatResponse({ ...reply, suggestions: [{ id: 'x', label: 'x', query: '' }] }), null);
  assert.equal(parseAdvisorChatResponse({ ...reply, source: { title: 'x', slide: 999 } }), null);
  assert.equal(createDemoAdvisorReply(' ').status, 'clarification');
  assert.equal(createDemoAdvisorReply('あ'.repeat(2001)).status, 'clarification');
  assert.equal(formatAdvisorTableCell('28660080', '値'), '28,660,080');
  assert.equal(formatAdvisorTableCell('00123', '資材品番'), '00123');
});

test('JSX localization leaves explicitly localized chat text and user input unchanged', () => {
  const load = createRequire(import.meta.url);
  const { translateSource } = load('../../scripts/exhibition-i18n-loader.cjs');
  const source = "'use client'; export default function Chat() { return <p>{message.text}</p>; }";
  assert.equal(translateSource(source, 'D:/components/ai-advisor/AiAdvisorClient.tsx'), source);
  assert.equal(translateSource(source, 'D:/components/ai-advisor/AdvisorResultTable.tsx'), source);
});
