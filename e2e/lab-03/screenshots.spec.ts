import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { uiSignIn, ACCOUNTS, DEV_PASSWORD } from './e2e-support';

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

async function assertZeroHorizontalOverflow(page: any, screenLabel: string) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow, `Expected zero horizontal overflow on ${screenLabel}`).toBe(false);
}

test.describe('AC-9.1 & AC-9.2: Visual Inspection & Screenshot Artifacts', () => {
  test('01: Auth screens & error states (Desktop & Mobile)', async ({ page, context }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // 1.1 Clean login screen
    await page.goto('/login');
    await page.waitForSelector('text=Sign In');
    await assertZeroHorizontalOverflow(page, 'Desktop Login Screen');
    await page.screenshot({ path: path.join(dirs.auth, 'desktop-01-login.png') });

    // 1.2 Invalid password error banner
    await page.fill('#email', ACCOUNTS.requester.email);
    await page.fill('#password', 'WrongPassword999!');
    await page.click('button:has-text("Sign In")');
    await page.waitForSelector('.alert-danger, text=Invalid email or password');
    await assertZeroHorizontalOverflow(page, 'Desktop Login Error');
    await page.screenshot({ path: path.join(dirs.auth, 'desktop-02-login-error.png') });

    // 1.3 Mandatory Password Change Screen
    await page.fill('#email', ACCOUNTS.passwordChangeStaff.email);
    await page.fill('#password', DEV_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForSelector('text=Change Password Required, text=Update Password');
    await assertZeroHorizontalOverflow(page, 'Desktop Change Password Screen');
    await page.screenshot({ path: path.join(dirs.auth, 'desktop-03-change-password.png') });

    // 1.4 Mobile Login & Change Password
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      document.cookie.split(';').forEach((c) => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
    });
    await page.reload();
    await page.waitForSelector('text=Sign In');
    await assertZeroHorizontalOverflow(page, 'Mobile Login Screen');
    await page.screenshot({ path: path.join(dirs.auth, 'mobile-01-login.png') });

    await page.fill('#email', ACCOUNTS.passwordChangeStaff.email);
    await page.fill('#password', DEV_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForSelector('text=Change Password Required, text=Update Password');
    await assertZeroHorizontalOverflow(page, 'Mobile Change Password Screen');
    await page.screenshot({ path: path.join(dirs.auth, 'mobile-02-change-password.png') });
  });

  test('02: Staff Ticket Queue across viewports', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await uiSignIn(page, ACCOUNTS.admin.email, DEV_PASSWORD);

    const queueBtn = page.locator('button:has-text("Ticket Queue"), a:has-text("Ticket Queue")');
    if (await queueBtn.isVisible()) {
      await queueBtn.click();
    }
    await page.waitForSelector('h1:has-text("Ticket Queue")');
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
    if (await navToggle.isVisible()) {
      await navToggle.click();
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(dirs.staffQueue, 'mobile-04-hamburger-nav.png') });
      await navToggle.click();
      await page.waitForTimeout(200);
    }
  });

  test('03: Staff Ticket Detail & Internal Notes', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await uiSignIn(page, ACCOUNTS.admin.email, DEV_PASSWORD);

    const queueBtn = page.locator('button:has-text("Ticket Queue"), a:has-text("Ticket Queue")');
    if (await queueBtn.isVisible()) {
      await queueBtn.click();
    }
    await page.waitForSelector('h1:has-text("Ticket Queue")');

    const firstTicket = page.locator('.table tbody tr, .card').first();
    await firstTicket.click();
    await page.waitForSelector('text=Problem Statement, text=Operational Controls');
    await assertZeroHorizontalOverflow(page, 'Desktop Staff Ticket Detail');
    await page.screenshot({ path: path.join(dirs.staffTicket, 'desktop-05-staff-ticket-detail.png') });

    // Internal Notes Tab
    const notesTab = page.locator('button:has-text("Internal Notes")');
    if (await notesTab.isVisible()) {
      await notesTab.click();
      await page.waitForSelector('text=Private Operational Notes');
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(dirs.staffTicket, 'desktop-06-internal-notes.png') });
    }

    // Tablet
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Tablet Staff Ticket Detail');
    await page.screenshot({ path: path.join(dirs.staffTicket, 'tablet-02-staff-ticket-detail.png') });

    // Mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Mobile Staff Ticket Detail');
    await page.screenshot({ path: path.join(dirs.staffTicket, 'mobile-05-staff-ticket-detail.png') });
  });

  test('04: Administrator User Management across viewports', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await uiSignIn(page, ACCOUNTS.admin.email, DEV_PASSWORD);

    const userMgmtBtn = page.locator('button:has-text("User Management"), a:has-text("User Management")');
    if (await userMgmtBtn.isVisible()) {
      await userMgmtBtn.click();
    }
    await page.waitForSelector('text=User Management');
    await assertZeroHorizontalOverflow(page, 'Desktop User Management Table');
    await page.screenshot({ path: path.join(dirs.userManagement, 'desktop-07-user-management.png') });

    // Create User Modal
    await page.click('button:has-text("+ Create User")');
    await page.waitForSelector('text=Create New User');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(dirs.userManagement, 'desktop-08-create-user-modal.png') });
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(300);

    // Edit User Modal with Self-Deactivation Guard
    const adminEditBtn = page.locator('table tbody tr:has-text("admin@toktickit.kmutt.ac.th") button:has-text("Edit")');
    if (await adminEditBtn.isVisible()) {
      await adminEditBtn.click();
      await page.waitForSelector('text=Edit User');
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(dirs.userManagement, 'desktop-09-edit-user-modal-self-guard.png') });
      await page.click('button:has-text("Cancel")');
      await page.waitForTimeout(300);
    }

    // Tablet
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Tablet User Management');
    await page.screenshot({ path: path.join(dirs.userManagement, 'tablet-03-user-management.png') });

    // Mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Mobile User Management');
    await page.screenshot({ path: path.join(dirs.userManagement, 'mobile-06-user-management.png') });
  });

  test('05: Requester Ticket Detail & Public Comments', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await uiSignIn(page, ACCOUNTS.requester.email, DEV_PASSWORD);

    await page.waitForSelector('h1:has-text("My Tickets")');
    const firstTicket = page.locator('table tbody tr').first();
    await firstTicket.click();
    await page.waitForSelector('text=Problem Description, text=Public Comments');
    await assertZeroHorizontalOverflow(page, 'Desktop Requester Ticket Detail');
    await page.screenshot({ path: path.join(dirs.requester, 'desktop-10-requester-ticket-detail.png') });

    // Mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(300);
    await assertZeroHorizontalOverflow(page, 'Mobile Requester Ticket Detail');
    await page.screenshot({ path: path.join(dirs.requester, 'mobile-07-requester-ticket-detail.png') });
  });
});
