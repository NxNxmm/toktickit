import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  ACCOUNTS,
  DEV_PASSWORD,
  STRONG_PASSWORD,
  apiCreateTicket,
  apiGet,
  apiLogin,
  apiPatch,
  apiResolveReferenceIds,
  provisionLoginReadyStaff,
  uiSignIn,
} from './e2e-support';

/**
 * E2E-02 — End-to-End IT Staff ticket lifecycle.
 *
 * Covers AC-8.2 together with AC-4.2, AC-4.4, AC-5.1, AC-5.2, AC-6.1, AC-6.2,
 * AC-6.3 and AC-6.4: queue viewing and search, ticket claiming and
 * reassignment, IT priority calibration, public comment and internal note
 * authoring, and a full walk of the BR-12 status transition matrix.
 *
 * The suite is serial because every step continues the same ticket's history.
 * `beforeAll` provisions every account and the ticket, so the spec depends
 * neither on execution order nor on the database having just been seeded.
 */

/**
 * The §6 state matrix, mirrored from `client/src/api.ts`
 * (`TICKET_STATUS_TRANSITIONS`). Every dropdown assertion below is made
 * against this map, so a regression in either the matrix or the UI that only
 * offers illegal transitions fails the suite.
 */
const EXPECTED_TRANSITIONS: Record<string, string[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  CANCELLED: [],
};

let staffToken = '';
let requesterToken = '';
let ticketId = 0;
let ticketNo = '';

/** The desktop queue table (Bootstrap `d-none d-lg-block`, shown at >= 992px). */
function queueTable(page: Page): Locator {
  return page.locator('div.d-none.d-lg-block table');
}

/** Signs the provisioned staff member in and lands on the IT Staff queue. */
async function signInToQueue(page: Page): Promise<void> {
  await uiSignIn(page, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);
  await expect(page.getByRole('heading', { name: 'IT Staff Ticket Queue' })).toBeVisible();
}

/** Searches the queue for the fixture ticket and opens its staff detail view. */
async function openFixtureTicket(page: Page): Promise<Locator> {
  await signInToQueue(page);
  await page
    .getByPlaceholder(/Search by Ticket No or Summary/i)
    .fill(ticketNo);

  const row = queueTable(page).getByRole('row', { name: new RegExp(ticketNo) });
  await expect(row, 'the fixture ticket should be searchable by ticket number').toHaveCount(1);
  await row.click();

  const detail = page.getByTestId('staff-ticket-detail');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(ticketNo);
  return detail;
}

test.describe.configure({ mode: 'serial' });

test.describe('E2E-02: End-to-End IT Staff Ticket Lifecycle (AC-8.2, AC-4.2, AC-4.4, AC-5.x, AC-6.x)', () => {
  test.beforeAll(async ({ request }) => {
    // 1. All three seeded IT Staff accounts ship with requiresPasswordChange =
    //    true, so Kevin must complete a first-login change before the staff
    //    shell is reachable at all.
    await provisionLoginReadyStaff(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD);

    staffToken = (
      await apiLogin(request, ACCOUNTS.lifecycleStaff.email, STRONG_PASSWORD)
    ).token;
    expect(staffToken, 'the lifecycle staff account should be usable').toBeTruthy();

    requesterToken = (await apiLogin(request, ACCOUNTS.requester.email, DEV_PASSWORD)).token;

    // 2. A fresh, unowned, NEW ticket so the lifecycle always starts from a
    //    known state regardless of previous runs.
    const { categoryId, relatedSystemId } = await apiResolveReferenceIds(
      request,
      requesterToken,
      'Hardware',
      'Corporate Laptop'
    );
    const ticket = await apiCreateTicket(request, requesterToken, {
      summary: `E2E Staff Lifecycle Monitor ${Date.now()}`,
      description:
        'Automated end-to-end fixture: the external monitor on the docking station flickers and drops signal whenever the laptop wakes from sleep.',
      categoryId,
      relatedSystemId,
      requestedPriority: 'MEDIUM',
    });
    ticketId = ticket.id;
    ticketNo = ticket.ticketNo;
    expect(ticketNo, 'the fixture ticket must be numbered').toMatch(/^TKT-/);
  });

  test('E2E-02.0: IT Staff sign in without a password gate and reach the Ticket Queue (AC-3.5, AC-5.1)', async ({
    page,
  }) => {
    await signInToQueue(page);

    // The App Header reflects the IT Staff role and staff-only navigation
    const header = page.locator('header');
    await expect(header.getByText(ACCOUNTS.lifecycleStaff.name, { exact: true })).toBeVisible();
    await expect(header.getByText('IT Staff', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ticket Queue', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /user management/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'My Tickets', exact: true })).toHaveCount(0);

    // The queue is summarised with a live total count (AC-5.1)
    await expect(page.getByText(/\(\d+ total\)/)).toBeVisible();
  });

  test('E2E-02.1: Queue columns, search and filters narrow the cross-requester ticket list (AC-5.1, AC-5.2)', async ({
    page,
  }) => {
    await signInToQueue(page);
    const table = queueTable(page);
    await expect(table).toBeVisible();

    // 1. The desktop table exposes every documented queue column (AC-5.4)
    for (const column of [
      'Ticket No',
      'Summary',
      'Category',
      'Requester',
      'Owner',
      'Req. Pri',
      'IT Pri',
      'Status',
      'Created',
    ]) {
      await expect(table.getByRole('columnheader', { name: new RegExp(column, 'i') })).toBeVisible();
    }

    // 2. Searching by ticket number isolates the fixture ticket and shows it as
    //    unowned and NEW (AC-5.1)
    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill(ticketNo);
    const row = table.getByRole('row', { name: new RegExp(ticketNo) });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(ACCOUNTS.requester.name);
    await expect(row).toContainText('Unassigned');
    await expect(row).toContainText('NEW');

    // 3. A nonsense search term yields the documented empty state
    await page.getByPlaceholder(/Search by Ticket No or Summary/i).fill('ZZZ-NO-SUCH-TICKET-E2E');
    await expect(table.getByText('No tickets found')).toBeVisible();

    // 4. The empty state offers a one-click escape from the filter
    await table.getByRole('button', { name: 'Clear filters' }).click();
    await expect(table.getByText('No tickets found')).toHaveCount(0);
    await expect(table.getByRole('row')).not.toHaveCount(0);

    // 5. The status filter restricts the queue to a single status (AC-5.2)
    await page.locator('#filter-status').selectOption('NEW');
    const newBadgeRows = table.getByRole('row').filter({ hasText: 'NEW' });
    await expect(newBadgeRows.first()).toBeVisible();
    await page.getByRole('button', { name: /clear filters/i }).first().click();
    await expect(page.locator('#filter-status')).toHaveValue('');
  });

  test('E2E-02.2: Staff claim an unowned ticket and reassign it to another active staff member (AC-6.1, BR-08)', async ({
    page,
  }) => {
    const detail = await openFixtureTicket(page);

    // 1. An unowned ticket offers the quick Claim action (AC-6.1)
    const ownerSelect = detail.getByTestId('ticket-owner-select');
    await expect(ownerSelect).toHaveValue('');
    await expect(detail.getByTestId('claim-ticket-btn')).toBeVisible();

    // "Apply Owner" is inert until a change is actually staged
    await expect(detail.getByTestId('apply-owner-btn')).toBeDisabled();

    await detail.getByTestId('claim-ticket-btn').click();

    // 2. Ownership is persisted and the quick action disappears
    await expect(ownerSelect.locator('option:checked')).toContainText(ACCOUNTS.lifecycleStaff.name);
    await expect(detail.getByTestId('claim-ticket-btn')).toHaveCount(0);

    const afterClaim = await apiGet(page.request, staffToken, `/api/staff/tickets/${ticketId}`);
    expect(afterClaim.status).toBe(200);
    expect(afterClaim.body.owner.email).toBe(ACCOUNTS.lifecycleStaff.email);

    // 3. Reassignment to another active IT Staff member via the dropdown
    const reassignValue = await ownerSelect
      .locator('option')
      .filter({ hasText: ACCOUNTS.reassignmentStaff.name })
      .getAttribute('value');
    expect(reassignValue, 'active IT Staff must be offered as an assignee').toBeTruthy();

    await ownerSelect.selectOption(reassignValue!);
    await expect(detail.getByTestId('apply-owner-btn')).toBeEnabled();
    await detail.getByTestId('apply-owner-btn').click();
    await expect(ownerSelect.locator('option:checked')).toContainText(
      ACCOUNTS.reassignmentStaff.name
    );

    const afterReassign = await apiGet(page.request, staffToken, `/api/staff/tickets/${ticketId}`);
    expect(afterReassign.body.owner.email).toBe(ACCOUNTS.reassignmentStaff.email);

    // 4. Hand ownership back so the remaining steps read cleanly
    const handBack = await ownerSelect
      .locator('option')
      .filter({ hasText: ACCOUNTS.lifecycleStaff.name })
      .getAttribute('value');
    await ownerSelect.selectOption(handBack!);
    await detail.getByTestId('apply-owner-btn').click();
    await expect(ownerSelect.locator('option:checked')).toContainText(
      ACCOUNTS.lifecycleStaff.name
    );
  });

  test('E2E-02.3: IT Priority is calibrated independently of the Requested Priority (AC-6.2, BR-09)', async ({
    page,
  }) => {
    const detail = await openFixtureTicket(page);

    // 1. IT Priority starts at the default and auto-saves on change (AC-6.2)
    const prioritySelect = detail.getByTestId('ticket-it-priority-select');
    await expect(prioritySelect).toHaveValue('MEDIUM');
    await prioritySelect.selectOption('URGENT');

    await expect(prioritySelect).toHaveValue('URGENT');
    // Scope to a span so the <option> in the select is not matched too
    await expect(detail.locator('span', { hasText: /^URGENT$/ }).first()).toBeVisible();

    // 2. The Requester's requestedPriority is untouched by the IT (BR-09)
    await expect(detail).toContainText('Requested priority: MEDIUM');

    const persisted = await apiGet(page.request, staffToken, `/api/staff/tickets/${ticketId}`);
    expect(persisted.body.itPriority).toBe('URGENT');
    expect(persisted.body.requestedPriority).toBe('MEDIUM');
  });

  test('E2E-02.4: Staff post a public comment and a confidential internal note (AC-4.2, AC-4.4, AC-6.3, AC-6.4)', async ({
    page,
  }) => {
    const detail = await openFixtureTicket(page);
    const stamp = Date.now();

    // ── Public Comments tab (AC-4.2) ────────────────────────────────────────
    await expect(detail.getByTestId('tab-public-comments')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    const commentText = `Staff reply confirming dock firmware check ${stamp}`;
    await detail.getByTestId('staff-comment-content-input').fill(commentText);

    // The submit button is enabled once the content is long enough (BR-16)
    await expect(detail.getByTestId('staff-post-comment-btn')).toBeEnabled();
    await detail.getByTestId('staff-post-comment-btn').click();

    const commentCard = detail.getByTestId('public-comment-card').filter({ hasText: commentText });
    await expect(commentCard).toHaveCount(1);
    // Author identity and role are stamped from the session, not the client
    await expect(commentCard).toContainText(ACCOUNTS.lifecycleStaff.name);
    await expect(commentCard).toContainText('IT Staff');

    // ── Internal Notes tab (AC-6.3 / AC-6.4) ────────────────────────────────
    await detail.getByTestId('tab-internal-notes').click();
    await expect(detail.getByTestId('tab-internal-notes')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    // The confidentiality banner is always shown on this tab
    const banner = detail.getByTestId('internal-notes-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Strictly visible to IT Staff and Administrators');

    const noteText = `Confidential: suspected driver fault, vendor RMA ${stamp}`;
    await detail.getByTestId('staff-note-content-input').fill(noteText);
    await expect(detail.getByTestId('staff-post-note-btn')).toBeEnabled();
    await detail.getByTestId('staff-post-note-btn').click();

    const noteCard = detail.getByTestId('internal-note-card').filter({ hasText: noteText });
    await expect(noteCard).toHaveCount(1);
    await expect(noteCard).toContainText('🔒');
    await expect(noteCard).toContainText(ACCOUNTS.lifecycleStaff.name);

    // The two threads are independent and each tab carries its own running
    // count, so an internal note never inflates the public comment thread
    await expect(detail.getByTestId('tab-public-comments')).toContainText('Public Comments (1)');
    await expect(detail.getByTestId('tab-internal-notes')).toContainText('Internal Notes (1)');

    // ── Confidentiality boundary (AC-4.4 / BR-15) ───────────────────────────
    // The owning Requester reads the public comment...
    const requesterComments = await apiGet(
      page.request,
      requesterToken,
      `/api/tickets/${ticketId}/comments`
    );
    expect(requesterComments.status).toBe(200);
    expect(
      requesterComments.body.some((comment: any) => comment.content === commentText)
    ).toBe(true);

    // ...but is strictly denied the internal notes, even on their own ticket
    const requesterNotes = await apiGet(
      page.request,
      requesterToken,
      `/api/tickets/${ticketId}/notes`
    );
    expect(requesterNotes.status).toBe(403);
    expect(requesterNotes.body.error).toBe('Forbidden');
    expect(JSON.stringify(requesterNotes.body)).not.toContain(noteText);

    // Staff do see the note
    const staffNotes = await apiGet(page.request, staffToken, `/api/tickets/${ticketId}/notes`);
    expect(staffNotes.status).toBe(200);
    expect(staffNotes.body.some((note: any) => note.content === noteText)).toBe(true);
  });

  test('E2E-02.5: Status workflow follows the transition matrix end to end (AC-6.2, BR-12)', async ({
    page,
  }) => {
    const detail = await openFixtureTicket(page);
    const statusSelect = detail.getByTestId('ticket-status-select');
    await expect(statusSelect).toBeVisible();

    /** Asserts the dropdown offers exactly the matrix-permitted transitions. */
    const expectOffered = async (from: string) => {
      await expect(
        statusSelect.locator('option'),
        `only matrix-permitted transitions may be offered from ${from}`
      ).toHaveText([
        'Select transition…',
        ...EXPECTED_TRANSITIONS[from].map((status) => status.replace(/_/g, ' ')),
      ]);
    };

    // Walk the whole workflow. Before every step the dropdown must offer
    // exactly the transitions the §6 matrix permits from the current status.
    const journey = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED'];
    let current = 'NEW';

    for (const next of journey) {
      await expectOffered(current);
      await statusSelect.selectOption(next);
      current = next;

      // The rendered status badge advances
      const label = current.replace(/_/g, ' ');
      await expect(detail.getByText(new RegExp(`^${label}$`)).first()).toBeVisible();

      // ...and so does the server record
      const persisted = await apiGet(page.request, staffToken, `/api/staff/tickets/${ticketId}`);
      expect(persisted.body.currentStatus, `server status should be ${current}`).toBe(current);
    }

    // 1. An illegal jump is rejected by the server with 422 (BR-12)
    const illegal = await apiPatch(
      page.request,
      staffToken,
      `/api/staff/tickets/${ticketId}/status`,
      { status: 'IN_PROGRESS' }
    );
    expect(illegal.status).toBe(422);
    expect(illegal.body.error).toBe('Unprocessable Entity');

    // 2. CLOSED is not terminal, but only offers REOPENED
    await expectOffered('CLOSED');

    // 3. REOPENED -> CANCELLED, after which the UI reports a terminal state
    await statusSelect.selectOption('REOPENED');
    await expectOffered('REOPENED');
    await statusSelect.selectOption('CANCELLED');

    await expect(detail.getByText('CANCELLED', { exact: true }).first()).toBeVisible();
    await expect(detail.getByTestId('ticket-status-select')).toHaveCount(0);
    await expect(
      detail.getByText(/Ticket is in a terminal state \(CANCELLED\)/i)
    ).toBeVisible();

    // 4. A terminal ticket rejects every further transition
    const afterTerminal = await apiPatch(
      page.request,
      staffToken,
      `/api/staff/tickets/${ticketId}/status`,
      { status: 'REOPENED' }
    );
    expect(afterTerminal.status).toBe(422);
    expect(afterTerminal.body.error).toBe('Unprocessable Entity');
  });

  test('E2E-02.6: Operational APIs stay scoped away from Requesters (AC-5.3, AC-6.1, AC-6.2)', async ({
    request,
  }) => {
    // 1. The cross-requester staff queue is reachable for staff and blocked for
    //    Requesters (AC-5.3)
    const staffQueue = await apiGet(request, staffToken, '/api/staff/tickets');
    expect(staffQueue.status).toBe(200);
    expect(
      staffQueue.body.tickets.some((ticket: any) => ticket.ticketNo === ticketNo)
    ).toBe(true);

    const requesterQueue = await apiGet(request, requesterToken, '/api/staff/tickets');
    expect(requesterQueue.status).toBe(403);
    expect(requesterQueue.body.error).toBe('Forbidden');

    // 2. A Requester cannot read another user's ticket detail (BR-06)
    const requesterDetail = await apiGet(request, requesterToken, `/api/staff/tickets/${ticketId}`);
    expect(requesterDetail.status).toBe(403);

    // 3. A Requester cannot claim, reprioritise or transition a ticket
    const requesterOwnership = await apiPatch(
      request,
      requesterToken,
      `/api/staff/tickets/${ticketId}/ownership`,
      { ownerId: null }
    );
    expect(requesterOwnership.status).toBe(403);

    const requesterPriority = await apiPatch(
      request,
      requesterToken,
      `/api/staff/tickets/${ticketId}/priority`,
      { itPriority: 'LOW' }
    );
    expect(requesterPriority.status).toBe(403);

    const requesterStatus = await apiPatch(
      request,
      requesterToken,
      `/api/staff/tickets/${ticketId}/status`,
      { status: 'CANCELLED' }
    );
    expect(requesterStatus.status).toBe(403);

    // 4. The fixture ticket kept the state the lifecycle ended on
    const finalState = await apiGet(request, staffToken, `/api/staff/tickets/${ticketId}`);
    expect(finalState.body.currentStatus).toBe('CANCELLED');
    expect(finalState.body.itPriority).toBe('URGENT');
  });
});
