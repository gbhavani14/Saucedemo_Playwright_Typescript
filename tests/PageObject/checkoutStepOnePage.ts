// Page object for checkout step one, where the buyer enters first name, last name
// and postal code. Steps use it for the happy path and for the required-field errors.
import { Locator, Page } from "@playwright/test";
import { BasePage } from "./basePage";

// The three form values, used both for filling the form and for reading it back
export type CheckoutInformation = {
    firstName: string;
    lastName: string;
    postalCode: string;
};

// Checkout step one ("Checkout: Your Information"): /checkout-step-one.html
export class CheckoutStepOnePage extends BasePage
{
    // Form fields and buttons, all found by their data-test attributes
    readonly firstNameInput: Locator;
    readonly lastNameInput: Locator;
    readonly postalCodeInput: Locator;
    readonly continueButton: Locator;
    readonly cancelButton: Locator;

    constructor(page: Page)
    {
        super(page);
        this.firstNameInput = page.locator('[data-test="firstName"]');
        this.lastNameInput = page.locator('[data-test="lastName"]');
        this.postalCodeInput = page.locator('[data-test="postalCode"]');
        this.continueButton = page.locator('[data-test="continue"]');
        this.cancelButton = page.locator('[data-test="cancel"]');
    }

    // Empty values clear the field, which is used to test the required-field errors
    async fillInformation(information: CheckoutInformation) {
        await this.firstNameInput.fill(information.firstName);
        await this.lastNameInput.fill(information.lastName);
        await this.postalCodeInput.fill(information.postalCode);
    }

    // What the fields actually contain after typing
    async getEnteredInformation(): Promise<CheckoutInformation> {
        return {
            firstName: await this.firstNameInput.inputValue(),
            lastName: await this.lastNameInput.inputValue(),
            postalCode: await this.postalCodeInput.inputValue(),
        };
    }

    // Continue goes to the overview, or shows an error if a field is empty. Cancel goes back to the cart.
    async continue() {
        await this.continueButton.click();
    }

    async cancel() {
        await this.cancelButton.click();
    }
}