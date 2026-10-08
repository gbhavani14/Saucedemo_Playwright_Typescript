// Page object for the cart page.
// It also exports the CartItem type and readCartItems(), because the checkout overview
// (CheckoutStepTwoPage) shows the products with the same markup and reuses them.
import { Locator, Page } from "@playwright/test";
import { BasePage } from "./basePage";

// One product row on the cart page or the checkout overview (both pages use the same markup)
export type CartItem = {
    name: string;
    description: string;
    price: string;
    quantity: number;
};

// Matches the whole text exactly, so "Sauce Labs Bolt T-Shirt" never matches another T-shirt
function exactText(text: string): RegExp {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^\\s*${escaped}\\s*$`);
}

// Reads all product rows at once. Shared by CartPage and CheckoutStepTwoPage.
export async function readCartItems(items: Locator): Promise<CartItem[]> {
    // evaluateAll reads all rows in one call to the browser. This is faster than one
    // locator call per field, and all values come from the same moment.
    return items.evaluateAll(rows =>
        rows.map(row => ({
            name: row.querySelector('[data-test="inventory-item-name"]')?.textContent?.trim() ?? '',
            description: row.querySelector('[data-test="inventory-item-desc"]')?.textContent?.trim() ?? '',
            price: row.querySelector('[data-test="inventory-item-price"]')?.textContent?.trim() ?? '',
            // The quantity is read by its class
            quantity: Number(row.querySelector('.cart_quantity')?.textContent?.trim() ?? '0'),
        }))
    );
}

// Cart page: /cart.html
export class CartPage extends BasePage
{
    // The product list, its rows and the two buttons below it
    readonly cartList: Locator;
    readonly cartItems: Locator;
    readonly checkoutButton: Locator;
    readonly continueShoppingButton: Locator;

    constructor(page: Page)
    {
        super(page);
        this.cartList = page.locator('.cart_list');
        this.cartItems = page.locator('.cart_item');
        this.checkoutButton = page.locator('[data-test="checkout"]');
        this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
    }

    // Opens the cart with the cart icon in the header
    async open() {
        await this.cartButton.click();
    }

    // All products in the cart, in the order shown. It waits for the list first,
    // so an empty result means the cart is really empty, not still loading.
    async getItems(): Promise<CartItem[]> {
        await this.cartList.waitFor();
        return readCartItems(this.cartItems);
    }

    // The row of one product in the cart
    getItem(productName: string): Locator {
        return this.cartItems.filter({
            has: this.page.locator('[data-test="inventory-item-name"]', { hasText: exactText(productName) }),
        });
    }

    // The Remove button inside one product's row
    getRemoveButton(productName: string): Locator {
        return this.getItem(productName).getByRole('button', { name: 'Remove', exact: true });
    }

    async removeProduct(productName: string) {
        await this.getRemoveButton(productName).click();
    }

    // The two buttons below the cart list
    async checkout() {
        await this.checkoutButton.click();
    }

    async continueShopping() {
        await this.continueShoppingButton.click();
    }
}