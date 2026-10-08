// Page object for the products page (/inventory.html), the first page after login.
// Covers the product cards, the Add to cart / Remove buttons, opening a product,
// checking for broken images, and sorting.
import { Dialog, Locator, Page } from "@playwright/test";
import { BasePage } from "./basePage";

// What one product card shows. The details page returns the same shape.
export type DisplayedProduct = {
    name: string;
    description: string;
    price: string;
    imageSrc: string;
};

// Matches the whole text exactly, so "Sauce Labs Bolt T-Shirt" never matches another T-shirt
function exactText(text: string): RegExp {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^\\s*${escaped}\\s*$`);
}

// Products page: /inventory.html
export class InventoryPage extends BasePage
{
    // All product cards and their parts. Each card is [data-test="inventory-item"].
    readonly products: Locator;
    readonly productImages: Locator;
    readonly productNames: Locator;
    readonly productDescriptions: Locator;
    readonly productPrices: Locator;
    // Sort dropdown and the label that shows the selected option
    readonly sortDropdown: Locator;
    readonly activeSortOption: Locator;

    constructor(page: Page)
    {
        super(page);
        this.products = page.locator('[data-test="inventory-item"]');
        this.productImages = page.locator('[data-test="inventory-item"] img[src]');
        this.productNames = page.locator('[data-test="inventory-item-name"]');
        this.productDescriptions = page.locator('[data-test="inventory-item-desc"]');
        this.productPrices = page.locator('[data-test="inventory-item-price"]');
        this.sortDropdown = page.locator('[data-test="product-sort-container"]');
        this.activeSortOption = page.locator('[data-test="active-option"]');
    }

    // The whole product card for one product
    getProduct(productName: string): Locator {
        return this.products.filter({
            has: this.page.locator('[data-test="inventory-item-name"]', { hasText: exactText(productName) }),
        });
    }

    // A button inside one product card, e.g. "Add to cart" or "Remove"
    getProductButton(productName: string, buttonText: string): Locator {
        return this.getProduct(productName).getByRole('button', { name: buttonText, exact: true });
    }

    // Clicks a button inside one product card
    async clickProductButton(productName: string, buttonText: string) {
        await this.getProductButton(productName, buttonText).click();
    }

    // Opens the details page by clicking the product name
    async clickProduct(productName: string) {
        await this.productNames.filter({ hasText: exactText(productName) }).click();
    }

    // Reads every product card at once, keeping each product's details together
    async getDisplayedProducts(): Promise<DisplayedProduct[]> {
        await this.products.first().waitFor();
        return this.products.evaluateAll(items =>
            items.map(item => ({
                name: item.querySelector('[data-test="inventory-item-name"]')?.textContent?.trim() ?? '',
                description: item.querySelector('[data-test="inventory-item-desc"]')?.textContent?.trim() ?? '',
                price: item.querySelector('[data-test="inventory-item-price"]')?.textContent?.trim() ?? '',
                imageSrc: item.querySelector('img')?.getAttribute('src') ?? '',
            }))
        );
    }

    // Product names whose image is missing or failed to load (waits for loading to finish first)
    async getBrokenImages(): Promise<{ name: string; src: string | null }[]> {
        return this.products.evaluateAll(async cards => {
            const broken: { name: string; src: string | null }[] = [];

            for (const card of cards) {
                const name = card.querySelector('[data-test="inventory-item-name"]')?.textContent?.trim() ?? '(unknown product)';
                const img = card.querySelector('img') as HTMLImageElement | null;

                if (!img) {
                    broken.push({ name, src: null });
                    continue;
                }
                // Wait for images that are still loading, otherwise a slow image would count as broken
                if (!img.complete) {
                    await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
                }
                // naturalWidth is 0 when the browser could not load or show the image
                if (img.naturalWidth === 0) {
                    broken.push({ name, src: img.getAttribute('src') });
                }
            }
            return broken;
        });
    }

    // ---------- Sorting ----------

    // Texts of all options in the sort dropdown, e.g. "Name (A to Z)"
    async getSortOptions(): Promise<string[]> {
        const options = await this.sortDropdown.locator('option').allTextContents();
        return options.map(option => option.trim());
    }

    // The sort option currently shown next to the dropdown
    async getActiveSortOption(): Promise<string> {
        return ((await this.activeSortOption.textContent()) ?? '').trim();
    }

    // Selects a sort option by its visible text.
    // Returns the text of an alert if the page shows one while sorting, otherwise null.
    async sortBy(optionLabel: string): Promise<string | null> {
        let alertMessage: string | null = null;
        const onDialog = async (dialog: Dialog) => {
            alertMessage = dialog.message();
            await dialog.accept();
        };

        // The handler is only active while sorting, so it does not affect other steps
        this.page.on('dialog', onDialog);
        try {
            await this.sortDropdown.selectOption({ label: optionLabel });
            // One round trip to the page, so an alert raised by the change is handled before we continue
            await this.page.evaluate(() => true);
        } finally {
            this.page.off('dialog', onDialog);
        }
        return alertMessage;
    }

    // Names of the products in the order they are shown
    async getProductNamesInOrder(): Promise<string[]> {
        return (await this.getDisplayedProducts()).map(product => product.name);
    }
}