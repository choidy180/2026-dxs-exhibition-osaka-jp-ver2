/** 720p·60초·무음 영상. 각 파일의 마지막 프레임 다음에 첫 프레임이 자연스럽게 이어진다. */
export const TAKTTIME_CAMERA_VIDEOS = {
  A: '/videos/takttime/web-v1/foaming.mp4',
  B: '/videos/takttime/web-v1/assembly-1.mp4',
  C: '/videos/takttime/web-v1/assembly-2.mp4',
} as const;

export const TAKTTIME_PLAYBACK_RATE = 0.5;
export const TAKTTIME_PART_NAMES = {
  A: ['도어 라이너 A', '도어 라이너 B', '도어 라이너 C'],
  B: ['모터 하우징', '금속 브래킷', '베어링 부품'],
  C: ['필터 카트리지', '펌프 모듈', '밸브 모듈'],
} as const;
