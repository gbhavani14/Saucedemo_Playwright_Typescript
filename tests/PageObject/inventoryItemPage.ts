// Page object for the product details page, opened by clicking a product name.
// getDetails() returns the same shape as the products page, so the steps can check that
// both pages show the same name, description, price and image.
import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "./basePage";
import { DisplayedProduct } from "./inventoryPage";
import { TIMEOUTS } from '../config/timeouts';

// Product details page: /inventory-item.html?id=<n>
export class InventoryItemPage extends BasePage
{
    // Name, description and price use the same data-test values as on the products page
    readonly productName: Locator;
    readonly productDescription: Locator;
    readonly productPrice: Locator;
    readonly productImage: Locator;
    readonly backToProductsButton: Locator;

    constructor(page: Page)
    {
        super(page);
        this.productName = page.locator('[data-test="inventory-item-name"]');
        this.productDescription = page.locator('[data-test="inventory-item-desc"]');
        this.productPrice = page.locator('[data-test="inventory-item-price"]');
        this.productImage = page.locator('.inventory_details_img');
        this.backToProductsButton = page.locator('[data-test="back-to-products"]');
    }

    // The products page and the details page use the same data-test names for name,
    // description and price. On a slow page the URL can already be the details page
    // while the product list is still shown, so wait until only one product is left.
    async waitUntilLoaded(timeout = TIMEOUTS.PAGE) {
        await this.backToProductsButton.waitFor({ timeout });
        await this.productImage.waitFor({ timeout });
        await expect(this.productName).toHaveCount(1, { timeout });
    }

    // A button on the details page by its exact text, e.g. "Add to cart" or "Remove"
    getButton(buttonText: string): Locator {
        return this.page.getByRole('button', { name: buttonText, exact: true });
    }

    // Clicks a button on the details page by its exact text
    async clickButton(buttonText: string) {
        await this.getButton(buttonText).click();
    }

    async backToProducts() {
        await this.backToProductsButton.click();
    }

    // Reads the details shown on this page, in the same shape as the products page
    async getDetails(): Promise<DisplayedProduct> {
        await this.waitUntilLoaded();
        return {
            name: (await this.productName.textContent())?.trim() ?? '',
            description: (await this.productDescription.textContent())?.trim() ?? '',
            price: (await this.productPrice.textContent())?.trim() ?? '',
            imageSrc: (await this.productImage.getAttribute('src')) ?? '',
        };
    }
}