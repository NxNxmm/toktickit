import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

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

test.describe('Lab 2 End-to-End Tests (E2E-01 & E2E-02)', () => {
    let createdTicketNo = '';

    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test so we start from a clean state
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('E2E-01: Full Requester Journey: Select User -> Create Ticket -> Upload -> View -> Soft Remove', async ({ page }) => {
        // 1. Visit root - verify Requester Selector prompts when no user selected
        await expect(page.getByText('DEVELOPMENT MODE')).toBeVisible();
        await expect(page.getByLabel(/Select Development Requester/i)).toBeVisible();

        // 2. Select Jennifer Anderson (value "1") and Continue
        const select = page.getByLabel(/Select Development Requester/i);
        await select.selectOption('1');
        await page.getByRole('button', { name: /Continue/i }).click();

        // 3. Verify Navbar shows selected requester
        await expect(page.getByText('Jennifer Anderson').first()).toBeVisible();
        await expect(page.getByText('My Tickets').first()).toBeVisible();

        // 4. Navigate to Create Ticket form
        await page.getByRole('button', { name: /\+ Create Ticket/i }).click();
        await expect(page.getByRole('heading', { name: /Create New Support Ticket/i })).toBeVisible();

        // 5. Fill out form
        const uniqueSummary = `E2E Test Laptop Battery Drain ${Date.now()}`;
        await page.getByPlaceholder(/Brief description of the problem/i).fill(uniqueSummary);
        await page.getByPlaceholder(/Provide details about the problem/i).fill(
            'The battery discharges from 100% to 15% in less than 45 minutes of standard usage. Requires battery diagnostics or replacement.'
        );

        // Attach file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFixturePath);
        await expect(page.getByText(/test-image\.png/i)).toBeVisible();

        // Submit form
        await page.getByRole('button', { name: /Submit Ticket/i }).click();

        // 6. Verify back in My Tickets list and created ticket is present
        await expect(page.getByText(uniqueSummary).first()).toBeVisible({ timeout: 10000 });

        // Click the ticket row to view detail
        await page.getByText(uniqueSummary).first().click();

        // 7. Verify Ticket Detail view
        await expect(page.getByText(/Problem Statement/i)).toBeVisible();
        await expect(page.getByText(uniqueSummary).first()).toBeVisible();

        // Capture official Ticket Number
        const ticketNoElement = page.locator('text=/TKT-\\d{4}-\\d{6}/').first();
        await expect(ticketNoElement).toBeVisible();
        createdTicketNo = await ticketNoElement.innerText();
        expect(createdTicketNo).toMatch(/^TKT-\d{4}-\d{6}$/);

        // Verify attachment is listed
        await expect(page.getByText('test-image.png')).toBeVisible();
        await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();

        // 8. Soft-remove attachment
        await page.getByRole('button', { name: /Remove/i }).click();

        // Fill in removal reason
        const reasonModal = page.getByRole('dialog');
        await expect(reasonModal).toBeVisible();
        await page.getByPlaceholder(/Explain why this attachment is being removed/i).fill('Removing file per E2E automated testing procedure');
        await page.screenshot({ path: path.join(process.cwd(), 'artifacts', 'lab-02', 'screenshots', 'desktop-05-soft-remove-modal.png') });
        await page.getByRole('button', { name: /Confirm Removal/i }).click();

        // 9. Verify attachment now has "Removed" badge and disabled download
        await expect(page.getByText(/Removed/i).first()).toBeVisible();
        await expect(page.getByText(/Removing file per E2E automated testing procedure/i)).toBeVisible();
        const disabledDownload = page.getByRole('button', { name: /🔒 Download/i });
        await expect(disabledDownload).toBeDisabled();

        // 10. Back to tickets list
        await page.getByRole('button', { name: /Back to My Tickets/i }).click();
        await expect(page.getByText(uniqueSummary).first()).toBeVisible();
    });

    test('E2E-02: Multi-requester switching and ticket isolation (FR-12, BR-06, AC-03)', async ({ page }) => {
        // 1. Initial state has clean localStorage - Select Jennifer Anderson
        await expect(page.getByLabel(/Select Development Requester/i)).toBeVisible();
        await page.getByLabel(/Select Development Requester/i).selectOption('1');
        await page.getByRole('button', { name: /Continue/i }).click();

        await expect(page.getByText('Jennifer Anderson').first()).toBeVisible();

        // 2. Click "Change Requester"
        await page.getByRole('button', { name: /Change Requester/i }).click();

        // 3. Switch to David Lee (value "4")
        await expect(page.getByLabel(/Select Development Requester/i)).toBeVisible();
        await page.getByLabel(/Select Development Requester/i).selectOption('4');
        await page.getByRole('button', { name: /Continue/i }).click();

        // 4. Verify Navbar shows David Lee
        await expect(page.getByText('David Lee').first()).toBeVisible();

        // 5. Verify Jennifer's specific ticket created in E2E-01 is NOT visible in David's tickets list
        if (createdTicketNo) {
            await expect(page.getByText(createdTicketNo)).not.toBeVisible();
        }
    });
});
