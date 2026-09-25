import { test, expect } from '@playwright/test';
import {
  ACCOUNTS,
  DEV_PASSWORD,
  STRONG_PASSWORD,
  TEMP_PASSWORD,
  apiAdminToken,
  apiFindUserId,
  apiGet,
  apiLoginExpectingStatus,
  apiResetPasswordForUser,
  uiReadStoredToken,
  uiSignIn,
} from './e2e-support';

/**
 * E2E-01 — End-to-End authentication and password change.
 *
 * Covers AC-8.1 together with AC-3.1 to AC-3.5:
 *   - login failure for wrong passwords and inactive accounts (BR-01, BR-04)
 *   - active user login and the resulting application shell (AC-3.5)
 *   - the mandatory first-login password change flow (AC-3.3, AC-3.4)
 *   - logout session invalidation (AC-3.2)
 */
test.describe('E2E-01: End-to-End Authentication & Password Change (AC-8.1, AC-3.1 to AC-3.5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('E2E-01.1: Rejects wrong password and inactive account without leaking account state (AC-3.1, BR-01, BR-04)', async ({
    page,
  }) => {
    const loginBanner = page.locator('div.alert[role="alert"]');

    // 1. The unauthenticated root renders the Sign In form
    await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password \*/i)).toBeVisible();

    // 2. Wrong password for a genuinely active account is rejected
    await page.getByLabel(/email address/i).fill(ACCOUNTS.requester.email);
    await page.getByLabel(/password \*/i).fill('WrongPassword999!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // 3. A safe, generic message is shown and no session is stored
    await expect(loginBanner).toContainText(/invalid email or password/i);
    expect(await uiReadStoredToken(page)).toBeNull();

    // 4. The correct password for the seeded inactive account is rejected with
    //    the *same* message, so the UI never reveals that the account exists
    await page.getByLabel(/email address/i).fill(ACCOUNTS.inactiveRequester.email);
    await page.getByLabel(/password \*/i).fill(DEV_PASSWORD);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(loginBanner).toContainText(/invalid email or password/i);
    expect(await uiReadStoredToken(page)).toBeNull();

    // 5. No navigation happened: the user is still on the Sign In screen
    await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'My Tickets', exact: true })).toHaveCount(0);
    await expect(page.getByText('TokTickIT')).toBeVisible();
  });

  test('E2E-01.2: Active user login renders the App Header with name, initials and role badge (AC-3.1, AC-3.5)', async ({
    page,
  }) => {
    await uiSignIn(page, ACCOUNTS.requester.email, DEV_PASSWORD);

    // 1. The App Header identifies the authenticated user (AC-3.5)
    const header = page.locator('header');
    await expect(header.getByText('TokTickIT')).toBeVisible();
    await expect(header.getByText(ACCOUNTS.requester.name, { exact: true })).toBeVisible();
    await expect(header.getByText('JA', { exact: true })).toBeVisible();
    await expect(header.getByText('Requester', { exact: true })).toBeVisible();

    // 2. Requester-specific navigation only
    await expect(page.getByRole('button', { name: 'My Tickets', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /\+ Create Ticket/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /user management/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /ticket queue/i })).toHaveCount(0);

    // 3. The Lab 2 development-mode requester switcher is fully retired
    await expect(page.getByText('DEVELOPMENT MODE')).toHaveCount(0);
    await expect(page.getByText(/Select a Development Requester/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /change requester/i })).toHaveCount(0);

    // 4. A session token is persisted for subsequent API calls
    expect(await uiReadStoredToken(page)).toBeTruthy();
  });

  test('E2E-01.3: Mandatory first-login password change gates the application shell (AC-3.3, AC-3.4)', async ({
    page,
    request,
  }) => {
    // Arrange: the admin reset endpoint always sets requiresPasswordChange = true,
    // so the account is guaranteed to start behind the gate on every run.
    const adminToken = await apiAdminToken(request);
    const staffId = await apiFindUserId(request, adminToken, ACCOUNTS.passwordChangeStaff.email);
    const reset = await apiResetPasswordForUser(request, adminToken, staffId, TEMP_PASSWORD);
    expect(reset.status).toBe(200);
    expect(reset.body.requiresPasswordChange).toBe(true);

    // 1. Sign in with the freshly reset temporary password
    await uiSignIn(page, ACCOUNTS.passwordChangeStaff.email, TEMP_PASSWORD);

    // 2. The user is blocked at the Mandatory Password Change screen
    await expect(
      page.getByRole('heading', { name: 'Mandatory Password Change', exact: true })
    ).toBeVisible();
    await expect(page.getByText(ACCOUNTS.passwordChangeStaff.name)).toBeVisible();
    // Operational navigation is unreachable while the gate is active
    await expect(page.getByRole('button', { name: /ticket queue/i })).toHaveCount(0);

    // 3. A non-compliant password is refused and the checklist stays unmet
    const lengthRequirement = page.locator('li', { hasText: 'At least 8 characters' });
    await page.getByLabel(/current \(temporary\) password \*/i).fill(TEMP_PASSWORD);
    await page.getByLabel('New Password *', { exact: true }).fill('weak');
    await page.getByRole('button', { name: 'Update Password', exact: true }).click();
    await expect(
      page.locator('div:has(> input#newPassword) [role="alert"]')
    ).toContainText(/complexity requirements/i);
    await expect(lengthRequirement).toHaveClass(/text-muted/);

    // 4. A mismatched confirmation is refused
    await page.getByLabel('New Password *', { exact: true }).fill(STRONG_PASSWORD);
    await page.getByLabel(/confirm new password \*/i).fill('DifferentPass2026!');
    await page.getByRole('button', { name: 'Update Password', exact: true }).click();
    await expect(
      page.locator('div:has(> input#confirmPassword) [role="alert"]')
    ).toContainText(/passwords do not match/i);

    // 5. A compliant, matching submission is accepted
    await page.getByLabel(/confirm new password \*/i).fill(STRONG_PASSWORD);
    await expect(lengthRequirement).toHaveClass(/text-success/);
    await page.getByRole('button', { name: 'Update Password', exact: true }).click();

    // 6. The gate lifts and the IT Staff shell renders
    const header = page.locator('header');
    await expect(header.getByText(ACCOUNTS.passwordChangeStaff.name, { exact: true })).toBeVisible();
    await expect(header.getByText('IT Staff', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /ticket queue/i })).toBeVisible();

    // 7. The new credential is live and the old temporary one is dead
    const withNew = await apiLoginExpectingStatus(
      request,
      ACCOUNTS.passwordChangeStaff.email,
      STRONG_PASSWORD
    );
    expect(withNew.status, 'the new password must be accepted').toBe(200);

    const withOld = await apiLoginExpectingStatus(
      request,
      ACCOUNTS.passwordChangeStaff.email,
      TEMP_PASSWORD
    );
    expect(withOld.status, 'the old temporary password must be rejected').toBe(401);

    // 8. The first-login flag is cleared, so /api/auth/me is no longer gated
    const me = await apiGet(request, withNew.body.token, '/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.requiresPasswordChange).toBe(false);

    // Cleanup: restore the documented development credential so the suite stays
    // re-runnable without re-seeding the database.
    const restore = await apiResetPasswordForUser(request, adminToken, staffId, DEV_PASSWORD);
    expect(restore.status).toBe(200);
  });

  test('E2E-01.4: Logout invalidates the session server-side, not just in the browser (AC-3.2)', async ({
    page,
    request,
  }) => {
    // 1. Sign in and capture the issued session token
    await uiSignIn(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.locator('header').getByText(ACCOUNTS.requester.name, { exact: true })).toBeVisible();
    const token = await uiReadStoredToken(page);
    expect(token).toBeTruthy();

    // 2. The token is a working session before logout
    const beforeLogout = await apiGet(request, token!, '/api/auth/me');
    expect(beforeLogout.status).toBe(200);
    expect(beforeLogout.body.email).toBe(ACCOUNTS.requester.email);

    // 3. Sign out through the App Header
    await page.getByRole('button', { name: /logout/i }).click();

    // 4. The client returns to Sign In and the token is discarded
    await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByText(ACCOUNTS.requester.name)).toHaveCount(0);
    expect(await uiReadStoredToken(page)).toBeNull();

    // 5. Server-side the session is destroyed, so the same token is rejected
    const afterLogout = await apiGet(request, token!, '/api/auth/me');
    expect(afterLogout.status).toBe(401);

    // 6. Replaying the stale token against a protected resource also fails
    const replay = await apiGet(request, token!, '/api/tickets');
    expect(replay.status).toBe(401);

    // 7. Reloading cannot resurrect the session
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
  });
});
