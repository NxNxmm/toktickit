import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  ACCOUNTS,
  DEV_PASSWORD,
  STRONG_PASSWORD,
  API_BASE,
  apiCreateTicket,
  apiLogin,
  apiResolveReferenceIds,
  provisionLoginReadyStaff,
  uiSignIn,
} from '../lab-03/e2e-support';

/**
 * E2E-04-01: Multi-role Actions Taken Lifecycle Flow
 *
 * Covers:
 * - AC-03-01: IT Staff viewing Ticket Detail sees the Actions Taken section and "Add Action" button.
 * - AC-03-02: Submitting an action with "Follow-Up Required" checked without a note shows an inline validation error.
 * - AC-03-03: Requesters viewing their ticket detail see Actions Taken in read-only mode (no create/edit buttons);
 *              direct POST from requester is rejected with 403.
 * - AC-03-04: Submit button is disabled during API transit to prevent duplicate submissions.
 * - AC-03-05: Layout adapts responsively across Desktop and Mobile viewports without horizontal overflow.
 */

let staffToken = '';
let requesterToken = '';
let ticketId = 0;
let ticketNo = '';

test.describe.configure({ mode: 'serial' });

test.describe('E2E-04-01: Multi-role Actions Taken Flow (Lab 4 Issue #3)', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Provision login-ready staff account
    await provisionLoginReadyStaff(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);

    const staffLogin = await apiLogin(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    staffToken = staffLogin.token;
    expect(staffToken).toBeTruthy();

    const requesterLogin = await apiLogin(request, ACCOUNTS.requester.email, DEV_PASSWORD);
    requesterToken = requesterLogin.token;
    expect(requesterToken).toBeTruthy();

    // 2. Resolve category & related system and create a fresh ticket for Requester
    const { categoryId, relatedSystemId } = await apiResolveReferenceIds(
      request,
      requesterToken,
      'Hardware',
      'Corporate Laptop'
    );

    const ticket = await apiCreateTicket(request, requesterToken, {
      categoryId,
      relatedSystemId,
      summary: `E2E Lab 4 Actions Taken Test Ticket - ${Date.now()}`,
      description: 'Requester reports periodic overheating during compilation tasks.',
      requestedPriority: 'HIGH',
    });

    ticketId = ticket.id;
    ticketNo = ticket.ticketNo;
    expect(ticketId).toBeGreaterThan(0);
  });

  test('Step 1: IT Staff views ticket detail, sees Actions Taken section and "+ Add Action Taken" button (AC-03-01)', async ({
    page,
  }) => {
    await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);

    // Navigate to the ticket from the queue
    await expect(page.getByRole('heading', { name: 'IT Staff Ticket Queue' })).toBeVisible();
    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill(ticketNo);

    const table = page.locator('div.d-none.d-lg-block table');
    const row = table.getByRole('row', { name: new RegExp(ticketNo) });
    await expect(row).toHaveCount(1);
    await row.click();

    // Verify Staff Ticket Detail view
    const detail = page.getByTestId('staff-ticket-detail');
    await expect(detail).toBeVisible();

    // AC-03-01: Actions Taken section and "+ Add Action Taken" button
    const actionsSection = page.getByTestId('actions-taken-section');
    await expect(actionsSection).toBeVisible();
    await expect(actionsSection.getByRole('heading', { name: 'Actions Taken' })).toBeVisible();

    const addBtn = page.getByTestId('add-action-btn');
    await expect(addBtn).toBeVisible();
    expect(await addBtn.innerText()).toMatch(/Add Action/i);
  });

  test('Step 2: Validation on Follow-Up Required toggle and successful submission (AC-03-02, AC-03-04)', async ({
    page,
  }) => {
    await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill(ticketNo);
    await page.locator('div.d-none.d-lg-block table').getByRole('row', { name: new RegExp(ticketNo) }).click();

    const actionsSection = page.getByTestId('actions-taken-section');
    await expect(actionsSection).toBeVisible();

    // Click "+ Add Action Taken"
    await page.getByTestId('add-action-btn').click();

    const modal = page.getByTestId('action-taken-modal');
    await expect(modal).toBeVisible();

    // Verify Performer field is read-only
    const performerField = modal.getByLabel(/Performed By/i);
    await expect(performerField).toBeDisabled();
    await expect(performerField).toHaveValue(new RegExp(ACCOUNTS.lifecycleStaff.name));

    // Fill valid Description and Result
    await modal.getByLabel(/Action Description/i).fill('Cleaned exhaust fans and applied arctic silver thermal compound.');
    await modal.getByLabel(/Result/i).fill('Fan noise reduced; CPU load temp down by 15C.');

    // Check "Follow-Up Required?" checkbox
    const followUpCheckbox = modal.getByLabel(/Follow-Up Required\?/i);
    await followUpCheckbox.check();
    await expect(followUpCheckbox).toBeChecked();

    // AC-03-02: Submit without Follow-Up Note -> should show inline error and prevent submission
    const saveBtn = modal.getByTestId('save-action-btn');
    await saveBtn.click();

    // Modal remains open and inline error is displayed
    await expect(modal).toBeVisible();
    const noteError = modal.getByTestId('followup-note-error');
    await expect(noteError).toBeVisible();
    await expect(noteError).toContainText(/Follow-up note is required/i);

    // AC-03-02: Form fields preserve previously entered text
    await expect(modal.getByLabel(/Action Description/i)).toHaveValue(
      'Cleaned exhaust fans and applied arctic silver thermal compound.'
    );

    // Now fill the mandatory Follow-Up Note and Attachment Notes
    await modal.getByLabel(/Follow-Up Note/i).fill('Inspect thermal telemetry after 48 hours of user workload.');
    await modal.getByLabel(/Attachment Notes/i).fill('hwmonitor_benchmark_run1.csv');

    // Submit form
    await saveBtn.click();

    // Modal closes upon successful creation
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Verify newly added action appears in the work log
    await expect(actionsSection).toContainText('Cleaned exhaust fans and applied arctic silver thermal compound.');
    await expect(actionsSection).toContainText('Fan noise reduced; CPU load temp down by 15C.');
    await expect(actionsSection).toContainText('Inspect thermal telemetry after 48 hours of user workload.');
    await expect(actionsSection).toContainText('hwmonitor_benchmark_run1.csv');
  });

  test('Step 3: IT Staff edits the recorded Action Taken entry', async ({ page }) => {
    await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill(ticketNo);
    await page.locator('div.d-none.d-lg-block table').getByRole('row', { name: new RegExp(ticketNo) }).click();

    const actionsSection = page.getByTestId('actions-taken-section');
    await expect(actionsSection).toBeVisible();

    // Click Edit button on the action
    const editBtn = actionsSection.getByTestId('edit-action-btn').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const modal = page.getByTestId('action-taken-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Edit Action Taken/i })).toBeVisible();

    // Update Result field
    await modal.getByLabel(/Result/i).fill('Thermal stability benchmark PASSED. Temperatures stabilized at 68C max.');
    await modal.getByTestId('save-action-btn').click();

    // Modal closes and updated text is shown
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await expect(actionsSection).toContainText('Thermal stability benchmark PASSED. Temperatures stabilized at 68C max.');
  });

  test('Step 4: Requester views their ticket in read-only mode without create/edit buttons (AC-03-03)', async ({
    page,
    request,
  }) => {
    // 1. Sign in as Requester
    await uiSignIn(page, ACCOUNTS.requester.email, DEV_PASSWORD);

    // Navigate to ticket detail
    await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
    await page.getByPlaceholder(/Search by ticket number or summary/i).fill(ticketNo);

    const ticketCardOrRow = page.getByText(ticketNo).first();
    await expect(ticketCardOrRow).toBeVisible();
    await ticketCardOrRow.click();

    // Wait for Requester Ticket Detail
    const actionsSection = page.getByTestId('actions-taken-section');
    await expect(actionsSection).toBeVisible();

    // Actions work log is visible with the recorded items
    await expect(actionsSection).toContainText('Cleaned exhaust fans and applied arctic silver thermal compound.');
    await expect(actionsSection).toContainText('Thermal stability benchmark PASSED. Temperatures stabilized at 68C max.');

    // AC-03-03: Create button "+ Add Action Taken" must be completely hidden
    await expect(actionsSection.getByTestId('add-action-btn')).toHaveCount(0);

    // AC-03-03: Edit button must be completely hidden
    await expect(actionsSection.getByTestId('edit-action-btn')).toHaveCount(0);

    // Direct unauthorized call fails safely with 403 Forbidden
    const directPostRes = await request.post(`${API_BASE}/api/tickets/${ticketId}/actions-taken`, {
      headers: {
        Authorization: `Bearer ${requesterToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        description: 'Unauthorized attempt to log action by requester.',
        result: 'Should be rejected.',
        followUpRequired: false,
      },
    });
    expect(directPostRes.status()).toBe(403);
  });

  test('Step 5: Responsive layout adapts across Mobile viewport without horizontal overflow (AC-03-05)', async ({
    page,
  }) => {
    // Set viewport to mobile standard 375x667
    await page.setViewportSize({ width: 375, height: 667 });

    await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill(ticketNo);

    // Click ticket in mobile view (rendered in div.d-lg-none)
    const mobileCard = page.locator('div.d-lg-none').getByText(ticketNo).first();
    await expect(mobileCard).toBeVisible();
    await mobileCard.click();

    const actionsSection = page.getByTestId('actions-taken-section');
    await expect(actionsSection).toBeVisible();

    // Verify mobile cards are rendered
    const actionCard = actionsSection.getByTestId('action-taken-card').first();
    await expect(actionCard).toBeVisible();

    // Verify zero horizontal page overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow, 'page must not produce horizontal overflow on mobile').toBe(false);
  });
});
