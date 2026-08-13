import type {
  ProcessStepConfig,
  ViewOption,
  ViewerLayoutType,
  ViewerUiMode,
} from '@/types/smartFactoryViewer';

export const JIG_MODEL_PATH = '/models/final_final_final.glb';
export const FLOOR_MODEL_PATH = '/models/final_final_final_final.glb';
export const INSPECTION_API_URL = 'https://gapi.dxsplatform.com/api/DX_API000035';

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
    label: '전체 모델',
    description: '3D 전체 모델만 보기',
  },
  {
    id: 'balanced',
    label: '관제 요약',
    description: '3D 모델과 핵심 관제 현황 보기',
  },
  {
    id: 'detailRight',
    label: '설비 상세',
    description: '3D 모델과 오른쪽 설비 상세 정보 보기',
  },
];

export const UI_MODE_OPTIONS: ViewOption<ViewerUiMode>[] = [
  {
    id: 'operator',
    label: '현장 작업자',
    description: '현장 작업자가 한눈에 보는 친화형 운영 UI',
  },
  {
    id: 'command',
    label: '데이터 관리자',
    description: '수치와 이상 항목을 우선하는 데이터 중심 관제 UI',
  },
];
