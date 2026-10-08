// The Cucumber World for this framework.
// Cucumber creates a new instance for every scenario, so these fields are shared by the
// steps of one scenario and start fresh for the next one. The Before hook in hooks.ts sets
// the browser, page and page objects; step definitions use them through `this`.
import {World, setWorldConstructor, IWorldOptions} from "@cucumber/cucumber";
import {Browser, BrowserContext, Page} from "@playwright/test";
import { LoginPage } from "../PageObject/loginPage";
import { InventoryPage, DisplayedProduct } from "../PageObject/inventoryPage";
import { InventoryItemPage } from "../PageObject/inventoryItemPage";
import { CartPage } from "../PageObject/cartPage";
import { CheckoutStepOnePage } from "../PageObject/checkoutStepOnePage";
import { CheckoutStepTwoPage } from "../PageObject/checkoutStepTwoPage";
import { CheckoutCompletePage } from "../PageObject/checkoutCompletePage";
import { CartItem } from "../PageObject/cartPage";
import { OrderSummary } from "../PageObject/checkoutStepTwoPage";
import { PdfContent } from "../Utils/pdfUtils";

export class BrowserInitiation extends World {
    // Playwright objects, set in the Before hook ("!" tells TypeScript they are set later)
    browser!: Browser;
    context!: BrowserContext;
    page!: Page;
    // Page objects, one per page
    loginPage!: LoginPage;
    inventoryPage!: InventoryPage;
    inventoryItemPage!: InventoryItemPage;
    rememberedProduct?: DisplayedProduct;   // details read on the inventory page
    cartPage!: CartPage;
    checkoutStepOnePage!: CheckoutStepOnePage;
    checkoutStepTwoPage!: CheckoutStepTwoPage;
    checkoutCompletePage!: CheckoutCompletePage;
    // Data remembered between steps of the same scenario
    addedProducts: DisplayedProduct[] = [];
    // Where AfterStep saves this scenario's screenshots (set in the Before hook)
    screenshotFolder!: string;

    // User key of the last "I login as ..." step in this scenario (e.g. "LockedOutUser").
    // Scenarios that pick their own user (TC01, TC02, TC016) have no TEST_USER, so the
    // report uses this to show them in the right user column instead of "General".
    loginUser?: string;
    orderPdf?: PdfContent;                                          // the PDF created in the scenario
    // Products and summary read on the checkout overview, kept for later checks
    orderOverview?: { items: CartItem[]; summary: OrderSummary };

    constructor(options: IWorldOptions) {
        super(options);
    }
}
// Tells Cucumber to use this class as the World of every scenario
setWorldConstructor(BrowserInitiation);