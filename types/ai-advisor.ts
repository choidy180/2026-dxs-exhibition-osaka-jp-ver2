export interface AdvisorTable {
	columns: string[];
	rows: string[][];
	truncated: boolean;
	summary: Record<string, string>;
}

export interface AdvisorChatRequest {
	query: string;
	session_id?: string;
	locale?: 'ko' | 'ja' | 'en';
	context?: AdvisorConversationContext;
}

export const ADVISOR_TOPICS = ['delivery', 'inventory', 'production', 'purchasing'] as const;
export type AdvisorTopic = typeof ADVISOR_TOPICS[number];
export const ADVISOR_INTENTS = [
	'delivery-destinations', 'delivery-destination', 'delivery-products', 'delivery-vehicles', 'delivery-progress',
	'material-list', 'material-stock', 'material-shortage', 'stock-after', 'safety-stock',
	'product-list', 'production-plan', 'production-duration', 'production-compare', 'additional-materials',
	'purchase-shortages', 'purchase-detail', 'purchase-week', 'purchase-supplier', 'supplier-list', 'material-price',
] as const;
export type AdvisorIntent = typeof ADVISOR_INTENTS[number];
export const ADVISOR_SLOTS = ['productCode', 'materialCode', 'quantity', 'workers', 'date'] as const;
export type AdvisorSlot = typeof ADVISOR_SLOTS[number];

export interface AdvisorConversationContext {
	topic?: AdvisorTopic;
	intent?: AdvisorIntent;
	productCode?: string;
	materialCode?: string;
	date?: string;
	quantity?: number;
	workers?: number;
	pending?: AdvisorSlot;
	choices?: AdvisorSuggestion[];
}

export type AdvisorReplyStatus = 'success' | 'empty' | 'partial' | 'unavailable' | 'unsupported' | 'clarification' | 'menu';

export interface AdvisorSuggestion {
	id: string;
	label: string;
	query: string;
}

export interface AdvisorChatResponse {
	answer: string;
	session_id: string | null;
	table: AdvisorTable | null;
	status: AdvisorReplyStatus;
	suggestions?: AdvisorSuggestion[];
	source?: { title: string; slide: number };
	context?: AdvisorConversationContext;
	data_kind?: 'reviewed' | 'demo' | 'calculated';
	suggestions_title?: string;
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
