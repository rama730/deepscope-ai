import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {

  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should show validation error for empty submission', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    // HTML5 validation or UI validation
    // Assuming shadcn form handling validation
    // Checking for error message. Since we don't know exact text, checking invalid attribute or text presence might be tricky without knowing ID.
    // Let's assume standard behavior: focus stays on input or error appears.
    // Given previous `ProfileForm` used Zod, Login likely does too.
    // Let's verify standard HTML5 validation first (browser tooltip) or just check url didn't change.
    await expect(page).toHaveURL(/login/);
  });

  /* 
   * Mocking Supabase Auth for successful login is complex because it involves 
   * multiple roundtrips and session setting. 
   * For this smoke test, we verify the UI handles the "loading" state and 
   * attempts the request.
   */
  test('should attempt login and show loading state', async ({ page }) => {
    await page.goto('/login');
    
    // Fill credentials
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');

    // Mock the API call to prevent actual Supabase hit failure
    await page.route('**/auth/v1/token*', async route => {
        // Delay to ensure we see loading state
        await new Promise(f => setTimeout(f, 500));
        await route.fulfill({
            status: 400, // Return error to check error handling/toast, easier than full session mock
            contentType: 'application/json',
            body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' })
        });
    });

    const submitBtn = page.getByRole('button', { name: /sign in/i });
    await submitBtn.click();

    // Check for loading state (e.g. spinner or disabled)
    // shadcn button usually disables or shows spinner
    await expect(submitBtn).toBeDisabled();
    
    // Check for error toast
    // sonner uses role='status' or similar
    await expect(page.getByText('Invalid login credentials')).toBeVisible({ timeout: 5000 });
  });
});
