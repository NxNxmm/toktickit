import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  ACCOUNTS,
  API_BASE,
  DEV_PASSWORD,
  STRONG_PASSWORD,
  TEMP_PASSWORD,
  apiAdminToken,
  apiFindUserId,
  apiGet,
  apiLoginExpectingStatus,
  apiPatch,
  apiPost,
  apiResetPasswordForUser,
  provisionLoginReadyStaff,
  uiSignIn,
} from './e2e-support';

/**
 * E2E-03 — End-to-End user administration.
 *
 * Covers AC-8.3 together with AC-7.1 to AC-7.5: account creation, duplicate
 * email rejection, initial password reset with a forced first-login change,
 * the self-deactivation guard, and role-based 403s for non-admin callers.
 *
 * The suite is serial: each test continues with the account the previous one
 * created. The fixture account is deactivated at the end, which both proves the
 * deactivation path and keeps re-runs idempotent.
 */

/** Unique per run so the suite never collides with a previous run's fixture. */
const STAMP = Date.now();
const NEW_USER = {
  name: 'Priya Sharma',
  email: `priya.sharma.e2e.${STAMP}@kmutt.ac.th`,
  role: 'IT_STAFF',
};

let adminToken = '';
let adminId = 0;
let createdUserId = 0;

/** The desktop user directory table (Bootstrap `d-none d-md-block`). */
function directoryTable(page: Page): Locator {
  return page.locator('div.d-none.d-md-block table');
}

/** The green success banner rendered above the directory. */
function successBanner(page: Page): Locator {
  return page.getByTestId('user-management').locator('div[role="status"]').first();
}

/** Signs the seeded Administrator in and lands on User Management. */
async function signInAsAdmin(page: Page): Promise<Locator> {
  await uiSignIn(page, ACCOUNTS.admin.email, DEV_PASSWORD);
  const panel = page.getByTestId('user-management');
  await expect(panel).toBeVisible();
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
  return panel;
}

/** Narrows the directory to a single account and returns its table row. */
async function searchDirectory(page: Page, panel: Locator, email: string): Promise<Locator> {
  await panel.getByLabel('Search users').fill(email);
  const row = directoryTable(page).getByRole('row').filter({ hasText: email });
  await expect(row, `the directory should list ${email}`).toHaveCount(1);
  return row;
}

test.describe.configure({ mode: 'serial' });

test.describe('E2E-03: End-to-End User Administration (AC-8.3, AC-7.1 to AC-7.5)', () => {
  test.beforeAll(async ({ request }) => {
    adminToken = await apiAdminToken(request);
    expect(adminToken, 'the seeded Administrator should be usable').toBeTruthy();
    adminId = await apiFindUserId(request, adminToken, ACCOUNTS.admin.email);

    // IT Staff and Requester accounts are used below to prove the 403 boundary.
    await provisionLoginReadyStaff(request, ACCOUNTS.reassignmentStaff.email, STRONG_PASSWORD);
  });

  test('E2E-03.1: Administrator creates a user who must change the initial password (AC-7.1, BR-21)', async ({
    page,
  }) => {
    const panel = await signInAsAdmin(page);

    // 1. Open the Create User modal
    await panel.getByRole('button', { name: '+ Create User' }).click();
    const modal = page.getByTestId('user-form-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Create User' })).toBeVisible();
    await expect(modal.locator('#create-user-active')).toBeChecked();

    // 2. A weak initial password is refused client-side (BR-03)
    await modal.getByLabel('Full Name').fill(NEW_USER.name);
    await modal.getByLabel('Email Address').fill(NEW_USER.email);
    await modal.locator('#create-user-role').selectOption(NEW_USER.role);
    await modal.getByLabel('Initial Password').fill('weak');
    await modal.getByRole('button', { name: 'Create User', exact: true }).click();
    await expect(page.locator('#user-password-error')).toContainText('At least 8 characters');
    await expect(modal).toBeVisible();

    // 3. A compliant submission succeeds and closes the modal
    await modal.getByLabel('Initial Password').fill(STRONG_PASSWORD);
    await modal.getByRole('button', { name: 'Create User', exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(successBanner(page)).toContainText(
      'The initial password must be changed at first login'
    );

    // 4. The new account is in the directory as an active IT Staff user
    const row = await searchDirectory(page, panel, NEW_USER.email);
    await expect(row).toContainText(NEW_USER.name);
    await expect(row).toContainText('IT Staff');
    await expect(row).toContainText('Active');

    // 5. Server-side the account exists, is active, and is flagged for a change
    const directory = await apiGet(
      page.request,
      adminToken,
      `/api/admin/users?search=${encodeURIComponent(NEW_USER.email)}`
    );
    expect(directory.status).toBe(200);
    const created = directory.body.find((user: any) => user.email === NEW_USER.email);
    expect(created, 'the created user should be persisted').toBeTruthy();
    createdUserId = created.id;
    expect(created.role).toBe(NEW_USER.role);
    expect(created.isActive).toBe(true);
    expect(created.requiresPasswordChange).toBe(true);

    // 6. The directory never leaks password or lockout material (BR-25)
    expect(created).not.toHaveProperty('passwordHash');
    expect(created).not.toHaveProperty('failedLoginAttempts');
  });

  test('E2E-03.2: Duplicate email is rejected by the API and surfaced in the UI (AC-7.2, BR-21)', async ({
    page,
  }) => {
    const panel = await signInAsAdmin(page);

    // 1. Re-create the same email through the UI
    await panel.getByRole('button', { name: '+ Create User' }).click();
    const modal = page.getByTestId('user-form-modal');
    await expect(modal).toBeVisible();
    await modal.getByLabel('Full Name').fill(NEW_USER.name);
    await modal.getByLabel('Email Address').fill(NEW_USER.email);
    await modal.locator('#create-user-role').selectOption(NEW_USER.role);
    await modal.getByLabel('Initial Password').fill(STRONG_PASSWORD);
    await modal.getByRole('button', { name: 'Create User', exact: true }).click();

    // 2. A conflict alert is shown and the modal stays open
    await expect(modal.getByRole('alert')).toContainText(
      'A user account with this email address already exists'
    );
    await expect(modal).toBeVisible();

    // 3. Email matching is case-insensitive on the server too
    const duplicate = await apiPost(page.request, adminToken, '/api/admin/users', {
      name: 'Priya Sharma Duplicate',
      email: NEW_USER.email.toUpperCase(),
      role: NEW_USER.role,
      isActive: true,
      initialPassword: STRONG_PASSWORD,
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe('Conflict');

    // 4. Exactly one account exists for that email
    const directory = await apiGet(
      page.request,
      adminToken,
      `/api/admin/users?search=${encodeURIComponent(NEW_USER.email)}`
    );
    expect(
      directory.body.filter((user: any) => user.email.toLowerCase() === NEW_USER.email).length
    ).toBe(1);

    // Close the modal so the next test starts clean
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toHaveCount(0);
  });

  test('E2E-03.3: Reset issues a temporary password that forces a change at next login (AC-7.3, BR-22)', async ({
    page,
  }) => {
    const panel = await signInAsAdmin(page);

    // 1. Locate the fixture account and open its Edit modal
    const row = await searchDirectory(page, panel, NEW_USER.email);
    await row.getByRole('button', { name: 'Edit' }).click();

    const editModal = page.getByTestId('user-form-modal');
    await expect(editModal).toBeVisible();
    await expect(editModal.getByRole('heading', { name: 'Edit User' })).toBeVisible();

    // 2. Open the reset modal and try a weak password (BR-03)
    await editModal.getByRole('button', { name: 'Reset Initial Password' }).click();
    const resetModal = page.getByTestId('reset-password-modal');
    await expect(resetModal).toBeVisible();
    await expect(resetModal).toContainText(NEW_USER.name);
    await resetModal.getByLabel('New Initial Password').fill('weak');
    await resetModal.getByRole('button', { name: 'Reset Password' }).click();
    await expect(resetModal.getByRole('alert')).toContainText('Password must include');

    // 3. A compliant temporary password is accepted
    await resetModal.getByLabel('New Initial Password').fill(TEMP_PASSWORD);
    await resetModal.getByRole('button', { name: 'Reset Password' }).click();
    await expect(resetModal).toHaveCount(0);
    await expect(successBanner(page)).toContainText(
      'Password change is required at next login'
    );

    // 4. The superseded password no longer works; the temporary one does
    const withOld = await apiLoginExpectingStatus(
      page.request,
      NEW_USER.email,
      STRONG_PASSWORD
    );
    expect(withOld.status, 'the superseded password must be rejected').toBe(401);

    const withTemp = await apiLoginExpectingStatus(
      page.request,
      NEW_USER.email,
      TEMP_PASSWORD
    );
    expect(withTemp.status, 'the temporary password must be accepted').toBe(200);

    // 5. In the browser the new account is forced through the change screen
    await uiSignIn(page, NEW_USER.email, TEMP_PASSWORD);
    await expect(
      page.getByRole('heading', { name: 'Mandatory Password Change', exact: true })
    ).toBeVisible();
    await expect(page.getByTestId('user-management')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /user management/i })).toHaveCount(0);

    // 6. Completing the change lifts the gate and the staff shell appears
    await page.getByLabel(/current \(temporary\) password \*/i).fill(TEMP_PASSWORD);
    await page.getByLabel('New Password *', { exact: true }).fill(STRONG_PASSWORD);
    await page.getByLabel(/confirm new password \*/i).fill(STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Update Password', exact: true }).click();
    await expect(page.locator('header').getByText('IT Staff', { exact: true })).toBeVisible();

    const afterChange = await apiLoginExpectingStatus(
      page.request,
      NEW_USER.email,
      STRONG_PASSWORD
    );
    expect(afterChange.status, 'the chosen password should become usable').toBe(200);
  });

  test('E2E-03.4: An administrator cannot deactivate their own account (AC-7.4, BR-23)', async ({
    page,
  }) => {
    const panel = await signInAsAdmin(page);

    // 1. The API rejects self-deactivation even when the UI guard is bypassed
    const selfPatch = await apiPatch(page.request, adminToken, `/api/admin/users/${adminId}`, {
      isActive: false,
    });
    expect(selfPatch.status).toBe(422);
    expect(selfPatch.body.error).toBe('Unprocessable Entity');
    expect(selfPatch.body.message).toBe('You cannot deactivate your own account');

    // 2. The UI disables the Active switch and explains why (AC-7.4)
    const adminRow = await searchDirectory(page, panel, ACCOUNTS.admin.email);
    await adminRow.getByRole('button', { name: 'Edit' }).click();

    const adminModal = page.getByTestId('user-form-modal');
    await expect(adminModal).toBeVisible();
    await expect(adminModal.locator('#edit-user-active')).toBeDisabled();
    await expect(adminModal).toContainText('You cannot deactivate your own account');
    await adminModal.getByRole('button', { name: 'Cancel' }).click();
    await expect(adminModal).toHaveCount(0);

    // 3. A *different* account can be deactivated, proving the guard is scoped
    const targetRow = await searchDirectory(page, panel, NEW_USER.email);
    await targetRow.getByRole('button', { name: 'Edit' }).click();

    const targetModal = page.getByTestId('user-form-modal');
    await expect(targetModal.locator('#edit-user-active')).toBeEnabled();
    await targetModal.locator('#edit-user-active').uncheck();
    await targetModal.getByRole('button', { name: 'Save Changes' }).click();
    await expect(targetModal).toHaveCount(0);
    await expect(successBanner(page)).toContainText('User details updated successfully');

    const deactivated = directoryTable(page)
      .getByRole('row')
      .filter({ hasText: NEW_USER.email });
    await expect(deactivated).toContainText('Inactive');

    const persisted = await apiGet(
      page.request,
      adminToken,
      `/api/admin/users?search=${encodeURIComponent(NEW_USER.email)}`
    );
    expect(persisted.body.find((user: any) => user.id === createdUserId).isActive).toBe(false);

    // 4. A deactivated account can no longer authenticate (BR-01)
    const blocked = await apiLoginExpectingStatus(
      page.request,
      NEW_USER.email,
      STRONG_PASSWORD
    );
    expect(blocked.status).toBe(401);
  });

  test('E2E-03.5: Non-admin roles are forbidden from every user-management operation (AC-7.5, BR-24)', async ({
    request,
  }) => {
    // 0. Checked first: an unauthenticated caller is rejected with 401, before
    //    any login in this test has populated the cookie jar.
    const anonymous = await request.get(`${API_BASE}/api/admin/users`);
    expect(anonymous.status()).toBe(401);
    expect((await anonymous.json()).error).toBe('Unauthorized');

    const requesterToken = (
      await apiLoginExpectingStatus(request, ACCOUNTS.requester.email, DEV_PASSWORD)
    ).body.token;
    const staffToken = (
      await apiLoginExpectingStatus(
        request,
        ACCOUNTS.reassignmentStaff.email,
        STRONG_PASSWORD
      )
    ).body.token;
    expect(requesterToken, 'the seeded Requester should be able to authenticate').toBeTruthy();
    expect(staffToken, 'the provisioned IT Staff account should be usable').toBeTruthy();

    // 1. Reading the directory is ADMIN-only
    for (const token of [requesterToken, staffToken]) {
      const directory = await apiGet(request, token, '/api/admin/users');
      expect(directory.status).toBe(403);
      expect(directory.body.error).toBe('Forbidden');
    }

    // 2. Every mutation is ADMIN-only
    const attempts: Array<() => Promise<{ status: number; body: any }>> = [
      () =>
        apiPost(request, requesterToken, '/api/admin/users', {
          name: 'Rogue Requester',
          email: `rogue.${STAMP}@kmutt.ac.th`,
          role: 'ADMIN',
          isActive: true,
          initialPassword: STRONG_PASSWORD,
        }),
      () =>
        apiPatch(request, staffToken, `/api/admin/users/${createdUserId}`, {
          role: 'ADMIN',
        }),
      () => apiResetPasswordForUser(request, requesterToken, createdUserId, TEMP_PASSWORD),
      () => apiResetPasswordForUser(request, staffToken, createdUserId, TEMP_PASSWORD),
    ];

    for (const attempt of attempts) {
      const result = await attempt();
      expect(result.status).toBe(403);
      expect(result.body.error).toBe('Forbidden');
    }

    // 3. The IT Staff caller can still use staff-scoped endpoints, proving the
    //    403 is a role boundary and not a broken session
    const staffQueue = await apiGet(request, staffToken, '/api/staff/tickets');
    expect(staffQueue.status).toBe(200);
  });
});
