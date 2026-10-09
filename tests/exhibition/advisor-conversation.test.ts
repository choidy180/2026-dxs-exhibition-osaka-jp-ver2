import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoAdvisorReply } from '../../data/demo-advisor';
import { ADVISOR_QUESTION_CATALOG, getAdvisorTopicStarters } from '../../data/advisor-conversation-catalog';
import { ADVISOR_MATERIALS, ADVISOR_PRODUCTS, getAdvisorDeliveries, getAdvisorProjectedStock } from '../../data/advisor-demo-dataset';
import { ADVISOR_SCENARIOS } from '../../data/advisor-knowledge';
import { parseAdvisorChatRequest, parseAdvisorChatResponse, parseAdvisorConversationContext } from '../../utils/ai-advisor-contract';
import type { AdvisorChatResponse, AdvisorConversationContext } from '../../types/ai-advisor';

const next = (query: string, reply?: AdvisorChatResponse, locale: 'ko' | 'ja' | 'en' = 'ko') => {
  const result = createDemoAdvisorReply(query, locale, reply?.context);
  assert.ok(parseAdvisorChatResponse(result), `Invalid response to ${query}: ${JSON.stringify(result)}`);
  assert.deepEqual(parseAdvisorChatResponse(result), result);
  return result;
};

test('short topics reveal complete relevant menus in Korean, Japanese and English', () => {
  for (const locale of ['ko', 'ja', 'en'] as const) {
    for (const starter of getAdvisorTopicStarters(locale)) {
      const reply = next(starter.query, undefined, locale);
      assert.equal(reply.status, 'menu');
      const topic = reply.context!.topic;
      const questions = ADVISOR_QUESTION_CATALOG.filter(item => item.topic === topic);
      assert.deepEqual(reply.suggestions?.map(item => item.id), questions.map(item => item.id));
      assert.ok(reply.suggestions!.length >= 5);
      assert.equal(reply.table, null);
      if (locale === 'ja') assert.doesNotMatch(reply.answer + JSON.stringify(reply.suggestions), /[가-힣]/);
    }
  }
  for (const query of ['납품처', '납품처 알려줘', '납품 관련 질문 추천', '納品先', '納品先について']) assert.equal(next(query).context?.topic, 'delivery');
});

test('all 21 catalog flows reach data answers through choices or separate typed conditions', () => {
  assert.equal(ADVISOR_QUESTION_CATALOG.length, 21);
  for (const locale of ['ko', 'ja', 'en'] as const) {
    for (const question of ADVISOR_QUESTION_CATALOG) {
      let reply = next(question.question[locale], undefined, locale);
      for (let step = 0; reply.context?.pending && step < 5; step++) {
        const pending = reply.context.pending;
        const input = pending === 'quantity' ? '300' : pending === 'workers' ? '7' : pending === 'date' ? '2026-08-21' : reply.suggestions![0].query;
        reply = next(input, reply, locale);
      }
      assert.equal(reply.status, 'success', question.id);
      assert.equal(reply.context?.pending, undefined, question.id);
      if (locale === 'ja') assert.doesNotMatch(reply.answer + JSON.stringify(reply.table), /[가-힣]/);
    }
  }
});

test('number selection, code-only input and quantity/worker clarification compose a full conversation', () => {
  let reply = next('납품처');
  reply = next('2번', reply);
  assert.equal(reply.context?.pending, 'productCode');
  reply = next('ADC30068403', reply);
  assert.match(reply.answer, /엘지전자/);
  reply = next('생산', reply);
  assert.equal(reply.context?.productCode, undefined);
  reply = next('3번', reply);
  assert.equal(reply.context?.pending, 'productCode');
  reply = next('ADC30068402', reply);
  assert.equal(reply.context?.pending, 'quantity');
  reply = next('300', reply);
  assert.equal(reply.context?.pending, 'workers');
  reply = next('7', reply);
  assert.match(reply.answer, /571\.97/);
  reply = next('그럼 10명은?', reply);
  assert.equal(reply.context?.quantity, 300);
  assert.equal(reply.context?.workers, 10);
  assert.match(reply.answer, /400\.38/);
  reply = next('수량을 200개로 바꾸면?', reply);
  assert.equal(reply.context?.workers, 10);
  assert.equal(reply.context?.quantity, 200);
  assert.match(reply.answer, /266\.92/);
  reply = next('처음으로', reply);
  assert.equal(reply.context?.productCode, undefined);
  assert.equal(reply.suggestions?.length, 4);
});

test('Japanese numerals, follow-ups and a language switch retain the right conditions', () => {
  let reply = next('生産');
  reply = next('3番', reply, 'ja');
  reply = next('ＡＤＣ３００６８４０２', reply, 'ja');
  reply = next('三百個', reply, 'ja');
  reply = next('七人', reply, 'ja');
  assert.match(reply.answer, /571\.97/);
  reply = next('では十人なら？', reply, 'ja');
  assert.equal(reply.context?.workers, 10);
  assert.match(reply.answer, /400\.38/);
  assert.doesNotMatch(reply.answer, /[가-힣]/);
  reply = next('그럼 8명은?', reply, 'ja');
  assert.equal(reply.context?.workers, 8);
  assert.match(reply.answer, /500\.47/);
  assert.match(reply.answer, /예상/);
});

test('bare worker numbers are values while explicitly numbered selections remain choices', () => {
  let reply = next('ADC30068403 생산 시간');
  reply = next('1', reply);
  assert.equal(reply.context?.quantity, 1);
  reply = next('1', reply);
  assert.equal(reply.context?.workers, 1);
  assert.equal(reply.status, 'success');
  reply = next('ADC30068402 생산 시간');
  reply = next('1번', reply);
  assert.equal(reply.context?.quantity, 100);
  reply = next('2번', reply);
  assert.equal(reply.context?.workers, 7);
});

test('material names, codes after lists and cross-topic follow-ups resolve an item without leaking other slots', () => {
  let reply = next('자재의 재고를 확인하고 싶어');
  reply = next('GASKET ASSEMBLY, DOOR', reply);
  assert.equal(reply.context?.materialCode, 'ADX72910333');
  assert.match(reply.answer, /385/);
  reply = next('그건 언제 부족해?', reply);
  assert.match(reply.answer, /618/);
  reply = next('공급처는?', reply);
  assert.equal(reply.context?.topic, 'purchasing');
  assert.match(reply.answer, /엘지전자/);
  reply = next('전체 자재 목록을 보여줘', reply);
  reply = next('MGJ67712807', reply);
  assert.equal(reply.context?.intent, 'material-stock');
  assert.match(reply.answer, /160/);
  reply = next('납품처', reply);
  assert.equal(reply.context?.materialCode, undefined);
  reply = next('1번', reply);
  reply = next('ADC30068404', reply);
  assert.match(reply.answer, /협력사 A/);
  assert.equal(next('가스켓 재고').context?.materialCode, 'ADX72910333');
  assert.equal(next('ガスケットの在庫は？').context?.materialCode, 'ADX72910333');
  assert.equal(next('부족한 자재 목록').table?.rows.length, 10);
});

test('relative dates, invalid slot replies and old choices can continue from their own conversation context', () => {
  let reply = next('오늘 납품 제품과 수량');
  reply = next('내일은?', reply);
  assert.equal(reply.context?.date, '2026-08-22');
  assert.match(reply.answer, /880/);
  reply = next('今日の生産計画', undefined, 'ja');
  reply = next('明日なら？', reply, 'ja');
  assert.equal(reply.context?.date, '2026-08-22');
  reply = next('ADC30068403', reply, 'ja');
  assert.equal(reply.context?.quantity, 180);
  assert.equal(reply.context?.pending, 'workers');
  reply = next('わからない', reply, 'ja');
  assert.equal(reply.context?.pending, 'workers');
  const old = next('납품처');
  next('가스켓 재고');
  reply = next(old.suggestions![1].query, old);
  assert.equal(reply.context?.pending, 'productCode');
  const invalid = next('ADC99999999 0개 0명 2027-08-21 생산 시간');
  assert.equal(invalid.status, 'clarification');
  assert.ok(parseAdvisorChatResponse(invalid));
});

test('demo rows preserve reviewed totals, ten shortages, fourteen BOM items and delivery aggregation', () => {
  const shortages = ADVISOR_MATERIALS.filter(item => item.forecast < item.safety);
  assert.equal(shortages.length, 10);
  assert.equal(shortages.filter(item => item.price === null).length, 4);
  assert.equal(shortages.reduce((sum, item) => sum + (item.price ?? 0) * item.orderQuantity, 0), 28660080);
  assert.equal(shortages.reduce((sum, item) => sum + (item.price ?? 0) * item.weekQuantity, 0), 48388500);
  const delivery = next('오늘 납품 제품과 총수량');
  const vehicles = next('오늘 차량별 포장 건수와 납품수량을 보여줘');
  const count = getAdvisorDeliveries('2026-08-21').reduce((sum, item) => sum + item.quantity, 0);
  assert.equal(count, 840);
  assert.equal(delivery.table?.rows.length, 4);
  assert.equal(vehicles.table?.rows.reduce((sum, row) => sum + Number(row[2].replaceAll(',', '')), 0), count);
  assert.equal(next('ADC30068403 100개 증산 추가 자재').table?.rows.length, 14);
  const safety = next('안전재고 미달 자재 상세 목록');
  assert.equal(safety.table?.rows.length, 10);
  const gaps = safety.table!.rows.map(row => Number(row[4].replaceAll(',', '')));
  assert.deepEqual(gaps, [...gaps].sort((a, b) => b - a));
  assert.equal(ADVISOR_PRODUCTS.length, 4);
  for (const material of shortages) {
    const previousDate = new Date(Date.parse(material.shortageDate!) - 86400000).toISOString().slice(0, 10);
    assert.ok(getAdvisorProjectedStock(material.code, previousDate) > 0, material.code);
    assert.equal(getAdvisorProjectedStock(material.code, material.shortageDate!), material.forecast);
  }
  assert.equal(next('ADC30068404 100개 증산 추가 자재').table?.rows[0][2], '110');
});

test('reviewed complete answers retain exact figures while added conditions use labeled simulation', () => {
  for (const scenario of ADVISOR_SCENARIOS.filter(item => item.coverage === 'complete')) {
    const reply = next(scenario.question.ja, undefined, 'ja');
    assert.equal(reply.answer, scenario.answer.ja, scenario.id);
    assert.equal(reply.data_kind, 'reviewed');
    assert.equal(reply.source?.slide, scenario.slide);
  }
  const changed = next('ADC30068402を8人で400個生産する時間は？');
  assert.equal(changed.data_kind, 'calculated');
  assert.equal(changed.context?.quantity, 400);
  assert.equal(changed.context?.workers, 8);
  assert.match(changed.answer, /667\.3/);
});

test('unknown items, invalid conditions, unrelated requests and execution requests recover without fabricating an action', () => {
  for (const query of ['ADC99999999 납품처', 'ZZZ99999999 재고']) {
    const reply = next(query);
    assert.equal(reply.status, 'clarification');
    assert.equal(reply.table, null);
    assert.ok(reply.suggestions!.length >= 4);
  }
  for (const query of ['ADC30068402 -100개 7명 생산 시간', 'ADC30068402 0개 7명 생산 시간', 'ADC30068402 300개 0명 생산 시간', 'ADC30068402 300개 101명 생산 시간', 'ADC30068402 1.5개 7명 생산 시간', '2027-08-21 생산 계획']) {
    assert.equal(next(query).status, 'clarification', query);
  }
  for (const query of ['오늘 날씨', 'MGJ67712807 발주해줘', 'MGJ67712807を発注して', 'ADC30068403 납품처와 생산 시간을 알려줘']) {
    const reply = next(query);
    assert.equal(reply.status, 'menu', query);
    assert.equal(reply.table, null, query);
    assert.ok(reply.suggestions?.length);
  }
});

test('conversation state contracts reject malformed slots and preserve only bounded public fields', () => {
  for (const context of [{ topic: 'unknown' }, { intent: 'execute' }, { pending: 'workers' }, { workers: 0 }, { quantity: 100001 }, { date: '2026-02-30' }, { productCode: 'bad' }, { choices: Array(13).fill({ id: 'x', label: 'x', query: 'x' }) }]) {
    assert.equal(parseAdvisorConversationContext(context), null);
    assert.equal(parseAdvisorChatRequest({ query: '질문', context }), null);
  }
  const context: AdvisorConversationContext = { topic: 'production', intent: 'production-duration', productCode: 'ADC30068402', quantity: 300, workers: 7 };
  assert.deepEqual(parseAdvisorChatRequest({ query: '그럼 10명은?', context })?.context, context);
  assert.deepEqual(parseAdvisorConversationContext({ ...context, secret: 'discard' }), context);
  const reply = next('그럼 10명은?', { context } as AdvisorChatResponse);
  assert.match(reply.answer, /400\.38/);
});
