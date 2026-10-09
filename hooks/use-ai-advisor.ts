'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdvisorChatResponse, AdvisorConversationContext, AdvisorMetadata } from '@/types/ai-advisor';
import { ADVISOR_COPY } from '@/constants/ai-advisor';
import { getLocale } from '@/lib/i18n/translate';
import {
  parseAdvisorChatResponse,
  parseAdvisorMetadata,
  ADVISOR_QUERY_MAX_LENGTH,
} from '@/utils/ai-advisor-contract';

import { createDemoAdvisorReply, createDemoAdvisorMetadata } from '@/data/demo-advisor';

const CHAT_TIMEOUT_MS = 125_000;
const METADATA_TIMEOUT_MS = 20_000;
const RESPONSE_TIMING_SAMPLE_LIMIT = 5;

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  table?: AdvisorChatResponse['table'];
  status?: AdvisorChatResponse['status'];
  suggestions?: AdvisorChatResponse['suggestions'];
  source?: AdvisorChatResponse['source'];
  context?: AdvisorConversationContext;
  dataKind?: AdvisorChatResponse['data_kind'];
  suggestionsTitle?: string;
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

/** 같은 화면에서 패널을 닫았다 열어도 대화를 유지한다. */
export function useAiAdvisor(enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<AdvisorConversationContext>({});
  const [isLoading, setIsLoading] = useState(false);
  const [requestStartedAt, setRequestStartedAt] = useState<number | null>(null);
  const [lastResponseDurationMs, setLastResponseDurationMs] = useState<number | null>(null);
  const [responseDurationSamplesMs, setResponseDurationSamplesMs] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AdvisorMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const mountedRef = useRef(false);
  const messageSequenceRef = useRef(0);
  const pendingQueryRef = useRef<string | null>(null);
  const contextRef = useRef<AdvisorConversationContext>({});
  const pendingContextRef = useRef<AdvisorConversationContext>({});
  const chatRequestRef = useRef<ActiveRequest | null>(null);
  const metadataRequestRef = useRef<ActiveRequest | null>(null);
  const metadataAttemptedRef = useRef(false);

  const loadChat = useCallback(async (query: string, isRetry = false, requestContext: AdvisorConversationContext = {}) => {
    if (!mountedRef.current || chatRequestRef.current) return;

    const startedAt = performance.now();
    const locale = getLocale();
    const controller = new AbortController();
    const request: ActiveRequest = {
      controller,
      timeout: setTimeout(() => {
        controller.abort();
      }, CHAT_TIMEOUT_MS),
    };

    // React가 다시 렌더링하기 전의 연속 클릭도 즉시 차단한다.
    chatRequestRef.current = request;
    pendingQueryRef.current = query;
    pendingContextRef.current = requestContext;
    setError(null);
    setIsLoading(true);
    setRequestStartedAt(startedAt);

    if (!isRetry) {
      const id = `advisor-${++messageSequenceRef.current}`;
      setMessages(previous => [...previous, { id, role: 'user', text: query }]);
    }

    try {
      await new Promise<void>(resolve => setTimeout(resolve, 650));
      if (!mountedRef.current || chatRequestRef.current !== request) return;
      const body = createDemoAdvisorReply(query, locale, requestContext);

      const result = parseAdvisorChatResponse(body);
      if (!result) throw new Error('답변 형식을 확인할 수 없습니다. 다시 시도해 주세요.');

      // 전체 응답 수신과 검증이 끝난 성공 요청만 최근 대기 시간 추정에 반영한다.
      const durationMs = performance.now() - startedAt;
      setLastResponseDurationMs(durationMs);
      setResponseDurationSamplesMs(previous => (
        [...previous, durationMs].slice(-RESPONSE_TIMING_SAMPLE_LIMIT)
      ));
      pendingQueryRef.current = null;
      contextRef.current = result.context ?? {};
      setContext(contextRef.current);
      const id = `advisor-${++messageSequenceRef.current}`;
      setMessages(previous => [
        ...previous,
        {
          id,
          role: 'assistant',
          text: result.answer,
          table: result.table,
          status: result.status,
          suggestions: result.suggestions,
          source: result.source,
          context: result.context,
          dataKind: result.data_kind,
          suggestionsTitle: result.suggestions_title,
        },
      ]);
    } catch {
      if (!mountedRef.current || chatRequestRef.current !== request) return;

      setError(ADVISOR_COPY[locale].failure);
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

  const send = useCallback(async (input: string, fromContext?: AdvisorConversationContext): Promise<boolean> => {
    const query = input.trim();
    if (!enabled || !mountedRef.current || !query || Array.from(query).length > ADVISOR_QUERY_MAX_LENGTH || chatRequestRef.current) return false;

    // 입력은 접수 즉시 비우며, 응답 실패 시에는 명시적인 재시도로만 재전송한다.
    void loadChat(query, false, fromContext ?? contextRef.current);
    return true;
  }, [enabled, loadChat]);

  const retry = useCallback(() => {
    if (!enabled || !pendingQueryRef.current || chatRequestRef.current) return;
    void loadChat(pendingQueryRef.current, true, pendingContextRef.current);
  }, [enabled, loadChat]);

  const cancel = useCallback(() => {
    const request = chatRequestRef.current;
    if (!request) return;
    chatRequestRef.current = null;
    stopRequest(request);
    if (mountedRef.current) {
      setIsLoading(false);
      setRequestStartedAt(null);
      setError(ADVISOR_COPY[getLocale()].cancelled);
    }
  }, []);

  const reset = useCallback(() => {
    const request = chatRequestRef.current;
    chatRequestRef.current = null;
    stopRequest(request);
    pendingQueryRef.current = null;
    contextRef.current = {};
    pendingContextRef.current = {};
    if (mountedRef.current) {
      setMessages([]);
      setContext({});
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
      const body = createDemoAdvisorMetadata();
      if (!mountedRef.current || metadataRequestRef.current !== request) return;

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
    context,
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
