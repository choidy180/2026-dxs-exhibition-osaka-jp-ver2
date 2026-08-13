export type ViewerLayoutType = 'modelOnly' | 'balanced' | 'detailRight';

export type ViewerUiMode = 'operator' | 'command';

export type ViewerLineTone = 'normal' | 'error' | 'offline';

export interface ApiDataItem {
  대차번호: string;
  INTCART: number;
  시리얼번호: string;
  모델번호: string;
  TIMEVALUE: string;
  'R액 압력(kg/㎥)': string;
  'P액 압력(kg/㎥)': string;
  'R액 유량(g)': string;
  'P액 유량(g)': string;
  '유량 비율(P/R)': string;
  'R액 탱크온도(℃)': string;
  'P액 탱크온도(℃)': string;
  'R액 헤드온도(℃)': string;
  'P액 헤드온도(℃)': string;
  '온조#1리턴온도(℃)': string;
  '온조#2리턴온도(℃)': string;
  '온조#1공급수압력(kg/㎥)': string;
  '온조#2공급수압력(kg/㎥)': string;
  '발포시간(초)': string;
  '가조립무게(g)': string;
  '가조립온도(℃)': string;
  '삽입주변온도(℃)': string;
  '지그상판온도(℃)': string;
  '지그하판온도(℃)': string;
  '취출경화시간(초)': string;
  '취출무게(g)': string;
  '취출주변온도(℃)': string;
  FILENAME1: string;
  AI_TIME_STR: string;
  AI_LABEL: string;
  RESULT002: string;
  FILEPATH1: string;
  [key: string]: unknown;
}

export interface EquipmentPositionItem {
  CdEquip: string;
  NmEquip: string;
  CartNo: string;
  OP: string;
  OPName: string;
}

export interface UnitData {
  name: string;
  temp: number;
  load: number;
  status: 'normal' | 'error';
  uuid?: string;
  problem?: string;
  solution?: string;
}

export interface ViewOption<T extends string> {
  id: T;
  label: string;
  description: string;
}

export interface ProcessStepConfig {
  name: string;
  color: string;
}
