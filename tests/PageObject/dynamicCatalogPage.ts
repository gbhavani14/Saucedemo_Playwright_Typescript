// Page object for the three Dynamic Catalog pages (lazy load, spinner and slider),
// opened from the burger menu. Their products appear only after a delay, so the steps
// wait on these locators instead of using fixed sleeps.
// The locators were found with scripts/inspectDynamicCatalog.js.
import { Page, Locator } from '@playwright/test';
import { BasePage } from './basePage';

// Locators shared by the lazy load, spinner and slider pages
export class DynamicCatalogPage extends BasePage {
    // Product names on any of the three catalog pages
    readonly productNames: Locator;

    // Lazy Load
    readonly lazyLoadedNames: Locator;
    readonly lazyPlaceholders: Locator;
    readonly lazySentinel: Locator;

    // Spinner (the page's own container and grid are excluded, they are always visible)
    readonly spinnerNames: Locator;
    readonly spinner: Locator;

    // Slider
    readonly sliderItemName: Locator;
    readonly sliderDots: Locator;

    constructor(page: Page) {
        super(page);
        // The data-test values contain the item number (e.g. lazy-load-item-3-name), so a
        // prefix match (^=) and a suffix match ($=) together find all items of one kind.
        this.productNames = page.locator(
            '[data-test^="lazy-load-item-"][data-test$="-name"], ' +
            '[data-test^="spinner-item-"][data-test$="-name"], ' +
            '[data-test="dynamic-catalog-slider-item-name"]'
        );

        this.lazyLoadedNames = page.locator('[data-test^="lazy-load-item-"][data-test$="-name"]');
        this.lazyPlaceholders = page.locator('[data-test^="lazy-load-item-"][data-test$="-placeholder"]');
        this.lazySentinel = page.locator('[data-test="dynamic-catalog-lazy-load-sentinel"]');

        this.spinnerNames = page.locator('[data-test^="spinner-item-"][data-test$="-name"]');
        // The loader markup is not fixed, so common patterns are combined: a class that contains
        // "spinner" (any case), a progressbar role, or aria-busy="true".
        this.spinner = page.locator(
            '[class*="spinner" i]:not(.dynamic_catalog_spinner_container):not(.dynamic_catalog_spinner_grid), ' +
            '[role="progressbar"], [aria-busy="true"]'
        );

        this.sliderItemName = page.locator('[data-test="dynamic-catalog-slider-item-name"]');
        this.sliderDots = page.locator('[data-test^="dynamic-catalog-slider-dot-"]');
    }

    // The slider dot that shows one product. .and() makes sure the element is a slider dot
    // and also has the expected accessible name, e.g. "Show Sauce Labs Backpack".
    sliderDot(productName: string): Locator {
        return this.sliderDots.and(this.page.getByRole('button', { name: `Show ${productName}`, exact: true }));
    }
}