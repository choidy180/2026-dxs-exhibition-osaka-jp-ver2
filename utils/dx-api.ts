/** 실제 접속 주소를 기준으로 모든 DX API와 해당 서버의 리소스 주소를 선택한다. */
export const DX_DEPLOYMENT_ORIGIN = 'http://192.168.2.147:3000';
export const DX_INTERNAL_BASE_URL = 'http://192.168.2.147:24828';
export const DX_EXTERNAL_BASE_URL = 'https://gapi.dxsplatform.com';

// 구형 검사 응답에 남아 있는 동일 DX 이미지 서버의 주소도 호환한다.
const DX_RESOURCE_HOSTS = new Set(['192.168.2.147:24828', 'gapi.dxsplatform.com', '1.254.24.170:24828']);

export function getDxApiBaseUrl(origin?: string): string {
  const pageOrigin = origin ?? (typeof window === 'undefined' ? '' : window.location.origin);
  return pageOrigin === DX_DEPLOYMENT_ORIGIN ? DX_INTERNAL_BASE_URL : DX_EXTERNAL_BASE_URL;
}

/** API 호출 시점에 평가한다. 서버에서 호출할 때는 요청의 origin을 명시한다. */
export function getDxApiUrl(path: string, origin?: string): string {
  return `${getDxApiBaseUrl(origin)}/${path.replace(/^\/+/, '')}`;
}

/** 대상 DX 서버의 절대/상대 경로만 변환하고 다른 서버·WebSocket 주소는 유지한다. */
export function resolveDxResourceUrl(value: string | null | undefined, origin?: string): string {
  const source = value?.trim();
  if (!source) return '';
  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(source) || /^[a-z][a-z\d+.-]*:/i.test(source)) {
    try {
      const url = new URL(source, getDxApiBaseUrl(origin));
      if ((url.protocol === 'http:' || url.protocol === 'https:') && DX_RESOURCE_HOSTS.has(url.host)) {
        return `${getDxApiBaseUrl(origin)}${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      return source;
    }
    return source;
  }
  return getDxApiUrl(source, origin);
}
