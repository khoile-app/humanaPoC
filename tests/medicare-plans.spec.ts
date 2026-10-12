import { test, expect } from '@playwright/test';

const ZIP = '75201';

test('Sunfire: skip wizard to top 3 plans, then Reliance plan search', async ({ page }) => {
  test.setTimeout(120_000);

  // --- Sunfire Matrix ---
  await page.goto('https://www.sunfirematrix.com/app/consumer/ifg/20085239/#/');
  await page.locator('#zip').fill(ZIP);

  const stepIndicator = page.getByText(/Step \d+ of \d+/);
  const skip = page.getByRole('button', { name: 'Skip', exact: true });
  const saveAndViewPlans = page.getByRole('button', { name: 'Save and View Plans' });

  // The ZIP is validated asynchronously; clicking "Find plans" before that finishes is a no-op.
  const findPlans = page.getByRole('button', { name: 'Find plans' });
  await expect(async () => {
    if (await findPlans.isVisible()) await findPlans.click();
    await expect(stepIndicator).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 30_000 });

  // Skip every wizard step (doctors, medications, pharmacy, health) until the
  // final "current plan" step, which has no Skip button. Driven by the "Step N of M"
  // counter because the previous step's buttons linger during the slide transition.
  const [, first, total] = (await stepIndicator.innerText()).match(/Step (\d+) of (\d+)/)!.map(Number);
  for (let step = first; step < total; step++) {
    await skip.click();
    await expect(stepIndicator).toHaveText(`Step ${step + 1} of ${total}`);
  }
  await saveAndViewPlans.click();

  await expect(page.getByText('Top 3 available plans')).toBeVisible({ timeout: 30_000 });

  // --- Reliance Medicare Advisors ---
  await page.goto('https://www.reliancemedicareadvisors.com/');
  const searchPlans = page.getByRole('button', { name: 'Search plans' }).first();
  const zipInput = page.locator('#zip-entry-input');
  // The button does nothing until the page has hydrated, so retry until the ZIP form appears.
  await expect(async () => {
    if (await searchPlans.isVisible()) await searchPlans.click();
    await expect(zipInput).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
  await zipInput.fill(ZIP);
  await page.getByRole('button', { name: 'Search all plans' }).click();
  await expect(zipInput).toBeHidden({ timeout: 30_000 });
});
