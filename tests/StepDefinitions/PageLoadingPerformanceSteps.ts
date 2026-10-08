// Loading time checks for TC020_PageLoadingPerformance.feature.
// The time of the user under test (TEST_USER) is compared with a reference user, usually
// StandardUser, measured in the same run in its own browser context.
// PerformanceGlitchUser is slow on purpose, so it is expected to fail here.

import { When, Then } from '@cucumber/cucumber';
import { Page } from '@playwright/test';
import { BrowserInitiation } from '../Fixtures/browserInitiation';
import { LoginPage } from '../PageObject/loginPage';
import { getPageUrl } from '../config/env';

// Extra time allowed on top of "N times StandardUser", so normal network noise doesn't fail the test
const MARGIN_MS = 1000;
// Upper limit for one measurement, so a page that never loads fails instead of hanging.
// Kept separate from tests/config/timeouts.ts because it belongs to the performance check only.
const LOAD_TIMEOUT_MS = 30 * 1000;

type Measurement = { action: string; pageName: string; ms: number };
// The last measurement of the scenario. The Then step reads it and clears it.
let measured: Measurement | undefined;
// Reference times per user and action, so the reference user is measured once per run, not in every scenario
const baselineCache = new Map<string, number>();

function currentUser(): string {
    return process.env.TEST_USER || 'StandardUser';
}

// Waits for the page title (data-test="title"), e.g. "Products" or "Your Cart".
// When the title is visible, the page counts as loaded.
async function waitForProductsHeader(page: Page) {
    await page.locator('[data-test="title"]').waitFor({ state: 'visible', timeout: LOAD_TIMEOUT_MS });
}

// Time from clicking Login until the products page is shown. Opening the login page is not measured.
async function timeLogin(page: Page, userType: string): Promise<number> {
    await page.goto(getPageUrl('login'));
    await page.locator('#user-name').waitFor({ state: 'visible' });
    const start = Date.now();
    await new LoginPage(page).loginAs(userType);
    await page.waitForURL('**/inventory.html', { timeout: LOAD_TIMEOUT_MS });
    await waitForProductsHeader(page);
    return Date.now() - start;
}

// From opening the URL until the page is loaded and its title is shown
async function timePage(page: Page, pageName: string): Promise<number> {
    const start = Date.now();
    await page.goto(getPageUrl(pageName), { waitUntil: 'load', timeout: LOAD_TIMEOUT_MS });
    await waitForProductsHeader(page);
    return Date.now() - start;
}

// Measures the same action for the reference user. A new browser context with the same window size
// is used, so the session of the user under test is not touched. The result is cached.
async function baselineTime(world: BrowserInitiation, baselineUser: string, m: Measurement): Promise<number> {
    const key = `${baselineUser}|${m.action}`;
    const cached = baselineCache.get(key);
    if (cached !== undefined) return cached;

    const context = await world.browser.newContext({ viewport: world.page.viewportSize() ?? undefined });
    try {
        const page = await context.newPage();
        let ms: number;
        if (m.pageName === 'login') {
            ms = await timeLogin(page, baselineUser);
        } else {
            await timeLogin(page, baselineUser);          // log in first, not measured
            ms = await timePage(page, m.pageName);
        }
        baselineCache.set(key, ms);
        return ms;
    } finally {
        await context.close();
    }
}

// Measures the login of TEST_USER. This scenario has no logged-in Background, because the login itself is measured.
When('I log in and measure the loading time', async function (this: BrowserInitiation) {
    const ms = await timeLogin(this.page, currentUser());
    measured = { action: 'Logging in', pageName: 'login', ms };
});

// Opens a page by URL while logged in, e.g. When I open the "cart" page and measure the loading time
When('I open the {string} page and measure the loading time', async function (this: BrowserInitiation, pageName: string) {
    const ms = await timePage(this.page, pageName);
    measured = { action: `Opening the ${pageName} page`, pageName, ms };
});

// Allowed time = factor x reference time + MARGIN_MS,
// e.g. Then the loading time should be at most 2 times the loading time of "StandardUser"
Then('the loading time should be at most {int} times the loading time of {string}', async function (this: BrowserInitiation, factor: number, baselineUser: string) {
    if (!measured) {
        throw new Error('No loading time was measured. Use a "measure the loading time" step first.');
    }
    const user = currentUser();
    const baseline = await baselineTime(this, baselineUser, measured);
    const allowed = baseline * factor + MARGIN_MS;

    // The times are shown in the Cucumber HTML report for every user, also when the step passes
    this.attach(
        `${measured.action}: ${user} ${measured.ms} ms, ${baselineUser} ${baseline} ms, allowed ${allowed} ms`,
        'text/plain'
    );

    if (measured.ms > allowed) {
        throw new Error(
            `${measured.action} is too slow for ${user}.\n` +
            `  ${user}: ${measured.ms} ms\n` +
            `  ${baselineUser}: ${baseline} ms\n` +
            `  Allowed: ${allowed} ms (${factor} x ${baseline} ms + ${MARGIN_MS} ms margin)`
        );
    }
    // Cleared so a later scenario cannot reuse this measurement by mistake
    measured = undefined;
});