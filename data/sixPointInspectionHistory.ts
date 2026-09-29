import type { HistoryLog } from '@/types/sixPointInspection';
import { GUIDE_IMAGE_PATH } from '@/constants/sixPointInspection';

const normalImage = () => '/demo/inspection-door.png';
const defectImage = () => '/demo/inspection-door.png';

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
      a1: normalImage(),
      a2: normalImage(),
      a3: normalImage(),
      a4: normalImage(),
      a5: normalImage(),
      a6: normalImage(),
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
      a1: normalImage(),
      a2: defectImage(),
      a3: normalImage(),
      a4: normalImage(),
      a5: normalImage(),
      a6: normalImage(),
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
      a1: normalImage(),
      a2: normalImage(),
      a3: normalImage(),
      a4: normalImage(),
      a5: normalImage(),
      a6: normalImage(),
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
      a1: normalImage(),
      a2: normalImage(),
      a3: normalImage(),
      a4: defectImage(),
      a5: normalImage(),
      a6: normalImage(),
    },
  },
];
