import { expect } from '@playwright/test';
import type { Download, Locator, Page } from '@playwright/test';

export type EssayExportFormat = 'Word' | 'PDF';
type UploadFile = Parameters<Locator['setInputFiles']>[0];

export class EssayReviewPage {
  readonly page: Page;
  readonly essayEditor: Locator;
  readonly documentInput: Locator;
  readonly proofreadButton: Locator;
  readonly mergeSuggestionsButton: Locator;
  readonly exportButton: Locator;
  readonly proofreadResult: Locator;
  readonly validationError: Locator;

  constructor(
    page: Page,
    private readonly path: string
  ) {
    this.page = page;
    this.essayEditor = page.getByRole('textbox', { name: /essay/i });
    this.documentInput = page.locator('input[type="file"]');
    this.proofreadButton = page.getByRole('button', { name: /proofread/i });
    this.mergeSuggestionsButton = page.getByRole('button', {
      name: /apply all|merge suggestions/i,
    });
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.proofreadResult = page.getByRole('region', { name: /proofread|suggestions/i });
    this.validationError = page.getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  async writeEssay(content: string): Promise<void> {
    await this.essayEditor.fill(content);
  }

  async uploadDocument(file: UploadFile): Promise<void> {
    await this.documentInput.setInputFiles(file);
  }

  async proofread(): Promise<void> {
    await this.proofreadButton.click();
  }

  async mergeSuggestions(): Promise<void> {
    await this.mergeSuggestionsButton.click();
  }

  async exportAs(format: EssayExportFormat): Promise<Download> {
    await this.exportButton.click();
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.getByRole('menuitem', { name: format, exact: false }).click();
    return downloadPromise;
  }

  async expectProofreadResult(): Promise<void> {
    await expect(this.proofreadResult).toBeVisible();
    await expect(this.proofreadResult).not.toBeEmpty();
  }

  async expectInsufficientTokens(): Promise<void> {
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  async expectValidationError(): Promise<void> {
    await expect(this.validationError).toBeVisible();
  }
}
