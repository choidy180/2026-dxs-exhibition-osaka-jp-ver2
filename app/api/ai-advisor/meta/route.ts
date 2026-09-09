import {
	AdvisorRequestError,
	advisorErrorResponse,
	advisorJson,
	fetchAdvisorJson,
} from '@/lib/ai-advisor-server';
import { parseAdvisorMetadata } from '@/utils/ai-advisor-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 125;

export async function GET(request: Request) {
	try {
		const metadata = parseAdvisorMetadata(await fetchAdvisorJson(request, '/api/data-meta'));
		if (!metadata) {
			throw new AdvisorRequestError(502, 'INVALID_RESPONSE', '데이터 기준일을 확인하지 못했습니다. 다시 시도해 주세요.');
		}
		return advisorJson(metadata);
	} catch (error) {
		return advisorErrorResponse(error);
	}
}
