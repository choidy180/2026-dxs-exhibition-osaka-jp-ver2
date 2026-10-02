/** 2026-10-02 촬영한 라인별 30초 영상. 화면의 라인 이름에 맞춰 연결한다. */
export const TAKTTIME_CAMERA_VIDEOS = {
  A: '/videos/takttime/20261002/foaming.mp4',
  B: '/videos/takttime/20261002/assembly-1.mp4',
  C: '/videos/takttime/20261002/assembly-2.mp4',
} as const;

export const TAKTTIME_PLAYBACK_RATE = 0.5;
export const TAKTTIME_PART_NAMES = {
  A: ['도어 라이너 A', '도어 라이너 B', '도어 라이너 C'],
  B: ['모터 하우징', '금속 브래킷', '베어링 부품'],
  C: ['필터 카트리지', '펌프 모듈', '밸브 모듈'],
} as const;
