const IDENTIFIER_HEADER = /코드|번호|식별|아이디|우편|전화|(?:^|[^a-z])(?:code|id|identifier|sku|serial|number|no|phone|zip)(?:$|[^a-z])/;
const TEXT_HEADER = /단위|일자|날짜|일시|년월|기준일|품명|품목명|자재명|설비명|제품명|이름|(?:^|[^a-z])(?:date|datetime|timestamp|year|month|day|name|uom)(?:$|[^a-z])/;
const NUMERIC_HEADER = /수량|소요(?:계획)?량|계획량|실적량|재고량|금액|단가|가격|비용|원가|합계|총계|건수|개수|횟수|비율|율|률|무게|중량|길이|면적|체적|온도|습도|압력|전력|(?:^|[^a-z])(?:qty|quantity|amount|count|sum|total|price|cost|rate|ratio|percent|percentage|weight|mass|length|area|volume|temperature|humidity|pressure|power|energy|stock|inventory|demand|requirement|balance|capacity|duration|hours|minutes|seconds)(?:$|[^a-z])/;
const DECIMAL_VALUE = /^([+-]?)(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$/;
const FRACTION_DIGITS = 6;

function normalizeHeader(header: string): string {
  return header.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().trim();
}

export function isAdvisorIdentifierColumn(header: string): boolean {
  return IDENTIFIER_HEADER.test(normalizeHeader(header));
}

export function isAdvisorNumericColumn(header: string): boolean {
  const normalized = normalizeHeader(header);
  if (IDENTIFIER_HEADER.test(normalized) || TEXT_HEADER.test(normalized)) return false;

  // 단위 자체는 보존하되 unit_price 같은 단가 열은 수치로 표시한다.
  if (/(?:^|[^a-z])units?(?:$|[^a-z])/.test(normalized) && !/(?:price|cost)/.test(normalized)) {
    return false;
  }

  return NUMERIC_HEADER.test(normalized);
}

export function formatAdvisorTableCell(value: string | null | undefined, header: string): string {
  const text = value?.trim() ?? '';
  if (!text) return '-';
  if (!isAdvisorNumericColumn(header)) return text;

  const match = DECIMAL_VALUE.exec(text);
  if (!match) return text;

  const [, sign, groupedInteger, fraction = ''] = match;
  const integer = groupedInteger.replaceAll(',', '');
  // 앞자리 0은 식별 값일 수 있으므로 수치 열에서도 원문을 유지한다.
  if (integer.length > 1 && integer.startsWith('0')) return text;

  // Number로 변환하지 않아 큰 정수와 긴 소수의 정밀도 손실을 막는다.
  const scale = BigInt(10 ** FRACTION_DIGITS);
  let scaled = BigInt(integer) * scale + BigInt(fraction.slice(0, FRACTION_DIGITS).padEnd(FRACTION_DIGITS, '0'));
  if (fraction.length > FRACTION_DIGITS && fraction[FRACTION_DIGITS] >= '5') {
    scaled += BigInt(1);
  }

  const whole = (scaled / scale).toLocaleString('ko-KR');
  const decimals = (scaled % scale).toString().padStart(FRACTION_DIGITS, '0').replace(/0+$/, '');
  const prefix = sign === '+' ? '+' : sign === '-' && scaled !== BigInt(0) ? '-' : '';
  return `${prefix}${whole}${decimals ? `.${decimals}` : ''}`;
}
