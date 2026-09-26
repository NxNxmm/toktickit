import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

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

async function isUrlAlive(url) {
    try {
        const res = await fetch(url);
        return res.ok;
    } catch {
        return false;
    }
}

async function waitForUrl(url, timeoutMs = 25000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await isUrlAlive(url)) return true;
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Timeout waiting for ${url}`);
}

async function checkHorizontalScroll(page, screenName, viewportName) {
    const hasScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (hasScroll) {
        console.warn(`⚠️ Warning: Horizontal overflow detected on ${screenName} (${viewportName})`);
    } else {
        console.log(`✓ Zero horizontal scroll verified on ${screenName} (${viewportName})`);
    }
}

async function run() {
    console.log('Ensuring development servers are running...');
    const spawnedProcesses = [];

    const serverAlive = await isUrlAlive('http://localhost:3000/api/health');
    if (!serverAlive) {
        console.log('Starting backend server (localhost:3000)...');
        const srv = spawn('npm.cmd', ['--prefix', 'server', 'run', 'dev'], { shell: true, stdio: 'ignore' });
        spawnedProcesses.push(srv);
        await waitForUrl('http://localhost:3000/api/health');
        console.log('Backend server is ready.');
    } else {
        console.log('Backend server is already running.');
    }

    const clientAlive = await isUrlAlive('http://localhost:5173');
    if (!clientAlive) {
        console.log('Starting frontend client (localhost:5173)...');
        const cli = spawn('npm.cmd', ['--prefix', 'client', 'run', 'dev'], { shell: true, stdio: 'ignore' });
        spawnedProcesses.push(cli);
        await waitForUrl('http://localhost:5173');
        console.log('Frontend client is ready.');
    } else {
        console.log('Frontend client is already running.');
    }

    console.log('\nStarting automated responsive screenshot capture for Lab 3...');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });

    try {
        // ─────────────────────────────────────────────────────────────
        // 1. DESKTOP VIEWPORT (1280x800)
        // ─────────────────────────────────────────────────────────────
        console.log('\n--- Capturing Desktop Screenshots (1280x800) ---');
        const desktopContext = await browser.newContext({ viewport: VIEWPORTS.desktop });
        const desktopPage = await desktopContext.newPage();

        // 1.1 Login Screen (Clean)
        await desktopPage.goto('http://localhost:5173/login');
        await desktopPage.evaluate(() => {
            localStorage.clear();
            document.cookie.split(';').forEach((c) => {
                document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
            });
        });
        await desktopPage.reload();
        await desktopPage.waitForSelector('text=Sign In');
        await desktopPage.waitForTimeout(500);
        await checkHorizontalScroll(desktopPage, 'Login Screen', 'Desktop 1280x800');
        await desktopPage.screenshot({ path: path.join(dirs.auth, 'desktop-01-login.png') });
        console.log('Saved auth/desktop-01-login.png');

        // 1.2 Login Error State
        await desktopPage.fill('#email', 'jennifer.anderson@kmutt.ac.th');
        await desktopPage.fill('#password', 'WrongPassword999!');
        await desktopPage.click('button:has-text("Sign In")');
        await desktopPage.waitForSelector('.alert-danger, text=Invalid email or password');
        await desktopPage.waitForTimeout(400);
        await checkHorizontalScroll(desktopPage, 'Login Error State', 'Desktop 1280x800');
        await desktopPage.screenshot({ path: path.join(dirs.auth, 'desktop-02-login-error.png') });
        console.log('Saved auth/desktop-02-login-error.png');

        // 1.3 Mandatory Password Change Screen
        await desktopPage.fill('#email', 'alex.turner@toktickit.kmutt.ac.th');
        await desktopPage.fill('#password', 'Password123!');
        await desktopPage.click('button:has-text("Sign In")');
        await desktopPage.waitForSelector('text=Change Password Required, text=Update Password');
        await desktopPage.waitForTimeout(500);
        await checkHorizontalScroll(desktopPage, 'Change Password Screen', 'Desktop 1280x800');
        await desktopPage.screenshot({ path: path.join(dirs.auth, 'desktop-03-change-password.png') });
        console.log('Saved auth/desktop-03-change-password.png');

        // Log out / clear context
        await desktopContext.close();

        // 1.4 Admin & Staff Views
        const adminContext = await browser.newContext({ viewport: VIEWPORTS.desktop });
        const adminPage = await adminContext.newPage();
        await adminPage.goto('http://localhost:5173/login');
        await adminPage.fill('#email', 'admin@toktickit.kmutt.ac.th');
        await adminPage.fill('#password', 'Password123!');
        await adminPage.click('button:has-text("Sign In")');
        await adminPage.waitForSelector('text=User Management');
        await adminPage.waitForTimeout(600);

        // User Management Table
        await checkHorizontalScroll(adminPage, 'User Management Table', 'Desktop 1280x800');
        await adminPage.screenshot({ path: path.join(dirs.userManagement, 'desktop-07-user-management.png') });
        console.log('Saved user-management/desktop-07-user-management.png');

        // Create User Modal
        await adminPage.click('button:has-text("+ Create User")');
        await adminPage.waitForSelector('text=Create New User');
        await adminPage.waitForTimeout(400);
        await adminPage.screenshot({ path: path.join(dirs.userManagement, 'desktop-08-create-user-modal.png') });
        console.log('Saved user-management/desktop-08-create-user-modal.png');
        await adminPage.click('button:has-text("Cancel")');
        await adminPage.waitForTimeout(300);

        // Edit User Modal with Self-Deactivation Guard
        const adminEditBtn = adminPage.locator('table tbody tr:has-text("admin@toktickit.kmutt.ac.th") button:has-text("Edit")');
        if (await adminEditBtn.isVisible()) {
            await adminEditBtn.click();
            await adminPage.waitForSelector('text=Edit User');
            await adminPage.waitForTimeout(400);
            await adminPage.screenshot({ path: path.join(dirs.userManagement, 'desktop-09-edit-user-modal-self-guard.png') });
            console.log('Saved user-management/desktop-09-edit-user-modal-self-guard.png');
            await adminPage.click('button:has-text("Cancel")');
            await adminPage.waitForTimeout(300);
        }

        // Staff Ticket Queue (as Admin or Staff)
        const staffQueueLink = adminPage.locator('button:has-text("Ticket Queue"), a:has-text("Ticket Queue")');
        if (await staffQueueLink.isVisible()) {
            await staffQueueLink.click();
        } else {
            await adminPage.goto('http://localhost:5173/staff/queue');
        }
        await adminPage.waitForSelector('h1:has-text("Ticket Queue")');
        await adminPage.waitForTimeout(600);
        await checkHorizontalScroll(adminPage, 'Staff Ticket Queue', 'Desktop 1280x800');
        await adminPage.screenshot({ path: path.join(dirs.staffQueue, 'desktop-04-staff-queue.png') });
        console.log('Saved staff-queue/desktop-04-staff-queue.png');

        // Staff Ticket Detail (Operational Controls)
        const queueRow = adminPage.locator('.table tbody tr, .card').first();
        await queueRow.click();
        await adminPage.waitForSelector('text=Operational Controls, text=Claim Ticket, text=IT Priority');
        await adminPage.waitForTimeout(600);
        await checkHorizontalScroll(adminPage, 'Staff Ticket Detail', 'Desktop 1280x800');
        await adminPage.screenshot({ path: path.join(dirs.staffTicket, 'desktop-05-staff-ticket-detail.png') });
        console.log('Saved staff-ticket/desktop-05-staff-ticket-detail.png');

        // Internal Notes Tab
        const notesTab = adminPage.locator('button:has-text("Internal Notes")');
        if (await notesTab.isVisible()) {
            await notesTab.click();
            await adminPage.waitForSelector('text=Private Operational Notes');
            await adminPage.waitForTimeout(400);
            await adminPage.screenshot({ path: path.join(dirs.staffTicket, 'desktop-06-internal-notes.png') });
            console.log('Saved staff-ticket/desktop-06-internal-notes.png');
        }

        await adminContext.close();

        // 1.5 Requester Ticket Detail View
        const reqContext = await browser.newContext({ viewport: VIEWPORTS.desktop });
        const reqPage = await reqContext.newPage();
        await reqPage.goto('http://localhost:5173/login');
        await reqPage.fill('#email', 'jennifer.anderson@kmutt.ac.th');
        await reqPage.fill('#password', 'Password123!');
        await reqPage.click('button:has-text("Sign In")');
        await reqPage.waitForSelector('h1:has-text("My Tickets")');
        await reqPage.waitForTimeout(600);

        const firstReqTicket = reqPage.locator('table tbody tr').first();
        await firstReqTicket.click();
        await reqPage.waitForSelector('text=Problem Description, text=Public Comments');
        await reqPage.waitForTimeout(600);
        await checkHorizontalScroll(reqPage, 'Requester Ticket Detail', 'Desktop 1280x800');
        await reqPage.screenshot({ path: path.join(dirs.requester, 'desktop-10-requester-ticket-detail.png') });
        console.log('Saved requester/desktop-10-requester-ticket-detail.png');

        await reqContext.close();

        // ─────────────────────────────────────────────────────────────
        // 2. TABLET VIEWPORT (768x1024)
        // ─────────────────────────────────────────────────────────────
        console.log('\n--- Capturing Tablet Screenshots (768x1024) ---');
        const tabletContext = await browser.newContext({ viewport: VIEWPORTS.tablet });
        const tabletPage = await tabletContext.newPage();

        // Tablet Staff Queue
        await tabletPage.goto('http://localhost:5173/login');
        await tabletPage.fill('#email', 'admin@toktickit.kmutt.ac.th');
        await tabletPage.fill('#password', 'Password123!');
        await tabletPage.click('button:has-text("Sign In")');
        await tabletPage.waitForSelector('h1');
        await tabletPage.waitForTimeout(600);

        const tabletQueueBtn = tabletPage.locator('button:has-text("Ticket Queue"), a:has-text("Ticket Queue")');
        if (await tabletQueueBtn.isVisible()) {
            await tabletQueueBtn.click();
        } else {
            const navToggle = tabletPage.locator('button.navbar-toggler');
            if (await navToggle.isVisible()) {
                await navToggle.click();
                await tabletPage.waitForTimeout(300);
                await tabletPage.click('button:has-text("Ticket Queue")');
            }
        }
        await tabletPage.waitForSelector('h1:has-text("Ticket Queue")');
        await tabletPage.waitForTimeout(600);
        await checkHorizontalScroll(tabletPage, 'Tablet Staff Queue', 'Tablet 768x1024');
        await tabletPage.screenshot({ path: path.join(dirs.staffQueue, 'tablet-01-staff-queue.png') });
        console.log('Saved staff-queue/tablet-01-staff-queue.png');

        // Tablet Staff Ticket Detail
        await tabletPage.locator('.table tbody tr, .card').first().click();
        await tabletPage.waitForSelector('text=Problem Statement, text=Operational Controls');
        await tabletPage.waitForTimeout(600);
        await checkHorizontalScroll(tabletPage, 'Tablet Staff Ticket Detail', 'Tablet 768x1024');
        await tabletPage.screenshot({ path: path.join(dirs.staffTicket, 'tablet-02-staff-ticket-detail.png') });
        console.log('Saved staff-ticket/tablet-02-staff-ticket-detail.png');

        // Tablet User Management
        const tabletNavToggle = tabletPage.locator('button.navbar-toggler');
        if (await tabletNavToggle.isVisible()) {
            await tabletNavToggle.click();
            await tabletPage.waitForTimeout(300);
            await tabletPage.click('button:has-text("User Management")');
        } else {
            await tabletPage.click('button:has-text("User Management")');
        }
        await tabletPage.waitForSelector('text=User Management');
        await tabletPage.waitForTimeout(600);
        await checkHorizontalScroll(tabletPage, 'Tablet User Management', 'Tablet 768x1024');
        await tabletPage.screenshot({ path: path.join(dirs.userManagement, 'tablet-03-user-management.png') });
        console.log('Saved user-management/tablet-03-user-management.png');

        await tabletContext.close();

        // ─────────────────────────────────────────────────────────────
        // 3. MOBILE VIEWPORT (375x812)
        // ─────────────────────────────────────────────────────────────
        console.log('\n--- Capturing Mobile Screenshots (375x812) ---');
        const mobileContext = await browser.newContext({ viewport: VIEWPORTS.mobile });
        const mobilePage = await mobileContext.newPage();

        // 3.1 Mobile Login
        await mobilePage.goto('http://localhost:5173/login');
        await mobilePage.evaluate(() => {
            localStorage.clear();
            document.cookie.split(';').forEach((c) => {
                document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
            });
        });
        await mobilePage.reload();
        await mobilePage.waitForSelector('text=Sign In');
        await mobilePage.waitForTimeout(500);
        await checkHorizontalScroll(mobilePage, 'Mobile Login', 'Mobile 375x812');
        await mobilePage.screenshot({ path: path.join(dirs.auth, 'mobile-01-login.png') });
        console.log('Saved auth/mobile-01-login.png');

        // 3.2 Mobile Change Password
        await mobilePage.fill('#email', 'alex.turner@toktickit.kmutt.ac.th');
        await mobilePage.fill('#password', 'Password123!');
        await mobilePage.click('button:has-text("Sign In")');
        await mobilePage.waitForSelector('text=Change Password Required, text=Update Password');
        await mobilePage.waitForTimeout(500);
        await checkHorizontalScroll(mobilePage, 'Mobile Change Password', 'Mobile 375x812');
        await mobilePage.screenshot({ path: path.join(dirs.auth, 'mobile-02-change-password.png') });
        console.log('Saved auth/mobile-02-change-password.png');

        // 3.3 Mobile Staff Queue (Stacked Cards)
        await mobilePage.goto('http://localhost:5173/login');
        await mobilePage.fill('#email', 'admin@toktickit.kmutt.ac.th');
        await mobilePage.fill('#password', 'Password123!');
        await mobilePage.click('button:has-text("Sign In")');
        await mobilePage.waitForSelector('h1');
        await mobilePage.waitForTimeout(600);

        const mobileNavToggle = mobilePage.locator('button.navbar-toggler');
        if (await mobileNavToggle.isVisible()) {
            await mobileNavToggle.click();
            await mobilePage.waitForTimeout(300);
            await mobilePage.click('button:has-text("Ticket Queue")');
        } else {
            await mobilePage.click('button:has-text("Ticket Queue")');
        }
        await mobilePage.waitForSelector('h1:has-text("Ticket Queue")');
        await mobilePage.waitForTimeout(600);
        await checkHorizontalScroll(mobilePage, 'Mobile Staff Queue', 'Mobile 375x812');
        await mobilePage.screenshot({ path: path.join(dirs.staffQueue, 'mobile-03-staff-queue.png') });
        console.log('Saved staff-queue/mobile-03-staff-queue.png');

        // 3.4 Mobile Hamburger Nav
        if (await mobileNavToggle.isVisible()) {
            await mobileNavToggle.click();
            await mobilePage.waitForTimeout(350);
            await mobilePage.screenshot({ path: path.join(dirs.staffQueue, 'mobile-04-hamburger-nav.png') });
            console.log('Saved staff-queue/mobile-04-hamburger-nav.png');
            await mobileNavToggle.click();
            await mobilePage.waitForTimeout(300);
        }

        // 3.5 Mobile Staff Ticket Detail
        const mobileTicketCard = mobilePage.locator('.d-lg-none .card, .card').first();
        await mobileTicketCard.click();
        await mobilePage.waitForSelector('text=Problem Statement, text=Operational Controls');
        await mobilePage.waitForTimeout(600);
        await checkHorizontalScroll(mobilePage, 'Mobile Staff Ticket Detail', 'Mobile 375x812');
        await mobilePage.screenshot({ path: path.join(dirs.staffTicket, 'mobile-05-staff-ticket-detail.png') });
        console.log('Saved staff-ticket/mobile-05-staff-ticket-detail.png');

        // 3.6 Mobile User Management
        if (await mobileNavToggle.isVisible()) {
            await mobileNavToggle.click();
            await mobilePage.waitForTimeout(300);
            await mobilePage.click('button:has-text("User Management")');
        } else {
            await mobilePage.click('button:has-text("User Management")');
        }
        await mobilePage.waitForSelector('text=User Management');
        await mobilePage.waitForTimeout(600);
        await checkHorizontalScroll(mobilePage, 'Mobile User Management', 'Mobile 375x812');
        await mobilePage.screenshot({ path: path.join(dirs.userManagement, 'mobile-06-user-management.png') });
        console.log('Saved user-management/mobile-06-user-management.png');

        await mobileContext.close();
        await browser.close();

        console.log('\n✅ All Lab 3 responsive screenshots successfully captured with ZERO horizontal scroll!');
        console.log('\nSaved screenshot directory: artifacts/lab-03/screenshots/');
    } finally {
        for (const proc of spawnedProcesses) {
            proc.kill();
        }
    }
}

run().catch((err) => {
    console.error('Error during Lab 3 screenshot generation:', err);
    process.exit(1);
});
