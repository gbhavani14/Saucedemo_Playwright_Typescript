// Steps for the product details page (inventory-item.html): opening a product, comparing
// its details with the products page, and its Add to cart / Remove button.
// Used by TC04, TC09 and TC013. Product keys come from tests/TestData/products.json
// via tests/Utils/productData.ts.

import { When, Then } from '@cucumber/cucumber';
import { expect, Locator } from '@playwright/test';
import { BrowserInitiation } from '../Fixtures/browserInitiation';
import { TIMEOUTS } from '../config/timeouts';
import { productName as resolveProductName } from '../Utils/productData';

// ---------- Helpers ----------

// For button changes and checks on the same page (TIMEOUTS.ELEMENT in tests/config/timeouts.ts)
const SHORT_TIMEOUT = TIMEOUTS.ELEMENT;

function currentUser(): string {
    return process.env.TEST_USER || 'StandardUser';
}

// Fails once with every problem listed, instead of stopping at the first one
function failIfProblems(problems: string[], title: string) {
    if (problems.length > 0) {
        throw new Error(`${title} for ${currentUser()}:\n - ${problems.join('\n - ')}`);
    }
}

// Image file name without folder and extension:
// /assets/bike-light-1200x1500-DxcZRFOA.jpg -> bike-light-1200x1500-DxcZRFOA
function imageFileName(src: string): string {
    return (src.split('/').pop() ?? '').replace(/\.[a-z0-9]+$/i, '');
}

// First line of a technical error, e.g. "locator.click: Timeout 15000ms exceeded."
function shortReason(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.split('\n')[0] ?? message;
}

// Runs an action and replaces a technical error with a readable one,
// keeping the original reason on the last line for debugging
async function withReadableError<T>(description: string, action: () => Promise<T>): Promise<T> {
    try {
        return await action();
    } catch (error) {
        throw new Error(`${description} (user: ${currentUser()}).\n   Technical reason: ${shortReason(error)}`);
    }
}

// Makes sure the page objects were created in the Before hook
function checkPageObjects(world: BrowserInitiation) {
    if (!world.inventoryPage || !world.inventoryItemPage) {
        throw new Error(
            'Page objects are missing. Add "this.inventoryPage = new InventoryPage(this.page)" and ' +
            '"this.inventoryItemPage = new InventoryItemPage(this.page)" to the Before hook in tests/Hooks/hooks.ts.'
        );
    }
}

// Names of all buttons on the page or inside an element, to explain what is shown instead
async function visibleButtonNames(scope: Locator): Promise<string> {
    const names = (await scope.getByRole('button').allTextContents()).map(n => n.trim()).filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'no buttons';
}

// ---------- Inventory page ----------

// Saves the product as the products page shows it, so the details page can be compared later.
// Example: When I remember the details of the product "Backpack"
When('I remember the details of the product {string}', async function (this: BrowserInitiation, productKey: string) {
    const productName = resolveProductName(productKey);
    checkPageObjects(this);
    const products = await withReadableError(
        'Could not read the products on the inventory page. Is the user logged in and on the inventory page?',
        () => this.inventoryPage.getDisplayedProducts()
    );

    const product = products.find(p => p.name === productName);
    if (!product) {
        throw new Error(
            `Product "${productName}" is not shown on the inventory page for ${currentUser()}.\n` +
            `   Products shown: ${products.map(p => p.name).join(', ') || 'none'}`
        );
    }

    // Stored on the World object, so later steps of the same scenario can use it
    this.rememberedProduct = product;
    this.attach(
        `Inventory page details (${currentUser()}):\n` +
        `Name: ${product.name}\nDescription: ${product.description}\nPrice: ${product.price}\nImage: ${imageFileName(product.imageSrc)}`,
        'text/plain'
    );
});

// Clicks the product name on the products page, e.g. When I open the product "Backpack"
When('I open the product {string}', async function (this: BrowserInitiation, productKey: string) {
    const productName = resolveProductName(productKey);
    checkPageObjects(this);
    const link = this.inventoryPage.getProduct(productName);

    if (await link.count() === 0) {
        const shown = (await this.inventoryPage.getDisplayedProducts()).map(p => p.name);
        throw new Error(
            `Cannot open "${productName}": it is not shown on the inventory page for ${currentUser()}.\n` +
            `   Products shown: ${shown.join(', ') || 'none'}`
        );
    }

    await withReadableError(
        `Could not click the product name "${productName}" on the inventory page`,
        () => this.inventoryPage.clickProduct(productName)
    );
});

// Clicks a button of one product on the products page,
// e.g. When I click on the "Add to cart" button for the product "Backpack"
When('I click on the {string} button for the product {string}', async function (this: BrowserInitiation, buttonText: string, productKey: string) {
    const productName = resolveProductName(productKey);
    checkPageObjects(this);
    const product = this.inventoryPage.getProduct(productName);

    if (await product.count() === 0) {
        throw new Error(`Cannot click "${buttonText}": "${productName}" is not shown on the inventory page for ${currentUser()}`);
    }

    const button = this.inventoryPage.getProductButton(productName, buttonText);
    if (await button.count() === 0) {
        throw new Error(
            `"${productName}" has no "${buttonText}" button on the inventory page for ${currentUser()}.\n` +
            `   Buttons shown for this product: ${await visibleButtonNames(product)}`
        );
    }

    await withReadableError(
        `Could not click "${buttonText}" for "${productName}" on the inventory page`,
        () => button.click()
    );
});

// ---------- Product details page ----------

// Only checks that a details page is open (inventory-item.html?id=<number>), not which product it shows
Then('I should be on the product details page', async function (this: BrowserInitiation) {
    await withReadableError(
        `The product details page did not open. Current URL: ${this.page.url()}`,
        () => expect(this.page).toHaveURL(/\/inventory-item\.html\?id=\d+$/, { timeout: SHORT_TIMEOUT })
    );
});

// Compares name, description, price and image with the remembered product.
// This catches a click that opened a different product.
Then('the product details should match the inventory page', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    const expected = this.rememberedProduct;
    if (!expected) {
        throw new Error(
            'No product details were remembered. Add "When I remember the details of the product ..." ' +
            'before this step in the scenario.'
        );
    }

    const actual = await withReadableError(
        `Could not read the product details page for "${expected.name}". The page may not have opened, or it shows an error`,
        () => this.inventoryItemPage.getDetails()
    );

    this.attach(
        `Inventory page vs details page (${currentUser()}):\n` +
        `Name:        ${expected.name}  |  ${actual.name}\n` +
        `Description: ${expected.description}  |  ${actual.description}\n` +
        `Price:       ${expected.price}  |  ${actual.price}\n` +
        `Image:       ${imageFileName(expected.imageSrc)}  |  ${imageFileName(actual.imageSrc)}`,
        'text/plain'
    );

    const problems: string[] = [];
    if (actual.name !== expected.name) {
        problems.push(`Name is "${actual.name}", inventory page showed "${expected.name}"`);
    }
    if (actual.description !== expected.description) {
        problems.push(`Description is:\n     "${actual.description}"\n   inventory page showed:\n     "${expected.description}"`);
    }
    if (actual.price !== expected.price) {
        problems.push(`Price is ${actual.price}, inventory page showed ${expected.price}`);
    }
    // Images are compared by file name only, so a different folder or host does not matter
    if (imageFileName(actual.imageSrc) !== imageFileName(expected.imageSrc)) {
        problems.push(`Image is "${imageFileName(actual.imageSrc)}", inventory page showed "${imageFileName(expected.imageSrc)}"`);
    }

    failIfProblems(problems, `Product details of "${expected.name}" do not match the inventory page`);
});

// "a(n)" matches both "a" and "an"
Then('the product details page should have a(n) {string} button', async function (this: BrowserInitiation, buttonText: string) {
    checkPageObjects(this);
    const button = this.inventoryItemPage.getButton(buttonText);

    try {
        await expect(button).toBeVisible({ timeout: SHORT_TIMEOUT });
    } catch {
        throw new Error(
            `The product details page shows no "${buttonText}" button for ${currentUser()}.\n` +
            `   Buttons shown: ${await visibleButtonNames(this.page.locator('[data-test="inventory-container"]'))}`
        );
    }
});

// Example: When I click on the "Remove" button on the product details page
When('I click on the {string} button on the product details page', async function (this: BrowserInitiation, buttonText: string) {
    checkPageObjects(this);
    const button = this.inventoryItemPage.getButton(buttonText);

    if (await button.count() === 0) {
        throw new Error(
            `Cannot click "${buttonText}": the product details page has no such button for ${currentUser()}.\n` +
            `   Buttons shown: ${await visibleButtonNames(this.page.locator('[data-test="inventory-container"]'))}`
        );
    }

    await withReadableError(
        `Could not click "${buttonText}" on the product details page`,
        () => button.click()
    );
});

// Clicks "Back to products" on the details page
When('I go back to the products', async function (this: BrowserInitiation) {
    checkPageObjects(this);
    await withReadableError(
        'Could not click "Back to products" on the product details page',
        () => this.inventoryItemPage.backToProducts()
    );
});