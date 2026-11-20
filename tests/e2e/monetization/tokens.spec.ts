
import {test,  expect } from '@playwright/test';
import { TokenPurchasePage } from '../../../src/pages/TokenPurchasePage';

const starterPack = {
  name: 'Starter',
  tokens: 10,
};

const validCard = {
  holder: 'QA Automation',
  number: '4242424242424242',
  expiry: '1230',
  cvc: '123',
};

async function tokenBalanceOf(client: {
  me(): Promise<{ tokenBalance: number }>;
}): Promise<number> {
  const user = await client.me();
  return user.tokenBalance;
}

test.describe('Token purchase (P0)', () => {
  test('TC_TOKN_001 successful credit addition', async ({ page, testUser }) => {
    const before = await tokenBalanceOf(testUser.client);
    const tokensPage = new TokenPurchasePage(authedPage);

    await tokensPage.goto();
    await tokensPage.expectPackSelected('Momentum');
    await tokensPage.selectPack(starterPack.name);
    await tokensPage.expectPackSelected(starterPack.name);
    await tokensPage.fillCard(validCard);
    await tokensPage.completePurchase();

    await tokensPage.expectToast(
      `Payment successful - ${starterPack.tokens} tokens added to your account.`
    );
    await expect
      .poll(async () => tokenBalanceOf(testUser.client))
      .toBe(before + starterPack.tokens);
    await expect(authedPage).toHaveURL(/\/dashboard/);
  });

  test('TC_TOKN_002 short card number is rejected without crediting tokens', async ({
    authedPage,
    testUser,
  }) => {
    const before = await tokenBalanceOf(testUser.client);
    const tokensPage = new TokenPurchasePage(authedPage);

    await tokensPage.goto();
    await tokensPage.selectPack(starterPack.name);
    await tokensPage.fillCard({
      holder: 'QA Automation',
      number: '40002',
      expiry: '1230',
      cvc: '123',
    });
    await tokensPage.completePurchase();

    await tokensPage.expectToast(
      'Enter a cardholder name, 16-digit card number, expiry date, and 3-4 digit CVC.'
    );
    expect(await tokenBalanceOf(testUser.client)).toBe(before);
    await expect(authedPage).toHaveURL(/\/payment/);
  });

  test('TC_TOKN_003 dropped payment request can be retried successfully', async ({
    authedPage,
    testUser,
  }) => {
    const before = await tokenBalanceOf(testUser.client);
    let dropped = false;
    await authedPage.route('**/api/billing/demo-topups', (route) => {
      if (!dropped) {
        dropped = true;
        return route.abort('failed');
      }
      return route.fallback();
    });

    const tokensPage = new TokenPurchasePage(authedPage);
    await tokensPage.goto();
    await tokensPage.selectPack(starterPack.name);
    await tokensPage.fillCard(validCard);

    await tokensPage.completePurchase();
    await tokensPage.expectToast(
      'Unable to reach Minerva. Check that the backend is running and try again.'
    );
    expect(await tokenBalanceOf(testUser.client)).toBe(before);

    await tokensPage.completePurchase();
    await tokensPage.expectToast(
      `Payment successful - ${starterPack.tokens} tokens added to your account.`
    );
    await expect
      .poll(async () => tokenBalanceOf(testUser.client))
      .toBe(before + starterPack.tokens);
  });
});
