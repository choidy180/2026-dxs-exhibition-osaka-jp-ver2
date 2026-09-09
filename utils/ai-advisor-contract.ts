import type {
	AdvisorApiError,
	AdvisorChatRequest,
	AdvisorChatResponse,
	AdvisorMetadata,
	AdvisorTable,
} from '@/types/ai-advisor';

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
	return {
		query,
		...(typeof value.session_id === 'string' ? { session_id: value.session_id } : {}),
	};
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
		(value.status !== 'success' && value.status !== 'empty')
	) return null;
	const table = value.table === null ? null : parseAdvisorTable(value.table);
	if (value.table !== null && table === null) return null;
	return { answer: value.answer, session_id: value.session_id, table, status: value.status };
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
