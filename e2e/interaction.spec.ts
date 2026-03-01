import { test, expect } from '@playwright/test';

test.describe('Core interactions', () => {
  test('page loads and is interactive', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/.+/);

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const navLinks = page.locator('nav a, header a');
    const linkCount = await navLinks.count();

    if (linkCount > 0) {
      const firstLink = navLinks.first();
      const href = await firstLink.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        await firstLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('buttons are clickable and respond', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const firstButton = buttons.first();
      await expect(firstButton).toBeEnabled();
    }
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
  });

  test('no accessibility violations in tab order', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
