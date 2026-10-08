// Steps for the products (inventory) page: which products are shown, their descriptions,
// prices and images, the Add to cart / Remove buttons, and sorting.
// Used by TC03, TC04, TC05, TC09, TC013 and TC015. Expected values come from
// tests/TestData/products.json via tests/Utils/productData.ts.

import { When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { BrowserInitiation } from '../Fixtures/browserInitiation';
import { LoginPage } from '../PageObject/loginPage';
import { InventoryPage, DisplayedProduct } from '../PageObject/inventoryPage';
import { getPageUrl } from '../config/env';
import { TIMEOUTS } from '../config/timeouts';
import { allProducts, productName, productNamesFromTable } from '../Utils/productData';

// ---------- Helpers ----------

// User under test, set with the TEST_USER environment variable
function currentUser(): string {
    return process.env.TEST_USER || 'StandardUser';
}

// Adds a readable list to the HTML report
function attachList(world: BrowserInitiation, title: string, rows: string[]) {
    world.attach(`${title} (${currentUser()}):\n${rows.join('\n')}`, 'text/plain');
}

// Fails once with every problem listed, instead of stopping at the first one
function failIfProblems(problems: string[], title: string) {
    if (problems.length > 0) {
        throw new Error(`${title} for ${currentUser()}:\n - ${problems.join('\n - ')}`);
    }
}

// File name without folder and extension:
// /assets/bike-light-1200x1500-DxcZRFOA.jpg -> bike-light-1200x1500-DxcZRFOA
function imageFileName(src: string): string {
    const file = src.split('/').pop() ?? '';
    return file.replace(/\.[a-z0-9]+$/i, '');
}

// True if the file name is the expected image, with or without a build hash after it:
// "bike-light-1200x1500-DxcZRFOA" matches "bike-light-1200x1500"
function isExpectedImage(fileName: string, expectedImage: string): boolean {
    return fileName === expectedImage
        || fileName.startsWith(`${expectedImage}-`)
        || fileName.startsWith(`${expectedImage}.`);
}

// Checks that each product shows the given button, and reports what it shows instead
async function checkButtons(world: BrowserInitiation, names: string[], buttonText: string) {
    const problems: string[] = [];

    for (const name of names) {
        const product = world.inventoryPage.getProduct(name);
        if (await product.count() === 0) {
            problems.push(`Missing product: "${name}"`);
            continue;
        }
        try {
            await expect(world.inventoryPage.getProductButton(name, buttonText)).toBeVisible({ timeout: TIMEOUTS.ELEMENT });
        } catch {
            const actual = (await product.getByRole('button').allTextContents()).join(', ') || 'no button';
            problems.push(`"${name}" shows "${actual}" instead of "${buttonText}"`);
        }
    }

    failIfProblems(problems, `"${buttonText}" buttons are not correct`);
}

// Products as the reference user sees them. Read once per run and then reused,
// so the reference user is logged in only once, not for every scenario.
const baselineCache = new Map<string, DisplayedProduct[]>();

async function getBaselineProducts(world: BrowserInitiation, baselineUser: string): Promise<DisplayedProduct[]> {
    const cached = baselineCache.get(baselineUser);
    if (cached) return cached;

    // A separate browser session, so the current user's session is not affected
    const context = await world.browser.newContext();
    try {
        const page = await context.newPage();
        const loginPage = new LoginPage(page);
        await loginPage.navigateTo('login');
        await loginPage.loginAs(baselineUser);
        await expect(page).toHaveURL(getPageUrl('inventory'), { timeout: TIMEOUTS.PAGE });

        const products = await new InventoryPage(page).getDisplayedProducts();
        baselineCache.set(baselineUser, products);
        return products;
    } finally {
        await context.close();
    }
}

// ---------- Comparison helpers ----------

// Checks that exactly these products are shown, once each and in this order
async function checkShownProducts(world: BrowserInitiation, expectedNames: string[]) {
    const actualNames = (await world.inventoryPage.getDisplayedProducts()).map(p => p.name);
    attachList(world, 'Products shown', actualNames);

    const problems: string[] = [];
    for (const name of expectedNames) {
        if (!actualNames.includes(name)) problems.push(`Missing product: "${name}"`);
    }
    for (const name of actualNames) {
        if (!expectedNames.includes(name)) problems.push(`Unexpected product: "${name}"`);
    }
    // A product shown twice would pass both checks above, so duplicates are checked on their own
    const duplicates = actualNames.filter((name, i) => actualNames.indexOf(name) !== i);
    for (const name of new Set(duplicates)) problems.push(`Product shown more than once: "${name}"`);

    // The order is only checked when the right products are shown, so one cause gives one message
    if (problems.length === 0 && actualNames.join('|') !== expectedNames.join('|')) {
        problems.push(`Products are in the wrong order. Expected: ${expectedNames.join(', ')} | Actual: ${actualNames.join(', ')}`);
    }

    failIfProblems(problems, 'Displayed products are not correct');
}

// Compares one field (description or price) of every shown product with the expected values
async function checkProductField(
    world: BrowserInitiation,
    field: 'description' | 'price',
    expected: { name: string; value: string }[]
) {
    const displayed = await world.inventoryPage.getDisplayedProducts();
    attachList(world, `Product ${field}s`, displayed.map(p => `${p.name} - ${p[field]}`));

    const problems: string[] = [];
    for (const { name, value } of expected) {
        const product = displayed.find(p => p.name === name);
        if (!product) {
            problems.push(`Missing product: "${name}"`);
        } else if (product[field] !== value) {
            problems.push(field === 'price'
                ? `"${name}" shows ${product.price}, expected ${value}`
                : `"${name}" shows description:\n     "${product.description}"\n   expected:\n     "${value}"`);
        }
    }

    failIfProblems(problems, `Product ${field}s are not correct`);
}

// ---------- Steps using the product list (tests/TestData/products.json) ----------

// Example: And all products from the product list should be shown
Then('all products from the product list should be shown', async function (this: BrowserInitiation) {
    await checkShownProducts(this, allProducts().map(p => p.name));
});

// Compares each description with products.json
Then('every product should show the description from the product list', async function (this: BrowserInitiation) {
    await checkProductField(this, 'description', allProducts().map(p => ({ name: p.name, value: p.description })));
});

// Compares each price as text, e.g. "$29.99", with products.json
Then('every product should show the price from the product list', async function (this: BrowserInitiation) {
    await checkProductField(this, 'price', allProducts().map(p => ({ name: p.name, value: p.price })));
});

// ---------- Steps with the values in the feature file (product keys or names) ----------

// One product key per row, no header row. Not used by the current feature files.
Then('I should see all the products:', async function (this: BrowserInitiation, table: DataTable) {
    await checkShownProducts(this, table.raw().map(row => productName(row[0] ?? '')));
});

// Not used by the current feature files. Kept for scenarios that list the values in the feature file.
Then('the products should have the following descriptions:', async function (this: BrowserInitiation, table: DataTable) {
    // | product_name | product_description |
    await checkProductField(this, 'description', table.hashes().map(row => ({
        name: productName(row.product_name ?? row.product ?? ''),
        value: (row.product_description ?? row.description ?? '').trim(),
    })));
});

// Not used by the current feature files
Then('the products should have the following prices:', async function (this: BrowserInitiation, table: DataTable) {
    // | product | price |
    await checkProductField(this, 'price', table.hashes().map(row => ({
        name: productName(row.product ?? row.name ?? ''),
        value: (row.price ?? '').trim(),
    })));
});

// Table: | product | image |. The image is the file name without extension or build hash, e.g. bike-light-1200x1500.
// Not used by the current feature files.
Then('the products should have the following images:', async function (this: BrowserInitiation, table: DataTable) {
    const expected = table.hashes(); // [{ name, image }, ...]
    const displayed = await this.inventoryPage.getDisplayedProducts();
    attachList(this, 'Product images', displayed.map(p => `${p.name} - ${p.imageSrc}`));

    const problems: string[] = [];
    for (const row of expected) {
        const name = productName(row.product ?? row.name ?? '');
        const image = (row.image ?? '').trim();
        const product = displayed.find(p => p.name === name);

        if (!product) {
            problems.push(`Missing product: "${name}"`);
            continue;
        }
        const fileName = imageFileName(product.imageSrc);
        if (!isExpectedImage(fileName, image)) {
            problems.push(`"${name}" shows image "${fileName || 'none'}", expected "${image}"`);
        }
    }

    // Each image must also actually load in the browser
    for (const image of await this.inventoryPage.getBrokenImages()) {
        problems.push(`"${image.name}" image did not load (${image.src ?? 'no image'})`);
    }

    failIfProblems(problems, 'Product images are not correct');
});

// Compares every image with the reference user, e.g. Then every product should show the same image as for "StandardUser".
// ProblemUser shows the same wrong image for every product, and this catches it without hard-coding file names.
Then('every product should show the same image as for {string}', async function (this: BrowserInitiation, baselineUser: string) {
    const baseline = await getBaselineProducts(this, baselineUser);
    const displayed = await this.inventoryPage.getDisplayedProducts();
    const user = currentUser();

    // Side-by-side comparison in the HTML report
    const comparison = baseline.map(expected => {
        const actual = displayed.find(p => p.name === expected.name);
        return `${expected.name}\n   ${baselineUser}: ${imageFileName(expected.imageSrc)}\n   ${user}: ${actual ? imageFileName(actual.imageSrc) : 'product missing'}`;
    });
    this.attach(`Image comparison ${user} vs ${baselineUser}:\n\n${comparison.join('\n\n')}`, 'text/plain');

    const problems: string[] = [];
    for (const expected of baseline) {
        const actual = displayed.find(p => p.name === expected.name);
        if (!actual) {
            problems.push(`"${expected.name}" is shown for ${baselineUser} but missing for ${user}`);
        } else if (actual.imageSrc !== expected.imageSrc) {
            problems.push(
                `"${expected.name}" shows image "${imageFileName(actual.imageSrc)}", ` +
                `but ${baselineUser} sees "${imageFileName(expected.imageSrc)}"`
            );
        }
    }
    for (const actual of displayed) {
        if (!baseline.some(expected => expected.name === actual.name)) {
            problems.push(`"${actual.name}" is shown for ${user} but not for ${baselineUser}`);
        }
    }

    failIfProblems(problems, `Product images differ from ${baselineUser}`);
});

// "a(n)" matches both "a" and "an", so this one step handles
// 'should have an "Add to cart" button:' and 'should have a "Remove" button:'
Then('the products should have a(n) {string} button:', async function (this: BrowserInitiation, buttonText: string, table: DataTable) {
    await checkButtons(this, productNamesFromTable(table), buttonText);
});

// Example: Then every product from the product list should have an "Add to cart" button
Then('every product from the product list should have a(n) {string} button', async function (this: BrowserInitiation, buttonText: string) {
    await checkButtons(this, allProducts().map(p => p.name), buttonText);
});

// Clicks the button of every product in products.json, e.g. "Add to cart" (TC03)
When('I click on the {string} button for every product from the product list', async function (this: BrowserInitiation, buttonText: string) {
    await clickButtons(this, allProducts().map(p => p.name), buttonText);
});

// Example: When I click on the "Add to cart" button for the following products:
// The table has a "product" header and one product key per row.
When('I click on the {string} button for the following products:', async function (this: BrowserInitiation, buttonText: string, table: DataTable) {
    await clickButtons(this, productNamesFromTable(table), buttonText);
});

// Clicks the button of each product. Missing buttons are collected, so every product is still tried.
async function clickButtons(world: BrowserInitiation, names: string[], buttonText: string) {
    const problems: string[] = [];

    for (const name of names) {
        const button = world.inventoryPage.getProductButton(name, buttonText);
        if (await button.count() === 0) {
            problems.push(`"${name}" has no "${buttonText}" button to click`);
            continue;
        }
        await button.click();
    }

    failIfProblems(problems, `Could not click "${buttonText}"`);
}

// Takes the first product in the current order, so the result depends on the chosen sort option (TC05)
When('I click on the {string} button for the first product', async function (this: BrowserInitiation, buttonText: string) {
    const [firstProduct] = await this.inventoryPage.getProductNamesInOrder();
    if (!firstProduct) {
        throw new Error(`No products are shown on the inventory page for ${currentUser()}`);
    }

    const button = this.inventoryPage.getProductButton(firstProduct, buttonText);
    if (await button.count() === 0) {
        const shown = (await this.inventoryPage.getProduct(firstProduct).getByRole('button').allTextContents()).join(', ') || 'no button';
        throw new Error(`The first product "${firstProduct}" shows "${shown}" instead of "${buttonText}" for ${currentUser()}`);
    }
    await button.click();
});

// ---------- Sorting ----------

// Selects a sort option by its label, e.g. When I sort the products by "Price (low to high)".
// ErrorUser gets a browser alert when sorting. sortBy() returns the alert text, and the step fails with it.
When('I sort the products by {string}', async function (this: BrowserInitiation, optionLabel: string) {
    const options = await this.inventoryPage.getSortOptions();
    if (!options.includes(optionLabel)) {
        throw new Error(
            `The sort dropdown has no option "${optionLabel}" for ${currentUser()}.\n` +
            `   Options shown: ${options.join(', ') || 'none'}`
        );
    }

    const alertMessage = await this.inventoryPage.sortBy(optionLabel);
    if (alertMessage) {
        throw new Error(`Sorting by "${optionLabel}" showed an error message for ${currentUser()}: "${alertMessage}"`);
    }
});

// Checks the selected option. For ProblemUser the dropdown does not change, which this catches.
Then('the sort dropdown should show {string}', async function (this: BrowserInitiation, expectedOption: string) {
    try {
        await expect(this.inventoryPage.activeSortOption).toHaveText(expectedOption, { timeout: TIMEOUTS.ELEMENT });
    } catch {
        throw new Error(
            `The sort dropdown shows "${await this.inventoryPage.getActiveSortOption()}" ` +
            `instead of "${expectedOption}" for ${currentUser()}`
        );
    }
});

// Checks the option labels and their order
Then('the sort dropdown should have the following options:', async function (this: BrowserInitiation, table: DataTable) {
    // One option per row, no header row
    const expected = table.raw().map(row => (row[0] ?? '').trim());
    const actual = await this.inventoryPage.getSortOptions();
    attachList(this, 'Sort options', actual);

    if (actual.join('|') !== expected.join('|')) {
        failIfProblems(
            [`Expected options: ${expected.join(', ')}`, `Actual options:   ${actual.join(', ')}`],
            'The sort dropdown does not show the expected options'
        );
    }
});

// "name" or "price", "ascending" or "descending". Checks the order of whatever is shown,
// so it keeps working when products or prices change.
Then(/^the products should be sorted by (name|price) (ascending|descending)$/,
    async function (this: BrowserInitiation, field: string, direction: string) {
        const displayed = await this.inventoryPage.getDisplayedProducts();

        // Prices are compared as numbers: as text, "$9.99" would come after "$49.99"
        const actual: (string | number)[] = displayed.map(p =>
            field === 'name' ? p.name : Number(p.price.replace('$', ''))
        );
        // Numbers are sorted as numbers, names alphabetically
        const expected = [...actual].sort((a, b) =>
            typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
        );
        if (direction === 'descending') expected.reverse();

        attachList(this, `Products after sorting by ${field} ${direction}`, displayed.map(p => `${p.name} - ${p.price}`));

        if (actual.join('|') !== expected.join('|')) {
            failIfProblems(
                [
                    `Expected ${field} order: ${expected.join(', ')}`,
                    `Actual ${field} order:   ${actual.join(', ')}`,
                ],
                `Products are not sorted by ${field} ${direction}`
            );
        }
    }
);

// Example: And 6 products should be shown
Then('{int} products should be shown', async function (this: BrowserInitiation, expectedCount: number) {
    const names = await this.inventoryPage.getProductNamesInOrder();
    if (names.length !== expectedCount) {
        throw new Error(
            `${names.length} products are shown instead of ${expectedCount} for ${currentUser()}.\n` +
            `   Products shown: ${names.join(', ') || 'none'}`
        );
    }
});