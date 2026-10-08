// Cart and checkout steps: adding and removing products, the cart page, the checkout
// information form, the overview with its totals, and the order confirmation.
// Used by TC06-TC010, TC013 and TC015-TC019. Products added in a scenario are kept in
// this.addedProducts, so later steps can compare the cart and the overview with them.
// Product keys come from tests/TestData/products.json via tests/Utils/productData.ts.

import { When, Then, DataTable } from '@cucumber/cucumber';
import { expect, Locator } from '@playwright/test';
import { BrowserInitiation } from '../Fixtures/browserInitiation';
import { DisplayedProduct } from '../PageObject/inventoryPage';
import { CartItem } from '../PageObject/cartPage';
import { CheckoutInformation } from '../PageObject/checkoutStepOnePage';
import { getPageUrl } from '../config/env';
import { TIMEOUTS } from '../config/timeouts';
import { productName as resolveProductName, productNamesFromTable } from '../Utils/productData';

// ---------- Settings ----------

const TAX_RATE = 0.08;                  // Sauce Demo charges 8% tax on the item total
const SHORT_TIMEOUT = TIMEOUTS.ELEMENT;  // buttons changing, rows disappearing
const PAGE_TIMEOUT = TIMEOUTS.PAGE;      // page changes (PerformanceGlitchUser is slow on purpose)
// Header text of the order confirmation page
const ORDER_CONFIRMATION = 'Thank you for your order!';

// ---------- Helpers ----------

function currentUser(): string {
    return process.env.TEST_USER || 'StandardUser';
}

// Fails once with every problem listed, instead of stopping at the first one
function failIfProblems(problems: string[], title: string) {
    if (problems.length > 0) {
        throw new Error(`${title} for ${currentUser()}:\n - ${problems.join('\n - ')}`);
    }
}

// First line of a technical error, e.g. "locator.click: Timeout 15000ms exceeded."
function shortReason(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.split('\n')[0] ?? message;
}

// Runs an action and replaces a technical error with a readable one
async function withReadableError<T>(description: string, action: () => Promise<T>): Promise<T> {
    try {
        return await action();
    } catch (error) {
        throw new Error(`${description} (user: ${currentUser()}).\n   Technical reason: ${shortReason(error)}`);
    }
}

// Makes sure the page objects were created in the Before hook
function checkPageObjects(world: BrowserInitiation) {
    const missing = [
        ['inventoryPage', world.inventoryPage],
        ['inventoryItemPage', world.inventoryItemPage],
        ['cartPage', world.cartPage],
        ['checkoutStepOnePage', world.checkoutStepOnePage],
        ['checkoutStepTwoPage', world.checkoutStepTwoPage],
        ['checkoutCompletePage', world.checkoutCompletePage],
    ].filter(([, pageObject]) => !pageObject).map(([name]) => name);

    if (missing.length > 0) {
        throw new Error(
            `Page objects are missing: ${missing.join(', ')}. ` +
            'Create them in the Before hook in tests/Hooks/hooks.ts and declare them in tests/Fixtures/browserInitiation.ts.'
        );
    }
}

// Checks the URL and explains which page is shown instead
async function expectOnPage(world: BrowserInitiation, pageName: string, pageDescription: string) {
    try {
        await expect(world.page).toHaveURL(getPageUrl(pageName), { timeout: PAGE_TIMEOUT });
    } catch {
        throw new Error(`The ${pageDescription} did not open for ${currentUser()}. Current page: ${world.page.url()}`);
    }
}

// "$29.99" or "Item total: $29.99" -> 2999. Money is kept in whole cents, because adding
// decimals like 29.99 + 9.99 in floating point gives rounding errors. Returns NaN if no amount is found.
function toCents(text: string): number {
    const match = text.match(/\$\s*([\d,]+\.?\d*)/);
    return match ? Math.round(Number(match[1]!.replace(/,/g, '')) * 100) : NaN;
}

// 2999 -> "$29.99"
function formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

// Names of the buttons inside an element, to explain what is shown instead
async function buttonsShown(scope: Locator): Promise<string> {
    const names = (await scope.getByRole('button').allTextContents()).map(n => n.trim()).filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'no buttons';
}

// Compares the products in the cart or the overview with the products added in this scenario
function compareWithAddedProducts(added: DisplayedProduct[], shown: CartItem[], where: string): string[] {
    const problems: string[] = [];

    for (const expected of added) {
        const actual = shown.find(item => item.name === expected.name);
        if (!actual) {
            problems.push(`"${expected.name}" was added but is missing in the ${where}`);
            continue;
        }
        if (actual.description !== expected.description) {
            problems.push(`"${expected.name}" shows description:\n     "${actual.description}"\n   when added it showed:\n     "${expected.description}"`);
        }
        if (actual.price !== expected.price) {
            problems.push(`"${expected.name}" costs ${actual.price} in the ${where}, but ${expected.price} when it was added`);
        }
        // Each product can be added only once from the products page, so the quantity is always 1
        if (actual.quantity !== 1) {
            problems.push(`"${expected.name}" has quantity ${actual.quantity} in the ${where}, expected 1`);
        }
    }

    for (const actual of shown) {
        if (!added.some(expected => expected.name === actual.name)) {
            problems.push(`"${actual.name}" is in the ${where} but was not added`);
        }
    }
    return problems;
}

// Writes added vs shown products to the HTML report, one line per product
function attachComparison(world: BrowserInitiation, where: string, added: DisplayedProduct[], shown: CartItem[]) {
    const rows = added.map(expected => {
        const actual = shown.find(item => item.name === expected.name);
        return actual
            ? `${expected.name}: added at ${expected.price}, ${where} shows ${actual.price} (quantity ${actual.quantity})`
            : `${expected.name}: added at ${expected.price}, missing in the ${where}`;
    });
    const extra = shown
        .filter(item => !added.some(expected => expected.name === item.name))
        .map(item => `${item.name}: not added, but shown in the ${where} at ${item.price}`);
    world.attach(`Added products vs ${where} (${currentUser()}):\n${[...rows, ...extra].join('\n')}`, 'text/plain');
}

// Waits until a button with the given text appears inside the scope.
// Checks the visible text and the data-test attribute ("add-to-cart-...", "remove-..."),
// so it does not depend on how the browser computes the button's accessible name.
async function waitForButton(scope: Locator, buttonText: string, timeout = SHORT_TIMEOUT): Promise<boolean> {
    const wantedText = buttonText.trim().toLowerCase();
    const wantedDataTest = wantedText.replace(/\s+/g, '-');
    try {
        await expect.poll(async () => {
            const buttons = scope.locator('button');
            const texts = (await buttons.allTextContents()).map(text => text.trim().toLowerCase());
            const dataTests = await buttons.evaluateAll(elements => elements.map(e => e.getAttribute('data-test') ?? ''));
            return texts.includes(wantedText) || dataTests.some(dataTest => dataTest.startsWith(wantedDataTest));
        }, { timeout }).toBe(true);
        return true;
    } catch {
        return false;
    }
}

// What the page shows right now, to explain a failed button change
async function describeState(world: BrowserInitiation, scope: Locator): Promise<string> {
    const buttons = scope.locator('button');
    const texts = (await buttons.allTextContents()).map(text => text.trim()).filter(Boolean);
    const dataTests = (await buttons.evaluateAll(elements => elements.map(e => e.getAttribute('data-test') ?? ''))).filter(Boolean);
    const badge = world.page.locator('[data-test="shopping-cart-badge"]');
    const badgeText = await badge.count() > 0 ? ((await badge.textContent()) ?? '').trim() : 'not shown';
    return `buttons: ${texts.join(', ') || 'none'} (data-test: ${dataTests.join(', ') || 'none'}); ` +
           `cart badge: ${badgeText}; page: ${world.page.url()}`;
}

// Opens a product's details page from the products page and checks that the right product opened
async function openProductDetails(world: BrowserInitiation, productName: string): Promise<DisplayedProduct> {
    checkPageObjects(world);

    if (await world.inventoryPage.getProduct(productName).count() === 0) {
        const shown = (await world.inventoryPage.getDisplayedProducts()).map(p => p.name);
        throw new Error(
            `Cannot open "${productName}": it is not shown on the products page for ${currentUser()}.\n` +
            `   Products shown: ${shown.join(', ') || 'none'}`
        );
    }

    await withReadableError(`Could not click the product name "${productName}"`, () => world.inventoryPage.clickProduct(productName));

    try {
        await expect(world.page).toHaveURL(/\/inventory-item\.html\?id=\d+$/, { timeout: PAGE_TIMEOUT });
    } catch {
        throw new Error(`The details page of "${productName}" did not open for ${currentUser()}. Current page: ${world.page.url()}`);
    }

    const details = await withReadableError(
        `Could not read the details page of "${productName}"`,
        () => world.inventoryItemPage.getDetails()
    );
    if (details.name !== productName) {
        throw new Error(`Clicked "${productName}", but the details page shows "${details.name}" for ${currentUser()}`);
    }
    return details;
}

// Clicks a button on the details page and waits until it changes to the other button
async function toggleOnDetailsPage(world: BrowserInitiation, productName: string, clickText: string, expectedText: string) {
    // The whole page is the scope, because the details page shows only one product
    const page = world.page.locator('body');
    const button = world.inventoryItemPage.getButton(clickText);
    if (await button.count() === 0) {
        throw new Error(
            `The details page of "${productName}" has no "${clickText}" button for ${currentUser()}.\n` +
            `   Page shows ${await describeState(world, page)}`
        );
    }

    await withReadableError(`Could not click "${clickText}" on the details page of "${productName}"`, () => button.click());

    if (!await waitForButton(page, expectedText)) {
        throw new Error(
            `Clicked "${clickText}" on the details page of "${productName}", but no "${expectedText}" button appeared for ${currentUser()}.\n` +
            `   Page shows ${await describeState(world, page)}`
        );
    }
}

// Adds products on the products page and remembers their details for later comparison
async function addFromProductsPage(world: BrowserInitiation, names: string[]) {
    checkPageObjects(world);
    const displayed = await withReadableError(
        'Could not read the products on the products page. Is the user logged in and on the products page?',
        () => world.inventoryPage.getDisplayedProducts()
    );

    const problems: string[] = [];
    for (const name of names) {
        const product = displayed.find(p => p.name === name);
        if (!product) {
            problems.push(`"${name}" is not shown on the products page`);
            continue;
        }

        const addButton = world.inventoryPage.getProductButton(name, 'Add to cart');
        if (await addButton.count() === 0) {
            problems.push(`"${name}" has no "Add to cart" button (shows: ${await buttonsShown(world.inventoryPage.getProduct(name))})`);
            continue;
        }
        await addButton.click();

        // The button must change to "Remove", otherwise the product was not added.
        // For ProblemUser and ErrorUser some buttons do not react, and this catches it.
        const card = world.inventoryPage.getProduct(name);
        if (await waitForButton(card, 'Remove')) {
            world.addedProducts.push(product);
        } else {
            problems.push(`Clicked "Add to cart" for "${name}", but its button did not change to "Remove". Now shows ${await describeState(world, card)}`);
        }
    }

    failIfProblems(problems, 'Could not add all products to the cart from the products page');
}

// Value of a table cell. "{space}" stands for one space, because Cucumber trims spaces
// at the start and end of a cell. TC017 uses it to type names that contain only spaces.
function cellValue(value: string | undefined): string {
    return (value ?? '').trim().replace(/\{space\}/g, ' ');
}


// Reads the first data row of a | first_name | last_name | postal_code | table
function readCheckoutInformation(table: DataTable): CheckoutInformation {
    const [row] = table.hashes();
    if (!row) {
        throw new Error('The checkout information table needs a header row and one data row: | first_name | last_name | postal_code |');
    }
    return {
        firstName: cellValue(row.first_name),
        lastName: cellValue(row.last_name),
        postalCode: cellValue(row.postal_code),
    };
}

// Types the information and checks that each field really contains what was typed
async function enterCheckoutInformation(world: BrowserInitiation, information: CheckoutInformation) {
    await withReadableError(
        'Could not type into the checkout information form. Is the checkout information page open?',
        () => world.checkoutStepOnePage.fillInformation(information)
    );

    // ProblemUser and ErrorUser have broken form fields (e.g. the last name does not end up in its own field),
    // so the fields are read back instead of trusting fill()
    const entered = await world.checkoutStepOnePage.getEnteredInformation();
    const problems: string[] = [];
    const fields: [string, keyof CheckoutInformation][] = [
        ['First name', 'firstName'],
        ['Last name', 'lastName'],
        ['Postal code', 'postalCode'],
    ];
    for (const [label, key] of fields) {
        if (entered[key] !== information[key]) {
            problems.push(`${label} field shows "${entered[key]}" after typing "${information[key]}"`);
        }
    }
    failIfProblems(problems, 'The checkout information was not entered correctly');
}

// ---------- Adding and removing products ----------

// Example: When I add the following products to the cart from the products page:
// The table has a "product" header and one product key per row.
When('I add the following products to the cart from the products page:', async function (this: BrowserInitiation, table: DataTable) {
    await addFromProductsPage(this, productNamesFromTable(table));
});

// Adds every product the products page shows right now (TC07)
When('I add all products to the cart from the products page', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    const names = (await this.inventoryPage.getDisplayedProducts()).map(p => p.name);
    await addFromProductsPage(this, names);
});

// Opens the details page, clicks "Add to cart" there and remembers the product (TC08)
When('I add the product {string} to the cart from its details page', async function (this: BrowserInitiation, productKey: string) {
    const productName = resolveProductName(productKey);
    const details = await openProductDetails(this, productName);
    await toggleOnDetailsPage(this, productName, 'Add to cart', 'Remove');
    this.addedProducts.push(details);
});

// Opens the details page, clicks "Remove" there and forgets the product (TC09)
When('I remove the product {string} on its details page', async function (this: BrowserInitiation, productKey: string) {
    const productName = resolveProductName(productKey);
    await openProductDetails(this, productName);
    await toggleOnDetailsPage(this, productName, 'Remove', 'Add to cart');
    this.addedProducts = this.addedProducts.filter(p => p.name !== productName);
});

// ---------- Cart page ----------

// Clicks the cart icon and checks that the cart page opened
When('I open the cart', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    await withReadableError('Could not click the cart icon', () => this.cartPage.open());
    await expectOnPage(this, 'cart', 'cart page');
});

// Each added product must be in the cart once, with the same description and price, and nothing else
Then('the cart should show the added products with the same details', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    const items = await withReadableError('Could not read the products in the cart', () => this.cartPage.getItems());
    attachComparison(this, 'cart', this.addedProducts, items);
    failIfProblems(compareWithAddedProducts(this.addedProducts, items, 'cart'), 'The cart does not match the added products');
});

// Used after Reset App State (TC015), after removing products (TC09) and after switching users (TC016)
Then('the cart should be empty', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    const items = await withReadableError('Could not read the products in the cart', () => this.cartPage.getItems());
    if (items.length > 0) {
        throw new Error(`The cart should be empty, but contains for ${currentUser()}: ${items.map(i => i.name).join(', ')}`);
    }
});

// Clicks "Remove" in the cart and waits until the row is gone, e.g. And I remove the product "BikeLight" from the cart
When('I remove the product {string} from the cart', async function (this: BrowserInitiation, productKey: string) {
    const productName = resolveProductName(productKey);
    checkPageObjects(this);
    const row = this.cartPage.getItem(productName);
    if (await row.count() === 0) {
        const shown = (await this.cartPage.getItems()).map(i => i.name);
        throw new Error(`"${productName}" is not in the cart for ${currentUser()}. Cart contains: ${shown.join(', ') || 'nothing'}`);
    }

    const removeButton = this.cartPage.getRemoveButton(productName);
    if (await removeButton.count() === 0) {
        throw new Error(`"${productName}" has no "Remove" button in the cart for ${currentUser()} (shows: ${await buttonsShown(row)})`);
    }
    await withReadableError(`Could not click "Remove" for "${productName}" in the cart`, () => removeButton.click());

    try {
        await expect(row).toHaveCount(0, { timeout: SHORT_TIMEOUT });
    } catch {
        throw new Error(`Clicked "Remove" for "${productName}", but it is still in the cart for ${currentUser()}`);
    }
    this.addedProducts = this.addedProducts.filter(p => p.name !== productName);
});

// Clicks "Checkout" on the cart page and checks that the information form opened
When('I proceed to checkout', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    await withReadableError('Could not click "Checkout" on the cart page', () => this.cartPage.checkout());
    await expectOnPage(this, 'checkout_step_one', 'checkout information page');
});

// ---------- Checkout: your information ----------

// Fills in the form without submitting it. Table: | first_name | last_name | postal_code |
When('I enter the checkout information:', async function (this: BrowserInitiation, table: DataTable) {
    checkPageObjects(this);
    await enterCheckoutInformation(this, readCheckoutInformation(table));
});

// Clicks "Continue". The next step checks where the user ends up.
When('I continue to the checkout overview', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    await withReadableError('Could not click "Continue" on the checkout information page', () => this.checkoutStepOnePage.continue());
});

// Used when the form should be rejected, e.g. an empty field (TC06) or only spaces (TC017)
Then('I should stay on the checkout information page', async function (this: BrowserInitiation) {
    await expectOnPage(this, 'checkout_step_one', 'checkout information page');
});

// Shortcut for scenarios that are not about the form: Checkout, fill in, Continue, overview opens
When('I check out with the checkout information:', async function (this: BrowserInitiation, table: DataTable) {
    checkPageObjects(this);
    await withReadableError('Could not click "Checkout" on the cart page', () => this.cartPage.checkout());
    await expectOnPage(this, 'checkout_step_one', 'checkout information page');

    await enterCheckoutInformation(this, readCheckoutInformation(table));
    await withReadableError('Could not click "Continue" on the checkout information page', () => this.checkoutStepOnePage.continue());

    try {
        await expect(this.page).toHaveURL(getPageUrl('checkout_step_two'), { timeout: PAGE_TIMEOUT });
        // Add the form's error message, if one is shown, so the failure explains itself
    } catch {
        const error = await this.checkoutStepOnePage.errorMessage.isVisible()
            ? ` The page shows: "${((await this.checkoutStepOnePage.errorMessage.textContent()) ?? '').trim()}"`
            : '';
        throw new Error(`The checkout overview did not open after "Continue" for ${currentUser()}.${error}`);
    }
});

// Cancel works on both checkout steps: step one goes back to the cart, step two to the products page
When('I cancel the checkout', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    const url = this.page.url();
    if (url.includes('checkout-step-one')) {
        await withReadableError('Could not click "Cancel" on the checkout information page', () => this.checkoutStepOnePage.cancel());
    } else if (url.includes('checkout-step-two')) {
        await withReadableError('Could not click "Cancel" on the checkout overview', () => this.checkoutStepTwoPage.cancel());
    } else {
        throw new Error(`"Cancel" only exists on the checkout pages, but the current page is ${url}`);
    }
});

// ---------- Checkout: overview ----------

Then('the checkout overview should show the added products with the same details', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    const items = await withReadableError('Could not read the products on the checkout overview', () => this.checkoutStepTwoPage.getItems());
    attachComparison(this, 'checkout overview', this.addedProducts, items);
    failIfProblems(
        compareWithAddedProducts(this.addedProducts, items, 'checkout overview'),
        'The checkout overview does not match the added products'
    );
});

// Recalculates the totals from the product prices, all in cents:
// item total = sum of prices, tax = 8% of item total, total = item total + tax.
Then('the checkout overview should show the correct totals', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    const items = await withReadableError('Could not read the products on the checkout overview', () => this.checkoutStepTwoPage.getItems());
    const summary = await withReadableError('Could not read the totals on the checkout overview', () => this.checkoutStepTwoPage.getSummary());

    const productsSum = items.reduce((sum, item) => sum + toCents(item.price) * item.quantity, 0);
    const itemTotal = toCents(summary.itemTotal);
    const tax = toCents(summary.tax);
    const total = toCents(summary.total);
    const expectedTax = Math.round(productsSum * TAX_RATE);

    this.attach(
        `Checkout totals (${currentUser()}):\n` +
        `Products add up to: ${formatCents(productsSum)}\n${summary.itemTotal}\n${summary.tax}\n${summary.total}`,
        'text/plain'
    );

    const problems: string[] = [];
    if ([itemTotal, tax, total].some(Number.isNaN)) {
        problems.push(`Could not read the amounts: "${summary.itemTotal}", "${summary.tax}", "${summary.total}"`);
    } else {
        if (itemTotal !== productsSum) {
            problems.push(`Item total is ${formatCents(itemTotal)}, but the products add up to ${formatCents(productsSum)}`);
        }
        // 1 cent tolerance for rounding differences
        if (Math.abs(tax - expectedTax) > 1) {
            problems.push(`Tax is ${formatCents(tax)}, expected ${formatCents(expectedTax)} (${TAX_RATE * 100}% of ${formatCents(productsSum)})`);
        }
        if (total !== itemTotal + tax) {
            problems.push(`Total is ${formatCents(total)}, but item total + tax is ${formatCents(itemTotal + tax)}`);
        }
    }

    failIfProblems(problems, 'The checkout totals are not correct');
});

// Example: And the payment information should be "SauceCard #31337"
Then('the payment information should be {string}', async function (this: BrowserInitiation, expected: string) {
    checkPageObjects(this);
    const actual = (await this.checkoutStepTwoPage.getSummary()).paymentInformation;
    if (actual !== expected) {
        throw new Error(`The payment information is "${actual}" instead of "${expected}" for ${currentUser()}`);
    }
});

// Example: And the shipping information should be "Free Pony Express Delivery!"
Then('the shipping information should be {string}', async function (this: BrowserInitiation, expected: string) {
    checkPageObjects(this);
    const actual = (await this.checkoutStepTwoPage.getSummary()).shippingInformation;
    if (actual !== expected) {
        throw new Error(`The shipping information is "${actual}" instead of "${expected}" for ${currentUser()}`);
    }
});

// Clicks "Finish" on the checkout overview
When('I finish the order', async function (this: BrowserInitiation) {
    checkPageObjects(this);

    // Remember what the overview shows, so documents created after the order (e.g. the order PDF)
    // can be compared with it. The overview is gone once the order is placed.
    this.orderOverview = {
        items: await this.checkoutStepTwoPage.getItems(),
        summary: await this.checkoutStepTwoPage.getSummary(),
    };

    await withReadableError('Could not click "Finish" on the checkout overview', () => this.checkoutStepTwoPage.finish());
});

// ---------- Checkout: complete ----------

// Checks the confirmation page and its "Thank you for your order!" header.
// For ErrorUser the Finish button does not work, so this step fails there.
Then('the order should be completed', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    try {
        await expect(this.page).toHaveURL(getPageUrl('checkout_complete'), { timeout: PAGE_TIMEOUT });
    } catch {
        throw new Error(
            `The order was not completed for ${currentUser()}: the confirmation page did not open after "Finish". ` +
            `Current page: ${this.page.url()}`
        );
    }

    const confirmation = await withReadableError('Could not read the order confirmation', () => this.checkoutCompletePage.getConfirmation());
    this.attach(`Order confirmation (${currentUser()}):\n${confirmation.header}\n${confirmation.text}`, 'text/plain');

    if (confirmation.header !== ORDER_CONFIRMATION) {
        throw new Error(`The confirmation page shows "${confirmation.header}" instead of "${ORDER_CONFIRMATION}" for ${currentUser()}`);
    }
});

// Clicks "Back Home" on the confirmation page and checks that the products page opens
When('I go back home', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    await withReadableError('Could not click "Back Home" on the order confirmation page', () => this.checkoutCompletePage.backHome());
    await expectOnPage(this, 'inventory', 'products page');
});