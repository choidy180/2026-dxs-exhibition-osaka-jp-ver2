import 'server-only';

import { NextResponse } from 'next/server';
import type { AdvisorApiError, AdvisorChatResponse } from '@/types/ai-advisor';
import {
	isAdvisorRecord,
	isAdvisorSessionId,
	parseAdvisorTable,
	parseAdvisorChatResponse,
	parseAdvisorConversationContext,
} from '@/utils/ai-advisor-contract';

import { createDemoAdvisorReply, createDemoAdvisorMetadata } from '@/data/demo-advisor';
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export class AdvisorRequestError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
		readonly sessionId?: string | null,
	) {
		super(message);
		this.name = 'AdvisorRequestError';
	}
}

export function advisorJson<T>(value: T, status = 200) {
	return NextResponse.json(value, { status, headers: NO_STORE_HEADERS });
}

export function advisorErrorResponse(error: unknown) {
	const failure = error instanceof AdvisorRequestError
		? error
		: new AdvisorRequestError(502, 'UPSTREAM_UNAVAILABLE', 'AI Advisor에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
	const body: AdvisorApiError = {
		error: failure.message,
		code: failure.code,
		...(failure.sessionId !== undefined ? { session_id: failure.sessionId } : {}),
	};
	return advisorJson(body, failure.status);
}

/** Exhibition endpoints never contact an external service. */
export async function fetchAdvisorJson(_request: Request, path: '/api/chat' | '/api/data-meta', body?: unknown): Promise<unknown> {
  if (path === '/api/data-meta') return createDemoAdvisorMetadata();
  const query = typeof body === 'object' && body !== null && 'query' in body ? String(body.query) : '';
  const locale = isAdvisorRecord(body) && (body.locale === 'ko' || body.locale === 'ja' || body.locale === 'en') ? body.locale : undefined;
  const context = isAdvisorRecord(body) && body.context !== undefined ? parseAdvisorConversationContext(body.context) ?? undefined : undefined;
  return createDemoAdvisorReply(query, locale, context);
}

function hasKnownBusinessFailure(answer: string): boolean {
	return answer.trim().startsWith('질문에 대한 안전한 데이터 조회를 만들지 못했습니다:') ||
		/^(?:읽기\s*전용\s*)?SQL\s*(?:생성|검증|실행)(?:에)?\s*(?:실패|오류)/i.test(answer.trim());
}

function hasKnownEmptyAnswer(answer: string): boolean {
	return /^(?:(?:조회|검색)(?:된)?\s*결과(?:가)?\s*없(?:습니다|어요)|(?:(?:질문|데이터에서)\s*)?조건에\s*맞는\s*(?:조회\s*)?(?:결과|데이터)(?:가)?\s*없(?:습니다|어요))/.test(answer.trim());
}

export function normalizeAdvisorChatResponse(value: unknown): AdvisorChatResponse {
	const invalidResponse = () => new AdvisorRequestError(502, 'INVALID_RESPONSE', 'AI Advisor 응답 형식을 확인하지 못했습니다. 다시 시도해 주세요.');
	if (!isAdvisorRecord(value) || typeof value.answer !== 'string' || !value.answer.trim()) throw invalidResponse();
	const sessionId = value.session_id ?? null;
	if (sessionId !== null && !isAdvisorSessionId(sessionId)) throw invalidResponse();
	if (hasKnownBusinessFailure(value.answer)) {
		throw new AdvisorRequestError(
			422,
			'QUERY_FAILED',
			'질문에 대한 조회를 완료하지 못했습니다. 날짜와 계획 소요량 등 조회 조건을 구체적으로 입력해 주세요.',
			sessionId,
		);
	}
	const reviewedResponse = parseAdvisorChatResponse(value);
	if (reviewedResponse) return reviewedResponse;
	let table = null;
	if (value.table !== null && value.table !== undefined) {
		if (!isAdvisorRecord(value.table)) throw invalidResponse();
		table = parseAdvisorTable({
			...value.table,
			truncated: value.table.truncated === undefined ? false : value.table.truncated,
			summary: value.table.summary === undefined ? {} : value.table.summary,
		});
		if (table === null) throw invalidResponse();
	}
	return {
		answer: value.answer,
		session_id: sessionId,
		table,
		status: (table !== null && table.rows.length === 0) || (table === null && hasKnownEmptyAnswer(value.answer))
			? 'empty'
			: 'success',
	};
}
