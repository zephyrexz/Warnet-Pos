import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /masuk ke cyberpos/i })).toBeVisible();
  });

  test('should load register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /daftar cyberpos/i })).toBeVisible();
  });

  test('should show validation error on empty login', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /masuk/i }).click();
    // HTML5 validation will prevent submission
  });
});

test.describe('Home Page', () => {
  test('should display hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /sistem manajemen warnet modern/i })).toBeVisible();
  });

  test('should have navigation to login and register', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /^masuk$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /daftar/i })).toBeVisible();
  });
});
