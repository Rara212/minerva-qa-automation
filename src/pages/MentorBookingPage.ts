import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export class MentorBookingPage {
  readonly page: Page;
  readonly timezoneSelect: Locator;
  readonly mentorCards: Locator;
  readonly availableTimeSlots: Locator;
  readonly confirmBookingButton: Locator;
  readonly bookingConfirmation: Locator;
  readonly bookingError: Locator;

  constructor(
    page: Page,
    private readonly path: string
  ) {
    this.page = page;
    this.timezoneSelect = page.getByLabel('Timezone');
    this.mentorCards = page.getByRole('article');
    this.availableTimeSlots = page.getByRole('button', {
      name: /\b\d{1,2}:\d{2}(?:\s?[ap]m)?\b/i,
    });
    this.confirmBookingButton = page.getByRole('button', {
      name: /confirm booking|book session|schedule session/i,
    });
    this.bookingConfirmation = page.getByRole('status');
    this.bookingError = page.getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  async selectMentor(name: string): Promise<void> {
    const mentor = this.mentorCards.filter({ hasText: name }).first();
    await mentor.getByRole('button', { name: /select|choose|book/i }).click();
  }

  async firstMentorName(): Promise<string> {
    const heading = this.mentorCards.first().getByRole('heading').first();
    return (await heading.innerText()).trim();
  }

  async selectTimezone(timezone: string): Promise<void> {
    await this.timezoneSelect.selectOption({ label: timezone });
  }

  async selectTimeSlot(slot: string): Promise<void> {
    await this.page.getByRole('button', { name: slot, exact: true }).click();
  }

  async firstAvailableTimeSlot(): Promise<string> {
    return (await this.availableTimeSlots.first().innerText()).trim();
  }

  async selectFirstAvailableTimeSlot(): Promise<void> {
    await this.availableTimeSlots.first().click();
  }

  async confirmBooking(): Promise<void> {
    await this.confirmBookingButton.click();
  }

  async expectConfirmation(expectedText: string | RegExp): Promise<void> {
    await expect(this.bookingConfirmation).toContainText(expectedText);
  }

  async expectBookingError(expectedText: string | RegExp): Promise<void> {
    await expect(this.bookingError).toContainText(expectedText);
  }

  async expectTimezone(timezone: string): Promise<void> {
    await expect(this.timezoneSelect.locator('option:checked')).toHaveText(timezone);
  }
}
