import { resolveDxResourceUrl } from '@/utils/dx-api';

// 기존 사용처와의 호환을 위한 일반 URL 변환 함수다.
export function useVehicleImageUrl(filePath) {
  return resolveDxResourceUrl(filePath);
}
