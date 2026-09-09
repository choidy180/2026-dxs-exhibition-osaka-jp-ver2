import type { HistoryLog } from '@/types/glassGapInspection';
import { GUIDE_IMAGE_PATH } from '@/constants/glassGapInspection';

export const GLASS_GAP_HISTORY_LOGS: HistoryLog[] = [
  {
    id: 'log-1',
    time: '09:12:34',
    model: 'GL-100',
    wo: 'WO-A901',
    result: 'ok',
    detail: '전 항목 정상 판정 완료. 특이사항 없음.',
    images: {
      main: GUIDE_IMAGE_PATH,
      a1: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A1+Normal',
      a2: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A2+Normal',
      a3: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A3+Normal',
      a4: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A4+Normal',
    },
  },
  {
    id: 'log-2',
    time: '10:05:22',
    model: 'GL-100',
    wo: 'WO-A901',
    result: 'ng',
    detail: '좌측 상단(A1) 모서리 들뜸 현상 감지됨. 재검사 요망.',
    images: {
      main: GUIDE_IMAGE_PATH,
      a1: 'https://dummyimage.com/960x540/FFF1F2/E11D2E&text=A1+Defect',
      a2: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A2+Normal',
      a3: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A3+Normal',
      a4: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A4+Normal',
    },
  },
  {
    id: 'log-3',
    time: '13:30:00',
    model: 'GL-PRO',
    wo: 'WO-B122',
    result: 'ok',
    detail: '전 항목 정상 판정 완료.',
    images: {
      main: GUIDE_IMAGE_PATH,
      a1: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A1+Normal',
      a2: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A2+Normal',
      a3: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A3+Normal',
      a4: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A4+Normal',
    },
  },
  {
    id: 'log-4',
    time: '15:45:10',
    model: 'GL-PRO',
    wo: 'WO-B122',
    result: 'ng',
    detail: '우측 하단(A4) 틈새 불량. 오차 범위 초과.',
    images: {
      main: GUIDE_IMAGE_PATH,
      a1: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A1+Normal',
      a2: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A2+Normal',
      a3: 'https://dummyimage.com/960x540/F8FAFC/475467&text=A3+Normal',
      a4: 'https://dummyimage.com/960x540/FFF1F2/E11D2E&text=A4+Defect',
    },
  },
];
