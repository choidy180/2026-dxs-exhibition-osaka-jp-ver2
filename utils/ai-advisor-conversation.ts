import type { Locale } from '@/lib/i18n/translate';
import type { AdvisorChatResponse, AdvisorConversationContext, AdvisorIntent, AdvisorSlot, AdvisorSuggestion, AdvisorTable, AdvisorTopic } from '@/types/ai-advisor';
import { ADVISOR_QUESTION_CATALOG, ADVISOR_TOPIC_LABELS, getAdvisorTopicStarters, getAdvisorTopicSuggestions } from '@/data/advisor-conversation-catalog';
import { ADVISOR_DEMO_DATE, ADVISOR_DEMO_END_DATE, ADVISOR_ITEM_ALIASES, ADVISOR_MATERIALS, ADVISOR_PRODUCTS, getAdvisorDeliveries, getAdvisorPlanQuantity, getAdvisorProjectedStock } from '@/data/advisor-demo-dataset';
import { getAdvisorReplyLocale, matchAdvisorScenario, normalizeAdvisorQuery } from './ai-advisor-match';

type ReviewedReply = (query: string, locale: Locale) => AdvisorChatResponse;
const say = (locale: Locale, ko: string, ja: string, en: string) => ({ ko, ja, en })[locale];
const num = (value: number, decimals = 0) => value.toLocaleString('ko-KR', { maximumFractionDigits: decimals });
const table = (columns: string[], rows: (string | number | null)[][], summary: Record<string, string> = {}): AdvisorTable => ({ columns, rows: rows.map(row => row.map(cell => cell === null ? '-' : typeof cell === 'number' ? num(cell, 2) : cell)), truncated: false, summary });
const suggestion = (id: string, label: string, query = label): AdvisorSuggestion => ({ id, label, query });

function detectTopic(query: string): AdvisorTopic | undefined {
  if (/발주|구매|공급|発注|購買|仕入|単価|단가|purchas|order|supplier|price/.test(query)) return 'purchasing';
  if (/납품|배송|출하|물류|納品|配送|出荷|物流|delivery|shipment/.test(query)) return 'delivery';
  if (/자재|재고|資材|在庫|material|stock|inventory/.test(query)) return 'inventory';
  if (/생산|증산|작업|生産|増産|作業|production|workers/.test(query)) return 'production';
}

function detectIntent(query: string): AdvisorIntent | undefined {
  const catalog = ADVISOR_QUESTION_CATALOG.find(item => Object.values(item.question).some(question => normalizeAdvisorQuery(question) === query));
  if (catalog) return catalog.id;
  if (/안전재고|安全在庫|safetystock/.test(query)) return 'safety-stock';
  if (/추가|증산|追加|増産|additional/.test(query) && /자재|資材|material/.test(query)) return 'additional-materials';
  if (/비교|比較|compare/.test(query) && /생산|시간|인원|生産|時間|人数|production|workers/.test(query)) return 'production-compare';
  if (/차량|車両|vehicle/.test(query) && /납품|포장|納品|梱包|delivery|packing/.test(query)) return 'delivery-vehicles';
  if (/포장|梱包|packing/.test(query)) return 'delivery-progress';
  if (/납품처|納品先|届け先|destination|どこ.*納品|어디.*납품/.test(query)) return /목록|전체|제품별|一覧|全製品|製品別|list|all/.test(query) ? 'delivery-destinations' : 'delivery-destination';
  if (/공급처|공급사|仕入先|仕入れ先|supplier/.test(query)) return /목록|전체|별|一覧|全|別|list|all/.test(query) ? 'supplier-list' : 'purchase-supplier';
  if (/단가|単価|unitprice/.test(query)) return 'material-price';
  if (/발주|発注|order/.test(query)) {
    if (/다음주|来週|nextweek/.test(query)) return 'purchase-week';
    if (/상세|詳細|detail/.test(query)) return 'purchase-detail';
    if (/수량|数量|quantity/.test(query) && !/부족|不足|short/.test(query)) return 'purchase-supplier';
    return 'purchase-shortages';
  }
  if (/부족|不足|short/.test(query) && /언제|시점|いつ|時期|when/.test(query)) return 'material-shortage';
  if (/부족|不足|short/.test(query) && /자재|資材|material/.test(query)) return /[a-z]{2,}\d{4,}/.test(query) ? 'material-shortage' : 'safety-stock';
  if (/생산후|生産後|afterproduction/.test(query) && /재고|在庫|stock/.test(query)) return 'stock-after';
  if (/자재|재고|資材|在庫|material|stock|inventory/.test(query)) return /목록|전체|一覧|全|list|all/.test(query) ? 'material-list' : 'material-stock';
  if (/생산|生産|produc/.test(query)) {
    if (/시간|몇분|걸려|時間|何分|かか|duration|minutes/.test(query)) return 'production-duration';
    if (/제품|품번|製品|品番|product/.test(query) && /목록|一覧|list/.test(query)) return 'product-list';
    if (/계획|計画|plan/.test(query)) return 'production-plan';
  }
  if (/납품|배송|納品|配送|delivery/.test(query)) return 'delivery-products';
}

function extractSlots(input: string, previous: AdvisorConversationContext) {
  const raw = input.normalize('NFKC');
  const query = normalizeAdvisorQuery(raw);
  const codes = [...new Set((raw.toUpperCase().match(/[A-Z]{2,}\d{4,}/g) ?? []))];
  // 공백을 지우기 전에 품번을 제거해 코드 끝 숫자를 수량으로 읽지 않는다.
  const numericQuery = normalizeAdvisorQuery(raw.replace(/[a-z]{2,}\d{4,}/gi, ''));
  const slots: Partial<AdvisorConversationContext> = {};
  for (const code of codes) {
    if (code.startsWith('ADC')) slots.productCode = code;
    else slots.materialCode = code;
  }
  const namedProduct = ADVISOR_PRODUCTS.find(item => [item.name, ...(ADVISOR_ITEM_ALIASES[item.code] ?? [])].some(name => query.includes(normalizeAdvisorQuery(name))));
  const namedMaterial = ADVISOR_MATERIALS.find(item => [item.name, ...(ADVISOR_ITEM_ALIASES[item.code] ?? [])].some(name => query.includes(normalizeAdvisorQuery(name))));
  if (!slots.productCode && namedProduct) slots.productCode = namedProduct.code;
  if (!slots.materialCode && namedMaterial) slots.materialCode = namedMaterial.code;
  const worker = numericQuery.match(/([+-]?\d+(?:\.\d+)?)(?:명|人|workers?)/);
  const quantity = numericQuery.match(/([+-]?\d+(?:\.\d+)?)(?:개|個|units?)/);
  if (worker) slots.workers = Number(worker[1]);
  if (quantity) slots.quantity = Number(quantity[1]);
  const fullDate = numericQuery.match(/(\d{4})[年년./-](\d{1,2})[月월./-](\d{1,2})(?:日|일)?/);
  const shortDate = numericQuery.match(/(\d{1,2})[月월](\d{1,2})[日일]|(?<!\d)(\d{1,2})[-/](\d{1,2})(?!\d)/);
  if (fullDate) slots.date = `${fullDate[1]}-${fullDate[2].padStart(2, '0')}-${fullDate[3].padStart(2, '0')}`;
  else if (shortDate) slots.date = `2026-${(shortDate[1] ?? shortDate[3]).padStart(2, '0')}-${(shortDate[2] ?? shortDate[4]).padStart(2, '0')}`;
  else if (/오늘|本日|今日|today/.test(query)) slots.date = ADVISOR_DEMO_DATE;
  else if (/내일|明日|tomorrow/.test(query)) slots.date = '2026-08-22';
  else if (/모레|明後日/.test(query)) slots.date = '2026-08-23';
  const bareNumber = query.match(/^(?:(?:그럼|그러면|では|じゃあ|then))?([+-]?\d+(?:\.\d+)?)[?？!！.。]*$/);
  if (bareNumber && (previous.pending === 'quantity' || previous.pending === 'workers')) slots[previous.pending] = Number(bareNumber[1]);
  return { slots, codes, query };
}

const intentTopic = (intent: AdvisorIntent): AdvisorTopic => ADVISOR_QUESTION_CATALOG.find(item => item.id === intent)!.topic;
const reviewedIntent: Record<string, AdvisorIntent> = { 'material-stock': 'stock-after', 'planned-duration': 'production-duration', 'quantity-duration': 'production-duration' };

export function createAdvisorConversationReply(input: string, fallbackLocale: Locale, previous: AdvisorConversationContext = {}, reviewed: ReviewedReply): AdvisorChatResponse {
  const locale = getAdvisorReplyLocale(input, fallbackLocale);
  const rawQuery = normalizeAdvisorQuery(input);
  const finish = (answer: string, context: AdvisorConversationContext, suggestions: AdvisorSuggestion[], extra: Partial<AdvisorChatResponse> = {}): AdvisorChatResponse => ({
    answer, session_id: null, status: 'success', table: null, ...extra,
    suggestions, suggestions_title: extra.suggestions_title ?? say(locale, '이어서 살펴보기', '続けて確認する', 'Continue exploring'),
    context: { ...Object.fromEntries(Object.entries(context).filter(([, value]) => value !== undefined)), choices: suggestions },
  });
  const menu = (topic?: AdvisorTopic, intro?: string): AdvisorChatResponse => {
    const suggestions = topic ? getAdvisorTopicSuggestions(topic, locale) : getAdvisorTopicStarters(locale);
    const title = topic ? say(locale, `${ADVISOR_TOPIC_LABELS[topic].ko} 관련 질문`, `${ADVISOR_TOPIC_LABELS[topic].ja}についての質問`, `${ADVISOR_TOPIC_LABELS[topic].en} questions`) : say(locale, '어떤 업무를 살펴볼까요?', 'どの業務を確認しますか。', 'Which topic would you like to explore?');
    return finish(intro ?? say(locale,
      `${topic ? ADVISOR_TOPIC_LABELS[topic].ko : '제조 업무'}에서 궁금한 내용을 골라보세요. 질문을 누르거나 번호로 선택할 수 있고, 제품·자재 코드나 조건을 직접 입력해도 됩니다.`,
      `${topic ? ADVISOR_TOPIC_LABELS[topic].ja : '製造業務'}について、気になる内容をお選びください。質問を押すか番号で選べます。製品・資材コードや条件を直接入力することもできます。`,
      `Choose what you would like to know about ${topic ? ADVISOR_TOPIC_LABELS[topic].en.toLowerCase() : 'manufacturing'}. Select a question, enter its number, or type a code and conditions.`), { topic }, suggestions, { status: 'menu', suggestions_title: title });
  };
  if (!input.trim() || Array.from(input).length > 2000) return reviewed(input, locale);
  if (/^(?:처음|처음으로|전체질문|질문목록|도움말|메뉴|주제변경|뭐할수있어|무슨질문|最初|最初から|質問一覧|メニュー|ヘルプ|何ができる|使い方|help|menu|startover)[?？!！.。]*$/.test(rawQuery)) return menu();
  if (/^(?:뒤로|취소|그만|戻る|キャンセル|back|cancel)[?？!！.。]*$/.test(rawQuery)) return menu(previous.topic);
  if (/^(?:다른질문|관련질문|더보기|他の質問|関連する質問|もっと|more)[?？!！.。]*$/.test(rawQuery)) return menu(previous.topic);
  if (/^(?:안녕(?:하세요)?|こんにちは|こんばんは|おはよう(?:ございます)?|hello|hi)[?？!！.。]*$/.test(rawQuery)) return menu(undefined, say(locale, '안녕하세요! 납품, 자재·재고, 생산, 발주·구매 중 궁금한 업무를 골라주세요. 짧게 “납품처”나 “재고”라고 물어보셔도 됩니다.', 'こんにちは！納品、資材・在庫、生産、発注・購買から気になる業務をお選びください。「納品先」や「在庫」と短く入力しても大丈夫です。', 'Hello! Choose delivery, materials and stock, production, or purchasing. You can also start with a short topic such as “delivery” or “inventory”.'));

  // 번호 선택은 마지막으로 제시한 목록에만 적용하고, 수량·인원 값과 구분한다.
  const selection = rawQuery.match(/^(?:第)?([1-9]|1[0-2])(?:번(?:째)?|번째|番(?:目)?|번째질문|번질문|番の質問)?[?？!！.。]*$/);
  const ordinal = /^(?:첫번째|첫째|一番|最初の質問)$/.test(rawQuery) ? 1 : /^(?:두번째|둘째|二番)$/.test(rawQuery) ? 2 : /^(?:세번째|셋째|三番)$/.test(rawQuery) ? 3 : undefined;
  const numericValueExpected = previous.pending === 'quantity' || previous.pending === 'workers';
  const index = selection && (!numericValueExpected || /번|番/.test(rawQuery)) ? Number(selection[1]) : ordinal;
  if (index && previous.choices?.[index - 1]) return createAdvisorConversationReply(previous.choices[index - 1].query, locale, { ...previous, choices: undefined }, reviewed);
  if (/^(?:네|예|응|좋아|はい|お願いします|yes|ok)[!！.。]*$/.test(rawQuery) && previous.choices?.length) return createAdvisorConversationReply(previous.choices[0].query, locale, { ...previous, choices: undefined }, reviewed);

  const { slots, codes, query } = extractSlots(input, previous);
  const explicitTopic = detectTopic(query);
  const shortTopic = query.replace(/알려주세요|알려줘|보여주세요|보여줘|알고싶어|궁금합니다|궁금해|좀|に関して|について|を教えてください|を教えて|教えてください|教えて|tellmeabout|please|[?？!！.。]/g, '').replace(/(?:은|는|이|가|을|를)$/, '');
  const broad = /^(?:납품처|납품|배송|출하|물류|자재|재고|자재재고|생산|생산시간|발주|구매|발주구매|공급처|納品先|納品|配送|出荷|物流|資材|在庫|資材在庫|生産|生産時間|発注|購買|仕入先|delivery|inventory|materials|stock|production|purchasing|orders)(?:알려줘|보여줘|에대해|관련|について|を教えて|教えてください)?[?？!！.。]*$/.test(query)
    || /^(?:납품처|납품|배송|출하|물류|자재|재고|생산|생산시간|발주|구매|공급처|納品先|納品|配送|資材|在庫|生産|発注|購買|仕入先|delivery|inventory|production|purchasing)$/.test(shortTopic)
    || /관련질문|관련메뉴|질문리스트|질문추천|についての質問|関連.*質問|questionsabout/.test(query);
  const contextualTopicQuery = (previous.productCode && /납품처는|納品先は/.test(query)) || (previous.materialCode && /재고는|在庫は|공급처는|仕入先は/.test(query));
  if (explicitTopic && broad && !contextualTopicQuery && !codes.length && slots.quantity === undefined && slots.workers === undefined) return menu(explicitTopic);
  if (/날씨|天気|weather|품질|品質|불량|不良|주가|株価|주소|住所|address/.test(query)) return menu(explicitTopic ?? previous.topic);
  const combinedTopics = [/납품처|納品先|배송|配送/, /재고|在庫/, /생산시간|생산소요|生産時間|生産所要|productiontime/, /공급처|仕入先|단가|単価|발주|発注/].filter(pattern => pattern.test(query));
  if (combinedTopics.length > 1 && /와|그리고|하고|및|と|and|&/.test(query)) return menu(undefined, say(locale, '궁금한 업무를 하나씩 이어서 살펴볼게요. 먼저 확인할 주제를 골라주세요.', '気になる業務を一つずつ確認していきましょう。まずテーマをお選びください。', 'Let’s explore those topics one at a time. Choose where you would like to start.'));
  const unsafeAction = /삭제|수정해|등록해|실행|발주해|주문해|発注して|注文して|削除|変更して|実行|execute|place.*order/.test(query);
  if (unsafeAction) return menu('purchasing', say(locale, '발주 준비에 필요한 내용을 먼저 정리해 볼까요? 권장 수량, 공급처, 예상금액을 아래에서 확인해 보세요.', '発注の準備に必要な内容から整理してみませんか。推奨数量、仕入先、概算金額を下から確認できます。', 'Let’s prepare the information for an order. You can check recommended quantities, suppliers and estimated costs below.'));
  if (codes.length > 1 && !/목록|一覧|list/.test(query)) return menu(explicitTopic ?? previous.topic, say(locale, '제품·자재를 하나씩 살펴볼게요. 먼저 확인할 질문을 선택한 뒤 코드를 입력해 주세요.', '製品・資材を一つずつ確認しましょう。まず質問を選んでからコードを入力してください。', 'Let’s review one product or material at a time. Choose a question, then enter a code.'));

  let intent = detectIntent(query);
  const matched = matchAdvisorScenario(input).scenario;
  // 상세 질문의 의도를 기존 요약 시나리오가 덮어쓰지 않게 한다.
  if (matched && !intent) intent = (reviewedIntent[matched.id] ?? matched.id) as AdvisorIntent;
  if (!intent && previous.materialCode && /그건언제|그럼언제|それはいつ|いつ不足/.test(query)) intent = 'material-shortage';
  const hasNewSlots = Object.keys(slots).length > 0;
  const followup = hasNewSlots || /그럼|그러면|같은|그제품|그자재|では|じゃあ|同じ|その製品|その資材|それ|then|same/.test(query);
  const namedItem = [...ADVISOR_PRODUCTS, ...ADVISOR_MATERIALS].some(item => query.includes(normalizeAdvisorQuery(item.name)));
  const leafIntents = ['delivery-destination', 'material-stock', 'material-shortage', 'stock-after', 'production-duration', 'production-compare', 'additional-materials', 'purchase-supplier', 'material-price'];
  const hasEntity = !!(slots.productCode || slots.materialCode);
  if (!intent && ((followup && previous.intent && (!hasEntity || leafIntents.includes(previous.intent))) || (previous.pending && namedItem))) intent = previous.intent;
  if (!intent && previous.pending && !explicitTopic) intent = previous.intent;
  if (!intent && slots.productCode) intent = previous.topic === 'production' ? 'production-duration' : 'delivery-destination';
  if (!intent && slots.materialCode) intent = previous.topic === 'purchasing' ? 'purchase-supplier' : 'material-stock';
  if (intent === 'material-stock' && slots.date) intent = 'stock-after';
  if (!intent) return menu(explicitTopic ?? previous.topic);

  const topic = intentTopic(intent);
  const sameIntent = previous.intent === intent;
  const context: AdvisorConversationContext = {
    topic, intent,
    productCode: (topic === 'production' || topic === 'delivery') ? previous.productCode : undefined,
    materialCode: (topic === 'inventory' || topic === 'purchasing') ? previous.materialCode : undefined,
    ...(sameIntent ? { date: previous.date, quantity: previous.quantity, workers: previous.workers } : {}),
    ...slots,
  };
  if (intent === 'production-duration' && previous.intent === 'production-plan' && !context.date) context.date = previous.date;
  const invalidQuantity = context.quantity !== undefined && (!Number.isInteger(context.quantity) || context.quantity < 1 || context.quantity > 100000);
  const invalidWorkers = context.workers !== undefined && (!Number.isInteger(context.workers) || context.workers < 1 || context.workers > 100);
  const invalidDate = !!context.date && (context.date < ADVISOR_DEMO_DATE || context.date > ADVISOR_DEMO_END_DATE || Number.isNaN(Date.parse(context.date)));
  if (invalidQuantity) delete context.quantity;
  if (invalidWorkers) delete context.workers;
  if (invalidDate) delete context.date;
  const prompt = (slot: AdvisorSlot, prefix = ''): AdvisorChatResponse => {
    const next = { ...context, pending: slot };
    let options: AdvisorSuggestion[];
    let answer: string;
    if (slot === 'productCode' || slot === 'materialCode') {
      const items = slot === 'productCode' ? ADVISOR_PRODUCTS : ADVISOR_MATERIALS.slice(0, 6);
      options = items.map(item => suggestion(item.code, `${item.code} · ${item.name}`, item.code));
      answer = slot === 'productCode' ? say(locale, '어떤 제품을 확인할까요? 제품을 선택하거나 품번을 입력해 주세요.', 'どの製品を確認しますか。製品を選ぶか、品番を入力してください。', 'Which product would you like to check? Select a product or enter its code.') : say(locale, '어떤 자재를 확인할까요? 자재를 선택하거나 품번·자재명을 입력해 주세요. 전체 자재 목록도 볼 수 있습니다.', 'どの資材を確認しますか。資材を選ぶか、品番・資材名を入力してください。全資材の一覧も確認できます。', 'Which material would you like to check? Select one or enter its code or name. You can also view all materials.');
      if (slot === 'materialCode') options.push(suggestion('all-materials', say(locale, '전체 자재 목록', '全資材の一覧', 'All materials'), say(locale, '전체 자재 목록을 보여줘', '全資材の一覧を見せてください', 'Show all materials')));
    } else if (slot === 'quantity') {
      answer = say(locale, `${context.productCode}의 수량을 몇 개로 볼까요? 숫자만 입력하거나 아래 수량을 선택해 주세요.`, `${context.productCode}の数量を何個にしますか。数字だけの入力、または下の数量を選べます。`, `How many units of ${context.productCode}? Enter a number or select a quantity.`);
      options = [100, 180, 300, 500].map(value => suggestion(`quantity-${value}`, say(locale, `${num(value)}개`, `${num(value)}個`, `${num(value)} units`)));
    } else if (slot === 'workers') {
      answer = say(locale, `${context.productCode}${context.quantity ? ` ${num(context.quantity)}개` : ''}를 몇 명이 생산하나요? 인원을 입력하거나 선택해 주세요.`, `${context.productCode}${context.quantity ? `を${num(context.quantity)}個` : 'を'}生産する作業人数を入力するか、下からお選びください。`, `How many workers will produce ${context.quantity ? `${num(context.quantity)} units of ` : ''}${context.productCode}? Enter or select a worker count.`);
      options = [5, 7, 8, 10].map(value => suggestion(`workers-${value}`, say(locale, `${value}명`, `${value}人`, `${value} workers`)));
    } else {
      answer = say(locale, '어느 날짜를 확인할까요? 8월 21일~31일 중 날짜를 입력하거나 아래에서 선택해 주세요.', 'どの日付を確認しますか。8月21日〜31日の日付を入力するか、下からお選びください。', 'Which date would you like to check? Enter a date from August 21–31 or choose below.');
      options = ['2026-08-21', '2026-08-27', '2026-08-31'].map(value => suggestion(`date-${value}`, value, value));
    }
    return finish(`${prefix}${answer}`, next, options, { status: 'clarification', suggestions_title: say(locale, '선택하거나 직접 입력해 주세요', '選択または直接入力してください', 'Select an option or type your answer') });
  };
  // 품번뿐 아니라 표시된 자재명·제품명으로도 이어갈 수 있다.
  if (!context.productCode) context.productCode = ADVISOR_PRODUCTS.find(item => query.includes(normalizeAdvisorQuery(item.name)))?.code;
  if (!context.materialCode) context.materialCode = ADVISOR_MATERIALS.find(item => query.includes(normalizeAdvisorQuery(item.name)))?.code;
  const product = ADVISOR_PRODUCTS.find(item => item.code === context.productCode);
  const material = ADVISOR_MATERIALS.find(item => item.code === context.materialCode);
  const productIntents = ['delivery-destination', 'production-duration', 'production-compare', 'additional-materials'];
  const materialIntents = ['material-stock', 'material-shortage', 'stock-after', 'purchase-supplier', 'material-price'];
  if (productIntents.includes(intent) && !product) {
    delete context.productCode;
    return prompt('productCode');
  }
  if (materialIntents.includes(intent) && !material) {
    delete context.materialCode;
    return prompt('materialCode');
  }
  if (invalidQuantity) {
    return prompt('quantity', say(locale, '수량은 1~100,000개의 정수로 입력해 주세요. ', '数量は1〜100,000の整数で入力してください。', 'Please enter a whole quantity from 1 to 100,000. '));
  }
  if (invalidWorkers) {
    return prompt('workers', say(locale, '작업 인원은 1~100명으로 입력해 주세요. ', '作業人数は1〜100人で入力してください。', 'Please enter 1–100 workers. '));
  }
  if (invalidDate) {
    return prompt('date');
  }
  if (intent === 'stock-after' && !context.date) return prompt('date');
  if (['production-duration', 'production-compare', 'additional-materials'].includes(intent) && !context.quantity) {
    if (intent !== 'additional-materials' && context.date) context.quantity = getAdvisorPlanQuantity(product!.code, context.date);
    if (!context.quantity) return prompt('quantity');
  }
  if (intent === 'production-duration' && !context.workers) return prompt('workers');
  const suggestions = getFollowups(context, locale);
  if (matched?.coverage === 'complete') {
    const reply = reviewed(input, locale);
    return finish(reply.answer, context, suggestions, { table: reply.table, source: reply.source, data_kind: 'reviewed' });
  }

  const columns = (ko: string[], ja: string[], en: string[]) => ({ ko, ja, en })[locale];
  const date = context.date ?? ADVISOR_DEMO_DATE;
  let answer = '';
  let result: AdvisorTable | null = null;
  let calculated = false;
  const shortageMaterials = ADVISOR_MATERIALS.filter(item => item.forecast < item.safety);
  if (intent === 'delivery-destinations' || intent === 'product-list') {
    answer = say(locale, `제품 ${ADVISOR_PRODUCTS.length}개의 품번과 납품처를 정리했습니다. 품번을 입력하면 해당 제품을 이어서 살펴볼 수 있습니다.`, `製品${ADVISOR_PRODUCTS.length}件の品番と納品先をまとめました。品番を入力すると、その製品を続けて確認できます。`, `Here are ${ADVISOR_PRODUCTS.length} products and their delivery destinations. Enter a code to explore a product.`);
    result = table(columns(['제품 코드', '제품명', '납품처'], ['製品コード', '製品名', '納品先'], ['Product code', 'Product name', 'Destination']), ADVISOR_PRODUCTS.map(item => [item.code, item.name, item.destination[locale]]));
  } else if (intent === 'delivery-destination') {
    answer = say(locale, `${product!.code} (${product!.name})의 납품처는 ${product!.destination.ko}입니다. 납품 예정 수량과 포장 현황도 이어서 살펴볼 수 있습니다.`, `${product!.code}（${product!.name}）の納品先は${product!.destination.ja}です。納品予定数量と梱包状況も続けて確認できます。`, `${product!.code} (${product!.name}) is delivered to ${product!.destination.en}. You can also check delivery quantities and packing progress.`);
  } else if (['delivery-products', 'delivery-vehicles', 'delivery-progress'].includes(intent)) {
    const deliveries = getAdvisorDeliveries(date);
    const total = deliveries.reduce((sum, item) => sum + item.quantity, 0);
    const packed = deliveries.reduce((sum, item) => sum + item.packed, 0);
    answer = say(locale, `${date} 납품 예정은 ${deliveries.length}개 제품, 총 ${num(total)}개입니다. 포장 완료 ${num(packed)}개, 미포장 ${num(total - packed)}개로 진행률은 ${num(packed / total * 100, 1)}%입니다.`, `${date}の納品予定は${deliveries.length}製品、合計${num(total)}個です。梱包済み${num(packed)}個、未梱包${num(total - packed)}個で、進捗率は${num(packed / total * 100, 1)}%です。`, `${date}: ${deliveries.length} products and ${num(total)} units scheduled; ${num(packed)} packed, ${num(total - packed)} remaining (${num(packed / total * 100, 1)}%).`);
    if (intent === 'delivery-vehicles') {
      const vehicles = [...new Set(deliveries.map(item => item.vehicle))];
      result = table(columns(['차량', '포장 건수', '납품수량', '미포장 수량'], ['車両', '梱包件数', '納品数量', '未梱包数量'], ['Vehicle', 'Packages', 'Delivery quantity', 'Unpacked quantity']), vehicles.map(vehicle => { const items = deliveries.filter(item => item.vehicle === vehicle); return [vehicle, items.reduce((sum, item) => sum + item.packages, 0), items.reduce((sum, item) => sum + item.quantity, 0), items.reduce((sum, item) => sum + item.quantity - item.packed, 0)]; }));
    } else result = table(columns(['제품 코드', '납품처', '납품수량', '포장 완료', '미포장', '출발 예정'], ['製品コード', '納品先', '納品数量', '梱包済み', '未梱包', '出発予定'], ['Product code', 'Destination', 'Delivery quantity', 'Packed', 'Unpacked', 'Departure']), deliveries.map(item => [item.product.code, item.product.destination[locale], item.quantity, item.packed, item.quantity - item.packed, item.time]));
    context.date = date;
  } else if (intent === 'material-list' || intent === 'supplier-list') {
    answer = say(locale, `자재 ${ADVISOR_MATERIALS.length}개를 정리했습니다. 자재 코드나 이름으로 재고·부족 시점·발주 정보를 이어서 물어보세요.`, `資材${ADVISOR_MATERIALS.length}件をまとめました。資材コードや名前で、在庫・不足時期・発注情報を続けて質問できます。`, `Here are ${ADVISOR_MATERIALS.length} materials. Use a code or name to ask about stock, shortage dates or orders.`);
    const materials = [...ADVISOR_MATERIALS].sort((a, b) => intent === 'supplier-list' ? a.supplier[locale].localeCompare(b.supplier[locale]) : 0);
    result = table(columns(['자재 코드', '자재명', '재고', '안전재고', '공급처'], ['資材コード', '資材名', '在庫', '安全在庫', '仕入先'], ['Material code', 'Material name', 'Stock', 'Safety stock', 'Supplier']), materials.map(item => [item.code, item.name, item.stock, item.safety, item.supplier[locale]]));
  } else if (intent === 'material-stock' || intent === 'stock-after') {
    const stock = intent === 'stock-after' ? getAdvisorProjectedStock(material!.code, date) : material!.stock;
    calculated = intent === 'stock-after';
    answer = say(locale, `${material!.code} (${material!.name})의 ${intent === 'stock-after' ? `${date} 생산 후 예상 재고` : `${ADVISOR_DEMO_DATE} 기준 재고`}는 ${num(stock, 2)}개입니다. 안전재고는 ${num(material!.safety)}개입니다.`, `${material!.code}（${material!.name}）の${intent === 'stock-after' ? `${date}の生産後予測在庫` : `${ADVISOR_DEMO_DATE}時点の在庫`}は${num(stock, 2)}個です。安全在庫は${num(material!.safety)}個です。`, `${material!.code} (${material!.name}): ${intent === 'stock-after' ? `forecast stock after production on ${date}` : `stock on ${ADVISOR_DEMO_DATE}`} is ${num(stock, 2)} units; safety stock is ${num(material!.safety)}.`);
    if (stock < 0) answer += say(locale, ` 부족 예상 수량은 ${num(-stock, 2)}개입니다.`, ` ${num(-stock, 2)}個の不足見込みです。`, ` The forecast shortage is ${num(-stock, 2)} units.`);
    context.date = date;
  } else if (intent === 'material-shortage') {
    answer = material!.shortageDate ? say(locale, `${material!.code} (${material!.name})는 ${material!.shortageDate}에 ${num(-material!.forecast)}개 부족해질 것으로 예상됩니다. 권장 발주수량과 공급처를 함께 살펴볼까요?`, `${material!.code}（${material!.name}）は${material!.shortageDate}に${num(-material!.forecast)}個不足する見込みです。推奨発注数量と仕入先も確認してみませんか。`, `${material!.code} (${material!.name}) is forecast short by ${num(-material!.forecast)} units on ${material!.shortageDate}. Shall we check the recommended order and supplier?`) : say(locale, `${material!.code}는 ${ADVISOR_DEMO_END_DATE}까지 부족이 예상되지 않습니다. 기간 말 예상 재고는 ${num(material!.forecast)}개입니다.`, `${material!.code}は${ADVISOR_DEMO_END_DATE}まで不足の見込みがありません。期末予測在庫は${num(material!.forecast)}個です。`, `${material!.code} is not forecast to run short through ${ADVISOR_DEMO_END_DATE}; end-of-period stock is ${num(material!.forecast)} units.`);
  } else if (intent === 'safety-stock') {
    answer = say(locale, `안전재고 미달 예상 자재 ${shortageMaterials.length}개를 부족 규모가 큰 순서로 정리했습니다. 부족량은 안전재고와 기간 말 예상 재고의 차이입니다.`, `安全在庫を下回る見込みの資材${shortageMaterials.length}件を不足量順にまとめました。不足量は安全在庫と期末予測在庫の差です。`, `${shortageMaterials.length} materials are forecast below safety stock, sorted by the gap between safety stock and forecast stock.`);
    const projections = shortageMaterials.map(item => ({ ...item, projected: getAdvisorProjectedStock(item.code, ADVISOR_DEMO_END_DATE) }));
    result = table(columns(['자재 코드', '자재명', '안전재고', '예상 재고', '안전재고 대비 부족'], ['資材コード', '資材名', '安全在庫', '予測在庫', '安全在庫との差'], ['Material code', 'Material name', 'Safety stock', 'Forecast stock', 'Safety stock gap']), projections.sort((a, b) => (b.safety - b.projected) - (a.safety - a.projected)).map(item => [item.code, item.name, item.safety, item.projected, Math.round((item.safety - item.projected) * 100) / 100]));
  } else if (intent === 'production-plan') {
    answer = say(locale, `${date} 생산 계획입니다. 제품을 선택하면 수량과 작업 인원에 따른 생산 시간을 이어서 계산할 수 있습니다.`, `${date}の生産計画です。製品を選ぶと、数量と作業人数に応じた生産所要時間を続けて計算できます。`, `Here is the production plan for ${date}. Continue with a product, quantity and worker count to estimate production time.`);
    result = table(columns(['제품 코드', '제품명', '계획 수량'], ['製品コード', '製品名', '計画数量'], ['Product code', 'Product name', 'Planned quantity']), ADVISOR_PRODUCTS.map(item => [item.code, item.name, getAdvisorPlanQuantity(item.code, date)!]));
    context.date = date;
  } else if (intent === 'production-duration' || intent === 'production-compare') {
    calculated = true;
    const minutes = product!.laborMinutes * context.quantity! / (context.workers ?? 1);
    const duration = (value: number) => say(locale, `${num(value, 2)}분 (약 ${Math.floor(value / 60)}시간 ${Math.floor(value % 60)}분)`, `${num(value, 2)}分（約${Math.floor(value / 60)}時間${Math.floor(value % 60)}分）`, `${num(value, 2)} minutes (about ${Math.floor(value / 60)}h ${Math.floor(value % 60)}m)`);
    answer = intent === 'production-duration' ? say(locale, `${product!.code} ${num(context.quantity!)}개를 ${context.workers}명이 생산할 때 예상 소요 시간은 ${duration(minutes)}입니다. 같은 제품·수량으로 “그럼 10명은?”처럼 이어서 물어보세요.`, `${product!.code}を${num(context.quantity!)}個、${context.workers}人で生産する推定所要時間は${duration(minutes)}です。同じ製品・数量で「では10人なら？」と続けて質問できます。`, `${num(context.quantity!)} units of ${product!.code} with ${context.workers} workers take an estimated ${duration(minutes)}. Ask “What about 10 workers?” to compare.`) : say(locale, `${product!.code} ${num(context.quantity!)}개를 생산할 때 인원별 예상 소요 시간입니다.`, `${product!.code}を${num(context.quantity!)}個生産する場合の人数別推定所要時間です。`, `Estimated time by worker count for ${num(context.quantity!)} units of ${product!.code}.`);
    if (intent === 'production-compare') result = table(columns(['작업 인원', '예상 시간 (분)', '시간 환산'], ['作業人数', '推定時間（分）', '時間換算'], ['Workers', 'Estimated minutes', 'Duration']), [5, 7, 8, 10].map(workers => { const time = product!.laborMinutes * context.quantity! / workers; return [workers, Math.round(time * 100) / 100, duration(time)]; }));
    answer += say(locale, '\n표준 작업량을 인원으로 나눈 예상 시간으로, 휴게·설비 정지 시간은 별도입니다.', '\n標準作業量を人数で割った目安で、休憩・設備停止時間は別途です。', '\nThis estimate divides standard labor by worker count; breaks and downtime are separate.');
  } else if (intent === 'additional-materials') {
    calculated = true;
    answer = say(locale, `${product!.code}를 ${num(context.quantity!)}개 증산할 때 추가 자재 ${ADVISOR_MATERIALS.length}개 항목이 필요합니다. 제품별 구성 수량을 적용해 정리했습니다.`, `${product!.code}を${num(context.quantity!)}個増産する場合、追加資材は${ADVISOR_MATERIALS.length}項目です。製品別の構成数量を適用してまとめました。`, `${ADVISOR_MATERIALS.length} material items are needed for ${num(context.quantity!)} additional units of ${product!.code}, based on its material quantities.`);
    result = table(columns(['자재 코드', '자재명', '추가 필요 수량'], ['資材コード', '資材名', '追加必要数量'], ['Material code', 'Material name', 'Additional quantity']), ADVISOR_MATERIALS.map(item => [item.code, item.name, Math.ceil(item.bom * Math.round(product!.bomFactor * 10) * context.quantity! / 10)]));
  } else if (intent === 'purchase-supplier' || intent === 'material-price') {
    answer = intent === 'material-price' ? say(locale, `${material!.code}의 단가는 ${material!.price === null ? '협의 중입니다' : `${num(material!.price)}원입니다`}. 공급처는 ${material!.supplier.ko}입니다.`, `${material!.code}の単価は${material!.price === null ? '協議中です' : `${num(material!.price)}ウォンです`}。仕入先は${material!.supplier.ja}です。`, `${material!.code}: unit price ${material!.price === null ? 'is being agreed' : `is KRW ${num(material!.price)}`}; supplier is ${material!.supplier.en}.`) : say(locale, `${material!.code}의 권장 발주수량은 ${num(material!.orderQuantity)}개이며 공급처는 ${material!.supplier.ko}입니다.${material!.orderDate ? ` 권장 발주일은 ${material!.orderDate}입니다.` : ' 현재 계획에서는 추가 발주 없이 진행할 수 있습니다.'}`, `${material!.code}の推奨発注数量は${num(material!.orderQuantity)}個、仕入先は${material!.supplier.ja}です。${material!.orderDate ? `推奨発注日は${material!.orderDate}です。` : '現在の計画では追加発注なしで進められます。'}`, `${material!.code}: recommended order is ${num(material!.orderQuantity)} units from ${material!.supplier.en}.${material!.orderDate ? ` Recommended order date: ${material!.orderDate}.` : ' No additional order is needed for the current plan.'}`);
  } else {
    const week = intent === 'purchase-week';
    const total = shortageMaterials.reduce((sum, item) => sum + (item.price ?? 0) * (week ? item.weekQuantity : item.orderQuantity), 0);
    const confirmed = shortageMaterials.filter(item => item.price !== null).length;
    answer = say(locale, `${week ? '다음 주 계획의' : '부족 자재의'} 발주 대상은 ${shortageMaterials.length}개 항목입니다. 단가 확정 ${confirmed}건의 예상금액은 ${num(total)}원이며, 나머지 ${shortageMaterials.length - confirmed}건은 단가 협의 후 합산합니다.`, `${week ? '来週の計画の' : '不足資材の'}発注対象は${shortageMaterials.length}件です。単価確定済み${confirmed}件の概算金額は${num(total)}ウォン、残り${shortageMaterials.length - confirmed}件は単価の合意後に合算します。`, `${shortageMaterials.length} ${week ? 'next-week' : 'shortage'} order items: KRW ${num(total)} for ${confirmed} confirmed prices; ${shortageMaterials.length - confirmed} items will be added after pricing is agreed.`);
    result = table(columns(['자재 코드', '권장 발주수량', '발주일', '예상금액 (KRW)', '공급처'], ['資材コード', '推奨発注数量', '発注日', '概算金額（KRW）', '仕入先'], ['Material code', 'Recommended quantity', 'Order date', 'Estimated cost (KRW)', 'Supplier']), shortageMaterials.map(item => [item.code, week ? item.weekQuantity : item.orderQuantity, item.orderDate, item.price === null ? null : item.price * (week ? item.weekQuantity : item.orderQuantity), item.supplier[locale]]), { [say(locale, '금액 산정 합계 (KRW)', '算出済み合計（KRW）', 'Priced total (KRW)')]: num(total), [say(locale, '단가 협의 중', '単価協議中', 'Pricing pending')]: String(shortageMaterials.length - confirmed) });
  }
  return finish(answer, { ...context, pending: undefined }, suggestions, { table: result, data_kind: calculated ? 'calculated' : 'demo' });
}

function getFollowups(context: AdvisorConversationContext, locale: Locale): AdvisorSuggestion[] {
  const { productCode, materialCode, intent, topic } = context;
  let suggestions = getAdvisorTopicSuggestions(topic!, locale).filter(item => item.id !== intent).slice(0, 4);
  const nextWorkers = context.workers === 10 ? 8 : 10;
  const nextQuantity = context.quantity === 300 ? 200 : 300;
  if (intent === 'production-duration' || intent === 'production-compare') suggestions = [
    suggestion('change-workers', say(locale, `${nextWorkers}명으로 바꾸면?`, `${nextWorkers}人に変更すると？`, `What about ${nextWorkers} workers?`), say(locale, `${productCode} ${context.quantity}개를 ${nextWorkers}명이 생산하는 시간`, `${productCode}を${context.quantity}個、${nextWorkers}人で生産する時間`, `Production time for ${context.quantity} units of ${productCode} with ${nextWorkers} workers`)),
    suggestion('change-quantity', say(locale, `수량을 ${nextQuantity}개로 바꾸면?`, `数量を${nextQuantity}個に変更すると？`, `What about ${nextQuantity} units?`)),
    suggestion('compare', say(locale, '인원별 시간 비교', '人数別の時間比較', 'Compare worker counts'), say(locale, `${productCode} ${context.quantity}개 생산 시간 비교`, `${productCode}を${context.quantity}個生産する時間を比較`, `Compare production time for ${context.quantity} units of ${productCode}`)),
  ];
  else if (materialCode) suggestions = [
    suggestion('stock', say(locale, '이 자재 재고', 'この資材の在庫', 'Stock for this material'), say(locale, `${materialCode} 자재 재고`, `${materialCode}の資材在庫`, `Material stock for ${materialCode}`)),
    suggestion('shortage', say(locale, '이 자재 부족 시점', 'この資材の不足時期', 'Shortage forecast'), say(locale, `${materialCode} 자재는 언제 부족해?`, `${materialCode}はいつ不足しますか？`, `When will material ${materialCode} run short?`)),
    suggestion('supplier', say(locale, '권장 발주·공급처', '推奨発注・仕入先', 'Recommended order & supplier'), say(locale, `${materialCode} 권장 발주수량과 공급처`, `${materialCode}の推奨発注数量と仕入先`, `Recommended order and supplier for ${materialCode}`)),
  ].filter(item => item.id !== ({ 'material-stock': 'stock', 'material-shortage': 'shortage', 'purchase-supplier': 'supplier' } as Record<string, string>)[intent!]);
  else if (intent === 'product-list' || intent === 'production-plan') suggestions = ADVISOR_PRODUCTS.map(item => suggestion(`duration-${item.code}`, say(locale, `${item.code} 생산 시간`, `${item.code}の生産時間`, `${item.code} production time`), say(locale, `${item.code} 생산 시간`, `${item.code}の生産時間`, `${item.code} production time`)));
  suggestions.push(suggestion('topic-more', say(locale, '이 주제의 다른 질문', 'このテーマの他の質問', 'More questions on this topic'), say(locale, '다른 질문', '他の質問', 'more')));
  return suggestions;
}
