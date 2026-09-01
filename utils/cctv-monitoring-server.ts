/** CCTV 사내 API를 서버에서만 호출하기 위한 설정과 URL 검증 도우미. */

const DEFAULT_CCTV_MONITORING_UPSTREAM_URL =
  'http://192.168.2.147:9000/api/cameras';

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

/**
 * 실시간 영상(WHEP) 서버 주소.
 * 카메라 목록 API(9000)와 포트가 다르므로 목록 주소에서 파생시키지 않고 따로 설정한다.
 */
const DEFAULT_CCTV_WHEP_BASE_URL = 'http://192.168.2.147:8889';

export const getCctvWhepBaseUrl = (): URL => {
  const configuredUrl = process.env.CCTV_WHEP_BASE_URL?.trim() || DEFAULT_CCTV_WHEP_BASE_URL;
  const url = new URL(configuredUrl);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('CCTV WHEP protocol is not allowed');
  }

  return url;
};

/** '/camera-204/whep' 처럼 받은 경로를 WHEP 서버 주소로 바꾼다. */
export const resolveCctvWhepUrl = (streamPath: string): URL => {
  const baseUrl = getCctvWhepBaseUrl();
  const resolvedUrl = new URL(streamPath, baseUrl);

  if (resolvedUrl.origin !== baseUrl.origin || decodeURIComponent(resolvedUrl.pathname).includes('..')) {
    throw new Error('CCTV WHEP path is not allowed');
  }

  return resolvedUrl;
};

/**
 * WHEP 세션 자원(Location) 주소를 검증한다.
 * 세션 종료(DELETE)를 중계할 때 임의 주소로 요청이 나가지 않도록 막는다.
 */
export const resolveCctvWhepSessionUrl = (resource: string): URL => {
  const baseUrl = getCctvWhepBaseUrl();
  const resolvedUrl = new URL(resource, baseUrl);

  if (resolvedUrl.origin !== baseUrl.origin || decodeURIComponent(resolvedUrl.pathname).includes('..')) {
    throw new Error('CCTV WHEP session resource is not allowed');
  }

  return resolvedUrl;
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
