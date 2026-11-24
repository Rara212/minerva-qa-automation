import { test, expect } from '../../../src/fixtures/authFixture';
import type { PublicUser } from '../../../src/api/AuthClient';
import { EssayReviewPage } from '../../../src/pages/EssayReviewPage';

const essayPath = '/documents';

async function tokenBalanceOf(client: { me(): Promise<PublicUser> }): Promise<number> {
  return (await client.me()).tokenBalance;
}

test.describe('Essay review (P1)', () => {
  test('TC_ESSY_001 proofreads an essay, merges suggestions, and deducts tokens', async ({
    authedPage,
    testUser,
  }) => {
    const balanceBefore = await tokenBalanceOf(testUser.client);
    const essayReview = new EssayReviewPage(authedPage, essayPath);

    await essayReview.goto();
    await essayReview.writeEssay(
      'I want to study computer science because it will help me build tools for my community.'
    );
    await essayReview.proofread();
    await essayReview.expectProofreadResult();
    await essayReview.mergeSuggestions();

    const download = await essayReview.exportAs('Word');
    expect(download.suggestedFilename()).toMatch(/\.docx?$/i);
    await expect.poll(() => tokenBalanceOf(testUser.client)).toBeLessThan(balanceBefore);
  });

  test('TC_ESSY_002 blocks proofreading when the user has no tokens', async ({ authedPage }) => {
    await authedPage.route('**/api/auth/me', async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as { user: PublicUser };
      await route.fulfill({
        response,
        json: { ...body, user: { ...body.user, tokenBalance: 0 } },
      });
    });

    const essayReview = new EssayReviewPage(authedPage, essayPath);
    await essayReview.goto();
    await essayReview.writeEssay('A short essay for the zero-token test.');
    await essayReview.proofread();
    await expect(authedPage.getByRole('dialog')).toBeVisible();
  });

  test('TC_ESSY_003 rejects essays above the 10,000-word limit', async ({ authedPage }) => {
    const essayReview = new EssayReviewPage(authedPage, essayPath);
    await essayReview.goto();
    await essayReview.writeEssay(Array.from({ length: 10_001 }, () => 'word').join(' '));
    await essayReview.proofread();
    await expect(essayReview.validationError).toBeVisible();
  });

  test('TC_ESSY_004 exports an essay containing UTF-8 characters', async ({ authedPage }) => {
    const essayReview = new EssayReviewPage(authedPage, essayPath);
    await essayReview.goto();
    await essayReview.writeEssay(
      'My goal is to support students 🌱 — especially first-generation applicants.'
    );
    await essayReview.proofread();
    await essayReview.expectProofreadResult();
    await essayReview.mergeSuggestions();

    const download = await essayReview.exportAs('PDF');
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
