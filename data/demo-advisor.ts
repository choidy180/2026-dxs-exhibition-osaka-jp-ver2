import type { AdvisorChatResponse, AdvisorConversationContext, AdvisorMetadata, AdvisorSuggestion } from '@/types/ai-advisor';
import { getLocale, type Locale } from '@/lib/i18n/translate';
import { ADVISOR_SCENARIOS, ADVISOR_SOURCE_DATE, ADVISOR_SOURCE_TITLE, type AdvisorScenario } from './advisor-knowledge';
import { getAdvisorReplyLocale, matchAdvisorScenario } from '@/utils/ai-advisor-match';
import { createAdvisorConversationReply } from '@/utils/ai-advisor-conversation';
import { ADVISOR_DEMO_DATE, ADVISOR_DEMO_END_DATE } from './advisor-demo-dataset';

export function createDemoAdvisorMetadata(): AdvisorMetadata {
  return { as_of_date: ADVISOR_SOURCE_DATE, snapshot_date: ADVISOR_DEMO_DATE, forecast_end_date: ADVISOR_DEMO_END_DATE };
}

export function getAdvisorSuggestion(scenario: AdvisorScenario, locale: Locale): AdvisorSuggestion {
  return { id: scenario.id, label: scenario.label[locale], query: scenario.question[locale] };
}

export function createDemoAdvisorReply(query: string, fallbackLocale: Locale = getLocale(), context?: AdvisorConversationContext): AdvisorChatResponse {
  return createAdvisorConversationReply(query, fallbackLocale, context, createReviewedAdvisorReply);
}

export function createReviewedAdvisorReply(query: string, fallbackLocale: Locale = getLocale()): AdvisorChatResponse {
  const locale = getAdvisorReplyLocale(query, fallbackLocale);
  const { scenario, candidates, reason } = matchAdvisorScenario(query);
  const normalizedQuery = query.normalize('NFKC');
  // 짧은 질문도 같은 업무의 구체적인 질문으로 이어지도록 주제를 보완한다.
  const topic = /발주|구매|공급|発注|購買|仕入|purchas|order|supplier/i.test(normalizedQuery) ? 'purchasing'
    : /납품|배송|출하|納品|配送|出荷|delivery|shipment/i.test(normalizedQuery) ? 'delivery'
      : /생산|작업|生産|作業|production|workers/i.test(normalizedQuery) ? 'production'
        : /자재|재고|資材|在庫|material|stock/i.test(normalizedQuery) ? 'inventory' : undefined;
  const related = ADVISOR_SCENARIOS.filter(item => item.id !== scenario?.id && item.coverage === 'complete' && (
    scenario ? item.category === scenario.category : candidates.length
      ? candidates.some(candidate => candidate.category === item.category) : item.category === topic
  ));
  const suggestions = [...new Map([
    ...(!scenario ? candidates.filter(item => item.coverage === 'complete') : []),
    ...related,
    ...ADVISOR_SCENARIOS.filter(item => item.coverage === 'complete' && item.id !== scenario?.id),
  ].map(item => [item.id, item])).values()].slice(0, 3).map(item => getAdvisorSuggestion(item, locale));

  if (Array.from(query.trim()).length === 0 || Array.from(query).length > 2_000) {
    return {
      answer: locale === 'ja' ? '質問は空白を除いて1〜2,000文字で入力してください。下の質問を選んで試すこともできます。'
        : locale === 'ko' ? '질문을 공백 제외 1~2,000자로 입력해 주세요. 아래 질문을 선택해서 체험할 수도 있습니다.'
        : 'Please enter a question of 1–2,000 characters, or select a suggested question below.',
      session_id: null, table: null, status: 'clarification', suggestions,
    };
  }

  if (!scenario) {
    const nextQuestion = suggestions[0].query;
    const isGreeting = /^(안녕(?:하세요)?|こんにちは|こんばんは|おはよう(?:ございます)?|hello|hi)[\s!！.。?？]*$/i.test(query.trim());
    const answer = reason === 'conditions'
      ? { ko: `제품·자재 코드와 작업 조건을 함께 살펴보면 계획을 세우는 데 도움이 됩니다. 먼저 아래 예시로 시작해 볼까요?\n“${nextQuestion}”\n질문을 선택하시면 바로 안내해 드릴게요.`, ja: `製品・資材コードと作業条件を合わせて確認すると、計画を立てやすくなります。まずは次の例から見てみませんか。\n「${nextQuestion}」\n下の質問を選ぶと、すぐにご案内します。`, en: `Reviewing the product or material code together with the working conditions helps with planning. Shall we start with this example?\n“${nextQuestion}”\nSelect a question below to continue.` }
      : reason === 'ambiguous'
        ? { ko: `말씀하신 내용을 하나씩 살펴볼게요. 먼저 다음 질문부터 확인해 볼까요?\n“${nextQuestion}”\n아래에서 궁금한 항목을 선택해 주세요.`, ja: `ご質問の内容を一つずつ見ていきましょう。まずは次の質問から確認してみませんか。\n「${nextQuestion}」\n下から気になる項目をお選びください。`, en: `Let’s look at your questions one at a time. Shall we start here?\n“${nextQuestion}”\nChoose the topic you would like to explore below.` }
        : isGreeting
          ? { ko: `안녕하세요! 납품처, 자재 재고, 생산 시간, 발주 계획을 함께 살펴볼 수 있어요. 먼저 이런 질문으로 시작해 볼까요?\n“${nextQuestion}”\n아래에서 궁금한 질문을 선택해 주세요.`, ja: `こんにちは！納品先、資材在庫、生産所要時間、発注計画をご案内します。まずは、こんな質問から始めてみませんか。\n「${nextQuestion}」\n下から気になる質問をお選びください。`, en: `Hello! We can explore delivery destinations, material stock, production time and order planning together. Shall we start with this question?\n“${nextQuestion}”\nChoose a question below.` }
          : { ko: `제조 업무에서는 납품처, 자재 재고, 생산 시간, 발주 계획을 함께 살펴보면 도움이 됩니다. 먼저 이런 질문은 어떠세요?\n“${nextQuestion}”\n아래 질문을 선택하시면 바로 이어서 안내해 드릴게요.`, ja: `製造業務では、納品先、資材在庫、生産所要時間、発注計画を合わせて確認すると役立ちます。まずは、こんな質問はいかがですか。\n「${nextQuestion}」\n下の質問を選ぶと、続けてご案内します。`, en: `Delivery destinations, material stock, production time and order planning are useful starting points for manufacturing operations. How about this question?\n“${nextQuestion}”\nSelect a question below and we’ll continue from there.` };
    return { answer: answer[locale], session_id: null, table: null, status: reason === 'ambiguous' ? 'clarification' : 'unsupported', suggestions };
  }

  return {
    answer: scenario.answer[locale], session_id: null,
    status: scenario.coverage === 'missing' ? 'unavailable' : scenario.coverage === 'summary' ? 'partial' : 'success',
    source: { title: locale === 'ja' ? '製造AIチャットボット 日本語翻訳 検収版' : locale === 'en' ? 'Manufacturing AI chatbot reviewed translation' : ADVISOR_SOURCE_TITLE, slide: scenario.slide },
    suggestions,
    table: scenario.facts ? {
      columns: locale === 'ja' ? ['概要項目', '値'] : locale === 'en' ? ['Summary item', 'Value'] : ['요약 항목', '값'],
      rows: scenario.facts.map(fact => [fact.label[locale], fact.value[locale]]),
      truncated: false, summary: {},
    } : null,
  };
}
