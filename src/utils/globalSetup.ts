import type { FullConfig } from '@playwright/test';
import { ensureAccountPool } from '../api/accountPool';
import { APP_ORIGIN } from '../api/AuthClient';

async function globalSetup(_config: FullConfig): Promise<void> {
  const healthUrl = `${APP_ORIGIN}/api/health`;
  const maxRetries = 10;
  const retryIntervalMs = 8_000;

  console.info('Checking the application health endpoint...');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let response: Response;
    try {
      response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      console.info(
        `Health check failed; retrying in ${retryIntervalMs / 1000}s (attempt ${attempt}/${maxRetries}):`,
        error
      );
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
      }
      continue;
    }

    if (response.ok) {
      console.info(`Application is healthy (attempt ${attempt}).`);
      await ensureAccountPool();
      return;
    }

    console.info(
      `Health endpoint returned ${response.status}; retrying in ${retryIntervalMs / 1000}s (attempt ${attempt}/${maxRetries}).`
    );

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
    }
  }

  throw new Error(`Application health check failed at ${healthUrl} after ${maxRetries} attempts.`);
}

export default globalSetup;
