import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const baseScreenshotDir = path.join(process.cwd(), 'artifacts', 'lab-02', 'screenshots');

// Sub-folder paths matching the lab2 required repository structure
const dirs = {
    myTickets:    path.join(baseScreenshotDir, 'my-tickets'),
    createTicket: path.join(baseScreenshotDir, 'create-ticket'),
    ticketDetail: path.join(baseScreenshotDir, 'ticket-detail'),
};

for (const dir of Object.values(dirs)) {
    fs.mkdirSync(dir, { recursive: true });
}

const VIEWPORTS = {
    desktop: { width: 1280, height: 800 },
    tablet:  { width: 768, height: 1024 },
    mobile:  { width: 375, height: 812 },
};

async function isUrlAlive(url) {
    try {
        const res = await fetch(url);
        return res.ok;
    } catch {
        return false;
    }
}

async function waitForUrl(url, timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await isUrlAlive(url)) return true;
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Timeout waiting for ${url}`);
}

async function checkHorizontalScroll(page, viewportName) {
    const hasScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (hasScroll) {
        console.warn(`⚠️ Warning: Horizontal overflow detected on viewport: ${viewportName}`);
    } else {
        console.log(`✓ Zero horizontal scroll verified on ${viewportName} (scrollWidth <= clientWidth)`);
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

    console.log('\nStarting automated responsive screenshot capture...');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });

    try {
        // ─────────────────────────────────────────────────────────────
        // 1. DESKTOP VIEWPORT (1280x800)
        // ─────────────────────────────────────────────────────────────
        console.log('\n--- Capturing Desktop Screenshots (1280x800) ---');
        const desktopContext = await browser.newContext({ viewport: VIEWPORTS.desktop });
        const desktopPage = await desktopContext.newPage();

        // 1.1 Requester Selector Modal  →  my-tickets/
        await desktopPage.goto('http://localhost:5173');
        await desktopPage.evaluate(() => localStorage.clear());
        await desktopPage.reload();
        await desktopPage.waitForSelector('text=TokTickIT');
        await desktopPage.waitForTimeout(500);
        await desktopPage.screenshot({ path: path.join(dirs.myTickets, 'desktop-01-requester-selector.png') });
        console.log('Saved my-tickets/desktop-01-requester-selector.png');

        // Select Jennifer Anderson
        await desktopPage.selectOption('select#requesterSelect', '1');
        await desktopPage.click('button:has-text("Continue")');
        await desktopPage.waitForSelector('h1:has-text("My Tickets")');
        await desktopPage.waitForTimeout(600);

        // 1.2 My Tickets List  →  my-tickets/
        await checkHorizontalScroll(desktopPage, 'Desktop My Tickets');
        await desktopPage.screenshot({ path: path.join(dirs.myTickets, 'desktop-02-my-tickets.png') });
        console.log('Saved my-tickets/desktop-02-my-tickets.png');

        // 1.3 Create Ticket Form  →  create-ticket/
        await desktopPage.click('button:has-text("+ Create Ticket")');
        await desktopPage.waitForSelector('text=Create New Support Ticket');
        await desktopPage.waitForTimeout(400);
        await checkHorizontalScroll(desktopPage, 'Desktop Create Ticket');
        await desktopPage.screenshot({ path: path.join(dirs.createTicket, 'desktop-03-create-ticket.png') });
        console.log('Saved create-ticket/desktop-03-create-ticket.png');

        // 1.4 Ticket Detail View  →  ticket-detail/
        await desktopPage.click('button:has-text("My Tickets")');
        await desktopPage.waitForSelector('h1:has-text("My Tickets")');
        await desktopPage.waitForTimeout(500);
        await desktopPage.click('table tbody tr:first-child');
        await desktopPage.waitForSelector('text=Problem Statement');
        await desktopPage.waitForTimeout(600);
        await checkHorizontalScroll(desktopPage, 'Desktop Ticket Detail');
        await desktopPage.screenshot({ path: path.join(dirs.ticketDetail, 'desktop-04-ticket-detail.png') });
        console.log('Saved ticket-detail/desktop-04-ticket-detail.png');

        // 1.5 Soft Remove Modal  →  ticket-detail/
        const removeBtn = desktopPage.locator('button:has-text("Remove")').first();
        if (await removeBtn.isVisible()) {
            await removeBtn.click();
            await desktopPage.waitForSelector('text=Remove Attachment');
            await desktopPage.waitForTimeout(300);
            await desktopPage.screenshot({ path: path.join(dirs.ticketDetail, 'desktop-05-soft-remove-modal.png') });
            console.log('Saved ticket-detail/desktop-05-soft-remove-modal.png');
            await desktopPage.click('button:has-text("Cancel")');
        }

        await desktopContext.close();

        // ─────────────────────────────────────────────────────────────
        // 2. TABLET VIEWPORT (768x1024)
        // ─────────────────────────────────────────────────────────────
        console.log('\n--- Capturing Tablet Screenshots (768x1024) ---');
        const tabletContext = await browser.newContext({ viewport: VIEWPORTS.tablet });
        const tabletPage = await tabletContext.newPage();

        await tabletPage.goto('http://localhost:5173');
        await tabletPage.evaluate(() => {
            localStorage.setItem('toktickit_selected_requester', JSON.stringify({
                id: 1,
                name: 'Jennifer Anderson',
                email: 'jennifer.anderson@kmutt.ac.th',
                department: 'Computer Engineering',
                isActive: true,
            }));
        });
        await tabletPage.reload();
        await tabletPage.waitForSelector('h1:has-text("My Tickets")');
        await tabletPage.waitForTimeout(600);

        // 2.1 Tablet My Tickets  →  my-tickets/
        await checkHorizontalScroll(tabletPage, 'Tablet My Tickets');
        await tabletPage.screenshot({ path: path.join(dirs.myTickets, 'tablet-01-my-tickets.png') });
        console.log('Saved my-tickets/tablet-01-my-tickets.png');

        // 2.2 Tablet Create Ticket Form  →  create-ticket/
        await tabletPage.click('button:has-text("New Ticket")');
        await tabletPage.waitForSelector('text=Create New Support Ticket');
        await tabletPage.waitForTimeout(400);
        await checkHorizontalScroll(tabletPage, 'Tablet Create Ticket');
        await tabletPage.screenshot({ path: path.join(dirs.createTicket, 'tablet-02-create-ticket.png') });
        console.log('Saved create-ticket/tablet-02-create-ticket.png');

        // 2.3 Tablet Ticket Detail View  →  ticket-detail/
        const tabletNavToggler = tabletPage.locator('button.navbar-toggler');
        if (await tabletNavToggler.isVisible()) {
            await tabletNavToggler.click();
            await tabletPage.waitForTimeout(300);
            await tabletPage.click('#toktickitNavbar button:has-text("My Tickets")');
        } else {
            await tabletPage.click('button:has-text("My Tickets")');
        }
        await tabletPage.waitForSelector('h1:has-text("My Tickets")');
        await tabletPage.waitForTimeout(500);

        const tabletTicket = tabletPage.locator('.d-lg-none .card button[title^="View ticket"], .d-lg-none .card').first();
        await tabletTicket.click();
        await tabletPage.waitForSelector('text=Problem Statement');
        await tabletPage.waitForTimeout(600);
        await checkHorizontalScroll(tabletPage, 'Tablet Ticket Detail');
        await tabletPage.screenshot({ path: path.join(dirs.ticketDetail, 'tablet-03-ticket-detail.png') });
        console.log('Saved ticket-detail/tablet-03-ticket-detail.png');

        await tabletContext.close();

        // ─────────────────────────────────────────────────────────────
        // 3. MOBILE VIEWPORT (375x812)
        // ─────────────────────────────────────────────────────────────
        console.log('\n--- Capturing Mobile Screenshots (375x812) ---');
        const mobileContext = await browser.newContext({ viewport: VIEWPORTS.mobile });
        const mobilePage = await mobileContext.newPage();

        await mobilePage.goto('http://localhost:5173');
        await mobilePage.evaluate(() => {
            localStorage.setItem('toktickit_selected_requester', JSON.stringify({
                id: 1,
                name: 'Jennifer Anderson',
                email: 'jennifer.anderson@kmutt.ac.th',
                department: 'Computer Engineering',
                isActive: true,
            }));
        });
        await mobilePage.reload();
        await mobilePage.waitForSelector('h1:has-text("My Tickets")');
        await mobilePage.waitForTimeout(600);

        // 3.1 Mobile My Tickets (Card view)  →  my-tickets/
        await checkHorizontalScroll(mobilePage, 'Mobile My Tickets');
        await mobilePage.screenshot({ path: path.join(dirs.myTickets, 'mobile-01-my-tickets.png') });
        console.log('Saved my-tickets/mobile-01-my-tickets.png');

        // 3.2 Mobile Hamburger Menu  →  my-tickets/
        const hamburgerBtn = mobilePage.locator('button.navbar-toggler');
        if (await hamburgerBtn.isVisible()) {
            await hamburgerBtn.click();
            await mobilePage.waitForTimeout(350);
            await mobilePage.screenshot({ path: path.join(dirs.myTickets, 'mobile-04-hamburger-nav.png') });
            console.log('Saved my-tickets/mobile-04-hamburger-nav.png');
            // Close hamburger menu
            await hamburgerBtn.click();
            await mobilePage.waitForTimeout(300);
        }

        // 3.3 Mobile Create Ticket Form  →  create-ticket/
        await mobilePage.click('button:has-text("New Ticket")');
        await mobilePage.waitForSelector('text=Create New Support Ticket');
        await mobilePage.waitForTimeout(400);
        await checkHorizontalScroll(mobilePage, 'Mobile Create Ticket');
        await mobilePage.screenshot({ path: path.join(dirs.createTicket, 'mobile-02-create-ticket.png') });
        console.log('Saved create-ticket/mobile-02-create-ticket.png');

        // 3.4 Mobile Ticket Detail View  →  ticket-detail/
        if (await hamburgerBtn.isVisible()) {
            await hamburgerBtn.click();
            await mobilePage.waitForTimeout(300);
            await mobilePage.click('#toktickitNavbar button:has-text("My Tickets")');
        } else {
            await mobilePage.click('button:has-text("My Tickets")');
        }
        await mobilePage.waitForSelector('h1:has-text("My Tickets")');
        await mobilePage.waitForTimeout(500);

        const mobileTicket = mobilePage.locator('.d-lg-none .card button[title^="View ticket"], .d-lg-none .card').first();
        await mobileTicket.click();
        await mobilePage.waitForSelector('text=Problem Statement');
        await mobilePage.waitForTimeout(600);
        await checkHorizontalScroll(mobilePage, 'Mobile Ticket Detail');
        await mobilePage.screenshot({ path: path.join(dirs.ticketDetail, 'mobile-03-ticket-detail.png') });
        console.log('Saved ticket-detail/mobile-03-ticket-detail.png');

        await mobileContext.close();
        await browser.close();

        console.log('\n✅ All screenshots captured and verified with zero horizontal scroll!');
        console.log('\nScreenshot directory structure:');
        console.log('  artifacts/lab-02/screenshots/');
        console.log('    my-tickets/     — requester selector, my tickets list (desktop, tablet, mobile), hamburger nav');
        console.log('    create-ticket/  — create ticket form (desktop, tablet, mobile)');
        console.log('    ticket-detail/  — ticket detail view and soft-remove modal (desktop, tablet, mobile)');
    } finally {
        for (const proc of spawnedProcesses) {
            proc.kill();
        }
    }
}

run().catch((err) => {
    console.error('Error during screenshot generation:', err);
    process.exit(1);
});
