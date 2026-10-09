import type { AdvisorIntent, AdvisorSuggestion, AdvisorTopic } from '@/types/ai-advisor';
import type { Locale } from '@/lib/i18n/translate';
import type { AdvisorText } from './advisor-knowledge';

const text = (ko: string, ja: string, en: string): AdvisorText => ({ ko, ja, en });
export const ADVISOR_TOPIC_LABELS: Record<AdvisorTopic, AdvisorText> = {
  delivery: text('납품·배송', '納品・配送', 'Delivery'),
  inventory: text('자재·재고', '資材・在庫', 'Materials & stock'),
  production: text('생산·작업 시간', '生産・作業時間', 'Production'),
  purchasing: text('발주·구매', '発注・購買', 'Purchasing'),
};
export interface AdvisorCatalogQuestion {
  id: AdvisorIntent;
  topic: AdvisorTopic;
  label: AdvisorText;
  question: AdvisorText;
}
export const ADVISOR_QUESTION_CATALOG: AdvisorCatalogQuestion[] = [
  { id: 'delivery-destinations', topic: 'delivery', label: text('제품별 납품처 목록', '製品別の納品先一覧', 'Delivery destinations by product'), question: text('제품별 납품처 목록을 보여줘', '製品別の納品先一覧を見せてください', 'Show delivery destinations by product') },
  { id: 'delivery-destination', topic: 'delivery', label: text('제품 납품처 찾아보기', '製品の納品先を調べる', 'Find a product’s destination'), question: text('제품의 납품처를 확인하고 싶어', '製品の納品先を確認したい', 'I want to check a product’s delivery destination') },
  { id: 'delivery-products', topic: 'delivery', label: text('오늘 납품 제품·총수량', '本日の納品製品・合計数量', 'Today’s products & delivery total'), question: text('오늘 납품할 제품과 총수량을 보여줘', '本日納品する製品と合計数量を見せてください', 'Show today’s products and total delivery quantity') },
  { id: 'delivery-vehicles', topic: 'delivery', label: text('차량별 포장·납품수량', '車両別の梱包・納品数量', 'Packing & deliveries by vehicle'), question: text('오늘 차량별 포장 건수와 납품수량을 보여줘', '本日の車両別の梱包件数と納品数量を表示してください', 'Show today’s packing counts and delivery quantities by vehicle') },
  { id: 'delivery-progress', topic: 'delivery', label: text('포장 진행률과 미포장 수량', '梱包進捗率と未梱包数量', 'Packing progress & remaining units'), question: text('포장 진행률과 미포장 수량을 보여줘', '梱包進捗率と未梱包数量を見せてください', 'Show packing progress and unpacked quantities') },
  { id: 'material-list', topic: 'inventory', label: text('전체 자재 목록·재고', '全資材の一覧・在庫', 'All materials & stock'), question: text('전체 자재 목록과 재고를 보여줘', '全資材の一覧と在庫を見せてください', 'Show all materials and stock') },
  { id: 'material-stock', topic: 'inventory', label: text('자재별 재고 조회', '資材別の在庫を確認', 'Look up material stock'), question: text('자재의 재고를 확인하고 싶어', '資材の在庫を確認したい', 'I want to check material stock') },
  { id: 'material-shortage', topic: 'inventory', label: text('자재가 부족해지는 시점', '資材が不足する時期', 'Material shortage forecast'), question: text('자재가 언제 부족해지는지 알고 싶어', '資材がいつ不足するか知りたい', 'I want to know when a material will run short') },
  { id: 'stock-after', topic: 'inventory', label: text('생산 후 예상 재고', '生産後の予測在庫', 'Stock after production'), question: text('자재의 생산 후 예상 재고를 확인하고 싶어', '資材の生産後の予測在庫を確認したい', 'I want to check material stock after production') },
  { id: 'safety-stock', topic: 'inventory', label: text('안전재고 미달 자재 순위', '安全在庫を下回る資材の順位', 'Materials below safety stock'), question: text('안전재고 미달 자재의 상세 목록을 부족량 순으로 보여줘', '安全在庫を下回る資材の詳細一覧を不足量順に見せてください', 'Show detailed materials below safety stock by shortage quantity') },
  { id: 'product-list', topic: 'production', label: text('생산 제품·품번 목록', '生産製品・品番一覧', 'Products & product codes'), question: text('생산 제품과 품번 목록을 보여줘', '生産する製品と品番の一覧を見せてください', 'Show production products and product codes') },
  { id: 'production-plan', topic: 'production', label: text('날짜별 생산 계획', '日付別の生産計画', 'Production plan by date'), question: text('오늘 생산 계획을 보여줘', '本日の生産計画を見せてください', 'Show today’s production plan') },
  { id: 'production-duration', topic: 'production', label: text('수량·인원별 생산 시간', '数量・人数別の生産時間', 'Production time by quantity & workers'), question: text('생산 소요 시간을 계산하고 싶어', '生産所要時間を計算したい', 'I want to calculate production time') },
  { id: 'production-compare', topic: 'production', label: text('작업 인원별 소요 시간 비교', '作業人数別の所要時間比較', 'Compare worker counts'), question: text('작업 인원별 생산 시간을 비교하고 싶어', '作業人数別の生産時間を比較したい', 'I want to compare production time by worker count') },
  { id: 'additional-materials', topic: 'production', label: text('증산할 때 추가 자재', '増産時の追加資材', 'Materials for additional production'), question: text('증산할 때 추가 자재를 계산하고 싶어', '増産する場合の追加資材を計算したい', 'I want to calculate materials for additional production') },
  { id: 'purchase-shortages', topic: 'purchasing', label: text('부족 자재 발주 요약', '不足資材の発注概要', 'Shortage order summary'), question: text('부족 자재의 발주 요약과 총액을 보여줘', '不足資材の発注概要と合計金額を見せてください', 'Show shortage order summary and total') },
  { id: 'purchase-detail', topic: 'purchasing', label: text('권장 발주수량·발주일 상세', '推奨発注数量・発注日の詳細', 'Detailed recommended orders'), question: text('부족 자재의 상세 발주수량과 발주일을 보여줘', '不足資材の詳細な発注数量と発注日を見せてください', 'Show detailed recommended order quantities and dates') },
  { id: 'purchase-week', topic: 'purchasing', label: text('다음 주 계획에 필요한 발주', '来週の計画に必要な発注', 'Orders for next week’s plan'), question: text('다음 주 생산계획에 필요한 발주를 보여줘', '来週の生産計画に必要な発注を見せてください', 'Show orders needed for next week’s production plan') },
  { id: 'purchase-supplier', topic: 'purchasing', label: text('자재별 권장 발주·공급처', '資材別の推奨発注・仕入先', 'Material order quantity & supplier'), question: text('자재의 권장 발주수량과 공급처를 확인하고 싶어', '資材の推奨発注数量と仕入先を確認したい', 'I want to check a material’s order quantity and supplier') },
  { id: 'supplier-list', topic: 'purchasing', label: text('공급처별 자재 목록', '仕入先別の資材一覧', 'Materials grouped by supplier'), question: text('공급처별 자재 목록을 보여줘', '仕入先別の資材一覧を見せてください', 'Show materials grouped by supplier') },
  { id: 'material-price', topic: 'purchasing', label: text('자재 단가 확인', '資材の単価を確認', 'Check a material’s unit price'), question: text('자재 단가를 확인하고 싶어', '資材の単価を確認したい', 'I want to check a material’s unit price') },
];

export function getAdvisorTopicSuggestions(topic: AdvisorTopic, locale: Locale): AdvisorSuggestion[] {
  return ADVISOR_QUESTION_CATALOG.filter(item => item.topic === topic).map(item => ({ id: item.id, label: item.label[locale], query: item.question[locale] }));
}

export function getAdvisorTopicStarters(locale: Locale): AdvisorSuggestion[] {
  return (Object.keys(ADVISOR_TOPIC_LABELS) as AdvisorTopic[]).map(topic => ({
    id: `topic-${topic}`, label: ADVISOR_TOPIC_LABELS[topic][locale],
    query: ({ delivery: { ko: '납품처', ja: '納品先', en: 'delivery' }, inventory: { ko: '자재 재고', ja: '資材在庫', en: 'inventory' }, production: { ko: '생산', ja: '生産', en: 'production' }, purchasing: { ko: '발주 구매', ja: '発注', en: 'purchasing' } })[topic][locale],
  }));
}
