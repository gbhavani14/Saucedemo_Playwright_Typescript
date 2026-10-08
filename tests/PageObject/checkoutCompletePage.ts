// Page object for the last checkout page, shown after clicking Finish.
// Used to check the confirmation message, go back to the products page
// and download the order as a PDF.
import { Locator, Page } from "@playwright/test";
import { BasePage } from "./basePage";

// The two confirmation texts, e.g. "Thank you for your order!"
export type OrderConfirmation = {
    header: string;
    text: string;
};

// Order confirmation ("Checkout: Complete!"): /checkout-complete.html
export class CheckoutCompletePage extends BasePage
{
    // Confirmation texts, image and buttons, all found by their data-test attributes
    readonly completeHeader: Locator;
    readonly completeText: Locator;
    readonly ponyExpressImage: Locator;
    readonly backHomeButton: Locator;
    readonly generatePdfButton:Locator;

    constructor(page: Page)
    {
        super(page);
        this.completeHeader = page.locator('[data-test="complete-header"]');
        this.completeText = page.locator('[data-test="complete-text"]');
        this.ponyExpressImage = page.locator('[data-test="pony-express"]');
        this.backHomeButton = page.locator('[data-test="back-to-products"]');
        this.generatePdfButton = page.locator('[data-test="generate-pdf-order"]');
    }

    // Reads both confirmation texts once the header is shown
    async getConfirmation(): Promise<OrderConfirmation> {
        await this.completeHeader.waitFor();
        return {
            header: ((await this.completeHeader.textContent()) ?? '').trim(),
            text: ((await this.completeText.textContent()) ?? '').trim(),
        };
    }

    async backHome() {
        await this.backHomeButton.click();
    }
}