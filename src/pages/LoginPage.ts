import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggleButton: Locator;
  readonly rememberCheckbox: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly createAccountLink: Locator;
  readonly accountMenuButton: Locator;
  readonly signOutButton: Locator;
  readonly signedOutToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.locator('input[autocomplete="current-password"]');
    this.passwordToggleButton = page.getByRole('button', {
      name: /Show password|Hide password/,
    });
    this.rememberCheckbox = page.getByRole('checkbox', { name: 'Remember me' });
    this.submitButton = page.getByRole('button', { name: 'Log in' });
    this.errorMessage = page.locator('p.error');
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });
    this.createAccountLink = page.getByRole('link', { name: 'Create an account' });
    this.accountMenuButton = page.getByRole('button', { name: 'Open account menu' });
    this.signOutButton = page.getByRole('button', { name: 'Sign out' });
    this.signedOutToast = page.getByText('You have signed out.');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async togglePasswordVisibility(): Promise<boolean> {
    await this.passwordToggleButton.click();
    return (await this.passwordInput.getAttribute('type')) === 'text';
  }

  async logout(): Promise<void> {
    await expect(async () => {
      await this.accountMenuButton.click();
      await expect(this.accountMenuButton).toHaveAttribute('aria-expanded', 'true', {
        timeout: 2000,
      });
    }).toPass();
    await this.signOutButton.click();
  }

  async expectErrorMessage(expected: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText(expected);
  }

  async expectPasswordInputType(type: 'password' | 'text'): Promise<void> {
    await expect(this.passwordInput).toHaveAttribute('type', type);
  }
}
