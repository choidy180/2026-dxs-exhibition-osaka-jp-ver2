import assert from 'node:assert/strict';
import test from 'node:test';
import { ADVISOR_DEMO_PAGE, ADVISOR_DEMO_PAGE_INDEX, EXHIBITION_DEMO_PAGES } from '../../constants/exhibition-demo';
import { createDemoAdvisorReply } from '../../data/demo-advisor';
import { getDemoPageGuide } from '../../data/exhibition-demo-copy';
import type { AdvisorChatResponse } from '../../types/ai-advisor';
import { parseAdvisorChatResponse } from '../../utils/ai-advisor-contract';
import { typeDemoInput, waitForDemoTarget } from '../../utils/exhibition-playback';

test('the advisor is a prominent tour stop and its actual choices complete in all three languages', () => {
  assert.equal(ADVISOR_DEMO_PAGE_INDEX, 1);
  assert.equal(EXHIBITION_DEMO_PAGES[ADVISOR_DEMO_PAGE_INDEX], ADVISOR_DEMO_PAGE);
  assert.deepEqual(ADVISOR_DEMO_PAGE.cleanup, ['advisor-cancel', 'advisor-close']);
  for (const locale of ['ko', 'ja', 'en'] as const) {
    assert.equal(getDemoPageGuide(ADVISOR_DEMO_PAGE, locale).title, 'AI Advisor');
    let draft = '';
    let reply: AdvisorChatResponse | undefined;
    const replies: AdvisorChatResponse[] = [];
    for (const step of ADVISOR_DEMO_PAGE.steps) {
      if (step.action === 'input') { draft = step.value[locale]; continue; }
      if (step.action !== 'click') continue;
      let query: string | undefined;
      if (step.target === 'advisor-submit') { query = draft; draft = ''; }
      if (step.target.startsWith('advisor-choice-')) {
        const id = step.target.slice('advisor-choice-'.length);
        const choice = reply?.suggestions?.find(item => item.id === id);
        assert.ok(choice, `${locale}: missing ${id}`);
        query = choice.query;
      }
      if (!query) continue;
      reply = createDemoAdvisorReply(query, locale, reply?.context);
      assert.ok(parseAdvisorChatResponse(reply), `${locale}: invalid reply to ${query}`);
      assert.ok(['menu', 'clarification', 'success'].includes(reply.status ?? ''), `${locale}: ${query}`);
      replies.push(reply);
    }
    assert.deepEqual(new Set(replies.map(item => item.context?.topic)), new Set(['delivery', 'inventory', 'purchasing', 'production']));
    assert.ok(replies.some(item => item.answer.includes('571.97') && item.context?.workers === 7));
    assert.ok(replies.some(item => item.answer.includes('400.38') && item.context?.workers === 10 && item.context?.quantity === 300));
    assert.ok(replies.some(item => item.context?.date === '2026-08-22' && item.answer.includes('880')));
    assert.ok(replies.some(item => item.context?.materialCode === 'ADX72910333' && item.answer.includes('385')));
    assert.ok(replies.some(item => item.context?.intent === 'purchase-detail' && item.table?.rows.length === 10));
    assert.equal(replies.at(-2)?.status, 'menu');
    assert.equal(replies.at(-1)?.context?.intent, 'delivery-destinations');
    assert.ok(replies.at(-1)?.table?.rows.length);
  }
});

test('OFF during typing clears the pending timer and prevents any later input', async t => {
  const previousTextarea = Object.getOwnPropertyDescriptor(globalThis, 'HTMLTextAreaElement');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  class Textarea extends EventTarget {
    private text = 'old draft';
    isConnected = true;
    focus() {}
    get value() { return this.text; }
    set value(value: string) { this.text = value; }
  }
  Object.defineProperty(globalThis, 'HTMLTextAreaElement', { configurable: true, value: Textarea });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { hidden: false } });
  t.after(() => {
    if (previousTextarea) Object.defineProperty(globalThis, 'HTMLTextAreaElement', previousTextarea);
    else Reflect.deleteProperty(globalThis, 'HTMLTextAreaElement');
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  });
  const input = new Textarea();
  let inputEvents = 0;
  input.addEventListener('input', () => { inputEvents++; });
  const controller = new AbortController();
  const pending = typeDemoInput(input as unknown as HTMLElement, '납품처', controller.signal);
  assert.equal(input.value, '');
  assert.equal(inputEvents, 1);
  const reason = new Error('OFF while typing');
  controller.abort(reason);
  await assert.rejects(pending, error => error === reason);
  assert.equal(input.value, '');
  assert.equal(inputEvents, 1);
});

test('a new chat step waits for a new reply rather than reusing the previous reply', async t => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const previousStyle = Object.getOwnPropertyDescriptor(globalThis, 'getComputedStyle');
  const element = () => ({ getBoundingClientRect: () => ({ width: 100, height: 50 }), matches: () => false });
  const oldReply = element();
  const newReply = element();
  let current = oldReply;
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { hidden: false, querySelectorAll: () => [current] } });
  Object.defineProperty(globalThis, 'getComputedStyle', { configurable: true, value: () => ({ visibility: 'visible' }) });
  const replace = setTimeout(() => { current = newReply; }, 150);
  t.after(() => {
    clearTimeout(replace);
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (previousStyle) Object.defineProperty(globalThis, 'getComputedStyle', previousStyle);
    else Reflect.deleteProperty(globalThis, 'getComputedStyle');
  });
  const found = await waitForDemoTarget('advisor-reply', new AbortController().signal, 1_000, false, oldReply as unknown as HTMLElement);
  assert.equal(found, newReply);
});
