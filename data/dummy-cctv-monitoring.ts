import { CCTV_THUMBNAIL_IMAGE_PATH } from '@/constants/cctv-monitoring';
import type { CctvCamera, CctvCameraStatus, CctvBuildingId } from '@/types/cctv-monitoring';

interface DummyCameraSeed {
  code: string;
  name: string;
  buildingId: CctvBuildingId;
  location: string;
  status: CctvCameraStatus;
  objectPosition: string;
}

const CAMERA_SEEDS: DummyCameraSeed[] = [
  { code: 'D01', name: '정문 출입구', buildingId: 'D', location: 'D동 1층 정문', status: 'online', objectPosition: '12% 18%' },
  { code: 'D02', name: '자재 입고장', buildingId: 'D', location: 'D동 1층 입고 도크', status: 'online', objectPosition: '34% 22%' },
  { code: 'D03', name: '조립 라인', buildingId: 'D', location: 'D동 1층 조립 구역', status: 'maintenance', objectPosition: '58% 28%' },
  { code: 'D04', name: '공정 통로', buildingId: 'D', location: 'D동 2층 중앙 통로', status: 'online', objectPosition: '78% 20%' },
  { code: 'D05', name: '옥상 설비실', buildingId: 'D', location: 'D동 옥상 설비 구역', status: 'offline', objectPosition: '88% 38%' },
  { code: 'E01', name: '동측 출입구', buildingId: 'E', location: 'E동 1층 동측 출입구', status: 'online', objectPosition: '18% 44%' },
  { code: 'E02', name: '발포 라인', buildingId: 'E', location: 'E동 1층 발포 구역', status: 'online', objectPosition: '42% 48%' },
  { code: 'E03', name: '검사 구역', buildingId: 'E', location: 'E동 1층 품질 검사실', status: 'online', objectPosition: '64% 52%' },
  { code: 'E04', name: '제품 창고', buildingId: 'E', location: 'E동 2층 제품 창고', status: 'maintenance', objectPosition: '82% 54%' },
  { code: 'E05', name: '외부 하역장', buildingId: 'E', location: 'E동 외부 하역장', status: 'online', objectPosition: '92% 64%' },
  { code: 'F01', name: '정문 로비', buildingId: 'F', location: 'F동 1층 정문 로비', status: 'online', objectPosition: '10% 72%' },
  { code: 'F02', name: '생산 라인', buildingId: 'F', location: 'F동 1층 생산 구역', status: 'online', objectPosition: '30% 76%' },
  { code: 'F03', name: '물류 통로', buildingId: 'F', location: 'F동 1층 물류 통로', status: 'offline', objectPosition: '52% 70%' },
  { code: 'F04', name: '포장 구역', buildingId: 'F', location: 'F동 2층 포장 구역', status: 'online', objectPosition: '72% 78%' },
  { code: 'F05', name: '임직원 주차장', buildingId: 'F', location: 'F동 외부 주차장', status: 'online', objectPosition: '90% 84%' },
];

/** API 연결 전 화면 검증에 사용하는 D/E/F동 CCTV 15대 */
export const DUMMY_CCTV_CAMERAS: readonly CctvCamera[] = CAMERA_SEEDS.map(seed => ({
  id: `cctv-${seed.code.toLowerCase()}`,
  code: seed.code,
  name: seed.name,
  buildingId: seed.buildingId,
  location: seed.location,
  status: seed.status,
  thumbnailUrl: CCTV_THUMBNAIL_IMAGE_PATH,
  objectPosition: seed.objectPosition,
  thumbnailUpdatedAt: null,
  lastSeenAt: null,
  apiCameraId: null,
  stream: {
    transport: 'websocket',
    endpoint: null,
    channel: `cctv/${seed.buildingId.toLowerCase()}/${seed.code.toLowerCase()}`,
  },
}));
