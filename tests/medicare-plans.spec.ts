import { test, expect } from '@applitools/eyes-playwright/fixture';

const ZIP = '75201';

test('Sunfire: skip wizard to top 3 plans, then Reliance plan search', async ({ page, eyes }) => {
  test.setTimeout(300_000);

  // --- Sunfire Matrix ---
  await page.goto('https://www.sunfirematrix.com/app/consumer/ifg/20085239/#/');
  await page.waitForTimeout(5000); // Wait for the page to load and any animations to complete
  await eyes.check('Sunfire - Home');

  await eyes.run(`type "${ZIP}" into the "ZIP code" textbox`);

  const stepIndicator = page.getByText(/Step \d+ of \d+/);
  const skip = page.getByRole('button', { name: 'Skip', exact: true });

  // The ZIP is validated asynchronously; clicking "Find plans" before that finishes is a no-op.
  const findPlans = page.getByRole('button', { name: 'Find plans' });
  await expect(async () => {
    if (await findPlans.isVisible()) await eyes.run('click the "Find plans" button');
    await expect(stepIndicator).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });

  // Skip every wizard step (doctors, medications, pharmacy, health) until the
  // final "current plan" step, which has no Skip button. Driven by the "Step N of M"
  // counter because the previous step's buttons linger during the slide transition.
  const [, first, total] = (await stepIndicator.innerText()).match(/Step (\d+) of (\d+)/)!.map(Number);
  await eyes.check(`Sunfire - Wizard step ${first} of ${total}`);
  for (let step = first; step < total; step++) {
    await skip.click();
    await expect(stepIndicator).toHaveText(`Step ${step + 1} of ${total}`);
    await eyes.check(`Sunfire - Wizard step ${step + 1} of ${total}`);
  }
  await eyes.run('click the "Save and View Plans" button');

  await expect(page.getByText('Top 3 available plans')).toBeVisible({ timeout: 30_000 });
  await eyes.check('Sunfire - Top 3 plans');

  // --- Reliance Medicare Advisors ---
  await page.goto('https://www.reliancemedicareadvisors.com/');
  // Call tracking swaps in a per-visit phone number (as a "tel:+1..." link) after load; the
  // mid-page number stays hidden until then. Wait for the swap and ignore the numbers.
  const phoneNumbers = page.locator('a[href^="tel:"]');
  await expect(page.locator('a[href^="tel:+1"]').first()).toBeAttached({ timeout: 30_000 });
  await eyes.check('Reliance - Home', { ignoreRegions: [phoneNumbers] });

  const searchPlans = page.getByRole('button', { name: 'Search plans' }).first();
  const zipInput = page.locator('#zip-entry-input');
  // The button does nothing until the page has hydrated, so retry until the ZIP form appears.
  await expect(async () => {
    if (await searchPlans.isVisible()) await eyes.run('click the first "Search plans" button');
    await expect(zipInput).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });
  await eyes.check('Reliance - ZIP entry', { ignoreRegions: [phoneNumbers] });
  await eyes.run(`type "${ZIP}" into the "ZIP code" textbox`);
  await eyes.run('click the "Search all plans" button');
  await expect(zipInput).toBeHidden({ timeout: 30_000 });
  // The results route renders a spinner first; wait for the plan list before the checkpoint.
  await expect(page.getByText(`available plans for ${ZIP}`)).toBeVisible({ timeout: 30_000 });
  await eyes.check('Reliance - Plan results', { ignoreRegions: [phoneNumbers] });
});
