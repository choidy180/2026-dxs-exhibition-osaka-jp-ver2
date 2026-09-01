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

/* ───────────────────────── 카메라 IP 보강 ───────────────────────── */

/**
 * 카메라 목록 API 는 IP 를 주지 않는다.
 * 실시간 영상 서버(MediaMTX)의 설정 API 에는 카메라 원본 주소(rtsp://192.168.x.x/...)가 있어
 * 여기서 호스트만 뽑아 카메라 IP 로 채운다. 기본 포트는 MediaMTX 의 API 포트인 9997 이다.
 */
const DEFAULT_MEDIAMTX_API_PORT = '9997';

export const getCctvMediaMtxApiBaseUrl = (): URL | null => {
  const configured = process.env.CCTV_MEDIAMTX_API_URL?.trim();

  try {
    if (configured) return new URL(configured);

    // 설정이 없으면 WHEP 서버와 같은 호스트의 API 포트를 사용한다
    const whepUrl = getCctvWhepBaseUrl();
    return new URL(`${whepUrl.protocol}//${whepUrl.hostname}:${DEFAULT_MEDIAMTX_API_PORT}`);
  } catch {
    return null;
  }
};

/** rtsp://user:pass@192.168.2.51:554/stream → 192.168.2.51 */
const extractHost = (source: unknown): string | null => {
  if (typeof source !== 'string' || !source.trim()) return null;

  try {
    const hostname = new URL(source.trim()).hostname;
    return hostname || null;
  } catch {
    // 주소 형태가 아니면 IP 만 들어 있는지 확인한다
    const match = source.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/);
    return match ? match[0] : null;
  }
};

/**
 * 스트림 경로 이름별 카메라 IP 를 조회한다.
 * 실패하면 빈 맵을 돌려주고, 목록 조회 자체는 계속 진행한다.
 */
export const fetchCctvCameraIpMap = async (): Promise<Map<string, string>> => {
  const result = new Map<string, string>();
  const baseUrl = getCctvMediaMtxApiBaseUrl();
  if (!baseUrl) return result;

  try {
    const response = await fetch(new URL('/v3/config/paths/list', baseUrl), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      // 목록 응답이 느려지지 않게 짧게 끊는다
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      console.warn(`[cctv] 카메라 IP 조회 실패 — MediaMTX API ${response.status}`);
      return result;
    }

    const payload = (await response.json()) as { items?: Array<Record<string, unknown>> };
    (payload.items ?? []).forEach(item => {
      const name = typeof item.name === 'string' ? item.name : null;
      const host = extractHost(item.source);
      if (name && host) result.set(name, host);
    });
  } catch (error) {
    console.warn('[cctv] 카메라 IP 조회 실패 — MediaMTX API 에 접근할 수 없습니다.', error);
  }

  return result;
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
