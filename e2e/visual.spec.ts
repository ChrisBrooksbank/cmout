import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const FIXTURE = fileURLToPath(new URL('./fixtures/events.json', import.meta.url));

// Fixed data, clock and timezone so the screenshot only changes when the UI does.
// Regenerate baselines with the "Update visual snapshots" workflow after intended UI changes.
test.use({ timezoneId: 'Europe/London', locale: 'en-GB' });

test.describe('Visual regression', () => {
  test('homepage matches screenshot', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-03-04T10:00:00Z'));
    await page.route('**/events.json', route => route.fulfill({ path: FIXTURE }));
    await page.goto('/');
    await page.waitForSelector('.event-feed__day');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });
});
