import { test, expect } from '@playwright/test';

test.describe('E2E-01: End-to-End Authentication & Password Change (Lab 3 AC-8.1, AC-3.1 to AC-3.5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('E2E-01.1: Displays Login screen and handles invalid credentials & inactive accounts safely', async ({ page }) => {
    // 1. Visit root - verify Login screen is shown
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password \*/i)).toBeVisible();

    // 2. Submit wrong password for active account
    await page.getByLabel(/email address/i).fill('jennifer.anderson@kmutt.ac.th');
    await page.getByLabel(/password \*/i).fill('WrongPassword999!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // 3. Verify safe generic error banner
    await expect(page.getByRole('alert')).toContainText(/invalid email or password/i);

    // 4. Submit inactive account credentials (Robert Taylor)
    await page.getByLabel(/email address/i).fill('robert.taylor@kmutt.ac.th');
    await page.getByLabel(/password \*/i).fill('Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // 5. Verify generic error message is returned without leaking account active state (BR-04)
    await expect(page.getByRole('alert')).toContainText(/invalid email or password/i);
  });

  test('E2E-01.2: Active user login, App Header display, and session logout', async ({ page }) => {
    // 1. Login with active Requester (Jennifer Anderson)
    await page.getByLabel(/email address/i).fill('jennifer.anderson@kmutt.ac.th');
    await page.getByLabel(/password \*/i).fill('Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // 2. Verify App Header renders user name, initials, and Requester badge
    await expect(page.getByText('TokTickIT')).toBeVisible();
    await expect(page.getByText('Jennifer Anderson')).toBeVisible();
    await expect(page.getByText('Requester')).toBeVisible();
    await expect(page.getByRole('button', { name: /my tickets/i })).toBeVisible();

    // 3. Verify old Development Requester selector & banner are completely absent
    await expect(page.getByText('DEVELOPMENT MODE')).not.toBeVisible();
    await expect(page.getByText('Select a Development Requester')).not.toBeVisible();

    // 4. Click Logout
    await page.getByRole('button', { name: /logout/i }).click();

    // 5. Verify immediate redirection back to Sign In
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByText('Jennifer Anderson')).not.toBeVisible();
  });

  test('E2E-01.3: Mandatory First-Login Password Change flow', async ({ page }) => {
    // 1. Login with Alex Turner (seeded with requiresPasswordChange = true)
    await page.getByLabel(/email address/i).fill('alex.turner@toktickit.kmutt.ac.th');
    await page.getByLabel(/password \*/i).fill('Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // 2. User is blocked at Mandatory Password Change screen
    await expect(page.getByRole('heading', { name: /mandatory password change/i })).toBeVisible();
    await expect(page.getByText(/Alex Turner/i)).toBeVisible();

    // 3. Enter weak password -> checklist indicates unfulfilled criteria
    const newPassInput = page.getByLabel('New Password *', { exact: true });
    await newPassInput.fill('weak');
    await expect(page.getByText('At least 8 characters')).toBeVisible();

    // 4. Fill compliant new password and confirmation
    const currentPassInput = page.getByLabel(/current \(temporary\) password \*/i);
    const confirmPassInput = page.getByLabel(/confirm new password \*/i);

    const tempNewPass = 'AlexSecurePass2026!';
    await currentPassInput.fill('Password123!');
    await newPassInput.fill(tempNewPass);
    await confirmPassInput.fill(tempNewPass);

    // 5. Submit password change
    await page.getByRole('button', { name: /update password/i }).click();

    // 6. User is unblocked and enters application shell with IT Staff badge
    await expect(page.getByText('Alex Turner')).toBeVisible();
    await expect(page.getByText('IT Staff')).toBeVisible();
    await expect(page.getByRole('button', { name: /ticket queue/i })).toBeVisible();

    // 7. Cleanup: revert password back to Password123! so future tests remain idempotent
    await page.evaluate(async (newPassword) => {
      const token = localStorage.getItem('toktickit_auth_token');
      await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: newPassword,
          newPassword: 'Password123!',
        }),
      });
    }, tempNewPass);
  });
});
