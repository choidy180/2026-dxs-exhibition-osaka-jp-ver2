import 'server-only';

import { NextResponse } from 'next/server';
import type { AdvisorApiError, AdvisorChatResponse } from '@/types/ai-advisor';
import {
	isAdvisorRecord,
	isAdvisorSessionId,
	parseAdvisorTable,
} from '@/utils/ai-advisor-contract';

const ADVISOR_TIMEOUT_MS = 120_000;
const DEFAULT_ADVISOR_API_BASE_URL = 'http://192.168.0.157:8793';
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

function advisorUrl(path: '/api/chat' | '/api/data-meta'): URL {
	try {
		const baseUrl = new URL(process.env.ADVISOR_API_BASE_URL?.trim() || DEFAULT_ADVISOR_API_BASE_URL);
		if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) throw new Error();
		return new URL(path, baseUrl);
	} catch {
		throw new AdvisorRequestError(503, 'INVALID_CONFIGURATION', 'AI Advisor 연결 설정을 확인해 주세요.');
	}
}

/** Server-side, same-origin adapter: no credentials, raw errors, retries, or cached answers. */
export async function fetchAdvisorJson(
	request: Request,
	path: '/api/chat' | '/api/data-meta',
	body?: unknown,
): Promise<unknown> {
	const url = advisorUrl(path);
	const controller = new AbortController();
	let timedOut = false;
	const abortOnDisconnect = () => controller.abort();
	request.signal.addEventListener('abort', abortOnDisconnect, { once: true });
	const timeout = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, ADVISOR_TIMEOUT_MS);
	if (request.signal.aborted) controller.abort();

	try {
		const response = await fetch(url, {
			method: body === undefined ? 'GET' : 'POST',
			headers: {
				Accept: 'application/json',
				...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
			},
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
			cache: 'no-store',
			credentials: 'omit',
			redirect: 'error',
			signal: controller.signal,
		});
		if (!response.ok) {
			// Do not read or relay upstream detail arrays, SQL, or infrastructure error pages.
			await response.body?.cancel();
			if (response.status === 429) {
				throw new AdvisorRequestError(429, 'UPSTREAM_BUSY', 'AI Advisor 요청이 많습니다. 잠시 후 다시 시도해 주세요.');
			}
			if (response.status === 400 || response.status === 422) {
				throw new AdvisorRequestError(422, 'UPSTREAM_REJECTED', '질문을 처리하지 못했습니다. 날짜와 조회 조건을 구체적으로 입력해 주세요.');
			}
			throw new AdvisorRequestError(502, 'UPSTREAM_HTTP_ERROR', 'AI Advisor 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
		}
		if (!/^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i.test(response.headers.get('Content-Type') ?? '')) {
			await response.body?.cancel();
			throw new AdvisorRequestError(502, 'INVALID_RESPONSE', 'AI Advisor 응답 형식을 확인하지 못했습니다. 다시 시도해 주세요.');
		}
		try {
			return await response.json();
		} catch (error) {
			if (controller.signal.aborted) throw error;
			throw new AdvisorRequestError(502, 'INVALID_RESPONSE', 'AI Advisor 응답을 읽지 못했습니다. 다시 시도해 주세요.');
		}
	} catch (error) {
		if (request.signal.aborted) {
			throw new AdvisorRequestError(499, 'REQUEST_CANCELLED', '요청이 취소되었습니다.');
		}
		if (timedOut) {
			throw new AdvisorRequestError(504, 'UPSTREAM_TIMEOUT', '답변 대기 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
		}
		if (error instanceof AdvisorRequestError) throw error;
		throw new AdvisorRequestError(502, 'UPSTREAM_UNAVAILABLE', 'AI Advisor에 연결하지 못했습니다. 사내망 연결을 확인한 뒤 다시 시도해 주세요.');
	} finally {
		clearTimeout(timeout);
		request.signal.removeEventListener('abort', abortOnDisconnect);
	}
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
