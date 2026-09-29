import type { AnchorMap, CornerKey, TypeOption } from '@/types/glassGapInspection';

export const GUIDE_IMAGE_PATH = '/demo/inspection-door.png';

export const HOTSPOT_STORAGE_KEY = 'glass-gap-inspection-hotspot-anchors-v2';
export const POLLING_INTERVAL_MS = 3000;

export const CORNER_KEYS: CornerKey[] = ['tl', 'tr', 'bl', 'br'];

export const DEFAULT_HOTSPOT_ANCHORS: AnchorMap = {
  tl: {
    x: 13,
    y: 16,
  },
  tr: {
    x: 87,
    y: 16,
  },
  bl: {
    x: 13,
    y: 84,
  },
  br: {
    x: 87,
    y: 84,
  },
};

export const TYPE_OPTIONS: TypeOption[] = [
  {
    type: 'guide',
    name: 'TYPE 01 · Guide Focus',
    shortName: 'Guide',
    text: '큰 검사 이미지만 단독으로 확인합니다.',
  },
  {
    type: 'split',
    name: 'TYPE 02 · Camera Split',
    shortName: 'Split',
    text: '확대 화면을 큰 이미지 좌우에 2개씩 배치합니다.',
  },
  {
    type: 'rightStack',
    name: 'TYPE 03 · Right Stack',
    shortName: 'Right',
    text: '확대 화면 4개를 오른쪽 한 영역에 모아 표시합니다.',
  },
];
