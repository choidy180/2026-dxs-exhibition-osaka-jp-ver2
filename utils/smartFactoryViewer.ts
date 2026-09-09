import { resolveDxResourceUrl } from '@/utils/dx-api';
import type {
  ApiDataItem,
  EquipmentPositionItem,
  UnitData,
} from '@/types/smartFactoryViewer';

const asString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

export const normalizeApiItem = (item: Partial<ApiDataItem>): ApiDataItem => {
  const result002 = asString(item.RESULT002, '정상');

  return {
    ...item,
    대차번호: asString(item.대차번호, '0'),
    INTCART: Number(item.INTCART ?? item.대차번호 ?? 0),
    시리얼번호: asString(item.시리얼번호 ?? item['Serial No.']),
    모델번호: asString(item.모델번호 ?? item['Model No.']),
    TIMEVALUE: asString(item.TIMEVALUE, new Date().toISOString()),
    'R액 압력(kg/㎥)': asString(item['R액 압력(kg/㎥)'] ?? item['R액 압력'], '0'),
    'P액 압력(kg/㎥)': asString(item['P액 압력(kg/㎥)'] ?? item['P액 압력'], '0'),
    'R액 유량(g)': asString(item['R액 유량(g)'] ?? item['R액 유량'], '0'),
    'P액 유량(g)': asString(item['P액 유량(g)'] ?? item['P액 유량'], '0'),
    '유량 비율(P/R)': asString(item['유량 비율(P/R)'] ?? item['유량 비율'], '0'),
    'R액 탱크온도(℃)': asString(item['R액 탱크온도(℃)'] ?? item['R액 탱크온도'], '0'),
    'P액 탱크온도(℃)': asString(item['P액 탱크온도(℃)'] ?? item['P액 탱크온도'], '0'),
    'R액 헤드온도(℃)': asString(item['R액 헤드온도(℃)'] ?? item['R액 헤드온도'], '0'),
    'P액 헤드온도(℃)': asString(item['P액 헤드온도(℃)'] ?? item['P액 헤드온도'], '0'),
    '온조#1리턴온도(℃)': asString(item['온조#1리턴온도(℃)'] ?? item['온조#1 리턴온도'], '0'),
    '온조#2리턴온도(℃)': asString(item['온조#2리턴온도(℃)'] ?? item['온조#2 리턴온도'], '0'),
    '온조#1공급수압력(kg/㎥)': asString(
      item['온조#1공급수압력(kg/㎥)'] ?? item['온조#1 공급수압력'],
      '0',
    ),
    '온조#2공급수압력(kg/㎥)': asString(
      item['온조#2공급수압력(kg/㎥)'] ?? item['온조#2 공급수압력'],
      '0',
    ),
    '발포시간(초)': asString(item['발포시간(초)'] ?? item.발포시간, '0'),
    '가조립무게(g)': asString(item['가조립무게(g)'] ?? item.가조립무게, '0'),
    '가조립온도(℃)': asString(item['가조립온도(℃)'] ?? item.가조립온도, '210.0'),
    '삽입주변온도(℃)': asString(item['삽입주변온도(℃)'] ?? item.삽입주변온도, '0'),
    '지그상판온도(℃)': asString(item['지그상판온도(℃)'] ?? item.지그상판온도, '0'),
    '지그하판온도(℃)': asString(item['지그하판온도(℃)'] ?? item.지그하판온도, '0'),
    '취출경화시간(초)': asString(item['취출경화시간(초)'] ?? item.취출경화시간, '0'),
    '취출무게(g)': asString(item['취출무게(g)'] ?? item.취출무게, '0'),
    '취출주변온도(℃)': asString(item['취출주변온도(℃)'] ?? item.취출주변온도, '0'),
    FILENAME1: asString(item.FILENAME1),
    AI_TIME_STR: asString(item.AI_TIME_STR),
    AI_LABEL: asString(item.AI_LABEL, result002),
    RESULT002: result002,
    FILEPATH1: resolveDxResourceUrl(asString(item.FILEPATH1)),
  } as ApiDataItem;
};

export const normalizeEquipmentPosition = (
  item: Partial<EquipmentPositionItem>,
): EquipmentPositionItem => ({
  CdEquip: asString(item.CdEquip),
  NmEquip: asString(item.NmEquip),
  CartNo: asString(item.CartNo),
  OP: asString(item.OP),
  OPName: asString(item.OPName),
});

export const getEquipmentPositionSignature = (items: EquipmentPositionItem[]) => {
  return items
    .map((item) => [item.CdEquip, item.OP, item.CartNo, item.OPName].join('|'))
    .sort()
    .join('::');
};

export const findGr2EquipmentPosition = (
  items: EquipmentPositionItem[],
  operation: string,
) => {
  return items.find((item) => (
    item.CdEquip === 'BMC021' && (item.OP === operation || item.OPName === operation)
  )) ?? null;
};

export const getGr2LineOffset = (
  items: EquipmentPositionItem[],
  stationCount: number,
  insertionStationIndex: number,
) => {
  if (stationCount <= 0 || insertionStationIndex < 0) return null;

  const insertionPosition = findGr2EquipmentPosition(items, 'OP1')
    ?? findGr2EquipmentPosition(items, '삽입');
  const cartNumber = Number.parseInt(insertionPosition?.CartNo ?? '', 10);

  if (!Number.isInteger(cartNumber) || cartNumber < 1 || cartNumber > stationCount) {
    return null;
  }

  return (insertionStationIndex - (cartNumber - 1) + stationCount) % stationCount;
};

export const isDefectResult = (result: unknown) => {
  const normalizedResult = asString(result).trim();
  return normalizedResult === '불량';
};

export const createErrorUnits = (apiData: ApiDataItem[]): UnitData[] => {
  return apiData
    .filter((item) => isDefectResult(item.RESULT002))
    .map((item) => ({
      name: formatUnitName(item.대차번호),
      temp: Number.parseFloat(item['가조립온도(℃)']) || 0,
      load: Number.parseFloat(item['R액 압력(kg/㎥)']) || 0,
      status: 'error' as const,
      problem: item.RESULT002,
      solution: '관리자 확인 필요',
    }));
};

export const getUnitNumber = (unitName: string) => {
  const matchedNumber = unitName.match(/\d+/)?.[0] ?? '';
  return Number.parseInt(matchedNumber, 10);
};

export const findApiItemByUnitName = (apiData: ApiDataItem[], unitName: string) => {
  const unitNumber = getUnitNumber(unitName);
  return apiData.find((item) => Number.parseInt(item.대차번호, 10) === unitNumber) ?? null;
};

export const formatUnitName = (cartNumber: string | number) => {
  return `OP${Number.parseInt(String(cartNumber), 10)}`;
};
