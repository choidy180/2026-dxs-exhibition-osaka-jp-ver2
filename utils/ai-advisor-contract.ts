import type {
	AdvisorApiError,
	AdvisorChatRequest,
	AdvisorChatResponse,
	AdvisorMetadata,
	AdvisorTable,
	AdvisorConversationContext,
} from '@/types/ai-advisor';
import { ADVISOR_INTENTS, ADVISOR_SLOTS, ADVISOR_TOPICS } from '@/types/ai-advisor';

export const ADVISOR_QUERY_MAX_LENGTH = 2_000;
export const ADVISOR_SESSION_MAX_LENGTH = 128;

export function isAdvisorRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isAdvisorSessionId(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.trim().length > 0 &&
		Array.from(value).length <= ADVISOR_SESSION_MAX_LENGTH
	);
}

export function parseAdvisorChatRequest(value: unknown): AdvisorChatRequest | null {
	if (!isAdvisorRecord(value) || typeof value.query !== 'string') return null;
	const query = value.query.trim();
	if (!query || Array.from(query).length > ADVISOR_QUERY_MAX_LENGTH) return null;
	if (value.session_id !== undefined && !isAdvisorSessionId(value.session_id)) return null;
	if (value.locale !== undefined && value.locale !== 'ko' && value.locale !== 'ja' && value.locale !== 'en') return null;
	const context = value.context === undefined ? undefined : parseAdvisorConversationContext(value.context);
	if (context === null) return null;
	return {
		query,
		...(typeof value.session_id === 'string' ? { session_id: value.session_id } : {}),
		...(value.locale === 'ko' || value.locale === 'ja' || value.locale === 'en' ? { locale: value.locale } : {}),
		...(context ? { context } : {}),
	};
}

function isAdvisorSuggestions(value: unknown): value is NonNullable<AdvisorChatResponse['suggestions']> {
	return Array.isArray(value) && value.length <= 12 && value.every(item =>
		isAdvisorRecord(item) && typeof item.id === 'string' && !!item.id.trim() && item.id.length <= 128 &&
		typeof item.label === 'string' && !!item.label.trim() && item.label.length <= 256 &&
		typeof item.query === 'string' && !!item.query.trim() && Array.from(item.query).length <= ADVISOR_QUERY_MAX_LENGTH);
}

export function parseAdvisorConversationContext(value: unknown): AdvisorConversationContext | null {
	if (!isAdvisorRecord(value)) return null;
	if (value.topic !== undefined && !ADVISOR_TOPICS.includes(value.topic as never)) return null;
	if (value.intent !== undefined && !ADVISOR_INTENTS.includes(value.intent as never)) return null;
	if (value.pending !== undefined && !ADVISOR_SLOTS.includes(value.pending as never)) return null;
	if (value.pending !== undefined && value.intent === undefined) return null;
	for (const field of ['productCode', 'materialCode'] as const) {
		if (value[field] !== undefined && (typeof value[field] !== 'string' || !/^[A-Z]{2,8}\d{4,16}$/.test(value[field]))) return null;
	}
	if (value.date !== undefined && (typeof value.date !== 'string' || !isNullableDate(value.date))) return null;
	if (value.quantity !== undefined && (!Number.isInteger(value.quantity) || Number(value.quantity) < 1 || Number(value.quantity) > 100000)) return null;
	if (value.workers !== undefined && (!Number.isInteger(value.workers) || Number(value.workers) < 1 || Number(value.workers) > 100)) return null;
	if (value.choices !== undefined && !isAdvisorSuggestions(value.choices)) return null;
	return Object.fromEntries(['topic', 'intent', 'productCode', 'materialCode', 'date', 'quantity', 'workers', 'pending', 'choices']
		.filter(key => value[key] !== undefined).map(key => [key, key === 'choices' ? (value.choices as AdvisorConversationContext['choices'])?.map(item => ({ id: item.id, label: item.label, query: item.query })) : value[key]])) as AdvisorConversationContext;
}

export function parseAdvisorTable(value: unknown): AdvisorTable | null {
	if (!isAdvisorRecord(value)) return null;
	const { columns, rows, truncated, summary } = value;
	if (
		!Array.isArray(columns) ||
		!columns.every((column): column is string => typeof column === 'string') ||
		!Array.isArray(rows) ||
		!rows.every(
			(row): row is string[] =>
				Array.isArray(row) &&
				row.length === columns.length &&
				row.every((cell) => typeof cell === 'string'),
		) ||
		typeof truncated !== 'boolean' ||
		!isAdvisorRecord(summary) ||
		!Object.values(summary).every((item) => typeof item === 'string')
	) return null;
	// Pick supported fields so upstream SQL, source files, and other fields never pass through.
	return {
		columns: [...columns],
		rows: rows.map((row) => [...row]),
		truncated,
		summary: Object.fromEntries(Object.entries(summary)) as Record<string, string>,
	};
}

export function parseAdvisorChatResponse(value: unknown): AdvisorChatResponse | null {
	if (
		!isAdvisorRecord(value) ||
		typeof value.answer !== 'string' ||
		!value.answer.trim() ||
		(value.session_id !== null && !isAdvisorSessionId(value.session_id)) ||
		!['success', 'empty', 'partial', 'unavailable', 'unsupported', 'clarification', 'menu'].includes(String(value.status))
	) return null;
	if (value.suggestions !== undefined && !isAdvisorSuggestions(value.suggestions)) return null;
	const context = value.context === undefined ? undefined : parseAdvisorConversationContext(value.context);
	if (context === null) return null;
	if (value.data_kind !== undefined && !['reviewed', 'demo', 'calculated'].includes(String(value.data_kind))) return null;
	if (value.suggestions_title !== undefined && (typeof value.suggestions_title !== 'string' || !value.suggestions_title.trim() || value.suggestions_title.length > 256)) return null;
	if (value.source !== undefined && (!isAdvisorRecord(value.source) || typeof value.source.title !== 'string' ||
		!value.source.title.trim() || !Number.isInteger(value.source.slide) || Number(value.source.slide) < 1 || Number(value.source.slide) > 6)) return null;
	const table = value.table === null ? null : parseAdvisorTable(value.table);
	if (value.table !== null && table === null) return null;
	return {
		answer: value.answer, session_id: value.session_id, table, status: value.status as AdvisorChatResponse['status'],
		...(Array.isArray(value.suggestions) ? { suggestions: value.suggestions.map(item => ({ id: item.id, label: item.label, query: item.query })) } : {}),
		...(isAdvisorRecord(value.source) ? { source: { title: value.source.title as string, slide: value.source.slide as number } } : {}),
		...(context ? { context } : {}),
		...(value.data_kind ? { data_kind: value.data_kind as AdvisorChatResponse['data_kind'] } : {}),
		...(typeof value.suggestions_title === 'string' ? { suggestions_title: value.suggestions_title } : {}),
	};
}

export function parseAdvisorApiError(value: unknown): AdvisorApiError | null {
	if (
		!isAdvisorRecord(value) ||
		typeof value.error !== 'string' ||
		!value.error.trim() ||
		typeof value.code !== 'string' ||
		!value.code.trim() ||
		(value.session_id !== undefined && value.session_id !== null && !isAdvisorSessionId(value.session_id))
	) return null;
	return {
		error: value.error,
		code: value.code,
		...(value.session_id === null || typeof value.session_id === 'string'
			? { session_id: value.session_id }
			: {}),
	};
}

function isNullableDate(value: unknown): value is string | null {
	if (value === null) return true;
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00.000Z`);
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseAdvisorMetadata(value: unknown): AdvisorMetadata | null {
	if (
		!isAdvisorRecord(value) ||
		!isNullableDate(value.as_of_date) ||
		!isNullableDate(value.snapshot_date) ||
		!isNullableDate(value.forecast_end_date)
	) return null;
	return {
		as_of_date: value.as_of_date,
		snapshot_date: value.snapshot_date,
		forecast_end_date: value.forecast_end_date,
	};
}
