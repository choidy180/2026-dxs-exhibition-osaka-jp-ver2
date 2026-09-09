export interface AdvisorTable {
	columns: string[];
	rows: string[][];
	truncated: boolean;
	summary: Record<string, string>;
}

export interface AdvisorChatRequest {
	query: string;
	session_id?: string;
}

export interface AdvisorChatResponse {
	answer: string;
	session_id: string | null;
	table: AdvisorTable | null;
	status: 'success' | 'empty';
}

export interface AdvisorApiError {
	error: string;
	code: string;
	session_id?: string | null;
}

export interface AdvisorMetadata {
	as_of_date: string | null;
	snapshot_date: string | null;
	forecast_end_date: string | null;
}
