// Page object for checkout step two, the order overview before Finish.
// It reads the products (with the same helper as the cart page) and the price summary,
// so the steps can compare them with what was added to the cart.
import { Locator, Page } from "@playwright/test";
import { BasePage } from "./basePage";
import { CartItem, readCartItems } from "./cartPage";

// The summary texts exactly as shown, including their labels
export type OrderSummary = {
    itemTotal: string;            // e.g. "Item total: $29.99"
    tax: string;                  // e.g. "Tax: $2.40"
    total: string;                // e.g. "Total: $32.39"
    paymentInformation: string;   // e.g. "SauceCard #31337"
    shippingInformation: string;  // e.g. "Free Pony Express Delivery!"
};

// Checkout step two ("Checkout: Overview"): /checkout-step-two.html
export class CheckoutStepTwoPage extends BasePage
{
    // Product rows, same markup as on the cart page
    readonly cartList: Locator;
    readonly cartItems: Locator;
    // Price summary, payment and shipping information
    readonly itemTotalLabel: Locator;
    readonly taxLabel: Locator;
    readonly totalLabel: Locator;
    readonly paymentInformation: Locator;
    readonly shippingInformation: Locator;
    // Buttons
    readonly finishButton: Locator;
    readonly cancelButton: Locator;

    constructor(page: Page)
    {
        super(page);
        this.cartList = page.locator('.cart_list');
        this.cartItems = page.locator('.cart_item');
        this.itemTotalLabel = page.locator('[data-test="subtotal-label"]');
        this.taxLabel = page.locator('[data-test="tax-label"]');
        this.totalLabel = page.locator('[data-test="total-label"]');
        this.paymentInformation = page.locator('[data-test="payment-info-value"]');
        this.shippingInformation = page.locator('[data-test="shipping-info-value"]');
        this.finishButton = page.locator('[data-test="finish"]');
        this.cancelButton = page.locator('[data-test="cancel"]');
    }

    // All products on the overview, in the order shown
    async getItems(): Promise<CartItem[]> {
        await this.cartList.waitFor();
        return readCartItems(this.cartItems);
    }

    // The summary texts. It waits for the total first, so the summary is on screen before it is read.
    async getSummary(): Promise<OrderSummary> {
        await this.totalLabel.waitFor();
        const text = async (locator: Locator) => ((await locator.textContent()) ?? '').trim();
        return {
            itemTotal: await text(this.itemTotalLabel),
            tax: await text(this.taxLabel),
            total: await text(this.totalLabel),
            paymentInformation: await text(this.paymentInformation),
            shippingInformation: await text(this.shippingInformation),
        };
    }

    // Finish places the order. Cancel leaves the checkout and goes back to the products page.
    async finish() {
        await this.finishButton.click();
    }

    async cancel() {
        await this.cancelButton.click();
    }
}