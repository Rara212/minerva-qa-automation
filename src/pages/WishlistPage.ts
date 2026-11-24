import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export class WishlistPage {
  readonly page: Page;
  readonly scholarshipCards: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.scholarshipCards = page.getByRole('article');
    this.emptyState = page.getByText(/wishlist is empty|no scholarships saved|nothing saved/i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/wishlist');
  }

  async toggleBookmark(scholarshipName: string): Promise<void> {
    await this.scholarshipCard(scholarshipName)
      .getByRole('button', { name: /add to wishlist|remove from wishlist/i })
      .click();
  }

  async removeBookmark(scholarshipName: string): Promise<void> {
    await this.scholarshipCard(scholarshipName)
      .getByRole('button', { name: /remove from wishlist/i })
      .click();
  }

  async expectBookmarked(scholarshipName: string): Promise<void> {
    await expect(this.scholarshipCard(scholarshipName)).toBeVisible();
  }

  async expectNotBookmarked(scholarshipName: string): Promise<void> {
    await expect(this.scholarshipCard(scholarshipName)).toHaveCount(0);
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  private scholarshipCard(name: string): Locator {
    return this.scholarshipCards.filter({ hasText: name }).first();
  }
}
