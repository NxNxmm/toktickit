import { test, expect } from '@playwright/test';
import {
  ACCOUNTS,
  DEV_PASSWORD,
  STRONG_PASSWORD,
  API_BASE,
  apiCreateTicket,
  apiLogin,
  apiPatch,
  apiPost,
  apiResolveReferenceIds,
  provisionLoginReadyStaff,
  uiSignIn,
} from '../lab-03/e2e-support';

/**
 * E2E-04-02: Ticket Resolution Gate, Permitted Workflow Transitions & Concurrency Handling
 *
 * Covers:
 * - AC-04-01: Requester clicking "Problem Appears Resolved" does NOT set the ticket status to Resolved;
 *              status remains unchanged and advisory indication is recorded.
 * - AC-04-02: IT Staff or Admin can transition an eligible ticket to Resolved (with >= 1 Action Taken);
 *              the backend updates status and version.
 * - AC-04-03: If a user submits a status change with a stale version, backend returns HTTP 409 Conflict,
 *              and the UI displays a conflict warning asking to refresh.
 * - AC-04-04: Disallowed transitions (e.g., NEW directly to CLOSED) return HTTP 422 and are disabled/hidden in the UI.
 */

let staffToken = '';
let requesterToken = '';
let ticketId = 0;
let ticketNo = '';

test.describe.configure({ mode: 'serial' });

test.describe('E2E-04-02: Ticket Workflow, Resolution Gate & Concurrency (Lab 4 Issue #4)', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Provision login-ready staff account
    await provisionLoginReadyStaff(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);

    const staffLogin = await apiLogin(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    staffToken = staffLogin.token;
    expect(staffToken).toBeTruthy();

    const requesterLogin = await apiLogin(request, ACCOUNTS.requester.email, DEV_PASSWORD);
    requesterToken = requesterLogin.token;
    expect(requesterToken).toBeTruthy();

    // 2. Resolve category & related system and create a fresh ticket
    const { categoryId, relatedSystemId } = await apiResolveReferenceIds(
      request,
      requesterToken,
      'Network',
      'Campus Wi-Fi'
    );

    const ticket = await apiCreateTicket(request, requesterToken, {
      categoryId,
      relatedSystemId,
      summary: `E2E Resolution Gate & Workflow Test - ${Date.now()}`,
      description: 'Testing formal transition matrix, advisory resolution, and optimistic concurrency.',
      requestedPriority: 'MEDIUM',
    });

    ticketId = ticket.id;
    ticketNo = ticket.ticketNo;
    expect(ticketId).toBeGreaterThan(0);
  });

  test('Step 1: Disallowed transitions are not shown in UI and rejected by API with 422 (AC-04-04 / BR-08)', async ({
    page,
    request,
  }) => {
    // 1a. Verify via API: Direct transition from NEW to CLOSED or RESOLVED is rejected with 422
    const resDisallowed = await apiPatch(
      request,
      staffToken,
      `/api/tickets/${ticketId}/workflow`,
      { status: 'CLOSED', version: 1 }
    );
    expect(resDisallowed.status).toBe(422);
    expect(resDisallowed.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    // 1b. Verify in UI: Staff viewing NEW ticket only sees OPEN and CANCELLED in dropdown
    await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill(ticketNo);

    const row = page.locator('div.d-none.d-lg-block table').getByRole('row', { name: new RegExp(ticketNo) });
    await expect(row).toHaveCount(1);
    await row.click();

    const detail = page.getByTestId('staff-ticket-detail');
    await expect(detail).toBeVisible();

    const statusSelect = page.getByTestId('status-transition-select');
    await expect(statusSelect).toBeVisible();

    const options = await statusSelect.locator('option').allInnerTexts();
    // NEW can only transition to OPEN or CANCELLED
    expect(options.some((o) => o.includes('Open'))).toBe(true);
    expect(options.some((o) => o.includes('Cancelled'))).toBe(true);
    // Disallowed transitions must NOT be present
    expect(options.some((o) => o.includes('Resolved'))).toBe(false);
    expect(options.some((o) => o.includes('Closed'))).toBe(false);
    expect(options.some((o) => o.includes('In Progress'))).toBe(false);

    // Transition NEW -> OPEN via UI
    await statusSelect.selectOption('OPEN');
    const updateBtn = page.getByTestId('update-status-btn');
    await expect(updateBtn).toBeEnabled();
    await updateBtn.click();

    // Verify status updated to OPEN
    await expect(detail).toContainText('Open');
  });

  test('Step 2: Requester advisory "Problem Appears Resolved" does NOT change status (AC-04-01 / BR-10)', async ({
    page,
    request,
  }) => {
    // 2a. Requester logs in and views their ticket detail
    await uiSignIn(page, ACCOUNTS.requester.email, DEV_PASSWORD);

    // In My Tickets list, click on the ticket
    await page.getByRole('button', { name: new RegExp(ticketNo) }).or(page.getByText(ticketNo)).first().click();

    // Verify ticket detail is open
    await expect(page.getByText(ticketNo)).toBeVisible();
    await expect(page.getByText('Open')).toBeVisible();

    // Click "Problem Appears Resolved" button
    const resolveBtn = page.locator('#resolve-indication-btn');
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    // Modal appears confirming advisory indication
    const modal = page.getByTestId('resolve-modal');
    await expect(modal).toBeVisible();

    // Click confirm in modal
    const confirmBtn = page.locator('#confirm-resolve-btn');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify resolution indication badge appears
    await expect(page.locator('#resolved-indicated-badge').or(page.getByText(/Resolution Indicated/i))).toBeVisible();

    // AC-04-01: Status remains OPEN, NOT RESOLVED
    const ticketCheck = await request.get(`${API_BASE}/api/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${requesterToken}` },
    });
    expect(ticketCheck.status()).toBe(200);
    const ticketData = await ticketCheck.json();
    expect(ticketData.currentStatus).toBe('OPEN');
    expect(ticketData.resolvedIndicated).toBe(true);
  });

  test('Step 3: Resolution Gate blocks RESOLVED with 0 Actions Taken (AC-04-04, BR-09.1)', async ({
    page,
    request,
  }) => {
    // 3a. Move ticket from OPEN -> IN_PROGRESS via API first
    const ticketRes = await request.get(`${API_BASE}/api/staff/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const { version } = await ticketRes.json();

    const advanceRes = await apiPatch(
      request,
      staffToken,
      `/api/tickets/${ticketId}/workflow`,
      { status: 'IN_PROGRESS', version }
    );
    expect(advanceRes.status).toBe(200);

    // 3b. Staff signs in and attempts to transition IN_PROGRESS -> RESOLVED with 0 actions taken
    await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill(ticketNo);
    await page.locator('div.d-none.d-lg-block table').getByRole('row', { name: new RegExp(ticketNo) }).click();

    const detail = page.getByTestId('staff-ticket-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('In Progress');

    const statusSelect = page.getByTestId('status-transition-select');
    await statusSelect.selectOption('RESOLVED');
    await page.getByTestId('update-status-btn').click();

    // AC-07b / BR-09.1: Resolution gate triggers 422 -> UI shows resolution-gate-banner
    const gateBanner = page.getByTestId('resolution-gate-banner');
    await expect(gateBanner).toBeVisible();
    await expect(gateBanner).toContainText(/Work Verification Required/i);
    await expect(gateBanner).toContainText(/at least one Action Taken/i);

    // Status remains IN_PROGRESS
    await expect(detail).toContainText('In Progress');
  });

  test('Step 4: IT Staff logs Action Taken and successfully transitions to RESOLVED (AC-04-02 / BR-08, BR-09)', async ({
    page,
    request,
  }) => {
    // 4a. Log an action taken on the ticket via API
    const actionRes = await apiPost(
      request,
      staffToken,
      `/api/tickets/${ticketId}/actions-taken`,
      {
        description: 'Replaced faulty access point hardware in CB2 room 401.',
        result: 'Full signal restored with 300Mbps throughput confirmed.',
        followUpRequired: false,
      }
    );
    expect(actionRes.status).toBe(201);

    // 4b. Staff refreshes/opens the ticket and transitions to RESOLVED
    await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill(ticketNo);
    await page.locator('div.d-none.d-lg-block table').getByRole('row', { name: new RegExp(ticketNo) }).click();

    const detail = page.getByTestId('staff-ticket-detail');
    await expect(detail).toBeVisible();

    const statusSelect = page.getByTestId('status-transition-select');
    await statusSelect.selectOption('RESOLVED');
    await page.getByTestId('update-status-btn').click();

    // Verify successful status update to RESOLVED
    await expect(detail).toContainText('Resolved');

    // Verify in database / backend
    const checkRes = await request.get(`${API_BASE}/api/staff/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const checkData = await checkRes.json();
    expect(checkData.currentStatus).toBe('RESOLVED');
  });

  test('Step 5: Stale update triggers HTTP 409 Conflict with refresh prompt (AC-04-03 / BR-11)', async ({
    page,
    request,
  }) => {
    // 5a. Reopen ticket to IN_PROGRESS so further transitions are possible
    const currentTicket = await (await request.get(`${API_BASE}/api/staff/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })).json();

    const reopenRes = await apiPatch(
      request,
      staffToken,
      `/api/tickets/${ticketId}/workflow`,
      { status: 'REOPENED', version: currentTicket.version }
    );
    expect(reopenRes.status).toBe(200);

    const inProgressRes = await apiPatch(
      request,
      staffToken,
      `/api/tickets/${ticketId}/workflow`,
      { status: 'IN_PROGRESS', version: reopenRes.body.version }
    );
    expect(inProgressRes.status).toBe(200);

    // 5b. Staff signs in and loads the ticket detail
    await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill(ticketNo);
    await page.locator('div.d-none.d-lg-block table').getByRole('row', { name: new RegExp(ticketNo) }).click();

    const detail = page.getByTestId('staff-ticket-detail');
    await expect(detail).toBeVisible();

    // 5c. Simulate concurrent mutation behind the user's back via direct API
    const bumpRes = await apiPatch(
      request,
      staffToken,
      `/api/tickets/${ticketId}/workflow`,
      { itPriority: 'HIGH', version: inProgressRes.body.version }
    );
    expect(bumpRes.status).toBe(200);
    // Ticket version is now bumped to bumpRes.body.version

    // 5d. User on page still holds the previous version and attempts status change
    const statusSelect = page.getByTestId('status-transition-select');
    await statusSelect.selectOption('WAITING_FOR_REQUESTER');
    await page.getByTestId('update-status-btn').click();

    // AC-04-03 / BR-11: 409 Conflict returned -> UI displays conflict-banner and refresh button
    const conflictBanner = page.getByTestId('conflict-banner');
    await expect(conflictBanner).toBeVisible();
    await expect(conflictBanner).toContainText(/Conflict Detected/i);
    await expect(conflictBanner).toContainText(/updated by another team member/i);

    const refreshBtn = page.getByTestId('refresh-ticket-btn');
    await expect(refreshBtn).toBeVisible();
  });
});
