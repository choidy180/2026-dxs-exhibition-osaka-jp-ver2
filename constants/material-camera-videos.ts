import type { Locale } from '@/lib/i18n/translate';

export const MATERIAL_CAMERA_RESET_MS = 3_000;

export const MATERIAL_CAMERA_VIDEOS = [
  '01_JP-RD-1048_48_JP.mp4',
  '02_JP-RD-2056_36_JP.mp4',
  '03_JP-RD-3072_64_JP.mp4',
  '04_JP-RD-4085_40_JP.mp4',
  '05_JP-RD-5093_52_JP.mp4',
  '06_JP-TR-6018_24_JP.mp4',
  '07_JP-TR-7026_32_JP.mp4',
  '08_JP-TR-8034_28_JP.mp4',
  '09_JP-FR-9042_60_JP.mp4',
  '10_JP-FR-1057_44_JP.mp4',
  '11_JP-FR-2069_56_JP.mp4',
].map(filename => `/videos/material-inbound/web-v1/${filename}`);

export const MATERIAL_CAMERA_KOREAN_VIDEOS = MATERIAL_CAMERA_VIDEOS.map(src =>
  src.replace('/web-v1/', '/web-ko-v1/').replace('_JP.mp4', '_KO.mp4'),
);

export function getMaterialCameraVideos(locale: Locale): readonly string[] {
  // 영어 전용 영상 대신 한국어 영상을 함께 사용한다.
  return locale === 'ja' ? MATERIAL_CAMERA_VIDEOS : MATERIAL_CAMERA_KOREAN_VIDEOS;
}
