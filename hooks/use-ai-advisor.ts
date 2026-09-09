'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdvisorMetadata, AdvisorTable } from '@/types/ai-advisor';
import {
  parseAdvisorApiError,
  parseAdvisorChatResponse,
  parseAdvisorMetadata,
} from '@/utils/ai-advisor-contract';

const CHAT_TIMEOUT_MS = 125_000;
const METADATA_TIMEOUT_MS = 20_000;
const RESPONSE_TIMING_SAMPLE_LIMIT = 5;

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  table?: AdvisorTable | null;
  status?: 'success' | 'empty';
};

type ActiveRequest = {
  controller: AbortController;
  timeout: ReturnType<typeof setTimeout>;
};

const stopRequest = (request: ActiveRequest | null) => {
  if (!request) return;
  clearTimeout(request.timeout);
  request.controller.abort();
};

const newSessionId = (): string | null => {
  try {
    return globalThis.crypto?.randomUUID?.() ?? null;
  } catch {
    // 내부망의 비보안 HTTP 환경에서는 서버가 세션 ID를 생성한다.
    return null;
  }
};

/** 같은 탭에서 패널을 닫았다 열어도 대화와 서버 세션을 유지한다. */
export function useAiAdvisor(enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [requestStartedAt, setRequestStartedAt] = useState<number | null>(null);
  const [lastResponseDurationMs, setLastResponseDurationMs] = useState<number | null>(null);
  const [responseDurationSamplesMs, setResponseDurationSamplesMs] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AdvisorMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const mountedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const messageSequenceRef = useRef(0);
  const pendingQueryRef = useRef<string | null>(null);
  const chatRequestRef = useRef<ActiveRequest | null>(null);
  const metadataRequestRef = useRef<ActiveRequest | null>(null);
  const metadataAttemptedRef = useRef(false);

  const loadChat = useCallback(async (query: string, isRetry = false) => {
    if (!mountedRef.current || chatRequestRef.current) return;

    const startedAt = performance.now();
    const controller = new AbortController();
    let timedOut = false;
    const request: ActiveRequest = {
      controller,
      timeout: setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, CHAT_TIMEOUT_MS),
    };

    // React가 다시 렌더링하기 전의 연속 클릭도 즉시 차단한다.
    chatRequestRef.current = request;
    pendingQueryRef.current = query;
    setError(null);
    setIsLoading(true);
    setRequestStartedAt(startedAt);

    if (!isRetry) {
      const id = `advisor-${++messageSequenceRef.current}`;
      setMessages(previous => [...previous, { id, role: 'user', text: query }]);
    }

    try {
      const response = await fetch('/api/ai-advisor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
        body: JSON.stringify({
          query,
          ...(sessionIdRef.current ? { session_id: sessionIdRef.current } : {}),
        }),
      });
      const body: unknown = await response.json();

      if (!mountedRef.current || chatRequestRef.current !== request) return;

      if (!response.ok) {
        const apiError = parseAdvisorApiError(body);
        if (apiError?.session_id) sessionIdRef.current = apiError.session_id;
        throw new Error(apiError?.error || '답변을 받지 못했습니다. 다시 시도해 주세요.');
      }

      const result = parseAdvisorChatResponse(body);
      if (!result) throw new Error('답변 형식을 확인할 수 없습니다. 다시 시도해 주세요.');

      // 전체 응답 수신과 검증이 끝난 성공 요청만 최근 대기 시간 추정에 반영한다.
      const durationMs = performance.now() - startedAt;
      setLastResponseDurationMs(durationMs);
      setResponseDurationSamplesMs(previous => (
        [...previous, durationMs].slice(-RESPONSE_TIMING_SAMPLE_LIMIT)
      ));
      if (result.session_id) sessionIdRef.current = result.session_id;
      pendingQueryRef.current = null;
      const id = `advisor-${++messageSequenceRef.current}`;
      setMessages(previous => [
        ...previous,
        {
          id,
          role: 'assistant',
          text: result.answer,
          table: result.table,
          status: result.status,
        },
      ]);
    } catch (caught) {
      if (!mountedRef.current || chatRequestRef.current !== request) return;

      setError(
        timedOut
          ? '응답 대기 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
          : caught instanceof Error && /[가-힣]/.test(caught.message)
            ? caught.message
            : '서버에 연결하지 못했습니다. 연결 상태를 확인한 후 다시 시도해 주세요.',
      );
    } finally {
      clearTimeout(request.timeout);
      // 이전 요청의 finally가 새 요청의 잠금이나 로딩 상태를 해제하지 않는다.
      if (chatRequestRef.current === request) {
        chatRequestRef.current = null;
        if (mountedRef.current) {
          setIsLoading(false);
          setRequestStartedAt(null);
        }
      }
    }
  }, []);

  const send = useCallback(async (input: string): Promise<boolean> => {
    const query = input.trim();
    if (!enabled || !mountedRef.current || !query || chatRequestRef.current) return false;

    // 입력은 접수 즉시 비우며, 응답 실패 시에는 명시적인 재시도로만 재전송한다.
    void loadChat(query);
    return true;
  }, [enabled, loadChat]);

  const retry = useCallback(() => {
    if (!enabled || !pendingQueryRef.current || chatRequestRef.current) return;
    void loadChat(pendingQueryRef.current, true);
  }, [enabled, loadChat]);

  const cancel = useCallback(() => {
    const request = chatRequestRef.current;
    if (!request) return;
    chatRequestRef.current = null;
    stopRequest(request);
    if (mountedRef.current) {
      setIsLoading(false);
      setRequestStartedAt(null);
      setError('응답 대기를 취소했습니다. 다시 시도할 수 있습니다.');
    }
  }, []);

  const reset = useCallback(() => {
    const request = chatRequestRef.current;
    chatRequestRef.current = null;
    stopRequest(request);
    sessionIdRef.current = newSessionId();
    pendingQueryRef.current = null;
    if (mountedRef.current) {
      setMessages([]);
      setError(null);
      setIsLoading(false);
      setRequestStartedAt(null);
    }
  }, []);

  const loadMetadata = useCallback(async (force = false) => {
    if (
      !mountedRef.current ||
      metadataRequestRef.current ||
      (!force && metadataAttemptedRef.current)
    ) return;

    const controller = new AbortController();
    const request: ActiveRequest = {
      controller,
      timeout: setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS),
    };
    metadataRequestRef.current = request;
    metadataAttemptedRef.current = true;
    setMetadataLoading(true);
    setMetadataError(null);

    try {
      const response = await fetch('/api/ai-advisor/meta', {
        cache: 'no-store',
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!mountedRef.current || metadataRequestRef.current !== request) return;

      if (!response.ok) {
        const apiError = parseAdvisorApiError(body);
        throw new Error(apiError?.error || '데이터 기준일을 불러오지 못했습니다.');
      }

      const result = parseAdvisorMetadata(body);
      if (!result) throw new Error('데이터 기준일 형식을 확인할 수 없습니다.');
      setMetadata(result);
    } catch (caught) {
      if (!mountedRef.current || metadataRequestRef.current !== request) return;
      setMetadataError(
        caught instanceof Error && /[가-힣]/.test(caught.message)
          ? caught.message
          : '데이터 기준일을 불러오지 못했습니다.',
      );
    } finally {
      clearTimeout(request.timeout);
      if (metadataRequestRef.current === request) {
        metadataRequestRef.current = null;
        if (mountedRef.current) setMetadataLoading(false);
      }
    }
  }, []);

  const retryMetadata = useCallback(() => {
    if (enabled) void loadMetadata(true);
  }, [enabled, loadMetadata]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const chatRequest = chatRequestRef.current;
      const metadataRequest = metadataRequestRef.current;
      chatRequestRef.current = null;
      metadataRequestRef.current = null;
      stopRequest(chatRequest);
      stopRequest(metadataRequest);
      if (metadataRequest) metadataAttemptedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    // Strict Mode의 effect 재실행과 닫힌 패널에서의 불필요한 조회를 피한다.
    queueMicrotask(() => {
      if (!disposed) void loadMetadata();
    });
    return () => { disposed = true; };
  }, [enabled, loadMetadata]);

  return {
    messages,
    isLoading,
    requestStartedAt,
    lastResponseDurationMs,
    responseDurationSamplesMs,
    error,
    send,
    retry,
    cancel,
    reset,
    metadata,
    metadataLoading,
    metadataError,
    retryMetadata,
  };
}
