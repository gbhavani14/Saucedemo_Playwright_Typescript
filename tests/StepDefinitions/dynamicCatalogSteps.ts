// Steps for the Dynamic Catalog menu in TC018_DynamicCatalogMenu.feature.
// The menu has three catalog types: Lazy Load, Spinner and Slider. Each section below covers one.
// Product keys in the tables come from tests/TestData/products.json via tests/Utils/productData.ts.

import { When, Then, DataTable } from '@cucumber/cucumber';
import { expect, Locator } from '@playwright/test';
import { BrowserInitiation } from '../Fixtures/browserInitiation';
import { DynamicCatalogPage } from '../PageObject/dynamicCatalogPage';
import { TIMEOUTS } from '../config/timeouts';
import { allProducts, productName as resolveProductName, productNamesFromTable } from '../Utils/productData';

const DYNAMIC_CATALOG = 'Dynamic Catalog';
// Set when the Spinner catalog is opened, checked later by "a loading spinner should be shown"
let spinnerSeen = false;

function catalogPage(world: BrowserInitiation) {
    return new DynamicCatalogPage(world.page);
}

// Returns true or false instead of throwing, so each step can write its own error message.
// Default wait is TIMEOUTS.ELEMENT from tests/config/timeouts.ts.
async function waitVisible(locator: Locator, timeout = TIMEOUTS.ELEMENT): Promise<boolean> {
    return locator.waitFor({ state: 'visible', timeout }).then(() => true, () => false);
}

// ---------- Menu ----------

// Checks the submenu entries, e.g. Then the "Dynamic Catalog" menu item should show the following options:
// The table has a "name" header and one option per row.
Then('the {string} menu item should show the following options:', async function (this: BrowserInitiation, itemName: string, table: DataTable) {
    const catalog = catalogPage(this);
    const missing: string[] = [];
    for (const { name } of table.hashes()) {
        if (!(await waitVisible(catalog.getMenuItem(name.trim())))) missing.push(name.trim());
    }
    if (missing.length > 0) {
        throw new Error(`The "${itemName}" menu item does not show these options: ${missing.join(', ')}`);
    }
});

// Opens the Dynamic Catalog submenu and then the chosen type, e.g. When I open the "Slider" dynamic catalog
When('I open the {string} dynamic catalog', async function (this: BrowserInitiation, type: string) {
    const catalog = catalogPage(this);
    await catalog.clickMenuItem(DYNAMIC_CATALOG);

    // The spinner can disappear quickly, so start watching for it before clicking
    const watchSpinner = /spinner/i.test(type) ? waitVisible(catalog.spinner.first()) : Promise.resolve(false);
    await catalog.clickMenuItem(type);
    spinnerSeen = await watchSpinner;
});

// At least one product must be shown. The 15 s wait is longer than usual because the catalogs load their products with a delay.
Then('the dynamic catalog should show products', async function (this: BrowserInitiation) {
    const catalog = catalogPage(this);
    if (!(await waitVisible(catalog.productNames.first(), 15000))) {
        throw new Error(`No products are shown on the dynamic catalog page.\n  URL: ${this.page.url()}`);
    }
});

// ---------- Lazy Load ----------

// Placeholders stand for products that are not loaded yet. Scrolling to the end must turn all of them into real products.
Then('the remaining products should be loaded after scrolling down', async function (this: BrowserInitiation) {
    const catalog = catalogPage(this);
    if (!(await waitVisible(catalog.lazyLoadedNames.first(), 15000))) {
        throw new Error('No products are shown on the Lazy Load catalog page');
    }

    const loadedBefore = await catalog.lazyLoadedNames.count();
    const placeholdersBefore = await catalog.lazyPlaceholders.count();
    // No placeholders before scrolling means nothing is loaded lazily, which is a failure too
    if (placeholdersBefore === 0) {
        throw new Error(`Lazy Load shows all ${loadedBefore} products before scrolling, so nothing is loaded lazily`);
    }

    // The sentinel is the element at the end of the list that starts loading the next products
    await catalog.lazySentinel.scrollIntoViewIfNeeded();
    const expected = loadedBefore + placeholdersBefore;
    try {
        await expect.poll(() => catalog.lazyLoadedNames.count(), { timeout: TIMEOUTS.PAGE }).toBeGreaterThanOrEqual(expected);
    } catch {
        throw new Error(
            `Lazy Load did not load the remaining products after scrolling down.\n` +
            `  Before scrolling: ${loadedBefore} products and ${placeholdersBefore} placeholders\n` +
            `  After scrolling:  ${await catalog.lazyLoadedNames.count()} products and ${await catalog.lazyPlaceholders.count()} placeholders`
        );
    }
});

// ---------- Spinner ----------

// The spinner must have been seen when the catalog was opened, then disappear, and then products must be shown
Then('a loading spinner should be shown before the products', async function (this: BrowserInitiation) {
    const catalog = catalogPage(this);
    if (!spinnerSeen) {
        throw new Error('No loading spinner was shown after opening the Spinner catalog');
    }
    try {
        await expect(catalog.spinner.first()).toBeHidden({ timeout: TIMEOUTS.PAGE });
    } catch {
        throw new Error(`The loading spinner is still shown after ${TIMEOUTS.PAGE / 1000} seconds`);
    }
    if (!(await waitVisible(catalog.spinnerNames.first(), 5000))) {
        throw new Error('The spinner disappeared, but no products are shown');
    }
});

// ---------- Slider ----------

// Checks that the slider has a dot for each product and lists the missing ones
async function checkSliderDots(world: BrowserInitiation, names: string[]) {
    const catalog = catalogPage(world);
    const missing: string[] = [];
    for (const name of names) {
        if (!(await waitVisible(catalog.sliderDot(name)))) missing.push(name);
    }
    if (missing.length > 0) {
        throw new Error(`The slider has no dot for: ${missing.join(', ')}`);
    }
}

// Table with a "product" header and one product key per row. Not used by the current feature files.
Then('the slider should have a dot for each of these products:', async function (this: BrowserInitiation, table: DataTable) {
    await checkSliderDots(this, productNamesFromTable(table));
});

// Uses every product from tests/TestData/products.json
Then('the slider should have a dot for every product from the product list', async function (this: BrowserInitiation) {
    await checkSliderDots(this, allProducts().map(p => p.name));
});

// Clicks the dot of one product, e.g. And I select "Backpack" in the slider
When('I select {string} in the slider', async function (this: BrowserInitiation, productKey: string) {
    const productName = resolveProductName(productKey);
    const dot = catalogPage(this).sliderDot(productName);
    if (!(await waitVisible(dot, 15000))) {
        throw new Error(`The slider has no dot for "${productName}"`);
    }
    await dot.click();
});

// The slider must show the product name, and the product's dot must be marked as active
Then('the slider should show {string}', async function (this: BrowserInitiation, productKey: string) {
    const productName = resolveProductName(productKey);
    const catalog = catalogPage(this);
    try {
        await expect(catalog.sliderItemName).toHaveText(productName, { timeout: TIMEOUTS.ELEMENT });
    } catch {
        const shown = ((await catalog.sliderItemName.textContent()) ?? '').trim();
        throw new Error(`The slider shows "${shown}" instead of "${productName}"`);
    }
    await expect(catalog.sliderDot(productName), `The dot for "${productName}" is not marked as active`)
        .toHaveClass(/active/);
});