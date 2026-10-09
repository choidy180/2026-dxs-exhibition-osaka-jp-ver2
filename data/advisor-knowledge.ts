import type { Locale } from '@/lib/i18n/translate';

export type AdvisorText = Record<Locale, string>;
export type AdvisorCategory = 'delivery' | 'inventory' | 'production' | 'purchasing';
export type AdvisorScenarioId =
  | 'delivery-vehicles' | 'delivery-products' | 'delivery-destination'
  | 'material-shortage' | 'material-stock' | 'safety-stock'
  | 'additional-materials' | 'planned-duration' | 'quantity-duration'
  | 'purchase-shortages' | 'purchase-week' | 'purchase-supplier';

export interface AdvisorScenario {
  id: AdvisorScenarioId;
  category: AdvisorCategory;
  slide: number;
  coverage: 'complete' | 'summary' | 'missing';
  label: AdvisorText;
  question: AdvisorText;
  answer: AdvisorText;
  facts?: { label: AdvisorText; value: AdvisorText }[];
  code?: string;
  date?: string;
  numbers?: number[];
}

export const ADVISOR_SOURCE_TITLE = '제조 AI 챗봇 일본어 번역 정리 검수본';
export const ADVISOR_SOURCE_DATE = '2026-09-18';
const text = (ko: string, ja: string, en: string): AdvisorText => ({ ko, ja, en });
const value = (content: string): AdvisorText => text(content, content, content);

export const ADVISOR_CATEGORIES: { id: AdvisorCategory; label: AdvisorText }[] = [
  { id: 'delivery', label: text('납품', '納品', 'Delivery') },
  { id: 'inventory', label: text('자재·재고', '資材・在庫', 'Materials & stock') },
  { id: 'production', label: text('생산', '生産', 'Production') },
  { id: 'purchasing', label: text('발주·구매', '発注・購買', 'Purchasing') },
];

// 검수본에 없는 상세 행·단가·차량별 수량은 만들지 않고 자료 부족으로 구분한다.
export const ADVISOR_SCENARIOS: AdvisorScenario[] = [
  {
    id: 'delivery-vehicles', category: 'delivery', slide: 1, coverage: 'missing',
    label: text('차량별 포장·납품수량', '車両別の梱包・納品数量', 'Packing & delivery by vehicle'),
    question: text('오늘 차량별 포장 건수와 납품수량을 보여줘.', '本日の車両別の梱包件数と納品数量を表示してください。', 'Show today’s packing counts and delivery quantities by vehicle.'),
    answer: text('차량별 출고를 준비할 때는 제품의 납품처부터 확인하면 편리합니다. ADC30068403의 납품처를 먼저 살펴볼까요? 아래의 납품처 질문을 선택해 주세요.', '車両別の出荷を準備する際は、製品の納品先から確認するとスムーズです。まず、ADC30068403の納品先を見てみませんか。下の納品先の質問をお選びください。', 'Checking the product’s delivery destination is a useful first step when preparing vehicle shipments. Shall we look at the destination for ADC30068403? Select the delivery-destination question below.'),
  },
  {
    id: 'delivery-products', category: 'delivery', slide: 1, coverage: 'missing',
    label: text('납품 제품·합계수량', '納品製品・合計数量', 'Products & total delivery quantity'),
    question: text('오늘 총 납품해야 하는 제품과 수량이 얼마야?', '本日納品予定の製品と合計数量を教えてください。', 'Which products are scheduled for delivery today, and what is the total quantity?'),
    answer: text('납품 준비는 제품과 납품처를 함께 확인하는 것부터 시작해 보세요. 예를 들어 “ADC30068403 제품은 어디로 납품해야 해?”라고 질문하시면 납품처를 바로 안내해 드릴게요. 아래 질문을 눌러 이어가셔도 됩니다.', '納品準備は、製品と納品先を合わせて確認するところから始めてみましょう。例えば「製品ADC30068403の納品先はどこですか。」と質問すると、納品先をご案内します。下の質問を押して続けることもできます。', 'Start delivery preparation by checking the product and its destination together. For example, ask “Where should product ADC30068403 be delivered?” You can also select the question below to continue.'),
  },
  {
    id: 'delivery-destination', category: 'delivery', slide: 1, coverage: 'complete', code: 'ADC30068403',
    label: text('ADC30068403 납품처', 'ADC30068403の納品先', 'ADC30068403 delivery destination'),
    question: text('ADC30068403 제품은 어디로 납품해야 해?', '製品ADC30068403の納品先はどこですか。', 'Where should product ADC30068403 be delivered?'),
    answer: text('ADC30068403 제품은 엘지전자(주)로 납품해야 합니다.', '製品ADC30068403の納品先はLG電子株式会社です。', 'Product ADC30068403 should be delivered to LG Electronics.'),
  },
  {
    id: 'material-shortage', category: 'inventory', slide: 2, coverage: 'complete', code: 'ADX72910333',
    label: text('ADX72910333 부족 시점', 'ADX72910333の不足時期', 'ADX72910333 shortage forecast'),
    question: text('ADX72910333 자재는 언제 부족해질 것으로 예상돼?', '資材ADX72910333は、いつ不足する見込みですか。', 'When is material ADX72910333 expected to run short?'),
    answer: text('GASKET ASSEMBLY, DOOR 자재(ADX72910333)는 2026년 8월 27일에 618.0개가 부족해질 것으로 예상됩니다.', '資材「GASKET ASSEMBLY, DOOR」（ADX72910333）は、2026年8月27日に618.0個不足する見込みです。', 'Material ADX72910333 (GASKET ASSEMBLY, DOOR) is forecast to be short by 618.0 units on August 27, 2026.'),
  },
  {
    id: 'material-stock', category: 'inventory', slide: 2, coverage: 'complete', code: 'ADX72910333', date: '08-21',
    label: text('8월 21일 생산 후 재고', '8月21日の生産後在庫', 'Stock after production on August 21'),
    question: text('자재 ADX72910333의 8월 21일 생산 후 예상 재고는 얼마야?', '資材ADX72910333は、8月21日の生産後にどのくらい在庫が残る見込みですか。', 'How much ADX72910333 stock is expected after production on August 21?'),
    answer: text('ADX72910333의 2026년 8월 21일 생산 후 예상 재고는 385.0입니다.', '資材ADX72910333の2026年8月21日の生産後の予測在庫数量は385.0です。', 'Expected ADX72910333 stock after production on August 21, 2026 is 385.0.'),
  },
  {
    id: 'safety-stock', category: 'inventory', slide: 2, coverage: 'summary',
    label: text('안전재고 미달 자재', '安全在庫を下回る資材', 'Materials below safety stock'),
    question: text('안전재고보다 부족해지는 자재를 부족 규모가 큰 순서로 보여줘.', '安全在庫を下回る見込みの資材を、不足量が多い順に表示してください。', 'Show materials forecast below safety stock, ordered by largest shortage.'),
    answer: text('안전재고 미달이 예상되는 자재는 총 10개 항목입니다. 자재 준비 계획을 세우려면 개별 자재의 부족 시점과 생산 후 재고도 함께 살펴보세요. 먼저 ADX72910333의 부족 시점을 확인해 볼까요?', '安全在庫を下回る見込みの資材は全10件です。資材の準備計画を立てる際は、個別資材の不足時期と生産後の在庫も合わせて確認すると役立ちます。まず、ADX72910333の不足時期を見てみませんか。', 'There are 10 materials forecast below safety stock. Individual shortage dates and stock after production are useful when planning material preparation. Shall we look at the shortage forecast for ADX72910333?'),
    facts: [{ label: text('조회 항목 수', '該当項目数', 'Reported item count'), value: value('10') }],
  },
  {
    id: 'additional-materials', category: 'production', slide: 3, coverage: 'summary', code: 'ADC30068403', numbers: [100],
    label: text('100개 증산 시 추가 자재', '100個増産時の追加資材', 'Materials for 100 additional units'),
    question: text('ADC30068403 제품 생산계획을 100개 늘리면 추가로 필요한 자재가 뭐야?', '製品ADC30068403の生産計画数量を100個増やす場合、追加で必要な資材は何ですか。', 'Which additional materials are needed if the ADC30068403 production plan increases by 100 units?'),
    answer: text('ADC30068403 생산계획을 100개 늘리면 추가 자재는 총 14개 항목입니다. 증산을 준비할 때는 작업 인원에 따른 생산 시간도 함께 살펴보면 좋습니다. 이어서 8월 27일 계획을 8명으로 생산할 때의 소요 시간을 확인해 볼까요?', '製品ADC30068403の生産計画数量を100個増やす場合、追加資材は全14件です。増産の準備では、作業人数に応じた生産所要時間も合わせて確認すると役立ちます。続けて、8月27日の計画を8人で生産する場合の所要時間を見てみませんか。', 'Increasing the ADC30068403 production plan by 100 units requires 14 material items. Production time for a given worker count is also useful when preparing for an increase. Shall we look at the duration for the August 27 plan with 8 workers?'),
    facts: [{ label: text('추가 자재 항목 수', '追加資材の項目数', 'Additional material item count'), value: value('14') }],
  },
  {
    id: 'planned-duration', category: 'production', slide: 3, coverage: 'complete', code: 'ADC30068403', date: '08-27', numbers: [8],
    label: text('8월 27일·8명 생산 시간', '8月27日・8人での生産時間', 'August 27 production with 8 workers'),
    question: text('8월 27일 ADC30068403 제품을 8명으로 생산하면 몇 분 걸려?', '8月27日に製品ADC30068403を8人で生産する場合、何分かかりますか。', 'How many minutes will ADC30068403 production take with 8 workers on August 27?'),
    answer: text('2026년 8월 27일 ADC30068403의 생산 계획 수량은 180.0개입니다. 8명으로 이 계획을 생산할 때 예상 소요 시간은 166.38분(2시간 46분)입니다.', '2026年8月27日の製品ADC30068403の生産計画数量は180.0個です。8人でこの計画どおりに生産した場合、推定所要時間は166.38分（2時間46分）です。', 'The August 27, 2026 production plan for ADC30068403 is 180.0 units. With 8 workers, the estimated duration is 166.38 minutes (2 hours 46 minutes).'),
  },
  {
    id: 'quantity-duration', category: 'production', slide: 3, coverage: 'complete', code: 'ADC30068402', numbers: [300, 7],
    label: text('300개·7명 생산 시간', '300個・7人での生産時間', '300 units with 7 workers'),
    question: text('ADC30068402를 300개 생산할 때 7명이면 몇 분 걸려?', 'ADC30068402を7人で300個生産する場合、何分かかりますか。', 'How many minutes does it take 7 workers to produce 300 units of ADC30068402?'),
    answer: text('Door Assembly,Semi Freezer(F) (ADC30068402)를 7명이 300개 생산하면 총 571.97분(9시간 31분)이 소요됩니다.', 'Door Assembly,Semi Freezer(F)（ADC30068402）を7人で300個生産する場合、約571.97分（9時間31分）かかります。', 'Producing 300 units of ADC30068402, Door Assembly,Semi Freezer(F), with 7 workers takes approximately 571.97 minutes (9 hours 31 minutes).'),
  },
  {
    id: 'purchase-shortages', category: 'purchasing', slide: 4, coverage: 'summary',
    label: text('부족 자재 권장 발주·금액', '不足資材の推奨発注・金額', 'Orders & costs for shortages'),
    question: text('부족 자재별 권장 발주수량, 발주일, 예상금액과 총액을 표로 보여줘.', '不足している資材ごとの推奨発注数量・発注日・概算金額と、合計金額を表で表示してください。', 'Show recommended order quantities, dates, estimated costs and total for materials in shortage.'),
    answer: text('부족 자재 발주 대상은 총 10개 항목입니다. 예상금액은 단가가 확정된 6건 기준 28,660,080원이며, 나머지 4건의 금액은 별도 산정이 필요합니다. 아래에 핵심 내용을 정리했습니다. 이어서 MGJ67712807의 권장 발주수량과 공급처를 살펴볼까요?', '不足資材の発注対象は全10件です。概算金額は単価確定済みの6件分で28,660,080ウォン、残り4件は別途金額の算出が必要です。概要を下の表にまとめました。続けて、MGJ67712807の推奨発注数量と仕入先を見てみませんか。', 'There are 10 shortage-order items. The estimated amount is KRW 28,660,080 for 6 items with confirmed unit prices; costs for the other 4 still need to be calculated. The key figures are summarized below. Shall we look at the recommended order quantity and supplier for MGJ67712807?'),
    facts: [
      { label: text('조회 항목 수', '該当項目数', 'Reported item count'), value: value('10') },
      { label: text('총 예상금액 (KRW)', '概算合計額（KRW）', 'Estimated total (KRW)'), value: value('28,660,080') },
      { label: text('단가 확정 건수', '単価確定済み件数', 'Items with confirmed unit prices'), value: value('6') },
      { label: text('금액 미산정 건수', '金額未算出件数', 'Items with uncalculated costs'), value: value('4') },
    ],
  },
  {
    id: 'purchase-week', category: 'purchasing', slide: 4, coverage: 'summary',
    label: text('다음 주 계획 발주·금액', '来週の計画に必要な発注・金額', 'Orders & costs for next week’s plan'),
    question: text('다음 주 생산계획 전량을 소화하려면 무엇을 얼마나 발주해야 해?', '来週の生産計画どおりに全量を生産するには、何をどれくらい発注する必要がありますか。', 'What and how much must be ordered to complete next week’s production plan?'),
    answer: text('다음 주 생산계획을 준비하는 데모 예시에서는 발주 대상이 총 10개 항목입니다. 예상금액은 48,388,500원으로 단가가 확정된 6건 기준이며, 나머지 4건의 금액은 별도 산정이 필요합니다. 개별 발주 준비도 살펴볼까요? MGJ67712807의 권장 발주수량과 공급처를 이어서 안내해 드릴 수 있습니다.', '来週の生産計画を準備するデモ例では、発注対象は全10件です。概算金額は48,388,500ウォンで、単価確定済みの6件分です。残り4件は別途金額の算出が必要です。個別の発注準備も見てみませんか。続けて、MGJ67712807の推奨発注数量と仕入先をご案内できます。', 'In the demo example for preparing next week’s production plan, there are 10 order items. The estimated amount is KRW 48,388,500 for 6 items with confirmed unit prices; costs for the other 4 still need to be calculated. Shall we look at an individual order? You can continue with the recommended order quantity and supplier for MGJ67712807.'),
    facts: [
      { label: text('조회 항목 수', '該当項目数', 'Reported item count'), value: value('10') },
      { label: text('총 예상금액 (KRW)', '概算合計額（KRW）', 'Estimated total (KRW)'), value: value('48,388,500') },
      { label: text('단가 확정 건수', '単価確定済み件数', 'Items with confirmed unit prices'), value: value('6') },
      { label: text('금액 미산정 건수', '金額未算出件数', 'Items with uncalculated costs'), value: value('4') },
    ],
  },
  {
    id: 'purchase-supplier', category: 'purchasing', slide: 4, coverage: 'complete', code: 'MGJ67712807',
    label: text('MGJ67712807 발주수량·공급처', 'MGJ67712807の発注数量・仕入先', 'MGJ67712807 order quantity & supplier'),
    question: text('MGJ67712807의 권장 발주수량과 공급처를 알려줘.', 'MGJ67712807の推奨発注数量と仕入先を教えてください。', 'What are the recommended order quantity and supplier for MGJ67712807?'),
    answer: text('MGJ67712807의 권장 발주수량은 310.0이며 공급처는 엘지전자(주)입니다.', 'MGJ67712807の推奨発注数量は310.0で、仕入先はLG電子株式会社です。', 'The recommended order quantity for MGJ67712807 is 310.0, and the supplier is LG Electronics.'),
  },
];
