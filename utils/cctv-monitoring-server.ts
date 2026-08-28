/** CCTV 사내 API를 서버에서만 호출하기 위한 설정과 URL 검증 도우미. */

const DEFAULT_CCTV_MONITORING_UPSTREAM_URL =
  'http://192.168.200.50:9100/api/cameras';

export const CCTV_MONITORING_UPSTREAM_TIMEOUT_MS = 8_000;

/** 배포 환경에서 사내 API 주소를 바꿀 수 있도록 서버 전용 환경변수를 우선한다. */
export const getCctvMonitoringUpstreamUrl = (): URL => {
  const configuredUrl =
    process.env.CCTV_MONITORING_UPSTREAM_URL?.trim()
    || DEFAULT_CCTV_MONITORING_UPSTREAM_URL;
  const url = new URL(configuredUrl);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('CCTV upstream protocol is not allowed');
  }

  return url;
};

/** API가 돌려준 썸네일 경로만 허용해 프록시가 임의 URL 호출에 악용되지 않게 한다. */
export const resolveCctvThumbnailUpstreamUrl = (source: string): URL => {
  const upstreamUrl = getCctvMonitoringUpstreamUrl();
  const resolvedUrl = new URL(source, upstreamUrl);
  const decodedPath = decodeURIComponent(resolvedUrl.pathname);

  if (
    resolvedUrl.origin !== upstreamUrl.origin
    || !decodedPath.startsWith('/static/thumbnails/')
    || decodedPath.includes('..')
  ) {
    throw new Error('CCTV thumbnail source is not allowed');
  }

  resolvedUrl.hash = '';
  return resolvedUrl;
};
