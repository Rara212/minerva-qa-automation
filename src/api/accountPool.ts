import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
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

function isTestAccount(value: unknown): value is TestAccount {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'name' in value &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    'email' in value &&
    typeof value.email === 'string' &&
    value.email.length > 0 &&
    'password' in value &&
    typeof value.password === 'string' &&
    value.password.length > 0
  );
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export function loadAccountPool(): TestAccount[] {
  let contents: string;
  try {
    contents = readFileSync(POOL_PATH, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(`Unable to parse the test-account pool at ${POOL_PATH}`, { cause: error });
  }
  if (!Array.isArray(parsed) || !parsed.every(isTestAccount)) {
    throw new Error(`The test-account pool at ${POOL_PATH} has an invalid format`);
  }
  return parsed;
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
    console.info(`Auth account pool ready (${pool.length} accounts)`);
    return;
  }

  console.info(`Filling auth account pool (${pool.length}/${POOL_SIZE})...`);
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
        console.info(`   Registered account ${pool.length}/${POOL_SIZE}`);
        await new Promise((resolve) => setTimeout(resolve, REGISTER_SPACING_MS));
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 429 &&
          rateLimitWaits < MAX_RATE_LIMIT_WAITS
        ) {
          rateLimitWaits += 1;
          const waitSeconds = Math.min(retryAfterSeconds(error), 300);
          console.info(`Rate limited; waiting ${waitSeconds}s before retrying...`);
          await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
          continue;
        }
        throw error;
      }
    }
    console.info(`Auth account pool filled (${POOL_SIZE} accounts)`);
  } finally {
    await context.dispose();
  }
}
