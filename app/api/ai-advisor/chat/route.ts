import {
	AdvisorRequestError,
	advisorErrorResponse,
	advisorJson,
	fetchAdvisorJson,
	normalizeAdvisorChatResponse,
} from '@/lib/ai-advisor-server';
import { parseAdvisorChatRequest } from '@/utils/ai-advisor-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 125;

export async function POST(request: Request) {
	try {
		if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') ?? '')) {
			throw new AdvisorRequestError(415, 'INVALID_CONTENT_TYPE', '질문 요청 형식이 올바르지 않습니다. 다시 시도해 주세요.');
		}
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			throw new AdvisorRequestError(400, 'INVALID_JSON', '질문 요청을 읽지 못했습니다. 다시 시도해 주세요.');
		}
		const input = parseAdvisorChatRequest(body);
		if (!input) {
			throw new AdvisorRequestError(422, 'INVALID_INPUT', '질문은 앞뒤 공백을 제외하고 1~2,000자로 입력해 주세요. 대화 정보가 올바르지 않으면 새 대화를 시작해 주세요.');
		}
		const response = await fetchAdvisorJson(request, '/api/chat', input);
		return advisorJson(normalizeAdvisorChatResponse(response));
	} catch (error) {
		return advisorErrorResponse(error);
	}
}
