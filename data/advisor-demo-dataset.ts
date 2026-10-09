import type { AdvisorText } from './advisor-knowledge';

// 검수 수치는 그대로 유지하고, 추가 행은 사용자 요청에 따라 만든 전시용 시뮬레이션이다.
export const ADVISOR_DEMO_DATE = '2026-08-21';
export const ADVISOR_DEMO_END_DATE = '2026-08-31';
const text = (ko: string, ja: string, en: string): AdvisorText => ({ ko, ja, en });
export const ADVISOR_LG = text('엘지전자(주)', 'LG電子株式会社', 'LG Electronics');
const partnerA = text('협력사 A', '協力会社A', 'Partner A');
const partnerB = text('협력사 B', '協力会社B', 'Partner B');

export const ADVISOR_PRODUCTS = [
  { code: 'ADC30068403', name: 'Door Assembly, Refrigerator', destination: ADVISOR_LG, planQuantity: 180, laborMinutes: 166.38 * 8 / 180, bomFactor: 1 },
  { code: 'ADC30068402', name: 'Door Assembly,Semi Freezer(F)', destination: ADVISOR_LG, planQuantity: 300, laborMinutes: 571.97 * 7 / 300, bomFactor: 1.2 },
  { code: 'ADC30068404', name: 'Door Assembly, Freezer', destination: partnerA, planQuantity: 240, laborMinutes: 9.6, bomFactor: 1.1 },
  { code: 'ADC30068405', name: 'Door Assembly, Compact', destination: partnerB, planQuantity: 120, laborMinutes: 6.4, bomFactor: 0.8 },
] as const;

export const ADVISOR_MATERIALS = [
  { code: 'ADX72910333', name: 'GASKET ASSEMBLY, DOOR', stock: 385, safety: 500, forecast: -618, shortageDate: '2026-08-27', orderQuantity: 800, orderDate: '2026-08-24', price: 12000, weekQuantity: 1200, supplier: ADVISOR_LG, bom: 1 },
  { code: 'MGJ67712807', name: 'COVER, HINGE', stock: 160, safety: 250, forecast: -210, shortageDate: '2026-08-26', orderQuantity: 310, orderDate: '2026-08-24', price: 18000, weekQuantity: 500, supplier: ADVISOR_LG, bom: 1 },
  { code: 'MDS64281201', name: 'HANDLE ASSEMBLY', stock: 240, safety: 400, forecast: -400, shortageDate: '2026-08-25', orderQuantity: 500, orderDate: '2026-08-24', price: 9000, weekQuantity: 707, supplier: partnerA, bom: 1 },
  { code: 'MEA62370102', name: 'BRACKET, DOOR', stock: 410, safety: 600, forecast: -250, shortageDate: '2026-08-28', orderQuantity: 600, orderDate: '2026-08-25', price: 6000, weekQuantity: 1000, supplier: partnerA, bom: 2 },
  { code: 'FAB30016101', name: 'SCREW, TAPPING', stock: 800, safety: 1200, forecast: -800, shortageDate: '2026-08-24', orderQuantity: 1000, orderDate: '2026-08-21', price: 4000, weekQuantity: 1000, supplier: partnerB, bom: 4 },
  { code: 'MCK69645301', name: 'TRIM, DOOR', stock: 250, safety: 350, forecast: -130, shortageDate: '2026-08-28', orderQuantity: 80, orderDate: '2026-08-25', price: 17251, weekQuantity: 500, supplier: partnerB, bom: 1 },
  { code: 'MEB65903801', name: 'STOPPER, DOOR', stock: 90, safety: 180, forecast: -100, shortageDate: '2026-08-25', orderQuantity: 250, orderDate: '2026-08-24', price: null, weekQuantity: 400, supplier: partnerA, bom: 1 },
  { code: 'MCR66806902', name: 'DECOR, DOOR', stock: 80, safety: 160, forecast: -90, shortageDate: '2026-08-26', orderQuantity: 200, orderDate: '2026-08-24', price: null, weekQuantity: 350, supplier: partnerB, bom: 1 },
  { code: 'MFG63099101', name: 'SEAL, FOAM', stock: 150, safety: 300, forecast: -180, shortageDate: '2026-08-27', orderQuantity: 400, orderDate: '2026-08-24', price: null, weekQuantity: 600, supplier: partnerA, bom: 2 },
  { code: 'MEG62512301', name: 'PLATE, HINGE', stock: 100, safety: 220, forecast: -140, shortageDate: '2026-08-28', orderQuantity: 300, orderDate: '2026-08-25', price: null, weekQuantity: 450, supplier: partnerB, bom: 1 },
  { code: 'MAM66001201', name: 'CAP, DOOR', stock: 1200, safety: 400, forecast: 600, shortageDate: null, orderQuantity: 0, orderDate: null, price: 900, weekQuantity: 0, supplier: partnerA, bom: 2 },
  { code: 'MFP61208401', name: 'PAD, INSULATION', stock: 900, safety: 300, forecast: 450, shortageDate: null, orderQuantity: 0, orderDate: null, price: 1400, weekQuantity: 0, supplier: partnerB, bom: 1 },
  { code: 'MFA62005701', name: 'CLIP, DOOR', stock: 3000, safety: 800, forecast: 1800, shortageDate: null, orderQuantity: 0, orderDate: null, price: 350, weekQuantity: 0, supplier: partnerA, bom: 4 },
  { code: 'MFB63109001', name: 'LABEL, PRODUCT', stock: 1800, safety: 500, forecast: 1100, shortageDate: null, orderQuantity: 0, orderDate: null, price: 200, weekQuantity: 0, supplier: partnerB, bom: 1 },
] as const;

export const ADVISOR_ITEM_ALIASES: Record<string, string[]> = {
  ADC30068403: ['냉장고 도어', '冷蔵庫ドア'], ADC30068402: ['세미 프리저 도어', 'セミフリーザードア'],
  ADC30068404: ['냉동고 도어', '冷凍庫ドア'], ADC30068405: ['소형 도어', '小型ドア'],
  ADX72910333: ['가스켓', 'ガスケット', 'gasket'], MGJ67712807: ['힌지 커버', 'ヒンジカバー'],
  MDS64281201: ['손잡이', 'ハンドル'], MEA62370102: ['도어 브라켓', 'ドアブラケット'],
  FAB30016101: ['스크류', '나사', 'ねじ', 'ネジ'], MCK69645301: ['도어 트림', 'ドアトリム'],
  MEB65903801: ['도어 스토퍼', 'ドアストッパー'], MCR66806902: ['도어 장식', 'ドア装飾'],
  MFG63099101: ['폼 씰', 'フォームシール'], MEG62512301: ['힌지 플레이트', 'ヒンジプレート'],
  MAM66001201: ['도어 캡', 'ドアキャップ'], MFP61208401: ['단열 패드', '断熱パッド'],
  MFA62005701: ['도어 클립', 'ドアクリップ'], MFB63109001: ['제품 라벨', '製品ラベル'],
};

export function getAdvisorDeliveries(date: string) {
  if (date < ADVISOR_DEMO_DATE || date > ADVISOR_DEMO_END_DATE) return [];
  const day = Number(date.slice(-2)) - 21;
  return ADVISOR_PRODUCTS.map((product, index) => {
    const quantity = product.planQuantity + day * 10;
    const packed = Math.max(0, quantity - [20, 60, 40, 0][index]);
    return { product, quantity, packed, packages: Math.ceil(packed / 10), vehicle: `DEMO-${[101, 102, 101, 103][index]}`, time: ['09:00', '11:00', '14:00', '16:00'][index] };
  });
}

export function getAdvisorPlanQuantity(code: string, date: string) {
  const product = ADVISOR_PRODUCTS.find(item => item.code === code);
  if (!product || date < ADVISOR_DEMO_DATE || date > ADVISOR_DEMO_END_DATE) return undefined;
  // 검수본의 8월 27일 계획 180개를 비롯한 기준 계획을 날짜별로 일관되게 사용한다.
  return product.planQuantity;
}

export function getAdvisorProjectedStock(code: string, date: string) {
  const material = ADVISOR_MATERIALS.find(item => item.code === code)!;
  const days = (Date.parse(date) - Date.parse(ADVISOR_DEMO_DATE)) / 86400000;
  const horizon = (Date.parse(material.shortageDate ?? ADVISOR_DEMO_END_DATE) - Date.parse(ADVISOR_DEMO_DATE)) / 86400000;
  // 부족 예정일까지는 양수 재고를 유지하고, 해당 날짜의 계획 소요량을 반영한다.
  const dailyUse = material.stock / (horizon + 1);
  const stock = material.shortageDate
    ? days < horizon ? material.stock - dailyUse * days : material.forecast - dailyUse * (days - horizon)
    : material.stock + (material.forecast - material.stock) * days / horizon;
  return Math.round(stock * 100) / 100;
}
