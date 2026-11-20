import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export interface RegistrationInput {
  name: string;
  email: string;
  password: string;
  confirm?: string;
  acceptTerms?: boolean;
}

export interface OnboardingProfile {
  age: number;
  country: string;
  education: string;
  targetEducation: string;
  field: string;
  destination: string;
  year: string;
  scholarshipType: string;
  fundingPreference: string;
  documents: string[];
}

export class RegistrationPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly clientErrors: Locator;
  readonly onboardingHeading: Locator;
  readonly onboardingError: Locator;
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly saveButton: Locator;
  readonly fullNameInput: Locator;
  readonly ageInput: Locator;
  readonly gpaInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByPlaceholder('Your full name');
    this.emailInput = page.getByPlaceholder('you@example.com');
    this.passwordInput = page.getByPlaceholder('8+ characters, capital letter & number');
    this.confirmPasswordInput = page.getByPlaceholder('Repeat password');
    this.termsCheckbox = page.getByRole('checkbox', {
      name: /I agree to the Minerva terms/,
    });
    this.submitButton = page.getByRole('button', { name: 'Create account' });
    this.clientErrors = page.locator('ul.rounded-xl li');
    this.onboardingHeading = page.getByRole('heading', { level: 1 });
    this.onboardingError = page.locator('p.error.onboarding-error');
    this.continueButton = page.getByRole('button', {
      name: /Continue|Review my profile/,
    });
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.saveButton = page.getByRole('button', {
      name: 'Save preferences & find my matches',
    });
    this.fullNameInput = page.getByPlaceholder('Enter your full name');
    this.ageInput = page.getByPlaceholder('e.g. 24');
    this.gpaInput = page.getByPlaceholder('e.g. 3.75 / 4.00');
  }

  async goto(): Promise<void> {
    await this.page.goto('/register');
  }

  async register(input: RegistrationInput): Promise<void> {
    await this.nameInput.fill(input.name);
    await this.emailInput.fill(input.email);
    await this.passwordInput.fill(input.password);
    await this.confirmPasswordInput.fill(input.confirm ?? input.password);
    if (input.acceptTerms) {
      await this.termsCheckbox.check();
    }
    await this.submitButton.click();
  }

  async expectClientErrors(messages: string[]): Promise<void> {
    await expect(this.clientErrors).toBeVisible();
    for (const message of messages) {
      await expect(this.clientErrors).toContainText(message);
    }
  }

  async selectStep(label: string): Promise<void> {
    await this.page.getByRole('button', { name: label, exact: true }).click();
  }

  async selectOption(fieldLabel: string, option: string): Promise<void> {
    const field = this.page.locator('label.field-label').filter({ hasText: fieldLabel }).first();
    await field.locator('button.base-select-trigger').click();
    await field.getByRole('option', { name: option, exact: true }).click();
  }

  async documentCheckbox(documentName: string): Promise<Locator> {
    const label = this.page
      .locator('label')
      .filter({ hasText: new RegExp(`^${documentName}`) })
      .first();
    return label.getByRole('checkbox');
  }

  async completeOnboarding(profile: OnboardingProfile): Promise<void> {
    await this.ageInput.fill(String(profile.age));
    await this.selectOption('Country', profile.country);
    await this.continueButton.click();

    await this.selectOption('Last education', profile.education);
    await this.selectOption('Target education', profile.targetEducation);
    await this.selectOption('Target field of study', profile.field);
    await this.continueButton.click();

    await this.selectOption('Destination', profile.destination);
    await this.selectOption('Enrollment year', profile.year);
    await this.selectOption('Scholarship type', profile.scholarshipType);
    await this.selectOption('Funding', profile.fundingPreference);
    await this.continueButton.click();

    for (const documentName of profile.documents) {
      const checkbox = await this.documentCheckbox(documentName);
      await checkbox.check();
    }
    await this.continueButton.click();

    await this.saveButton.click();
  }
}
