import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export interface CardDetails {
  holder: string;
  number: string;
  expiry: string;
  cvc: string;
}

export class TokenPurchasePage {
  readonly page: Page;
  readonly cardholderInput: Locator;
  readonly cardNumberInput: Locator;
  readonly expiryInput: Locator;
  readonly cvcInput: Locator;
  readonly payButton: Locator;
  readonly toasts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cardholderInput = page.getByPlaceholder('Name on card');
    this.cardNumberInput = page.getByPlaceholder('1234 1234 1234 1234', {
      exact: true,
    });
    this.expiryInput = page.getByPlaceholder('MM / YY', { exact: true });
    this.cvcInput = page.getByPlaceholder('123', { exact: true });
    this.payButton = page.getByRole('button', {
      name: /Complete demo payment for \d+ tokens/,
    });
    this.toasts = page.locator('[aria-live="polite"] > div');
  }

  async goto(): Promise<void> {
    await this.page.goto('/payment');
  }

  packCard(packName: string): Locator {
    return this.page.locator(`button:has(p.font-black:text-is("${packName}"))`);
  }

  async selectPack(packName: string): Promise<void> {
    await this.packCard(packName).click();
  }

  async expectPackSelected(packName: string): Promise<void> {
    await expect(this.packCard(packName)).toHaveClass(/border-\[#5b45f5\]/);
  }

  async fillCard(card: CardDetails): Promise<void> {
    await this.cardholderInput.fill(card.holder);
    await this.cardNumberInput.fill(card.number);
    await this.expiryInput.fill(card.expiry);
    await this.cvcInput.fill(card.cvc);
  }

  async completePurchase(): Promise<void> {
    await this.payButton.click();
  }

  async expectToast(expected: string): Promise<void> {
    await expect(this.toasts.filter({ hasText: expected }).first()).toBeVisible();
  }

  async expectCardValidationError(expected: string): Promise<void> {
    await this.completePurchase();
    await this.expectToast(expected);
  }
}
