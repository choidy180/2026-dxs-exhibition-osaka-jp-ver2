import { ADVISOR_SCENARIOS, type AdvisorScenario, type AdvisorScenarioId } from '@/data/advisor-knowledge';
import type { Locale } from '@/lib/i18n/translate';

// NFKC로 전각 영숫자와 검수본의 한자 부수(⽇, ⾞ 등)를 같은 문자로 처리한다.
export const normalizeAdvisorQuery = (query: string) => query.normalize('NFKC').toLowerCase().replace(/\s+/g, '')
  .replace(/[〇零一二三四五六七八九十百千]+(?=[月日人個])/g, token => {
    const digits = '〇一二三四五六七八九';
    let total = 0;
    let digit = 0;
    for (const char of token) {
      const unit = ({ 十: 10, 百: 100, 千: 1000 } as Record<string, number>)[char];
      if (unit) { total += (digit || 1) * unit; digit = 0; }
      else digit = char === '零' ? 0 : digits.indexOf(char);
    }
    return String(total + digit);
  });
// 검수본 첫 질문의 '表示てください'도 수정된 예시와 같은 질문으로 인식한다.
const exactKey = (query: string) => normalizeAdvisorQuery(query).replace(/表示てください/g, '表示してください')
  .replace(/[。、，,?!？！「」"'“”‘’‧·:：]|\.(?!\d)/g, '');

export function getAdvisorReplyLocale(query: string, fallback: Locale): Locale {
  const normalized = query.normalize('NFKC');
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(normalized) && !/[가-힣]/.test(normalized)) return 'ja';
  if (/[가-힣]/.test(normalized)) return 'ko';
  return fallback;
}

const INTENTS: Record<AdvisorScenarioId, (query: string) => boolean> = {
  'delivery-vehicles': q => /차량|車両|vehicle/.test(q) && /포장|梱包|packing/.test(q) && /납품|納品|delivery/.test(q),
  'delivery-products': q => /납품|納品|delivery/.test(q) && /수량|数量|quantity/.test(q) && !/차량|車両|vehicle|납품처|納品先/.test(q),
  'delivery-destination': q => /납품처|납품해야|납품해|納品先|届け先|どこ.*納品|どこ.*届|delivered|destination/.test(q),
  'material-shortage': q => /부족|不足|short/.test(q) && /언제|시점|いつ|時期|when/.test(q) && !/발주|発注|order/.test(q),
  'material-stock': q => /재고|在庫|stock/.test(q) && /생산후|生産後|afterproduction/.test(q),
  'safety-stock': q => /안전재고|安全在庫|safetystock/.test(q),
  'additional-materials': q => /추가|追加|additional/.test(q) && /자재|資材|material/.test(q) && /늘|증가|증산|増|increase/.test(q),
  'planned-duration': q => /생산|生産|production/.test(q) && /시간|몇분|걸려|時間|何分|かか|minutes|duration/.test(q) && /8월27일|8月27日|08[-/]27|8[-/]27/.test(q),
  'quantity-duration': q => /생산|生産|produc/.test(q) && /시간|몇분|걸려|時間|何分|かか|minutes|duration/.test(q) && !/8월27일|8月27日|08[-/]27|8[-/]27/.test(q),
  'purchase-shortages': q => /발주|発注|order/.test(q) && /부족|不足|shortage/.test(q) && !/안전재고|安全在庫|safetystock/.test(q),
  'purchase-week': q => /다음주|来週|nextweek/.test(q) && /발주|発注|order/.test(q),
  'purchase-supplier': q => /공급처|공급사|仕入先|仕入れ先|supplier/.test(q),
};

function conditionsMatch(query: string, scenario: AdvisorScenario): boolean {
  // 코드 바로 뒤에 공백으로 구분한 날짜·인원 숫자가 붙지 않게 먼저 코드를 추출한다.
  let rest = query.normalize('NFKC').toLowerCase();
  const codes = rest.match(/[a-z]{2,}\d{4,}/g) ?? [];
  if (scenario.code ? codes.length !== 1 || codes[0] !== scenario.code.toLowerCase() : codes.length > 0) return false;
  rest = rest.replace(/[a-z]{2,}\d{4,}/g, '');
  rest = normalizeAdvisorQuery(rest);
  const dates: string[] = [];
  let wrongYear = false;
  rest = rest.replace(/(\d{4})[年년./-](\d{1,2})[月월./-](\d{1,2})[日일]?/g, (_, year, month, day) => {
    if (year !== '2026') wrongYear = true;
    dates.push(`${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    return '';
  });
  rest = rest.replace(/(\d{1,2})[月월](\d{1,2})[日일]|(?<!\d)(\d{1,2})[-/](\d{1,2})(?!\d)/g, (_, month, day, slashMonth, slashDay) => {
    dates.push(`${String(month ?? slashMonth).padStart(2, '0')}-${String(day ?? slashDay).padStart(2, '0')}`);
    return '';
  });
  if (wrongYear || (scenario.date ? dates.length !== 1 || dates[0] !== scenario.date : dates.length > 0)) return false;
  const numbers = (rest.replace(/(?<=\d),(?=\d)/g, '').match(/[+-]?\d+(?:\.\d+)?/g) ?? []).map(Number).sort((a, b) => a - b);
  const expected = [...(scenario.numbers ?? [])].sort((a, b) => a - b);
  if (numbers.length !== expected.length || numbers.some((number, index) => number !== expected[index])) return false;
  // 작업 인원과 생산 수량을 바꿔 입력한 경우에도 같은 시간을 반환하지 않는다.
  if (scenario.id === 'quantity-duration' && (!/7(?:명|人|workers)|(?:with|take)7workers/.test(rest) || !/300(?:개|個|units)/.test(rest))) return false;
  if (scenario.id === 'planned-duration' && !/8(?:명|人|workers)/.test(rest)) return false;
  if (scenario.id === 'additional-materials' && !/100(?:개|個|units)/.test(rest)) return false;
  return true;
}

export function matchAdvisorScenario(input: string): { scenario?: AdvisorScenario; candidates: AdvisorScenario[]; reason?: 'conditions' | 'ambiguous' | 'unsupported' } {
  const query = normalizeAdvisorQuery(input);
  const exact = ADVISOR_SCENARIOS.find(scenario => Object.values(scenario.question).some(question => exactKey(question) === exactKey(input)));
  if (exact) return { scenario: exact, candidates: [exact] };
  const candidates = ADVISOR_SCENARIOS.filter(scenario => INTENTS[scenario.id](query));
  const forbidden = /왜|원인|原因|なぜ|理由|why|실시간|현재|リアルタイム|現在|現時点|realtime|明日|明後日|昨日|내일|어제|모레|이번주|今週|先週|今月|이번달|내년|来年|今年|올해|지난주|lastweek|tomorrow|yesterday|thisweek|today/.test(query)
    || /오늘|本日|今日|マイナス|음수/.test(query)
    || /날씨|天気|weather|주가|株価|stockprice|주소|住所|address|연락처|連絡先|電話|전화|단가|単価|unitprice|품질|品質|quality|불량|不良|defect|검사|検査/.test(query)
    || /삭제|수정해|변경해|취소해|削除|変更して|取り消|取消|delete|execute/.test(query)
    || /(?:발주|주문|発注|注文)(?:를|을|を)?(?:실행|등록|취소|처리|진행|해줘|して|実行|登録)/.test(query);
  if (forbidden) return { candidates, reason: 'unsupported' };
  // 복수 의도 또는 자료 밖 조건은 임의로 하나를 골라 답하지 않는다.
  if (candidates.length > 1) return { candidates, reason: 'ambiguous' };
  const scenario = candidates[0];
  if (!scenario) return { candidates, reason: 'unsupported' };
  if (!conditionsMatch(input, scenario)) return { candidates, reason: 'conditions' };
  return { scenario, candidates };
}
