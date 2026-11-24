import { test as base, expect, request as playwrightRequest } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import {
  APP_ORIGIN,
  ApiError,
  AuthClient,
  createTestAccount,
  type PublicUser,
  type TestAccount,
} from '../api/AuthClient';
import { pooledAccount } from '../api/accountPool';

export interface TestUser extends TestAccount {
  client: AuthClient;
  user: PublicUser;
}

interface WorkerAuthFixtures {
  testUser: TestUser;
}

interface TestAuthFixtures {
  authClient: AuthClient;
  authedPage: Page;
}

export const test = base.extend<TestAuthFixtures, WorkerAuthFixtures>({
  testUser: [
    async ({}, use, testInfo) => {
      const context: APIRequestContext = await playwrightRequest.newContext({
        baseURL: APP_ORIGIN,
      });
      const client = new AuthClient(context);
      let account: TestAccount;
      let isPooled = false;
      try {
        let user: PublicUser;
        const pooled = pooledAccount(testInfo.workerIndex);
        if (pooled) {
          // Pool accounts are pre-registered by globalSetup: log in instead of
          // registering so runs stay under the backend's auth rate limit.
          account = pooled;
          isPooled = true;
          try {
            user = await client.login({ email: account.email, password: account.password });
          } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 401) {
              throw error;
            }
            isPooled = false;
            account = createTestAccount(
              `worker-${testInfo.workerIndex}-${Date.now().toString(36)}`
            );
            await new Promise((resolve) => setTimeout(resolve, testInfo.workerIndex * 400));
            user = await client.registerWithRateLimitRetry(account);
          }
        } else {
          account = createTestAccount(`worker-${testInfo.workerIndex}-${Date.now().toString(36)}`);
          // Stagger worker startups so registrations don't hit the auth rate limit as one burst.
          await new Promise((resolve) => setTimeout(resolve, testInfo.workerIndex * 400));
          try {
            user = await client.registerWithRateLimitRetry(account);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(
              `Worker ${testInfo.workerIndex} failed to register ${account.email}: ${message}`,
              { cause: error }
            );
          }
        }
        await use({ ...account, client, user });
        if (!isPooled) {
          try {
            await client.cleanupAccount(account);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[authFixture] best-effort cleanup failed: ${message}`);
          }
        }
      } finally {
        await context.dispose();
      }
    },
    { scope: 'worker' },
  ],
  authClient: async ({ request }, use) => {
    await use(new AuthClient(request));
  },
  authedPage: async ({ page, testUser }, use) => {
    const state = await testUser.client.storageState();
    await page.context().addCookies(state.cookies);
    await use(page);
  },
});

export { expect };
