import type { ApiDataItem } from '@/types/smartFactoryViewer';

export const MOTOR_DATA = [
  { time: '1s', load: 45 },
  { time: '2s', load: 52 },
  { time: '3s', load: 48 },
  { time: '4s', load: 70 },
  { time: '5s', load: 65 },
  { time: '6s', load: 58 },
  { time: '7s', load: 42 },
  { time: '8s', load: 45 },
];

export const createMockApiData = (): ApiDataItem[] => {
  return Array.from({ length: 12 }, (_, index) => {
    const cartNumber = index + 1;
    const isDemoError = cartNumber === 4;

    return {
      대차번호: String(cartNumber),
      INTCART: cartNumber,
      시리얼번호: `SN-${20240000 + index}`,
      모델번호: `MD-${100 + index}`,
      TIMEVALUE: new Date().toISOString(),
      'R액 압력(kg/㎥)': (150 + Math.random() * 10).toFixed(1),
      'P액 압력(kg/㎥)': (148 + Math.random() * 10).toFixed(1),
      'R액 유량(g)': (300 + Math.random() * 50).toFixed(1),
      'P액 유량(g)': (300 + Math.random() * 50).toFixed(1),
      '유량 비율(P/R)': '1.0',
      'R액 탱크온도(℃)': (40 + Math.random() * 5).toFixed(1),
      'P액 탱크온도(℃)': (40 + Math.random() * 5).toFixed(1),
      'R액 헤드온도(℃)': (45 + Math.random() * 5).toFixed(1),
      'P액 헤드온도(℃)': (45 + Math.random() * 5).toFixed(1),
      '온조#1리턴온도(℃)': '30.0',
      '온조#2리턴온도(℃)': '30.0',
      '온조#1공급수압력(kg/㎥)': '3.5',
      '온조#2공급수압력(kg/㎥)': '3.5',
      '발포시간(초)': '15',
      '가조립무게(g)': '1200',
      '가조립온도(℃)': isDemoError ? '223.0' : (200 + Math.random() * 10).toFixed(1),
      '삽입주변온도(℃)': '25.0',
      '지그상판온도(℃)': '55.0',
      '지그하판온도(℃)': '55.0',
      '취출경화시간(초)': '120',
      '취출무게(g)': '1250',
      '취출주변온도(℃)': '26.0',
      FILENAME1: 'inspection-door.png',
      AI_TIME_STR: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      AI_LABEL: isDemoError ? '온도 상한 초과' : '정상',
      RESULT002: isDemoError ? '불량' : '정상',
      FILEPATH1: '/demo/inspection-door.png',
    };
  });
};
