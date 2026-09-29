import type { PushTestStatus } from '@/types/push-test';
export class PushTestApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) { super(message); }
}
let registered = false;
const snapshot = (): PushTestStatus => ({ registered, repeating: registered, publicKey: '', pending: null, lastJob: null, workerReady: true });
export const fetchPushTestStatus = async (endpoint: string | null) => { void endpoint; return snapshot(); };
export const subscribePushTest = async (subscription: PushSubscriptionJSON | { platform: 'android'; token: string }) => { void subscription; registered = true; return snapshot(); };
export const schedulePushTest = async (endpoint: string, repeating = false) => { void endpoint; return { pending: { id: 'demo-' + Date.now(), dueAt: Date.now() + 1000 }, repeating }; };
export const unsubscribePushTest = async (endpoint: string | null) => { void endpoint; registered = false; return snapshot(); };
export const loginPushTest = async (userId: string, password: string) => { void userId; void password; return { ok: true, demo: true }; };
