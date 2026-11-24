import { test, expect } from '../../../src/fixtures/authFixture';
import { RegistrationPage } from '../../../src/pages/RegistrationPage';
import { captureApiError, createTestAccount } from '../../../src/api/AuthClient';

const validOnboarding = {
  age: 24,
  country: 'Indonesia',
  education: 'High school',
  targetEducation: 'Bachelor',
  field: 'Computer Science',
  destination: 'Australia',
  year: '2027',
  scholarshipType: 'Government',
  fundingPreference: 'Fully funded',
  documents: ['CV'],
};

test.describe('Registration & onboarding (P0)', () => {
  test('TC_AUTH_001 full multi-step onboarding and profile creation', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    await registrationPage.goto();
    await registrationPage.register({ ...createTestAccount(), acceptTerms: true });

    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 30_000 });
    await expect(registrationPage.onboardingHeading).toHaveText('Personal information');

    await registrationPage.completeOnboarding(validOnboarding);

    await expect(page.getByText('Your preferences are saved.')).toBeVisible();
    await expect(page).toHaveURL(/\/scholarships\?recommended=1/);
  });

  test('TC_AUTH_002 duplicate email registration is blocked', async ({ page, testUser }) => {
    const registrationPage = new RegistrationPage(page);
    await registrationPage.goto();
    await registrationPage.register({
      name: 'Duplicate Attempt',
      email: testUser.email,
      password: 'Minerva1QA',
      acceptTerms: true,
    });

    await expect(page).toHaveURL(/\/register/);
    await registrationPage.expectClientErrors(['An account already exists for this email']);
  });

  test('TC_AUTH_003 terms of service agreement is required', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    const registerRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/auth/register')) {
        registerRequests.push(request.url());
      }
    });

    await registrationPage.goto();
    await registrationPage.register({
      ...createTestAccount(),
      acceptTerms: false,
    });

    await registrationPage.expectClientErrors(['Accept the terms to continue.']);
    await expect(page).toHaveURL(/\/register/);
    expect(registerRequests).toHaveLength(0);
  });

  test('TC_AUTH_004 password complexity rules enforced before submission', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    await registrationPage.goto();
    await registrationPage.register({
      name: 'Weak Password User',
      email: 'weak-password-check@example.com',
      password: 'abc123',
      confirm: 'abc123',
      acceptTerms: true,
    });

    const complexityMessage = 'Use 8+ characters with at least one capital letter and one number.';
    await registrationPage.expectClientErrors([complexityMessage]);

    await registrationPage.passwordInput.fill('alllowercaseletters');
    await registrationPage.confirmPasswordInput.fill('alllowercaseletters');
    await registrationPage.submitButton.click();
    await registrationPage.expectClientErrors([complexityMessage]);

    await registrationPage.passwordInput.fill('Ab1def');
    await registrationPage.confirmPasswordInput.fill('Ab1def');
    await registrationPage.submitButton.click();
    await registrationPage.expectClientErrors([complexityMessage]);
    await expect(page).toHaveURL(/\/register/);
  });

  test('TC_AUTH_005 multi-step registration survives browser refresh', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    await registrationPage.goto();
    await registrationPage.register({ ...createTestAccount(), acceptTerms: true });
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 30_000 });

    await registrationPage.ageInput.fill('24');
    await registrationPage.selectDropdownOption('Country', 'Indonesia');
    await registrationPage.continueButton.click();
    await expect(registrationPage.onboardingHeading).toHaveText('Last education');

    await page.reload();

    // The wizard resumes at the step that was in progress when refreshed.
    await expect(registrationPage.onboardingHeading).toHaveText('Last education');

    // Step 1 data survived the refresh: go back and verify it.
    await registrationPage.backButton.click();
    await expect(registrationPage.onboardingHeading).toHaveText('Personal information');
    await expect(registrationPage.ageInput).toHaveValue('24');
    const countryTrigger = registrationPage.page
      .locator('label.field-label')
      .filter({ hasText: 'Country' })
      .first()
      .locator('button.base-select-trigger');
    await expect(countryTrigger).toContainText('Indonesia');
  });

  test('TC_AUTH_006 boundary inputs are rejected', async ({ page, testUser }) => {
    const registrationPage = new RegistrationPage(page);
    await registrationPage.goto();
    await registrationPage.register({
      name: 'A',
      email: 'boundary-name-check@example.com',
      password: 'Minerva1QA',
      acceptTerms: true,
    });
    await registrationPage.expectClientErrors(['Enter your name.']);
    await expect(page).toHaveURL(/\/register/);

    const nameTooLong = await captureApiError(() =>
      testUser.client.register({
        name: 'x'.repeat(121),
        email: `boundary-name-${Date.now()}@example.com`,
        password: 'Minerva1QA',
      })
    );
    expect(nameTooLong.status).toBe(422);

    const passwordTooLong = await captureApiError(() =>
      testUser.client.register({
        name: 'Valid Name',
        email: `boundary-password-${Date.now()}@example.com`,
        password: `A1${'x'.repeat(127)}`,
      })
    );
    expect(passwordTooLong.status).toBe(422);

    const profile = await testUser.client.updateProfile({
      gpa: 'not-a-number',
    });
    expect(profile.gpa).toBeNull();
  });
});
