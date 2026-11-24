import { defineConfig, devices } from '@playwright/test';
import { APP_ORIGIN } from './src/api/AuthClient';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 4,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  globalSetup: require.resolve('./src/utils/globalSetup.ts'),
  reporter: [['html'], ['list']],
  use: {
    baseURL: APP_ORIGIN,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
