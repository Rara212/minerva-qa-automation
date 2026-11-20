import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { request as playwrightRequest } from '@playwright/test';
import {
  APP_ORIGIN,
  ApiError,
  AuthClient,
  createTestAccount,
  retryAfterSeconds,
  type TestAccount,
} from './AuthClient';

const POOL_PATH = path.join(process.cwd(), '.auth-pool.json');
const POOL_SIZE = 6;
const REGISTER_SPACING_MS = 2_000;
const MAX_RATE_LIMIT_WAITS = 6;

export function loadAccountPool(): TestAccount[] {
  try {
    if (!existsSync(POOL_PATH)) return [];
    const parsed: unknown = JSON.parse(readFileSync(POOL_PATH, 'utf8'));
    return Array.isArray(parsed) ? (parsed as TestAccount[]) : [];
  } catch {
    return [];
  }
}

function saveAccountPool(accounts: TestAccount[]): void {
  writeFileSync(POOL_PATH, JSON.stringify(accounts, null, 2));
}

/** Worker-indexed lookup so parallel workers never share an account. */
export function pooledAccount(workerIndex: number): TestAccount | undefined {
  return loadAccountPool()[workerIndex];
}

/**
 * Registers the shared test-account pool once (persisted across runs).
 * Sequential with spacing so we stay under the backend's auth rate limit;
 * on 429 we wait the server-provided retryAfterSeconds (globalSetup has no
 * test timeout, so a full window wait is safe here).
 */
export async function ensureAccountPool(): Promise<void> {
  const pool = loadAccountPool();
  if (pool.length >= POOL_SIZE) {
    console.log(`🔐 Auth account pool ready (${pool.length} accounts)`);
    return;
  }

  console.log(`🔐 Filling auth account pool (${pool.length}/${POOL_SIZE})...`);
  const context = await playwrightRequest.newContext({ baseURL: APP_ORIGIN });
  const client = new AuthClient(context);
  let rateLimitWaits = 0;
  try {
    while (pool.length < POOL_SIZE) {
      const account = createTestAccount(`pool-${Date.now().toString(36)}-${pool.length}`);
      try {
        await client.register(account);
        pool.push(account);
        saveAccountPool(pool);
        console.log(`   + ${account.email} (${pool.length}/${POOL_SIZE})`);
        await new Promise((resolve) => setTimeout(resolve, REGISTER_SPACING_MS));
      } catch (error) {
        if (error instanceof ApiError && error.status === 429 && rateLimitWaits < MAX_RATE_LIMIT_WAITS) {
          rateLimitWaits += 1;
          const waitSeconds = Math.min(retryAfterSeconds(error), 300);
          console.log(`   ⏳ Rate limited; waiting ${waitSeconds}s before retrying...`);
          await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
          continue;
        }
        throw error;
      }
    }
    console.log(`🔐 Auth account pool filled (${POOL_SIZE} accounts)`);
  } finally {
    await context.dispose();
  }
}
