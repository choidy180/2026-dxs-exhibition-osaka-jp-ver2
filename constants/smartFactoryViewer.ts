import type {
  ProcessStepConfig,
  ViewOption,
  ViewerLayoutType,
  ViewerUiMode,
} from '@/types/smartFactoryViewer';

export const JIG_MODEL_PATH = '/models/final_final_final.glb';
export const FLOOR_MODEL_PATH = '/models/final_final_final_final.glb';
export const INSPECTION_API_URL =
  typeof window !== 'undefined' &&
  (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.pathname.includes('-dev')
  )
    ? 'https://gapi.dxsplatform.com/api/DX_API000024'
    : 'http://192.168.2.147:24828/api/DX_API000024';

export const PROCESS_CONFIG: ProcessStepConfig[] = [
  { name: '오픈', color: '#6ab04c' },
  { name: '취출', color: '#f0932b' },
  { name: '삽입', color: '#f9ca24' },
  { name: '닫힘', color: '#72adb3' },
  { name: '주입', color: '#22a6b3' },
];

export const PROCESS_TABS = ['GR2', 'GR3', 'GR5', 'GR9'];

export const VIEW_LAYOUT_OPTIONS: ViewOption<ViewerLayoutType>[] = [
  {
    id: 'modelOnly',
    label: 'MODEL',
    description: '모델 단독 보기',
  },
  {
    id: 'balanced',
    label: 'BALANCED',
    description: '중앙 모델 + 좌우 정보 배치',
  },
  {
    id: 'detailRight',
    label: 'DETAIL',
    description: '왼쪽 모델 + 오른쪽 상세 정보',
  },
];

export const UI_MODE_OPTIONS: ViewOption<ViewerUiMode>[] = [
  {
    id: 'operator',
    label: 'OPERATOR',
    description: '현장 작업자가 한눈에 보는 친화형 운영 UI',
  },
  {
    id: 'command',
    label: 'DATA OPS',
    description: '수치와 이상 항목을 우선하는 데이터 중심 관제 UI',
  },
];
