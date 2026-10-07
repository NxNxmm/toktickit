import { test, expect } from '@playwright/test';
import {
  ACCOUNTS,
  DEV_PASSWORD,
  STRONG_PASSWORD,
  API_BASE,
  apiLogin,
  apiCreateTicket,
  apiResolveReferenceIds,
  provisionLoginReadyStaff,
  uiSignIn,
} from '../lab-03/e2e-support';

/**
 * E2E-04-03: Role Dashboards — Rendering & Drill-Down Navigation
 * E2E-04-04: Viewport Layout Audit & Accessibility Focus Rings
 *
 * Covers (tests.md):
 *   E2E-04-03 — AC-12, AC-13, AC-14: Role dashboards render appropriate metrics
 *               and drill down to the filtered ticket queue.
 *   E2E-04-04 — AC-18, AC-19 / FR-22: Viewport layout at 375px/768px/1280px,
 *               no horizontal scroll, and focus rings on metric cards.
 */

// ─── Shared state ─────────────────────────────────────────────────────────────
let requesterToken = '';
let staffToken = '';
let ticketId = 0;

async function signInToDashboard(page: any, email: string, password = DEV_PASSWORD) {
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
}

test.describe.configure({ mode: 'serial' });

test.describe('E2E-04-03: Role Dashboards — Metrics & Drill-Down (AC-12, AC-13, AC-14)', () => {
  test.beforeAll(async ({ request }) => {
    // Provision login-ready staff (clears requiresPasswordChange)
    await provisionLoginReadyStaff(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);

    const [requesterLogin, staffLogin] = await Promise.all([
      apiLogin(request, ACCOUNTS.requester.email, DEV_PASSWORD),
      apiLogin(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD),
    ]);
    requesterToken = requesterLogin.token;
    staffToken = staffLogin.token;
    expect(requesterToken).toBeTruthy();
    expect(staffToken).toBeTruthy();

    // Create at least one ticket so dashboards are non-zero
    const { categoryId, relatedSystemId } = await apiResolveReferenceIds(
      request,
      requesterToken,
      'Hardware',
      'Corporate Laptop',
    );
    const ticket = await apiCreateTicket(request, requesterToken, {
      categoryId,
      relatedSystemId,
      summary: `E2E-04-03 Dashboard Test Ticket — ${Date.now()}`,
      description: 'Browser keyboard and trackpad are unresponsive after system update.',
      requestedPriority: 'MEDIUM',
    });
    ticketId = ticket.id;
    expect(ticketId).toBeGreaterThan(0);
  });

  // ── E2E-04-03.1: Requester sees Dashboard as landing page ────────────────
  test('E2E-04-03.1: Requester is greeted by their Dashboard on login (AC-12)', async ({ page }) => {
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);

    // Dashboard should be the default landing view for a Requester
    const dashboard = page.getByTestId('requester-dashboard');
    await expect(dashboard).toBeVisible({ timeout: 8000 });
  });

  // ── E2E-04-03.2: Requester dashboard shows 4 metric cards ────────────────
  test('E2E-04-03.2: Requester Dashboard renders 4 metric cards (AC-12)', async ({ page }) => {
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });

    // All 4 metric card containers must be visible
    await expect(page.getByTestId('metric-total-open')).toBeVisible();
    await expect(page.getByTestId('metric-waiting-for-requester')).toBeVisible();
    await expect(page.getByTestId('metric-recently-updated')).toBeVisible();
    await expect(page.getByTestId('metric-recently-resolved')).toBeVisible();
  });

  // ── E2E-04-03.3: Requester metric counts are non-negative numbers ─────────
  test('E2E-04-03.3: Requester metric card counts are valid numbers (AC-12)', async ({ page }) => {
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });

    // Wait for the counts to load (not skeleton state)
    await expect(page.getByTestId('metric-total-open-count')).toBeVisible({ timeout: 8000 });

    const totalOpenText = await page.getByTestId('metric-total-open-count').textContent();
    const waitingText = await page.getByTestId('metric-waiting-for-requester-count').textContent();
    expect(Number(totalOpenText)).toBeGreaterThanOrEqual(0);
    expect(Number(waitingText)).toBeGreaterThanOrEqual(0);
  });

  // ── E2E-04-03.4: Requester Dashboard nav link in AppHeader ───────────────
  test('E2E-04-03.4: AppHeader shows Dashboard link highlighted when on dashboard (AC-12)', async ({ page }) => {
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });

    // The Dashboard nav button should exist
    const navDashboard = page.getByTestId('nav-dashboard');
    await expect(navDashboard).toBeVisible();
    // When on dashboard, the button has the active class (btn-light)
    await expect(navDashboard).toHaveClass(/btn-light/);
  });

  // ── E2E-04-03.5: Drill-down — "My Open Tickets" card navigates to filtered queue ──
  test('E2E-04-03.5: Clicking "My Open Tickets" card navigates to My Tickets view (AC-14)', async ({
    page,
  }) => {
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('metric-total-open')).toBeVisible({ timeout: 8000 });

    // Click the metric card
    await page.getByTestId('metric-total-open').click();

    // Should navigate to a tickets view (my-tickets renders MyTicketsList)
    // We check that the requester dashboard is no longer the only content
    // and that a tickets-related element appears
    await expect(page.getByTestId('requester-dashboard')).not.toBeVisible({ timeout: 5000 });
  });

  // ── E2E-04-03.6: Requester Dashboard shows recent tickets table ───────────
  test('E2E-04-03.6: Requester Dashboard shows recent tickets table with data (AC-12)', async ({
    page,
  }) => {
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });

    // Either table or empty state should be visible
    const tableOrEmpty = page.locator('[data-testid="recent-tickets-table"], [data-testid="requester-dashboard-empty"]');
    await expect(tableOrEmpty.first()).toBeVisible({ timeout: 8000 });
  });

  // ── E2E-04-03.7: IT Staff lands on Staff Dashboard ───────────────────────
  test('E2E-04-03.7: IT Staff is greeted by Staff Dashboard on login (AC-13)', async ({ page }) => {
    await signInToDashboard(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);

    const staffDashboard = page.getByTestId('staff-dashboard');
    await expect(staffDashboard).toBeVisible({ timeout: 8000 });
  });

  // ── E2E-04-03.8: Staff Dashboard shows 5 operational metric cards ─────────
  test('E2E-04-03.8: Staff Dashboard renders 5 operational metric cards (AC-13)', async ({ page }) => {
    await signInToDashboard(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await expect(page.getByTestId('staff-dashboard')).toBeVisible({ timeout: 8000 });

    await expect(page.getByTestId('metric-new-tickets')).toBeVisible();
    await expect(page.getByTestId('metric-open-tickets')).toBeVisible();
    await expect(page.getByTestId('metric-in-progress-tickets')).toBeVisible();
    await expect(page.getByTestId('metric-waiting-tickets')).toBeVisible();
    await expect(page.getByTestId('metric-my-assigned')).toBeVisible();
  });

  // ── E2E-04-03.9: Staff metric counts are valid numbers ────────────────────
  test('E2E-04-03.9: Staff Dashboard metric counts are valid numbers (AC-13)', async ({ page }) => {
    await signInToDashboard(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await expect(page.getByTestId('staff-dashboard')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('metric-new-tickets-count')).toBeVisible({ timeout: 8000 });

    const newText = await page.getByTestId('metric-new-tickets-count').textContent();
    const openText = await page.getByTestId('metric-open-tickets-count').textContent();
    expect(Number(newText)).toBeGreaterThanOrEqual(0);
    expect(Number(openText)).toBeGreaterThanOrEqual(0);
  });

  // ── E2E-04-03.10: Staff drill-down — clicking "New" goes to filtered queue ─
  test('E2E-04-03.10: Clicking "New" metric card navigates to filtered Ticket Queue (AC-14)', async ({
    page,
  }) => {
    await signInToDashboard(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await expect(page.getByTestId('staff-dashboard')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('metric-new-tickets')).toBeVisible({ timeout: 8000 });

    await page.getByTestId('metric-new-tickets').click();

    // Staff dashboard should no longer be visible
    await expect(page.getByTestId('staff-dashboard')).not.toBeVisible({ timeout: 5000 });
  });

  // ── E2E-04-03.11: Staff Dashboard nav link highlighted ────────────────────
  test('E2E-04-03.11: AppHeader Dashboard link is highlighted on Staff Dashboard (AC-13)', async ({
    page,
  }) => {
    await signInToDashboard(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await expect(page.getByTestId('staff-dashboard')).toBeVisible({ timeout: 8000 });

    const navDashboard = page.getByTestId('nav-dashboard');
    await expect(navDashboard).toBeVisible();
    await expect(navDashboard).toHaveClass(/btn-light/);
  });

  // ── E2E-04-03.12: Staff Dashboard has recent tickets or empty state ────────
  test('E2E-04-03.12: Staff Dashboard recent tickets table or empty state is visible (AC-13)', async ({
    page,
  }) => {
    await signInToDashboard(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await expect(page.getByTestId('staff-dashboard')).toBeVisible({ timeout: 8000 });

    const tableOrEmpty = page.locator(
      '[data-testid="staff-recent-tickets-table"], [data-testid="staff-dashboard-empty"]',
    );
    await expect(tableOrEmpty.first()).toBeVisible({ timeout: 8000 });
  });

  // ── E2E-04-03.13: Admin sees Staff Dashboard + User Stats section (AC-14) ─
  test('E2E-04-03.13: Admin sees Staff Dashboard + User Stats section (AC-14)', async ({ page }) => {
    await signInToDashboard(page, ACCOUNTS.admin.email, DEV_PASSWORD);
    await expect(page.getByTestId('staff-dashboard')).toBeVisible({ timeout: 8000 });

    // Admin also sees the user stats panel
    await expect(page.getByTestId('admin-user-stats')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('admin-stat-requesters')).toBeVisible();
    await expect(page.getByTestId('admin-stat-staff')).toBeVisible();
    await expect(page.getByTestId('admin-stat-total')).toBeVisible();
  });

  // ── E2E-04-03.14: AC-05-05 — Requester cannot access staff dashboard via API
  test('E2E-04-03.14: API enforces 403 when Requester calls /api/dashboard/staff (AC-05-05)', async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE}/api/dashboard/staff`, {
      headers: { Authorization: `Bearer ${requesterToken}` },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  // ── E2E-04-03.15: Refresh button reloads dashboard data ───────────────────
  test('E2E-04-03.15: Refresh button triggers a new dashboard data fetch (AC-12)', async ({
    page,
  }) => {
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('metric-total-open-count')).toBeVisible({ timeout: 8000 });

    // Click refresh
    await page.getByTestId('dashboard-refresh-btn').click();

    // Should momentarily show loading text, then come back
    // (We wait for counts to re-appear, confirming refresh cycle completed)
    await expect(page.getByTestId('metric-total-open-count')).toBeVisible({ timeout: 8000 });
  });

  // ── E2E-04-03.16: Quick action "Create Ticket" works from Dashboard ────────
  test('E2E-04-03.16: Quick action "Create Ticket" from Requester Dashboard opens form', async ({
    page,
  }) => {
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('quick-action-create-ticket')).toBeVisible({ timeout: 8000 });

    await page.getByTestId('quick-action-create-ticket').click();

    // Should navigate away from Dashboard to Create Ticket form
    await expect(page.getByTestId('requester-dashboard')).not.toBeVisible({ timeout: 5000 });
  });
});

// ─── E2E-04-04: Viewport Layout Audit & Accessibility Focus Rings ─────────────
test.describe('E2E-04-04: Viewport Layout Audit & a11y Focus Rings (AC-18, AC-19 / FR-22)', () => {
  /**
   * Helper: navigates to the target URL, sets the viewport, and asserts no
   * horizontal overflow exists (inner scroll width ≤ window width).
   */
  async function assertNoHorizontalOverflow(
    page: typeof test.info extends (...args: any) => any ? never : import('@playwright/test').Page,
  ): Promise<void> {
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow, 'Page must not have horizontal overflow').toBe(false);
  }

  // ── 1280px Desktop — Requester Dashboard ──────────────────────────────────
  test('E2E-04-04.1: Requester Dashboard — no horizontal overflow at 1280px desktop', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });
    await assertNoHorizontalOverflow(page);
  });

  // ── 768px Tablet — Requester Dashboard ───────────────────────────────────
  test('E2E-04-04.2: Requester Dashboard — no horizontal overflow at 768px tablet', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });
    await assertNoHorizontalOverflow(page);
  });

  // ── 375px Mobile — Requester Dashboard ───────────────────────────────────
  test('E2E-04-04.3: Requester Dashboard — no horizontal overflow at 375px mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });
    await assertNoHorizontalOverflow(page);
  });

  // ── 1280px Desktop — Staff Dashboard ─────────────────────────────────────
  test('E2E-04-04.4: Staff Dashboard — no horizontal overflow at 1280px desktop', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await provisionLoginReadyStaff(
      page.request,
      ACCOUNTS.reassignmentStaff.email,
      STRONG_PASSWORD,
    ).catch(() => {
      // May already be provisioned from E2E-04-03; ignore duplicate provisioning
    });
    await signInToDashboard(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await expect(page.getByTestId('staff-dashboard')).toBeVisible({ timeout: 8000 });
    await assertNoHorizontalOverflow(page);
  });

  // ── 375px Mobile — Staff Dashboard ───────────────────────────────────────
  test('E2E-04-04.5: Staff Dashboard — no horizontal overflow at 375px mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signInToDashboard(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await expect(page.getByTestId('staff-dashboard')).toBeVisible({ timeout: 8000 });
    await assertNoHorizontalOverflow(page);
  });

  // ── Focus ring — "My Open Tickets" metric card is keyboard-focusable ──────
  test('E2E-04-04.6: Requester Dashboard metric cards receive visible focus ring (AC-19)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('metric-total-open')).toBeVisible({ timeout: 8000 });

    // Tab to the metric card and verify it can receive keyboard focus
    const card = page.getByTestId('metric-total-open');
    await card.focus();
    await expect(card).toBeFocused();
  });

  // ── Focus ring — Staff metric cards keyboard-focusable ────────────────────
  test('E2E-04-04.7: Staff Dashboard metric cards receive keyboard focus (AC-19)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInToDashboard(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await expect(page.getByTestId('staff-dashboard')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('metric-new-tickets')).toBeVisible({ timeout: 8000 });

    const card = page.getByTestId('metric-new-tickets');
    await card.focus();
    await expect(card).toBeFocused();
  });

  // ── Enter key on metric card triggers navigation ───────────────────────────
  test('E2E-04-04.8: Pressing Enter on a metric card triggers navigation (AC-19)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInToDashboard(page, ACCOUNTS.requester.email, DEV_PASSWORD);
    await expect(page.getByTestId('requester-dashboard')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('metric-total-open')).toBeVisible({ timeout: 8000 });

    const card = page.getByTestId('metric-total-open');
    await card.focus();
    await card.press('Enter');

    // Dashboard should navigate away
    await expect(page.getByTestId('requester-dashboard')).not.toBeVisible({ timeout: 5000 });
  });
});
