import { request as playwrightRequest } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/authFixture';
import { APP_ORIGIN, AuthClient, createTestAccount } from '../../../src/api/AuthClient';
import { MentorBookingPage } from '../../../src/pages/MentorBookingPage';

const mentorBookingPath = '/mentors';

function minutesOfDay(label: string): number {
  const match = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) {
    throw new Error(`Could not read a time from the available slot label: "${label}"`);
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem) {
    hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0);
  }
  return hours * 60 + minutes;
}

test.describe('Mentor booking (P1)', () => {
  test('TC_BNKR_001 books an available mentor session', async ({ authedPage }) => {
    const bookingPage = new MentorBookingPage(authedPage, mentorBookingPath);
    await bookingPage.goto();

    const mentorName = await bookingPage.firstMentorName();
    await bookingPage.selectMentor(mentorName);
    await bookingPage.selectTimezone('GMT+7');
    await bookingPage.selectFirstAvailableTimeSlot();
    await bookingPage.confirmBooking();

    await expect(bookingPage.bookingConfirmation).toContainText(/confirmed|booked/i);
  });

  test('TC_BNKR_002 prevents concurrent booking of the same mentor slot', async ({
    authedPage,
    browser,
  }, testInfo) => {
    const apiContext = await playwrightRequest.newContext({ baseURL: APP_ORIGIN });
    const secondAccount = createTestAccount(
      `booking-race-${testInfo.workerIndex}-${Date.now().toString(36)}`
    );
    const secondClient = new AuthClient(apiContext);
    const secondBrowserContext = await browser.newContext();
    try {
      await secondClient.registerWithRateLimitRetry(secondAccount);
      try {
        const storageState = await secondClient.storageState();
        await secondBrowserContext.addCookies(storageState.cookies);

        const secondPage = await secondBrowserContext.newPage();
        const firstBooking = new MentorBookingPage(authedPage, mentorBookingPath);
        const secondBooking = new MentorBookingPage(secondPage, mentorBookingPath);
        await Promise.all([firstBooking.goto(), secondBooking.goto()]);

        const mentorName = await firstBooking.firstMentorName();
        await Promise.all([
          firstBooking.selectMentor(mentorName),
          secondBooking.selectMentor(mentorName),
        ]);
        await Promise.all([
          firstBooking.selectTimezone('GMT+7'),
          secondBooking.selectTimezone('GMT+7'),
        ]);
        const slot = await firstBooking.firstAvailableTimeSlot();
        await Promise.all([firstBooking.selectTimeSlot(slot), secondBooking.selectTimeSlot(slot)]);
        await Promise.all([firstBooking.confirmBooking(), secondBooking.confirmBooking()]);

        await expect
          .poll(async () => {
            const confirmations =
              Number(await firstBooking.bookingConfirmation.isVisible()) +
              Number(await secondBooking.bookingConfirmation.isVisible());
            const errors =
              Number(await firstBooking.bookingError.isVisible()) +
              Number(await secondBooking.bookingError.isVisible());
            return { confirmations, errors };
          })
          .toEqual({ confirmations: 1, errors: 1 });
      } finally {
        await secondClient.cleanupAccount(secondAccount);
      }
    } finally {
      await secondBrowserContext.close();
      await apiContext.dispose();
    }
  });

  test('TC_BNKR_003 converts available slots between GMT+7 and GMT+0', async ({ authedPage }) => {
    const bookingPage = new MentorBookingPage(authedPage, mentorBookingPath);
    await bookingPage.goto();
    const mentorName = await bookingPage.firstMentorName();
    await bookingPage.selectMentor(mentorName);

    await bookingPage.selectTimezone('GMT+7');
    const gmtPlusSevenSlot = await bookingPage.firstAvailableTimeSlot();
    await bookingPage.selectTimezone('GMT+0');
    const gmtZeroSlot = await bookingPage.firstAvailableTimeSlot();

    const difference = (minutesOfDay(gmtPlusSevenSlot) - minutesOfDay(gmtZeroSlot) + 1_440) % 1_440;
    expect(difference).toBe(7 * 60);
  });
});
