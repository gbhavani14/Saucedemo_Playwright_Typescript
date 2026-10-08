// Layout checks for TC019_VisualLayout.feature.
// Position and size of named elements are compared with a reference user (StandardUser)
// in the same browser and window size. VisualUser has deliberate layout bugs, so it is
// expected to fail.

import { Then, DataTable } from '@cucumber/cucumber';
import { Page } from '@playwright/test';
import { BrowserInitiation } from '../Fixtures/browserInitiation';
import { LoginPage } from '../PageObject/loginPage';
import { TIMEOUTS } from '../config/timeouts';

// Elements that can be checked, by the name used in the feature file.
// Add new ones here.
const ELEMENTS: Record<string, string> = {
    'menu button': '#react-burger-menu-btn',
    'cart icon': '[data-test="shopping-cart-link"]',
    'page title': '[data-test="title"]',
    'sort dropdown': '[data-test="product-sort-container"]',
    'checkout button': '[data-test="checkout"]',
    'continue shopping button': '[data-test="continue-shopping"]',
};

// Allowed difference in pixels, so small rounding differences between two sessions do not fail the test
const TOLERANCE_PX = 3;

type Box = { x: number; y: number; width: number; height: number };

// Baseline positions, cached per user + page so the baseline login happens only once
const baselineCache = new Map<string, Record<string, Box | null>>();

// Turns a name from the feature table into a selector. A typo gives a list of the known names.
function selectorFor(elementName: string): string {
    const selector = ELEMENTS[elementName.toLowerCase()];
    if (!selector) {
        throw new Error(`Unknown element "${elementName}". Known elements: ${Object.keys(ELEMENTS).join(', ')}`);
    }
    return selector;
}

// Reads position and size of each element. An element that is not visible is stored as null,
// so the step can report it instead of crashing.
async function readBoxes(page: Page, names: string[]): Promise<Record<string, Box | null>> {
    // Measure only after the page, its styles and its fonts have finished loading
    await page.waitForLoadState('load');
    await page.evaluate(() => document.fonts.ready);

    const boxes: Record<string, Box | null> = {};
    for (const name of names) {
        const locator = page.locator(selectorFor(name)).first();
        const visible = await locator.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT }).then(() => true, () => false);
        boxes[name] = visible ? await locator.boundingBox() : null;
    }
    return boxes;
}

// Logs in the reference user in its own browser context and opens the same page as the user under test
async function baselineBoxes(world: BrowserInitiation, baselineUser: string, names: string[]) {
    const current = new URL(world.page.url());
    const key = `${baselineUser}|${current.pathname}|${names.join(',')}`;
    const cached = baselineCache.get(key);
    if (cached) return cached;

    // Same browser and same window size as the user under test
    const context = await world.browser.newContext({ viewport: world.page.viewportSize() ?? undefined });
    try {
        const page = await context.newPage();
        // A protected page opened while logged out shows the login form, so this also works as the login page
        await page.goto(`${current.origin}${current.pathname}`); 
        await new LoginPage(page).loginAs(baselineUser);
        await page.waitForURL('**/inventory.html', { timeout: TIMEOUTS.PAGE });
        // After login Sauce Demo always opens the products page, so the wanted page is opened again
        if (!current.pathname.endsWith('inventory.html')) {
            await page.goto(`${current.origin}${current.pathname}`);
        }
        const boxes = await readBoxes(page, names);
        baselineCache.set(key, boxes);
        return boxes;
    } finally {
        await context.close();
    }
}

// Readable position for error messages, e.g. "x=12, y=8, size 40x40"
function describe(box: Box): string {
    return `x=${Math.round(box.x)}, y=${Math.round(box.y)}, size ${Math.round(box.width)}x${Math.round(box.height)}`;
}

// Compares every element from the table (header "element") with the reference user and lists all differences at once
Then('the following elements should be at the same place as for {string}:', async function (this: BrowserInitiation, baselineUser: string, table: DataTable) {
    const names = table.hashes().map(row => (row.element ?? '').trim());
    const user = process.env.TEST_USER || 'StandardUser';

    const expected = await baselineBoxes(this, baselineUser, names);
    const actual = await readBoxes(this.page, names);

    const problems: string[] = [];
    for (const name of names) {
        const want = expected[name];
        const got = actual[name];
        if (!want) {
            problems.push(`${name}: not shown for ${baselineUser}, so there is nothing to compare with`);
        } else if (!got) {
            problems.push(`${name}: not shown for ${user}`);
        } else if (
            Math.abs(got.x - want.x) > TOLERANCE_PX || Math.abs(got.y - want.y) > TOLERANCE_PX ||
            Math.abs(got.width - want.width) > TOLERANCE_PX || Math.abs(got.height - want.height) > TOLERANCE_PX
        ) {
            problems.push(`${name}: is at ${describe(got)}, but for ${baselineUser} at ${describe(want)}`);
        }
    }

    if (problems.length > 0) {
        throw new Error(
            `These elements are not at the same place for ${user} as for ${baselineUser} (tolerance ${TOLERANCE_PX}px):\n - ` +
            problems.join('\n - ')
        );
    }
});