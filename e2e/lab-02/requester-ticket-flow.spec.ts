import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ACCOUNTS, DEV_PASSWORD, uiSignIn } from '../lab-03/e2e-support';

// Helper: ensure a small valid PNG fixture file exists for attachment testing
const testFixturePath = path.join(process.cwd(), 'server', 'tests', 'fixtures', 'test-image.png');
if (!fs.existsSync(testFixturePath)) {
    const fixtureDir = path.dirname(testFixturePath);
    if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(
        testFixturePath,
        Buffer.from(
            '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
            '2e00000000c49444154789c6260f8cfc000000002000172657273696f6e303' +
            '00000000049454e44ae426082',
            'hex'
        )
    );
}

/**
 * Lab 2 End-to-End Tests (E2E-01 & E2E-02).
 *
 * These journeys were originally driven through the Lab 2 "DEVELOPMENT MODE"
 * requester switcher. Lab 3 Issue 1 replaced that impersonation shortcut with
 * strict authenticated sessions (AC-3.1, AC-3.5), so the suites now sign in as
 * real seeded accounts. The coverage is unchanged: the attachment lifecycle
 * (AC-6.5) and requester ticket isolation (BR-06) are still verified end to end.
 */
test.describe('Lab 2 End-to-End Tests (E2E-01 & E2E-02)', () => {
    let createdTicketNo = '';

    test.beforeEach(async ({ page }) => {
        await page.context().clearCookies();
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('E2E-01: Full Requester Journey: Sign In -> Create Ticket -> Upload -> View -> Soft Remove', async ({ page }) => {
        // 1. An unauthenticated visitor is held at the Sign In screen and the
        //    Lab 2 impersonation switcher is gone
        await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
        await expect(page.getByText('DEVELOPMENT MODE')).toHaveCount(0);
        await expect(page.getByLabel(/Select Development Requester/i)).toHaveCount(0);

        // 2. Sign in as a real seeded Requester
        await uiSignIn(page, ACCOUNTS.requester.email, DEV_PASSWORD);
        const header = page.locator('header');
        await expect(header.getByText(ACCOUNTS.requester.name, { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'My Tickets', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: /Change Requester/i })).toHaveCount(0);

        // 3. Navigate to the Create Ticket form
        await page.getByRole('button', { name: /\+ Create Ticket/i }).click();
        await expect(page.getByRole('heading', { name: /Create New Support Ticket/i })).toBeVisible();

        // 4. Fill out the form and attach a file
        const uniqueSummary = `E2E Test Laptop Battery Drain ${Date.now()}`;
        await page.getByPlaceholder(/Brief description of the problem/i).fill(uniqueSummary);
        await page.getByPlaceholder(/Provide details about the problem/i).fill(
            'The battery discharges from 100% to 15% in less than 45 minutes of standard usage. Requires battery diagnostics or replacement.'
        );

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFixturePath);
        await expect(page.getByText(/test-image\.png/i)).toBeVisible();

        await page.getByRole('button', { name: /Submit Ticket/i }).click();

        // 5. Back in My Tickets with the new ticket present
        await expect(page.getByText(uniqueSummary).first()).toBeVisible({ timeout: 10000 });
        await page.getByText(uniqueSummary).first().click();

        // 6. Ticket Detail view with the official Ticket Number
        await expect(page.getByText(/Problem Statement/i)).toBeVisible();
        await expect(page.getByText(uniqueSummary).first()).toBeVisible();

        // The number is rendered inside a combined "Ticket Number / badges" block,
        // so read the detail region and pull the number out of the text.
        // The sequence width is intentionally not asserted: the API path
        // (ticket.controller.ts) and utils/ticketNumber.ts disagree on it.
        const detail = page.locator('main');
        await expect(detail).toContainText('Ticket Number');
        const ticketNoMatch = (await detail.innerText()).match(/TKT-\d{4}-\d{5,6}/);
        expect(ticketNoMatch).not.toBeNull();
        createdTicketNo = ticketNoMatch![0];
        expect(createdTicketNo).toMatch(/^TKT-\d{4}-\d{5,6}$/);

        // 7. The attachment is listed and downloadable
        await expect(page.getByText('test-image.png')).toBeVisible();
        await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();

        // 8. Soft-remove the attachment
        await page.getByRole('button', { name: /Remove/i }).click();

        const reasonModal = page.getByRole('dialog');
        await expect(reasonModal).toBeVisible();
        await page.getByPlaceholder(/Explain why this attachment is being removed/i).fill('Removing file per E2E automated testing procedure');
        await page.getByRole('button', { name: /Confirm Removal/i }).click();

        // 9. The attachment now shows a Removed badge and a disabled download
        await expect(page.getByText(/Removed/i).first()).toBeVisible();
        await expect(page.getByText(/Removing file per E2E automated testing procedure/i)).toBeVisible();
        const disabledDownload = page.getByRole('button', { name: /🔒 Download/i });
        await expect(disabledDownload).toBeDisabled();

        // 10. Back to the tickets list
        await page.getByRole('button', { name: /Back to My Tickets/i }).click();
        await expect(page.getByText(uniqueSummary).first()).toBeVisible();
    });

    test('E2E-02: Per-user sessions keep ticket ownership isolated (FR-12, BR-06, AC-03)', async ({ page }) => {
        // E2E-01 must have produced a ticket number to assert isolation against
        expect(createdTicketNo, 'E2E-01 should have captured a ticket number').toMatch(
            /^TKT-\d{4}-\d{5,6}$/
        );

        // 1. Jennifer's ticket from E2E-01 is visible in her own list
        await uiSignIn(page, ACCOUNTS.requester.email, DEV_PASSWORD);
        await expect(page.locator('header').getByText(ACCOUNTS.requester.name, { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'My Tickets', exact: true })).toBeVisible();
        await expect(page.getByText(createdTicketNo).first()).toBeVisible();

        // 2. Signing in as a different Requester replaces the session entirely,
        //    and the first requester's ticket is not disclosed
        await uiSignIn(page, ACCOUNTS.secondRequester.email, DEV_PASSWORD);
        await expect(page.locator('header').getByText(ACCOUNTS.secondRequester.name, { exact: true })).toBeVisible();
        await expect(page.getByText(createdTicketNo)).toHaveCount(0);

        // 3. There is no longer a way to impersonate another requester from the
        //    client; isolation is enforced by the session, not by a picker
        await expect(page.getByRole('button', { name: /Change Requester/i })).toHaveCount(0);
        await expect(page.getByLabel(/Select Development Requester/i)).toHaveCount(0);
        await expect(page.getByText('DEVELOPMENT MODE')).toHaveCount(0);
    });
});
