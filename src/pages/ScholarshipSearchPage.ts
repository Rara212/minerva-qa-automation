import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export class ScholarshipSearchPage {
  readonly page: Page;
  readonly keywordInput: Locator;
  readonly resultCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.keywordInput = page.getByRole('searchbox');
    this.resultCards = page.getByRole('article');
  }

  async goto(): Promise<void> {
    await this.page.goto('/scholarships');
  }

  async search(keyword: string): Promise<void> {
    await this.keywordInput.fill(keyword);
    await this.keywordInput.press('Enter');
  }

  async expandFilter(filterName: string): Promise<void> {
    const filterButton = this.page.getByRole('button', { name: filterName, exact: true });
    if ((await filterButton.getAttribute('aria-expanded')) !== 'true') {
      await filterButton.click();
    }
  }

  async setFilterOption(filterName: string, option: string, selected = true): Promise<void> {
    await this.expandFilter(filterName);
    const checkbox = this.page.getByRole('checkbox', { name: option, exact: true });
    if (selected) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  async expectResultCount(count: number): Promise<void> {
    await expect(this.resultCards).toHaveCount(count);
  }

  async expectScholarshipVisible(name: string): Promise<void> {
    await expect(this.scholarshipCard(name)).toBeVisible();
  }

  async expectNoResults(): Promise<void> {
    await expect(this.page.getByText(/no scholarships|no results/i)).toBeVisible();
  }

  async expectSuitabilityScore(name: string): Promise<void> {
    await expect(this.scholarshipCard(name).getByText(/\d{1,3}\s?%\s*match/i)).toBeVisible();
  }

  private scholarshipCard(name: string): Locator {
    return this.resultCards.filter({ hasText: name }).first();
  }
}
