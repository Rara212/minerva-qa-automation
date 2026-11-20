// src/utils/globalSetup.ts
import { FullConfig } from '@playwright/test';
import { ensureAccountPool } from '../api/accountPool';

async function globalSetup(_config: FullConfig) {
  const healthUrl = 'https://minerva-mentorship.pages.dev/api/health';
  const maxRetries = 10;
  const retryIntervalMs = 8000; // Wait 8 seconds between retries

  console.log('🌍 Checking Render backend status (handling potential cold start)...');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(healthUrl, { method: 'GET' });
      
      if (response.ok) {
        console.log(`✅ Backend is awake and healthy! (Attempt ${attempt})`);
        await ensureAccountPool();
        return;
      }
      
      console.log(`⚠️ Backend responded with status ${response.status}. Retrying in ${retryIntervalMs / 1000}s... (Attempt ${attempt}/${maxRetries})`);
    } catch (error) {
      console.log(`💤 Backend is sleeping (cold start). Retrying in ${retryIntervalMs / 1000}s... (Attempt ${attempt}/${maxRetries})`, error instanceof Error ? error.message : '');
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
    }
  }

  throw new Error(`❌ Failed to wake up the Render backend at ${healthUrl} after ${maxRetries} attempts.`);
}

export default globalSetup;