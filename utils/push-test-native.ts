export interface NativePushStatus {
  permission: NotificationPermission;
  configured: boolean;
}

interface NativePushResults {
  getStatus: NativePushStatus;
  getToken: { token: string | null };
  requestPermission: NativePushStatus;
  register: { token: string };
  unregister: { unregistered: true };
}

interface NativePushBridge {
  postMessage(message: string): void;
  onmessage: ((event: { data: string }) => void) | null;
}

declare global {
  interface Window {
    DxsNativePush?: NativePushBridge;
  }
}

export class NativePushError extends Error {
  constructor(public readonly code: string) {
    super(code === 'TIMEOUT'
      ? '앱의 응답 시간이 초과되었습니다. 다시 시도해주세요.'
      : code === 'UNAVAILABLE'
        ? '앱의 알림 연결을 확인하지 못했습니다. 앱을 다시 열어주세요.'
        : '앱의 알림 설정을 처리하지 못했습니다. 기기 설정과 연결 상태를 확인하고 다시 시도해주세요.');
    this.name = 'NativePushError';
  }
}

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (reason: NativePushError) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, PendingRequest>();
let connectedBridge: NativePushBridge | null = null;
let requestSequence = 0;

export function hasNativePushBridge(): boolean {
  return typeof window !== 'undefined' && typeof window.DxsNativePush?.postMessage === 'function';
}

export function subscribeNativePushBridge(onChange: () => void): () => void {
  window.addEventListener('dxs-native-ready', onChange);
  window.addEventListener('pageshow', onChange);
  return () => {
    window.removeEventListener('dxs-native-ready', onChange);
    window.removeEventListener('pageshow', onChange);
  };
}

function connectBridge(): NativePushBridge {
  const bridge = typeof window !== 'undefined' ? window.DxsNativePush : undefined;
  if (!bridge || typeof bridge.postMessage !== 'function') throw new NativePushError('UNAVAILABLE');
  if (connectedBridge === bridge) return bridge;
  for (const request of pending.values()) {
    clearTimeout(request.timeout);
    request.reject(new NativePushError('UNAVAILABLE'));
  }
  pending.clear();
  connectedBridge = bridge;
  bridge.onmessage = event => {
    try {
      const response = JSON.parse(event.data) as { id?: unknown; result?: unknown; error?: { code?: unknown } };
      if (typeof response.id !== 'string') return;
      const request = pending.get(response.id);
      if (!request) return;
      pending.delete(response.id);
      clearTimeout(request.timeout);
      if (response.error) request.reject(new NativePushError(typeof response.error.code === 'string' ? response.error.code : 'NATIVE_ERROR'));
      else request.resolve(response.result);
    } catch {
      // 다른 메시지나 잘못된 JSON은 요청의 제한 시간 안에서만 무시한다.
    }
  };
  return bridge;
}

function validResult(method: keyof NativePushResults, value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  if (method === 'getStatus' || method === 'requestPermission') {
    return ['granted', 'denied', 'default'].includes(String(result.permission)) && typeof result.configured === 'boolean';
  }
  if (method === 'unregister') return result.unregistered === true;
  return (method === 'getToken' && result.token === null)
    || (typeof result.token === 'string' && result.token.length > 0 && result.token.length <= 4096);
}

export async function requestNativePush<Method extends keyof NativePushResults>(method: Method): Promise<NativePushResults[Method]> {
  const bridge = connectBridge();
  const id = `push-${Date.now()}-${++requestSequence}`;
  const result = await new Promise<unknown>((resolve, reject) => {
    // OS 권한 대화상자 응답을 기다리되, 끊어진 앱 호출은 영구 대기하지 않는다.
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new NativePushError('TIMEOUT'));
    }, method === 'requestPermission' ? 120_000 : 20_000);
    pending.set(id, { resolve, reject, timeout });
    try {
      bridge.postMessage(JSON.stringify({ id, method }));
    } catch {
      clearTimeout(timeout);
      pending.delete(id);
      reject(new NativePushError('UNAVAILABLE'));
    }
  });
  if (!validResult(method, result)) throw new NativePushError('INVALID_RESPONSE');
  return result as NativePushResults[Method];
}

export function nativePushEndpoint(token: string): string {
  return `fcm:${token}`;
}
