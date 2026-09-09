import type { HistoryLog } from '@/types/sixPointInspection';
import { GUIDE_IMAGE_PATH } from '@/constants/sixPointInspection';

const normalImage = (code: string) => `https://dummyimage.com/960x540/F8FAFC/475467&text=${code}+Normal`;
const defectImage = (code: string) => `https://dummyimage.com/960x540/FFF1F2/E11D2E&text=${code}+Defect`;

export const SIX_POINT_HISTORY_LOGS: HistoryLog[] = [
  {
    id: 'log-1',
    time: '09:12:34',
    model: 'VISION-6P',
    wo: 'WO-A901',
    result: 'ok',
    detail: '6개 검사 영역 전 항목 정상 판정 완료. 특이사항 없음.',
    images: {
      main: GUIDE_IMAGE_PATH,
      a1: normalImage('CAM+01'),
      a2: normalImage('CAM+02'),
      a3: normalImage('CAM+03'),
      a4: normalImage('CAM+04'),
      a5: normalImage('CAM+05'),
      a6: normalImage('CAM+06'),
    },
  },
  {
    id: 'log-2',
    time: '10:05:22',
    model: 'VISION-6P',
    wo: 'WO-A901',
    result: 'ng',
    detail: 'Surface Check(CAM 02) 불량 감지. 점검이 필요합니다.',
    images: {
      main: GUIDE_IMAGE_PATH,
      a1: normalImage('CAM+01'),
      a2: defectImage('CAM+02'),
      a3: normalImage('CAM+03'),
      a4: normalImage('CAM+04'),
      a5: normalImage('CAM+05'),
      a6: normalImage('CAM+06'),
    },
  },
  {
    id: 'log-3',
    time: '13:30:00',
    model: 'VISION-6P',
    wo: 'WO-B122',
    result: 'ok',
    detail: '상단/하단 6개 확대 영역 모두 정상 판정 완료.',
    images: {
      main: GUIDE_IMAGE_PATH,
      a1: normalImage('CAM+01'),
      a2: normalImage('CAM+02'),
      a3: normalImage('CAM+03'),
      a4: normalImage('CAM+04'),
      a5: normalImage('CAM+05'),
      a6: normalImage('CAM+06'),
    },
  },
  {
    id: 'log-4',
    time: '15:45:10',
    model: 'VISION-6P',
    wo: 'WO-B122',
    result: 'ng',
    detail: 'Bottom-Right(CAM 04) 영역에서 오차 범위 초과가 감지되었습니다.',
    images: {
      main: GUIDE_IMAGE_PATH,
      a1: normalImage('CAM+01'),
      a2: normalImage('CAM+02'),
      a3: normalImage('CAM+03'),
      a4: defectImage('CAM+04'),
      a5: normalImage('CAM+05'),
      a6: normalImage('CAM+06'),
    },
  },
];
