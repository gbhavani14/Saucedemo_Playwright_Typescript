// Shared steps used by almost every feature file: opening pages, URL and title checks,
// error messages, the cart badge and the burger menu.
// Page names such as "inventory" or "checkout_step_one" are turned into URLs by tests/config/env.ts.
// Wait times come from tests/config/timeouts.ts.

import {Given, When, Then, DataTable} from '@cucumber/cucumber';
import {expect, Page} from '@playwright/test';
import { BrowserInitiation } from '../Fixtures/browserInitiation';
import { getPageUrl } from '../config/env';
import { BasePage } from '../PageObject/basePage';
import { TIMEOUTS } from '../config/timeouts';

// Opens a page by its short name, e.g. Given I am on the "login" page
Given('I am on the {string} page', async function (this: BrowserInitiation, pageName: string) {
    const basePage = new BasePage(this.page as Page);
    await basePage.navigateTo(pageName);
});

// Checks the URL after an action that moves the user to another page, e.g. after login.
Then('I should be redirected to the {string} page', async function (this: BrowserInitiation, pageName: string) {
    await expect(this.page as Page).toHaveURL(getPageUrl(pageName), { timeout: TIMEOUTS.PAGE });
});

// Checks the red error banner on the login or checkout form. It is a partial match,
// so the feature file can leave out prefixes like "Epic sadface:".
Then('I should see the error message {string}', async function (this: BrowserInitiation, expectedText: string) {
    const basePage = new BasePage(this.page as Page);
    console.log(`Expected error message: ${expectedText}`);
    await expect(basePage.getErrorMessage()).toContainText(expectedText);
});

// Used after a successful login or page visit to make sure no error banner is shown
Then('I should not see an error message', async function (this: BrowserInitiation) {
    const basePage = new BasePage(this.page as Page);
    await expect(basePage.getErrorMessage()).not.toBeVisible();
});

// Same check as "redirected to", worded for a user who stays on or returns to a page
Then('I should be on the {string} page', async function (this: BrowserInitiation, pageName: string) {
    await expect(this.page as Page).toHaveURL(getPageUrl(pageName), { timeout: TIMEOUTS.PAGE });
});

// Opens a page directly by URL. TC02 and TC014 use it to check that protected pages
// send a logged-out user back to the login page.
When('I try to open the {string} page', async function (this: BrowserInitiation, pageName: string) {
    const basePage = new BasePage(this.page as Page);
    await basePage.navigateTo(pageName);
});

// Checks the heading of the page, e.g. Then I should see the title of the page "Products"
Then('I should see the title of the page {string}', async function (this:BrowserInitiation, expectedTitle:string) {
    const basePage = new BasePage(this.page as Page);
    await basePage.verifyPageTitle(expectedTitle);
});

// Example: And the cart badge should show 2
Then('the cart badge should show {int}', async function (this: BrowserInitiation, expectedCount: number) {
    const basePage = new BasePage(this.page);
    await basePage.verifyCartBadgeCount(expectedCount);
});

// Sauce Demo hides the badge when the cart is empty. It never shows "0".
Then('the cart badge should not be shown', async function (this: BrowserInitiation) {
    const basePage = new BasePage(this.page);
    await basePage.verifyCartBadgeNotShown();
});

// Opens the burger menu. The catch replaces the Playwright timeout with a message
// that names the page and the user.
When('I open the menu', async function (this: BrowserInitiation) {
    const basePage = new BasePage(this.page);
    try {
        await basePage.openMenu();
    } catch {
        throw new Error(`The menu did not open on ${this.page.url()} for ${process.env.TEST_USER || 'StandardUser'}`);
    }
});

// Closes the burger menu with its X button
When('I close the menu', async function (this: BrowserInitiation) {
    const basePage = new BasePage(this.page);
    try {
        await basePage.closeMenu();
    } catch {
        throw new Error(`The menu did not close on ${this.page.url()} for ${process.env.TEST_USER || 'StandardUser'}`);
    }
});

// Compares the menu with the table. Missing, hidden, unexpected and wrongly ordered
// items are all reported together.
Then('the menu should show the following items:', async function (this: BrowserInitiation, table: DataTable) {
    // One menu item per row, no header row
    const expected = table.raw().map(row => (row[0] ?? '').trim());
    const basePage = new BasePage(this.page);
    const actual = await basePage.getMenuItems();
    const problems: string[] = [];

    for (const item of expected) {
        if (!actual.includes(item)) {
            problems.push(`Menu item "${item}" is missing`);
        } else if (!await basePage.menuItems.filter({ hasText: item }).first().isVisible()) {
            problems.push(`Menu item "${item}" exists but is not visible`);
        }
    }
    for (const item of actual) {
        if (!expected.includes(item)) problems.push(`Unexpected menu item "${item}"`);
    }
    // The order is only checked when the items themselves are right, to avoid a second message for the same cause
    if (problems.length === 0 && actual.join('|') !== expected.join('|')) {
        problems.push(`Menu items are in the wrong order. Expected: ${expected.join(', ')} | Actual: ${actual.join(', ')}`);
    }

    // The actual items go into the HTML report, also when the step passes
    this.attach(`Menu items shown: ${actual.join(', ') || 'none'}`, 'text/plain');
    if (problems.length > 0) {
        throw new Error(`The menu is not correct for ${process.env.TEST_USER || 'StandardUser'}:\n - ${problems.join('\n - ')}`);
    }
});

// The closed menu stays in the page. Sauce Demo marks it with aria-hidden="true", so that is what is checked.
Then('the menu should be closed', async function (this: BrowserInitiation) {
    const basePage = new BasePage(this.page);
    await expect(basePage.menuPanel, 'The menu is still open').toHaveAttribute('aria-hidden', 'true');
});

// Clicks an item in the burger menu and opens the menu first if needed,
// e.g. When I click on the "Logout" menu item
When('I click on the {string} menu item', async function (this: BrowserInitiation, itemName: string) {
    await this.inventoryPage.clickMenuItem(itemName);
});

// Checks only the href, without clicking. TC012 uses it so the link is checked even when
// saucelabs.com is slow or not reachable.
Then('the {string} menu item should link to {string}', async function (this: BrowserInitiation, itemName: string, expectedUrl: string) {
    const href = await this.inventoryPage.getMenuItemLink(itemName);
    if (href !== expectedUrl) {
        throw new Error(
            `The "${itemName}" menu item links to the wrong page.\n` +
            `  Expected: ${expectedUrl}\n` +
            `  Actual:   ${href ?? '(no link)'}`
        );
    }
});

// Checks that the About link left Sauce Demo and opened a real Sauce Labs page
Then('I should be on the Sauce Labs website', async function (this: BrowserInitiation) {
    // Sauce Labs is a heavy site: wait only until the HTML is loaded, not for every image/script
    try {
        await this.page.waitForURL(/^https:\/\/saucelabs\.com\//, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.EXTERNAL_PAGE });
    } catch {
        throw new Error(
            `The About menu item did not open the Sauce Labs website.\n` +
            `  Current URL: ${this.page.url()}`
        );
    }

    const url = this.page.url();
    const title = await this.page.title();
    // ProblemUser's About link points to a 404 page on saucelabs.com, so the domain alone is not enough
    if (/404|error/i.test(url) || /404|not found/i.test(title)) {
        throw new Error(
            `The About menu item opened an error page instead of the Sauce Labs website.\n` +
            `  URL:   ${url}\n` +
            `  Title: ${title}`
        );
    }
});

// Browser back button. Like the reload below, it waits only for the HTML, not for every image.
When('I go back in the browser', async function (this: BrowserInitiation) {
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
});

// Reloads the current page, e.g. to check that the cart survives a refresh (TC015)
When('I reload the page', async function (this: BrowserInitiation) {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
});