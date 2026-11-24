import { test, expect } from '../../../src/fixtures/authFixture';
import { LoginPage } from '../../../src/pages/LoginPage';
import { captureApiError, SESSION_COOKIE_NAME } from '../../../src/api/AuthClient';

test.describe('Login & session (P0)', () => {
  test('TC_LOG_001 valid credentials login and clean session logout', async ({
    page,
    testUser,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);

    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 30_000 });
    const loggedInCookies = await page.context().cookies();
    expect(loggedInCookies.some((cookie) => cookie.name === SESSION_COOKIE_NAME)).toBe(true);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    await loginPage.logout();
    await expect(page).toHaveURL(/\/$/);
    await expect(loginPage.signedOutToast).toBeVisible();
    const loggedOutCookies = await page.context().cookies();
    expect(loggedOutCookies.some((cookie) => cookie.name === SESSION_COOKIE_NAME)).toBe(false);
  });

  test('TC_LOG_002 invalid credentials are rejected with clear error messaging', async ({
    page,
    testUser,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.email, 'WrongPass1');

    await loginPage.expectErrorMessage('Email or password is incorrect');
    await expect(page).toHaveURL(/\/login/);
    const cookies = await page.context().cookies();
    expect(cookies.some((cookie) => cookie.name === SESSION_COOKIE_NAME)).toBe(false);
  });

  test('TC_LOG_003 protected routes redirect to login after logout', async ({ page, testUser }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 30_000 });

    await page.goto('/wishlist');
    await expect(page).toHaveURL(/\/wishlist/);

    await loginPage.logout();
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/wishlist');
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/redirect=.*wishlist/);
  });

  test('TC_LOG_004 sql injection and xss payloads cannot authenticate', async ({
    page,
    authClient,
  }) => {
    const sqlPayload = "admin' OR '1'='1' --";
    const xssPayload = '<img src=x onerror=alert(document.cookie)>';

    for (const payload of [sqlPayload, xssPayload]) {
      const error = await captureApiError(() =>
        authClient.login({ email: payload, password: payload })
      );
      expect(error.status).toBe(401);
      expect(error.code).toBe('INVALID_CREDENTIALS');
    }

    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    const loginPosts: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/api/auth/login')) {
        loginPosts.push(request.url());
      }
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    for (const payload of [sqlPayload, xssPayload]) {
      await loginPage.login(payload, payload);
      await expect(page).toHaveURL(/\/login/);
    }
    // Malformed payloads (no '@') are blocked by client-side email validation
    // before any login request is sent; nothing authenticates and no script runs.
    expect(loginPosts).toHaveLength(0);
    expect(dialogs).toHaveLength(0);
    const cookies = await page.context().cookies();
    expect(cookies.some((cookie) => cookie.name === SESSION_COOKIE_NAME)).toBe(false);
  });
});
