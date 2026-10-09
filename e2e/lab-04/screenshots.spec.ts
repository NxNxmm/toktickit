import { test, expect, type Locator, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
  uiSignIn,
  ACCOUNTS,
  DEV_PASSWORD,
  STRONG_PASSWORD,
  provisionLoginReadyStaff,
  apiLogin,
  apiPatch,
  apiPost,
  apiResolveReferenceIds,
  apiCreateTicket,
} from '../lab-03/e2e-support';

/**
 * Lab 4: Visual Inspection & Screenshot Artifacts
 *
 * Captures the Lab 4 deliverables (Actions Taken, Ticket Workflow, Role
 * Dashboards, and Accessibility polish) into `artifacts/lab-04/screenshots/`
 * so each feature can be reviewed without running the app.
 *
 * Layout mirrors `e2e/lab-03/screenshots.spec.ts`:
 *   artifacts/lab-04/screenshots/
 *     dashboards/       — Requester / IT Staff / Admin dashboards at 3 viewports
 *     actions-taken/    — work log, add modal, validation error, requester read-only
 *     ticket-workflow/  — status controls, resolution gate, advisory dialog, 409 conflict
 *     accessibility/    — focus rings, non-color status cues, mobile hamburger nav
 */

const baseScreenshotDir = path.join(process.cwd(), 'artifacts', 'lab-04', 'screenshots');

const dirs = {
  dashboards: path.join(baseScreenshotDir, 'dashboards'),
  actionsTaken: path.join(baseScreenshotDir, 'actions-taken'),
  workflow: path.join(baseScreenshotDir, 'ticket-workflow'),
  accessibility: path.join(baseScreenshotDir, 'accessibility'),
};

for (const dir of Object.values(dirs)) {
  fs.mkdirSync(dir, { recursive: true });
}

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
} as const;

async function assertZeroHorizontalOverflow(page: Page, screenLabel: string) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow, `Expected zero horizontal overflow on ${screenLabel}`).toBe(false);
}

/** The desktop tables (Bootstrap `d-none d-lg-block`, shown at >= 992px). */
function desktopTable(page: Page): Locator {
  return page.locator('div.d-none.d-lg-block table');
}

/** Signs in through the real Login form and navigates to the role dashboard. */
async function signInToDashboard(
  page: Page,
  email: string,
  password: string,
  dashboardTestId: string
): Promise<void> {
  await uiSignIn(page, email, password);
  await expect(page.locator('nav.navbar')).toBeVisible({ timeout: 8000 });
  const navDashboard = page.getByTestId('nav-dashboard');
  if (!(await navDashboard.isVisible())) {
    const toggler = page.locator('button.navbar-toggler');
    if (await toggler.isVisible()) {
      await toggler.click();
      await expect(navDashboard).toBeVisible({ timeout: 4000 });
    }
  }
  await navDashboard.click();
  await expect(page.getByTestId(dashboardTestId)).toBeVisible({ timeout: 10000 });
}

/** Opens a ticket from the requester's My Tickets list (desktop table). */
async function openRequesterTicket(page: Page, ticketNo: string): Promise<void> {
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
  await page.getByPlaceholder(/Search by ticket number or summary/i).fill(ticketNo);
  const row = desktopTable(page).getByRole('row', { name: new RegExp(ticketNo) });
  await expect(row).toHaveCount(1);
  await row.click();
}

let staffToken = '';
let requesterToken = '';
let fixtureTicketId = 0;
let fixtureTicketNo = '';
let workflowTicketId = 0;
let workflowTicketNo = '';
let workflowVersion = 1;

test.describe.configure({ mode: 'serial' });

test.describe('Lab 4: Visual Inspection & Screenshot Artifacts', () => {
  test.beforeAll(async ({ request }) => {
    // 1. A seeded IT Staff account ships with requiresPasswordChange = true,
    //    so it has to be provisioned before the staff shell is reachable.
    await provisionLoginReadyStaff(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);

    requesterToken = (await apiLogin(request, ACCOUNTS.requester.email, DEV_PASSWORD)).token;
    staffToken = (await apiLogin(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD)).token;

    // 2. Fixture ticket with a logged Action Taken so the work log is not empty.
    const hardware = await apiResolveReferenceIds(
      request,
      requesterToken,
      'Hardware',
      'Corporate Laptop'
    );
    const fixture = await apiCreateTicket(request, requesterToken, {
      categoryId: hardware.categoryId,
      relatedSystemId: hardware.relatedSystemId,
      summary: 'External monitor flickers after the laptop wakes from sleep',
      description:
        'The external monitor on the docking station flickers and drops its signal every time the laptop wakes from sleep. Swapping the cable did not help, and the issue reproduces on every wake-up.',
      requestedPriority: 'HIGH',
    });
    fixtureTicketId = fixture.id;
    fixtureTicketNo = fixture.ticketNo;
    expect(fixtureTicketNo, 'the screenshot fixture must be numbered').toMatch(/^TKT-/);

    const action = await apiPost(
      request,
      staffToken,
      `/api/tickets/${fixtureTicketId}/actions-taken`,
      {
        description:
          'Reseated the docking-station display cable and updated the GPU driver to v537.42.',
        result: 'Flicker no longer reproduces after 10 consecutive sleep/wake cycles.',
        followUpRequired: true,
        followUpNote: 'Monitor the user for one week and confirm the driver remains stable.',
        attachmentNotes: 'display-diagnostics-report.pdf',
      }
    );
    expect(action.status, 'the fixture Action Taken should be created').toBe(201);

    // 3. A dedicated workflow ticket advanced to IN_PROGRESS (0 Actions Taken)
    //    so the transition dropdown offers RESOLVED and the resolution gate can
    //    be demonstrated, plus the requester advisory dialog is reachable.
    const network = await apiResolveReferenceIds(request, requesterToken, 'Network', 'Campus Wi-Fi');
    const workflowTicket = await apiCreateTicket(request, requesterToken, {
      categoryId: network.categoryId,
      relatedSystemId: network.relatedSystemId,
      summary: 'Wi-Fi keeps disconnecting in the CB2 study room',
      description:
        'The campus Wi-Fi drops every few minutes in the CB2 study room, making online lectures impossible to follow.',
      requestedPriority: 'MEDIUM',
    });
    workflowTicketId = workflowTicket.id;
    workflowTicketNo = workflowTicket.ticketNo;

    const toOpen = await apiPatch(
      request,
      staffToken,
      `/api/tickets/${workflowTicketId}/workflow`,
      { status: 'OPEN', version: 1 }
    );
    expect(toOpen.status, 'NEW -> OPEN should succeed').toBe(200);

    const toInProgress = await apiPatch(
      request,
      staffToken,
      `/api/tickets/${workflowTicketId}/workflow`,
      { status: 'IN_PROGRESS', version: toOpen.body.version }
    );
    expect(toInProgress.status, 'OPEN -> IN_PROGRESS should succeed').toBe(200);
    workflowVersion = toInProgress.body.version;
  });

  test('01: Role dashboards across viewports', async ({ page }) => {
    // ── Requester dashboard ──────────────────────────────────────────────────
    await page.setViewportSize(VIEWPORTS.desktop);
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD, 'requester-dashboard');
    await expect(page.getByTestId('metric-total-open')).toBeVisible();
    await assertZeroHorizontalOverflow(page, 'Desktop Requester Dashboard');
    await page.screenshot({
      path: path.join(dirs.dashboards, 'desktop-01-requester-dashboard.png'),
    });

    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Tablet Requester Dashboard');
    await page.screenshot({
      path: path.join(dirs.dashboards, 'tablet-01-requester-dashboard.png'),
    });

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Mobile Requester Dashboard');
    await page.screenshot({
      path: path.join(dirs.dashboards, 'mobile-01-requester-dashboard.png'),
    });

    // ── IT Staff dashboard ───────────────────────────────────────────────────
    await page.setViewportSize(VIEWPORTS.desktop);
    await signInToDashboard(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD, 'staff-dashboard');
    await expect(page.getByTestId('metric-new-tickets')).toBeVisible();
    await assertZeroHorizontalOverflow(page, 'Desktop Staff Dashboard');
    await page.screenshot({ path: path.join(dirs.dashboards, 'desktop-02-staff-dashboard.png') });

    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Tablet Staff Dashboard');
    await page.screenshot({ path: path.join(dirs.dashboards, 'tablet-02-staff-dashboard.png') });

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Mobile Staff Dashboard');
    await page.screenshot({ path: path.join(dirs.dashboards, 'mobile-02-staff-dashboard.png') });

    // ── Administrator dashboard (Staff dashboard + User Stats) ───────────────
    await page.setViewportSize(VIEWPORTS.desktop);
    await signInToDashboard(page, ACCOUNTS.admin.email, DEV_PASSWORD, 'staff-dashboard');
    await expect(page.getByTestId('admin-user-stats')).toBeVisible();
    await assertZeroHorizontalOverflow(page, 'Desktop Admin Dashboard');
    await page.screenshot({
      path: path.join(dirs.dashboards, 'desktop-03-admin-dashboard.png'),
      fullPage: true,
    });
  });

  test('02: Actions Taken work log, modal and requester read-only view', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await expect(page.getByRole('heading', { name: 'IT Staff Ticket Queue' })).toBeVisible();

    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill(fixtureTicketNo);
    const row = desktopTable(page).getByRole('row', { name: new RegExp(fixtureTicketNo) });
    await expect(row).toHaveCount(1);
    await row.click();

    const detail = page.getByTestId('staff-ticket-detail');
    await expect(detail).toBeVisible();
    const actionsSection = page.getByTestId('actions-taken-section');
    await expect(actionsSection).toBeVisible();
    await expect(actionsSection).toContainText('Reseated the docking-station display cable');
    await assertZeroHorizontalOverflow(page, 'Desktop Staff Actions Taken');
    await page.screenshot({
      path: path.join(dirs.actionsTaken, 'desktop-01-staff-actions-taken.png'),
      fullPage: true,
    });

    // Add Action Taken modal (empty state)
    await page.getByTestId('add-action-btn').click();
    const modal = page.getByTestId('action-taken-modal');
    await expect(modal).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(dirs.actionsTaken, 'desktop-02-add-action-modal.png') });

    // Validation: Follow-Up Required checked but no note -> inline error
    await modal
      .getByLabel(/Action Description/i)
      .fill('Ran a full network trace on the CB2 access point.');
    await modal.getByLabel(/Result/i).fill('Traced intermittent packet loss to a saturated uplink port.');
    await modal.getByLabel(/Follow-Up Required\?/i).check();
    await modal.getByTestId('save-action-btn').click();
    await expect(modal.getByTestId('followup-note-error')).toBeVisible();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(dirs.actionsTaken, 'desktop-03-add-action-validation.png'),
    });
    await modal.getByTestId('cancel-action-btn').click();
    await expect(modal).not.toBeVisible();

    // Responsive captures of the same work log
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Tablet Staff Actions Taken');
    await page.screenshot({
      path: path.join(dirs.actionsTaken, 'tablet-01-staff-actions-taken.png'),
      fullPage: true,
    });

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Mobile Staff Actions Taken');
    await page.screenshot({
      path: path.join(dirs.actionsTaken, 'mobile-01-staff-actions-taken.png'),
      fullPage: true,
    });

    // ── Requester read-only view (no Add / Edit controls) ────────────────────
    await page.setViewportSize(VIEWPORTS.desktop);
    await uiSignIn(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await openRequesterTicket(page, fixtureTicketNo);

    const requesterActions = page.getByTestId('actions-taken-section');
    await expect(requesterActions).toBeVisible();
    await expect(requesterActions.getByTestId('add-action-btn')).toHaveCount(0);
    await expect(requesterActions.getByTestId('edit-action-btn')).toHaveCount(0);
    await assertZeroHorizontalOverflow(page, 'Desktop Requester Read-Only Actions');
    await page.screenshot({
      path: path.join(dirs.actionsTaken, 'desktop-04-requester-readonly.png'),
      fullPage: true,
    });
  });

  test('03: Ticket workflow, resolution gate, advisory dialog and conflict', async ({
    page,
    request,
  }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await expect(page.getByRole('heading', { name: 'IT Staff Ticket Queue' })).toBeVisible();

    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill(workflowTicketNo);
    await desktopTable(page)
      .getByRole('row', { name: new RegExp(workflowTicketNo) })
      .click();

    const detail = page.getByTestId('staff-ticket-detail');
    await expect(detail).toBeVisible();
    const statusSelect = page.getByTestId('status-transition-select');
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption('RESOLVED');
    await page.waitForTimeout(200);
    await assertZeroHorizontalOverflow(page, 'Desktop Staff Workflow Controls');
    await page.screenshot({
      path: path.join(dirs.workflow, 'desktop-01-staff-workflow-controls.png'),
      fullPage: true,
    });

    // Resolution gate: RESOLVED with 0 Actions Taken -> 422 warning banner
    await page.getByTestId('update-status-btn').click();
    const gateBanner = page.getByTestId('resolution-gate-banner');
    await expect(gateBanner).toBeVisible();
    await expect(gateBanner).toContainText(/Work Verification Required/i);
    await gateBanner.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(dirs.workflow, 'desktop-02-resolution-gate-banner.png'),
    });

    // Concurrency conflict: bump the version behind the user's back, then update
    const bump = await apiPatch(
      request,
      staffToken,
      `/api/tickets/${workflowTicketId}/workflow`,
      { itPriority: 'HIGH', version: workflowVersion }
    );
    expect(bump.status, 'the version bump should succeed').toBe(200);

    await statusSelect.selectOption('WAITING_FOR_REQUESTER');
    await page.getByTestId('update-status-btn').click();
    const conflictBanner = page.getByTestId('conflict-banner');
    await expect(conflictBanner).toBeVisible();
    await expect(conflictBanner).toContainText(/Conflict Detected/i);
    await expect(page.getByTestId('refresh-ticket-btn')).toBeVisible();
    await conflictBanner.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(dirs.workflow, 'desktop-03-conflict-banner.png'),
    });

    // Requester advisory ("Problem Appears Resolved") dialog — status stays put
    await uiSignIn(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await openRequesterTicket(page, workflowTicketNo);

    const resolveBtn = page.locator('#resolve-indication-btn');
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();
    const advisoryModal = page.getByTestId('resolve-modal');
    await expect(advisoryModal).toBeVisible();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(dirs.workflow, 'desktop-04-requester-advisory-dialog.png'),
    });

    await page.locator('#confirm-resolve-btn').click();
    await expect(
      page.locator('#resolved-indicated-badge').or(page.getByText(/Resolution Indicated/i))
    ).toBeVisible();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(dirs.workflow, 'desktop-05-resolution-indicated.png'),
      fullPage: true,
    });
  });

  test('04: Accessibility — focus rings, non-color status cues, mobile nav', async ({ page }) => {
    // ── Visible focus ring on an interactive metric card (AC-19) ─────────────
    await page.setViewportSize(VIEWPORTS.desktop);
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD, 'requester-dashboard');
    await page.getByTestId('metric-total-open').focus();
    await page.waitForTimeout(150);
    await assertZeroHorizontalOverflow(page, 'Desktop Focus Ring');
    await page.screenshot({ path: path.join(dirs.accessibility, 'desktop-01-focus-ring.png') });

    // ── Non-color status cues (icons) on the staff queue (AC-9.1) ────────────
    await signInToDashboard(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD, 'staff-dashboard');
    await page.getByTestId('nav-ticket-queue').click();
    await expect(page.getByRole('heading', { name: 'IT Staff Ticket Queue' })).toBeVisible();
    await assertZeroHorizontalOverflow(page, 'Desktop Status Badges');
    await page.screenshot({ path: path.join(dirs.accessibility, 'desktop-02-status-badges.png') });

    // ── Mobile hamburger navigation on the dashboard shell ───────────────────
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(300);
    const navToggle = page.locator('button.navbar-toggler');
    await expect(navToggle, 'the mobile nav toggle should be reachable').toBeVisible();
    await navToggle.click();
    await expect(navToggle).toHaveAttribute('aria-expanded', 'true');
    await page.waitForTimeout(350);
    await assertZeroHorizontalOverflow(page, 'Mobile Hamburger Nav');
    await page.screenshot({ path: path.join(dirs.accessibility, 'mobile-01-hamburger-nav.png') });
  });
});
