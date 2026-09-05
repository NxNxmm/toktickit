import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        channel: 'chrome',
    },
    webServer: [
        {
            command: 'npm.cmd --prefix server run dev',
            url: 'http://localhost:3000/api/health',
            reuseExistingServer: true,
            timeout: 30000,
        },
        {
            command: 'npm.cmd --prefix client run dev',
            url: 'http://localhost:5173',
            reuseExistingServer: true,
            timeout: 30000,
        },
    ],
    projects: [
        {
            name: 'Desktop Chrome',
            use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        },
    ],
});
