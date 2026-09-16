import Database from 'better-sqlite3';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { PushTestError, validatePushTargetEndpoint, validatePushTarget, type ValidatedPushTarget } from './validation';

export const PUSH_TEST_DELAY_MS = 30_000;
export const WORKER_HEARTBEAT_MAX_AGE_MS = 10_000;
export const SENDING_UNKNOWN_AFTER_MS = 30_000;

export type PushJobStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'unknown';
export interface PushJob {
  id: string;
  status: PushJobStatus;
  dueAt: number;
  createdAt: number;
  finishedAt: number | null;
  errorCode: string | null;
}
export interface PushPayload {
  title: string;
  body: string;
  url: '/lab/push';
  tag: string;
}
export interface ClaimedPushJob extends PushJob {
  userId: string;
  subscriptionId: string;
  subscription: ValidatedPushTarget;
  payload: PushPayload;
}
export interface DevicePushStatus {
  registered: boolean;
  workerReady: boolean;
  pending: PushJob | null;
  lastJob: PushJob | null;
}
interface SubscriptionRow { id: string; user_id: string; subscription_json: string }
interface JobRow {
  id: string; user_id: string; subscription_id: string; status: PushJobStatus;
  due_at: number; created_at: number; finished_at: number | null; error_code: string | null;
  payload_json: string;
}

const endpointId = (endpoint: string) => createHash('sha256').update(validatePushTargetEndpoint(endpoint)).digest('hex');
const toJob = (row: JobRow): PushJob => ({
  id: row.id, status: row.status, dueAt: row.due_at, createdAt: row.created_at,
  finishedAt: row.finished_at, errorCode: row.error_code,
});

function createPayload(id: string): PushPayload {
  const camera = `TEST-CAM-${String(randomInt(1, 7)).padStart(2, '0')}`;
  const recovery = randomInt(2) === 1;
  return {
    title: `[테스트] ${camera} 영상 수신 ${recovery ? '복구' : '중단'}`,
    body: `푸시 수신 확인용 가상 이벤트입니다. 실제 ${recovery ? '복구' : '장애'}가 아닙니다.`,
    url: '/lab/push', tag: `push-test-${id}`,
  };
}

export class PushTestStore {
  private readonly database: Database.Database;
  constructor(dbPath: string, private readonly now: () => number = Date.now) {
    if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
    this.database = new Database(dbPath, { timeout: 5000 });
    if (dbPath !== ':memory:') chmodSync(dbPath, 0o600);
    this.database.pragma('journal_mode = WAL');
    this.database.pragma('synchronous = FULL');
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subscription_json TEXT NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS push_jobs (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subscription_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('queued','sending','sent','failed','cancelled','unknown')),
        payload_json TEXT NOT NULL, created_at INTEGER NOT NULL, due_at INTEGER NOT NULL,
        claimed_at INTEGER, worker_id TEXT, finished_at INTEGER, error_code TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS push_jobs_one_active ON push_jobs(subscription_id)
        WHERE status IN ('queued', 'sending');
      CREATE INDEX IF NOT EXISTS push_jobs_due ON push_jobs(status, due_at);
      CREATE INDEX IF NOT EXISTS push_jobs_device ON push_jobs(user_id, subscription_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS push_workers (id TEXT PRIMARY KEY, heartbeat_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS push_login_attempts (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL);
    `);
  }

  close(): void { this.database.close(); }

  registerSubscription(userId: string, input: unknown): { id: string; endpoint: string } {
    const subscription = validatePushTarget(input);
    const id = endpointId(subscription.endpoint);
    return this.database.transaction(() => {
      const existing = this.database.prepare('SELECT * FROM push_subscriptions WHERE id = ?').get(id) as SubscriptionRow | undefined;
      if (existing && existing.user_id !== userId) {
        throw new PushTestError('SUBSCRIPTION_OWNED', '이 구독은 다른 로그인 또는 기기에 등록되어 있습니다. 기존 구독을 해제해 주세요.', 409);
      }
      // 같은 브라우저에서 구독 주소가 바뀌면 이전 기기 예약까지 함께 정리한다.
      this.database.prepare(`UPDATE push_jobs SET status = 'cancelled', finished_at = ?
        WHERE user_id = ? AND subscription_id != ? AND status = 'queued'`).run(this.now(), userId, id);
      this.database.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND id != ?').run(userId, id);
      this.database.prepare(`INSERT INTO push_subscriptions (id, user_id, subscription_json, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET subscription_json = excluded.subscription_json, updated_at = excluded.updated_at`)
        .run(id, userId, JSON.stringify(subscription), this.now());
      return { id, endpoint: subscription.endpoint };
    }).immediate();
  }

  getSubscription(userId: string, endpoint: string): ValidatedPushTarget | null {
    const row = this.database.prepare('SELECT * FROM push_subscriptions WHERE id = ? AND user_id = ?')
      .get(endpointId(endpoint), userId) as SubscriptionRow | undefined;
    return row ? JSON.parse(row.subscription_json) as ValidatedPushTarget : null;
  }

  isWorkerReady(): boolean {
    return Boolean(this.database.prepare('SELECT 1 FROM push_workers WHERE heartbeat_at >= ? AND heartbeat_at <= ? LIMIT 1')
      .get(this.now() - WORKER_HEARTBEAT_MAX_AGE_MS, this.now() + WORKER_HEARTBEAT_MAX_AGE_MS));
  }

  getDeviceStatus(userId: string, endpoint: string | null): DevicePushStatus {
    const workerReady = this.isWorkerReady();
    const id = endpoint ? endpointId(endpoint) : null;
    const registered = endpoint ? Boolean(this.getSubscription(userId, endpoint)) : false;
    // 브라우저 구독 소실·서비스 만료 후에도 현재 기기의 예약과 실패 결과는 보여준다.
    const pending = this.database.prepare("SELECT * FROM push_jobs WHERE user_id = ? AND (? IS NULL OR subscription_id = ?) AND status IN ('queued','sending') LIMIT 1")
      .get(userId, id, id) as JobRow | undefined;
    const last = this.database.prepare('SELECT * FROM push_jobs WHERE user_id = ? AND (? IS NULL OR subscription_id = ?) ORDER BY created_at DESC, rowid DESC LIMIT 1')
      .get(userId, id, id) as JobRow | undefined;
    return { registered, workerReady, pending: pending ? toJob(pending) : null, lastJob: last ? toJob(last) : null };
  }

  scheduleTestPush(userId: string, endpoint: string): { job: PushJob; duplicate: boolean } {
    const subscriptionId = endpointId(endpoint);
    return this.database.transaction(() => {
      if (!this.getSubscription(userId, endpoint)) {
        throw new PushTestError('NOT_SUBSCRIBED', '현재 기기의 알림을 먼저 등록해 주세요.', 404);
      }
      const pending = this.database.prepare("SELECT * FROM push_jobs WHERE user_id = ? AND subscription_id = ? AND status IN ('queued','sending') LIMIT 1")
        .get(userId, subscriptionId) as JobRow | undefined;
      if (pending) return { job: toJob(pending), duplicate: true };
      if (!this.isWorkerReady()) {
        throw new PushTestError('WORKER_UNAVAILABLE', '푸시 발송 워커가 실행 중이 아닙니다. 서버 실행 상태를 확인해 주세요.', 503);
      }
      const id = randomUUID();
      const createdAt = this.now();
      const dueAt = createdAt + PUSH_TEST_DELAY_MS;
      this.database.prepare(`INSERT INTO push_jobs (id, user_id, subscription_id, status, payload_json, created_at, due_at)
        VALUES (?, ?, ?, 'queued', ?, ?, ?)`).run(id, userId, subscriptionId, JSON.stringify(createPayload(id)), createdAt, dueAt);
      return { job: { id, status: 'queued' as const, createdAt, dueAt, finishedAt: null, errorCode: null }, duplicate: false };
    }).immediate();
  }

  unsubscribe(userId: string, endpoint: string): { removed: boolean; cancelled: number } {
    const id = endpointId(endpoint);
    return this.database.transaction(() => {
      const cancelled = this.database.prepare("UPDATE push_jobs SET status = 'cancelled', finished_at = ? WHERE user_id = ? AND subscription_id = ? AND status = 'queued'")
        .run(this.now(), userId, id).changes;
      const removed = this.database.prepare('DELETE FROM push_subscriptions WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
      return { removed, cancelled };
    }).immediate();
  }

  unsubscribeDevice(userId: string): { removed: boolean; cancelled: number } {
    return this.database.transaction(() => {
      const cancelled = this.database.prepare("UPDATE push_jobs SET status = 'cancelled', finished_at = ? WHERE user_id = ? AND status = 'queued'")
        .run(this.now(), userId).changes;
      const removed = this.database.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(userId).changes > 0;
      return { removed, cancelled };
    }).immediate();
  }

  workerHeartbeat(workerId: string): void {
    this.database.prepare('INSERT INTO push_workers (id, heartbeat_at) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET heartbeat_at = excluded.heartbeat_at')
      .run(workerId, this.now());
    this.database.prepare('DELETE FROM push_workers WHERE heartbeat_at < ?').run(this.now() - 86_400_000);
  }

  removeWorker(workerId: string): void {
    this.database.prepare('DELETE FROM push_workers WHERE id = ?').run(workerId);
  }

  markStaleSending(): number {
    // 중단된 시도도 이미 푸시 서비스에 도착했을 수 있으므로 재발송하지 않는다.
    return this.database.prepare("UPDATE push_jobs SET status = 'unknown', finished_at = ?, error_code = 'INTERRUPTED_SEND' WHERE status = 'sending' AND claimed_at <= ?")
      .run(this.now(), this.now() - SENDING_UNKNOWN_AFTER_MS).changes;
  }

  claimDueJob(workerId: string): ClaimedPushJob | null {
    return this.database.transaction(() => {
      this.markStaleSending();
      const row = this.database.prepare(`SELECT j.* FROM push_jobs j JOIN push_subscriptions s ON s.id = j.subscription_id AND s.user_id = j.user_id
        WHERE j.status = 'queued' AND j.due_at <= ? ORDER BY j.due_at, j.rowid LIMIT 1`).get(this.now()) as JobRow | undefined;
      if (!row) return null;
      const subscription = this.database.prepare('SELECT * FROM push_subscriptions WHERE id = ? AND user_id = ?')
        .get(row.subscription_id, row.user_id) as SubscriptionRow;
      this.database.prepare("UPDATE push_jobs SET status = 'sending', claimed_at = ?, worker_id = ? WHERE id = ? AND status = 'queued'")
        .run(this.now(), workerId, row.id);
      return { ...toJob(row), status: 'sending' as const, userId: row.user_id, subscriptionId: row.subscription_id,
        subscription: JSON.parse(subscription.subscription_json) as ValidatedPushTarget,
        payload: JSON.parse(row.payload_json) as PushPayload };
    }).immediate();
  }

  finishJob(id: string, status: 'sent' | 'failed' | 'unknown', errorCode: string | null = null): void {
    this.database.prepare("UPDATE push_jobs SET status = ?, finished_at = ?, error_code = ? WHERE id = ? AND status = 'sending'")
      .run(status, this.now(), errorCode, id);
  }

  consumeLoginAttempt(key: string, now = this.now(), limit = 10): boolean {
    const windowMs = 15 * 60_000;
    return this.database.transaction(() => {
      this.database.prepare('DELETE FROM push_login_attempts WHERE window_start <= ?').run(now - windowMs);
      const current = this.database.prepare('SELECT attempts FROM push_login_attempts WHERE key = ?').get(key) as { attempts: number } | undefined;
      if (current && current.attempts >= limit) return false;
      this.database.prepare('INSERT INTO push_login_attempts (key, window_start, attempts) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1')
        .run(key, now);
      return true;
    }).immediate();
  }
}

export function openPushTestStore(dbPath: string, now?: () => number): PushTestStore {
  return new PushTestStore(dbPath, now);
}
