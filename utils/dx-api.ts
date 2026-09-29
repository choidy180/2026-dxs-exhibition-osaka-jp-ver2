/** 전시회에서는 서버 주소 대신 현재 로컬 사이트 주소만 사용한다. */
export function getDxApiBaseUrl(origin?: string): string {
  return origin ?? (typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin);
}
export function getDxApiUrl(path: string, origin?: string): string {
  return `${getDxApiBaseUrl(origin)}/${path.replace(/^\/+/, '')}`;
}
/** 과거 데이터의 서버 이미지 주소도 번들에 포함된 전시용 이미지로 치환한다. */
export function resolveDxResourceUrl(value: string | null | undefined, _origin?: string): string {
  void _origin;
  const source = value?.trim();
  if (!source) return '';
  if (source.startsWith('data:') || source.startsWith('blob:')) return source;
  if (/^\/(?:demo|images|models|videos)\//.test(source) || source === '/truck-image.png') return source;
  if (/vehicle|truck|car|plate/i.test(source)) return '/truck-image.png';
  return '/demo/inspection-door.png';
}
