import { test, expect, type Locator, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
  uiSignIn,
  ACCOUNTS,
  DEV_PASSWORD,
  STRONG_PASSWORD,
  TEMP_PASSWORD,
  provisionLoginReadyStaff,
  apiAdminToken,
  apiFindUserId,
  apiResetPasswordForUser,
  apiLogin,
  apiPost,
  apiResolveReferenceIds,
  apiCreateTicket,
} from './e2e-support';

const baseScreenshotDir = path.join(process.cwd(), 'artifacts', 'lab-03', 'screenshots');

const dirs = {
  auth: path.join(baseScreenshotDir, 'auth'),
  staffQueue: path.join(baseScreenshotDir, 'staff-queue'),
  staffTicket: path.join(baseScreenshotDir, 'staff-ticket'),
  userManagement: path.join(baseScreenshotDir, 'user-management'),
  requester: path.join(baseScreenshotDir, 'requester'),
};

for (const dir of Object.values(dirs)) {
  fs.mkdirSync(dir, { recursive: true });
}

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

async function assertZeroHorizontalOverflow(page: Page, screenLabel: string) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow, `Expected zero horizontal overflow on ${screenLabel}`).toBe(false);
}

/** The desktop staff queue table (Bootstrap `d-none d-lg-block`, shown at >= 992px). */
function staffQueueTable(page: Page): Locator {
  return page.locator('div.d-none.d-lg-block table');
}

/** Signs the provisioned staff member in and lands on the IT Staff Ticket Queue. */
async function signInToStaffQueue(page: Page): Promise<void> {
  await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
  await expect(page.getByRole('heading', { name: 'IT Staff Ticket Queue' })).toBeVisible();
}

/** Drops the browser back to a genuinely signed-out state (AC-3.1). */
async function resetToSignedOut(page: Page): Promise<void> {
  // The session also lives in an httpOnly cookie that `document.cookie` cannot
  // delete, so it has to be cleared through the browser context. Without this
  // the client silently re-authenticates on reload and never renders Login.
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
}

let fixtureTicketId = 0;
let fixtureTicketNo = '';

test.describe('AC-9.1 & AC-9.2: Visual Inspection & Screenshot Artifacts', () => {
  test.beforeAll(async ({ request }) => {
    // 1. All three seeded IT Staff accounts ship with requiresPasswordChange =
    //    true, so Kevin has to clear the first-login gate before the staff
    //    shell is reachable at all.
    await provisionLoginReadyStaff(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);

    // 2. A dedicated fixture ticket so the detail screenshots always show the
    //    same readable content instead of whatever a previous run left behind.
    const requesterToken = (
      await apiLogin(request, ACCOUNTS.requester.email, DEV_PASSWORD)
    ).token;
    const { categoryId, relatedSystemId } = await apiResolveReferenceIds(
      request,
      requesterToken,
      'Hardware',
      'Corporate Laptop'
    );
    const ticket = await apiCreateTicket(request, requesterToken, {
      summary: 'External monitor flickers after the laptop wakes from sleep',
      description:
        'The external monitor on the docking station flickers and drops its signal every time the laptop wakes from sleep. Swapping the cable did not help, and the issue reproduces on every wake-up.',
      categoryId,
      relatedSystemId,
      requestedPriority: 'MEDIUM',
    });
    fixtureTicketId = ticket.id;
    fixtureTicketNo = ticket.ticketNo;
    expect(fixtureTicketNo, 'the screenshot fixture must be numbered').toMatch(/^TKT-/);

    // 3. Seed one public comment and one confidential internal note so the
    //    staff/requester detail screenshots demonstrate both channels (AC-4.2,
    //    AC-4.4) rather than an empty thread.
    const staffToken = (
      await apiLogin(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD)
    ).token;

    const publicComment = await apiPost(
      request,
      staffToken,
      `/api/tickets/${fixtureTicketId}/comments`,
      {
        content:
          'Hi Jennifer, thanks for the clear report. Could you confirm whether the flicker also happens on battery power? That tells us whether the dock or the display driver is at fault.',
      }
    );
    expect(publicComment.status, 'Staff public comment should be created').toBe(201);

    const internalNote = await apiPost(
      request,
      staffToken,
      `/api/tickets/${fixtureTicketId}/notes`,
      {
        content:
          'Checked the dock firmware: 3 tickets in the last 30 days with the same wake-from-sleep symptom. Treating as a known driver bug, requesting a loaner unit pending the OEM patch.',
      }
    );
    expect(internalNote.status, 'Staff internal note should be created').toBe(201);
  });

  test('01: Auth screens & error states (Desktop & Mobile)', async ({ page, request }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // 1.1 Clean login screen
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await assertZeroHorizontalOverflow(page, 'Desktop Login Screen');
    await page.screenshot({ path: path.join(dirs.auth, 'desktop-01-login.png') });

    // 1.2 Invalid password error banner (AC-3.1, BR-04)
    await page.fill('#email', ACCOUNTS.requester.email);
    await page.fill('#password', 'WrongPassword999!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await assertZeroHorizontalOverflow(page, 'Desktop Login Error');
    await page.screenshot({ path: path.join(dirs.auth, 'desktop-02-login-error.png') });

    // 1.3 Mandatory Password Change Screen (AC-3.3, AC-3.4)
    // A previous run may already have completed Alex's first-login change, so
    // the admin reset API is used to put the account back into that state.
    const adminToken = await apiAdminToken(request);
    const staffId = await apiFindUserId(request, adminToken, ACCOUNTS.passwordChangeStaff.email);
    const reset = await apiResetPasswordForUser(
      request,
      adminToken,
      staffId,
      TEMP_PASSWORD
    );
    expect(reset.status, 'Admin password reset should succeed').toBe(200);
    expect(reset.body.requiresPasswordChange, 'Reset must flag a first-login change').toBe(true);

    await page.fill('#email', ACCOUNTS.passwordChangeStaff.email);
    await page.fill('#password', TEMP_PASSWORD);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Mandatory Password Change' })
    ).toBeVisible();
    await assertZeroHorizontalOverflow(page, 'Desktop Change Password Screen');
    await page.screenshot({ path: path.join(dirs.auth, 'desktop-03-change-password.png') });

    // 1.4 Mobile Login & Change Password
    await page.setViewportSize(VIEWPORTS.mobile);
    await resetToSignedOut(page);
    await assertZeroHorizontalOverflow(page, 'Mobile Login Screen');
    await page.screenshot({ path: path.join(dirs.auth, 'mobile-01-login.png') });

    await page.fill('#email', ACCOUNTS.passwordChangeStaff.email);
    await page.fill('#password', TEMP_PASSWORD);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Mandatory Password Change' })
    ).toBeVisible();
    await assertZeroHorizontalOverflow(page, 'Mobile Change Password Screen');
    await page.screenshot({ path: path.join(dirs.auth, 'mobile-02-change-password.png') });
  });

  test('02: Staff Ticket Queue across viewports', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await signInToStaffQueue(page);

    await assertZeroHorizontalOverflow(page, 'Desktop Staff Queue');
    await page.screenshot({ path: path.join(dirs.staffQueue, 'desktop-04-staff-queue.png') });

    // Tablet
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Tablet Staff Queue');
    await page.screenshot({ path: path.join(dirs.staffQueue, 'tablet-01-staff-queue.png') });

    // Mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Mobile Staff Queue');
    await page.screenshot({ path: path.join(dirs.staffQueue, 'mobile-03-staff-queue.png') });

    // Mobile Hamburger
    const navToggle = page.locator('button.navbar-toggler');
    await expect(navToggle, 'the mobile nav toggle should be reachable').toBeVisible();
    await navToggle.click();
    await expect(navToggle).toHaveAttribute('aria-expanded', 'true');
    await page.waitForTimeout(350);
    await assertZeroHorizontalOverflow(page, 'Mobile Hamburger Nav');
    await page.screenshot({ path: path.join(dirs.staffQueue, 'mobile-04-hamburger-nav.png') });
    await navToggle.click();
    await page.waitForTimeout(200);
  });

  test('03: Staff Ticket Detail & Internal Notes', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await signInToStaffQueue(page);

    await page
      .getByPlaceholder(/Search by Ticket No or Summary/i)
      .fill(fixtureTicketNo);
    const row = staffQueueTable(page).getByRole('row', { name: new RegExp(fixtureTicketNo) });
    await expect(row, 'the fixture ticket should be searchable by ticket number').toHaveCount(1);
    await row.click();

    const detail = page.getByTestId('staff-ticket-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText(fixtureTicketNo);
    await expect(detail.getByRole('heading', { name: 'Problem Statement' })).toBeVisible();
    await expect(detail.getByTestId('public-comment-card').first()).toBeVisible();
    await assertZeroHorizontalOverflow(page, 'Desktop Staff Ticket Detail');
    await page.screenshot({
      path: path.join(dirs.staffTicket, 'desktop-05-staff-ticket-detail.png'),
      fullPage: true,
    });

    // Internal Notes Tab (AC-4.4, BR-15) - confidential channel
    await detail.getByTestId('tab-internal-notes').click();
    await expect(page.getByTestId('internal-notes-banner')).toBeVisible();
    await expect(detail.getByTestId('internal-note-card').first()).toBeVisible();
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Desktop Staff Internal Notes');
    await page.screenshot({
      path: path.join(dirs.staffTicket, 'desktop-06-internal-notes.png'),
      fullPage: true,
    });

    // Back to the default Public Comments tab for the responsive captures
    await detail.getByTestId('tab-public-comments').click();
    await expect(detail.getByTestId('public-comment-card').first()).toBeVisible();

    // Tablet
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Tablet Staff Ticket Detail');
    await page.screenshot({
      path: path.join(dirs.staffTicket, 'tablet-02-staff-ticket-detail.png'),
      fullPage: true,
    });

    // Mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Mobile Staff Ticket Detail');
    await page.screenshot({
      path: path.join(dirs.staffTicket, 'mobile-05-staff-ticket-detail.png'),
      fullPage: true,
    });
  });

  test('04: Administrator User Management across viewports', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await uiSignIn(page, ACCOUNTS.admin.email, DEV_PASSWORD);

    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
    await assertZeroHorizontalOverflow(page, 'Desktop User Management Table');
    // Viewport-only: the directory grows with every admin test, so a full-page
    // capture would be an unreadable 10,000px strip.
    await page.screenshot({
      path: path.join(dirs.userManagement, 'desktop-07-user-management.png'),
    });

    // Create User Modal
    await page.getByRole('button', { name: '+ Create User' }).click();
    const modal = page.getByTestId('user-form-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Create User' })).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(dirs.userManagement, 'desktop-08-create-user-modal.png'),
    });
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toBeHidden();

    // Edit User Modal with Self-Deactivation Guard (AC-7.4, BR-23)
    const adminRow = page
      .locator('div.d-none.d-md-block table tbody tr')
      .filter({ hasText: ACCOUNTS.admin.email });
    await expect(adminRow, 'the signed-in admin row should be listed').toHaveCount(1);
    await adminRow.getByRole('button', { name: 'Edit' }).click();
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Edit User' })).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(dirs.userManagement, 'desktop-09-edit-user-modal-self-guard.png'),
    });
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toBeHidden();

    // Tablet
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Tablet User Management');
    await page.screenshot({
      path: path.join(dirs.userManagement, 'tablet-03-user-management.png'),
    });

    // Mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Mobile User Management');
    await page.screenshot({
      path: path.join(dirs.userManagement, 'mobile-06-user-management.png'),
    });
  });

  test('05: Requester Ticket Detail & Public Comments', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await uiSignIn(page, ACCOUNTS.requester.email, DEV_PASSWORD);

    await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
    await page
      .getByPlaceholder(/Search by ticket number or summary/i)
      .fill(fixtureTicketNo);

    const row = page
      .locator('div.d-none.d-lg-block table')
      .getByRole('row', { name: new RegExp(fixtureTicketNo) });
    await expect(row, 'the fixture ticket should be searchable by ticket number').toHaveCount(1);
    await row.click();

    await expect(page.getByRole('heading', { name: 'Problem Statement' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Public Comments/i })).toBeVisible();
    await assertZeroHorizontalOverflow(page, 'Desktop Requester Ticket Detail');
    await page.screenshot({
      path: path.join(dirs.requester, 'desktop-10-requester-ticket-detail.png'),
      fullPage: true,
    });

    // Mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Mobile Requester Ticket Detail');
    await page.screenshot({
      path: path.join(dirs.requester, 'mobile-07-requester-ticket-detail.png'),
      fullPage: true,
    });
  });
});
