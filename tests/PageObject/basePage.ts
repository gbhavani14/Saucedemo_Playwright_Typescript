// Base class for all page objects (Page Object pattern).
// Holds what every SauceDemo page shares after login: the header with the cart icon,
// the page title, the burger menu and the error message box.
// All other page objects extend this class, so these locators are defined only once.
import{expect, Locator, Page} from "@playwright/test";
import {getPageUrl} from "../config/env";

export class BasePage {

    // Header, title and error message
    readonly errorMessage: Locator;
    readonly cartButton: Locator;
    readonly cartBadge: Locator;
    readonly pageTitle: Locator;
    // Burger menu (the side panel opened from the top left)
    readonly menuButton: Locator;
    readonly closeMenuButton: Locator;
    readonly menuPanel: Locator;
    readonly menuItems: Locator;

    constructor(public page: Page) 
    {
        // data-test attributes are preferred because they exist for testing and do not change
        // with styling. Where the site has none, a stable id or class is used instead.
        this.errorMessage = page.locator('[data-test="error"]');
        this.cartButton = page.locator('.shopping_cart_link');
        this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
        this.pageTitle = page.locator('.title');
        this.menuButton = page.locator('#react-burger-menu-btn');
        this.closeMenuButton = page.locator('#react-burger-cross-btn');
        this.menuPanel = page.locator('.bm-menu-wrap');
        this.menuItems = page.locator('.bm-item-list a');
    }
    // The error box on the login and checkout forms
    getErrorMessage()
    {
        return this.errorMessage;
    }
    // Opens a page by its name from PAGES in config/env.ts, e.g. "inventory"
    async navigateTo(PageName: string)
    {
        await this.page.goto(getPageUrl(PageName));
    }

    // Checks that the browser shows the given page (full URL must match)
    async verifyOnPage(pageName: string) 
    {
        await expect(this.page).toHaveURL(getPageUrl(pageName));
    }

    // Small helpers that take a CSS selector as text
    async enterText(locator: string, text: string)
    {
        await this.page.locator(locator).fill(text);
    }

    async clickElement(locator: string)
    {
        await this.page.locator(locator).click();
    }

    async getCurrentUrl()
    {
        return this.page.url();
    }  

    getPageTitle(): Locator
    {
        return this.pageTitle;
    }

    // Title in the header, e.g. "Products" or "Your Cart"
    async verifyPageTitle(expectedTitle: string)
    {
        await expect(this.pageTitle).toBeVisible();
        await expect(this.pageTitle).toHaveText(expectedTitle);
    }

    // The badge on the cart icon shows the number of items. With an empty cart the
    // site removes the badge completely, so a count of 0 means "badge not shown".
    async verifyCartBadgeCount(expectedCount: number)
    {
        if (expectedCount === 0) {
            await this.verifyCartBadgeNotShown();
            return;
        }
        await expect(this.cartBadge).toBeVisible();
        await expect(this.cartBadge).toHaveText(String(expectedCount));
    }
    
    async verifyCartBadgeNotShown()
    {
        await expect(this.cartBadge).toBeHidden();
    }
    // The panel's aria-hidden attribute shows whether the menu is really open or closed,
    // so the next step does not start while the panel is still sliding in or out.
        async openMenu() {
        await this.menuButton.click();
        await expect(this.menuPanel).toHaveAttribute('aria-hidden', 'false');
    }

    async closeMenu() {
        await this.closeMenuButton.click();
        await expect(this.menuPanel).toHaveAttribute('aria-hidden', 'true');
    }

    // Texts of the menu entries, in the order shown, e.g. "All Items", "Dynamic Catalog", "About", "Logout", "Reset App State"
    async getMenuItems(): Promise<string[]> {
        const texts = await this.menuItems.allTextContents();
        return texts.map(text => text.trim()).filter(Boolean);
    }
    // One menu entry by its exact text. Special regex characters in the name are escaped.
    // The exact match stops a short name from matching a longer entry.
    getMenuItem(name: string): Locator {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return this.menuPanel.locator('a, button')
            .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) })
            .first();
    }

    // The panel stays in the page when closed, so aria-hidden is checked instead of visibility
    async isMenuOpen(): Promise<boolean> {
        return (await this.menuPanel.getAttribute('aria-hidden')) === 'false';
    }

    // Opens the menu if needed, then clicks the item
    async clickMenuItem(name: string) {
        if (!(await this.isMenuOpen())) {
            await this.openMenu();
        }
        const item = this.getMenuItem(name);
        await expect(item, `Menu item "${name}" is not shown in the menu`).toBeVisible();
        await item.click();
    }

    // The link target of a menu entry, e.g. to check where "About" points without opening it
    async getMenuItemLink(name: string): Promise<string | null> {
        const item = this.getMenuItem(name);
        await expect(item, `Menu item "${name}" is not shown in the menu`).toBeVisible();
        return item.getAttribute('href');
    }
}