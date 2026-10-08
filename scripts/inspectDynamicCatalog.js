// Helper script, not part of the test run. It logs in, opens the three Dynamic Catalog pages
// and prints their data-test values, loader/slider classes and buttons: once early (while
// loading) and once after loading. It was used to choose the locators in
// tests/PageObject/dynamicCatalogPage.ts.
// Run: node scripts/inspectDynamicCatalog.js   (opens a visible browser)

const { chromium } = require('@playwright/test');

const BASE = 'https://www.saucedemo.com';
const PAGES = ['dynamic-catalog-lazy-load.html', 'dynamic-catalog-spinner.html', 'dynamic-catalog-slider.html'];

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto(BASE);
    await page.fill('#user-name', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('[value="Login"]');
    await page.waitForURL('**/inventory.html');

    for (const name of PAGES) {
        await page.goto(`${BASE}/${name}`);
        // Fixed waits are fine here: this is a one-off inspection script, not a test
        await page.waitForTimeout(1500);   // early state (spinner may be visible)
        const early = await collect(page);
        await page.waitForTimeout(8000);   // after loading
        const late = await collect(page);

        console.log(`\n================ ${name} ================`);
        console.log('data-test values (count) after 1.5 s:', early.dataTest);
        console.log('data-test values (count) after 9.5 s:', late.dataTest);
        console.log('spinner/loader/slider/carousel classes after 1.5 s:', early.special);
        console.log('spinner/loader/slider/carousel classes after 9.5 s:', late.special);
        console.log('buttons:', late.buttons);
    }

    await browser.close();
})();

// Runs inside the page and collects: how often each data-test value appears, elements whose
// class looks like a spinner, loader or slider, and all buttons. Hidden elements are marked "(hidden)".
async function collect(page) {
    return page.evaluate(() => {
        const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const dataTest = {};
        document.querySelectorAll('[data-test]').forEach(el => {
            const key = el.getAttribute('data-test') + (visible(el) ? '' : ' (hidden)');
            dataTest[key] = (dataTest[key] || 0) + 1;
        });
        const special = {};
        document.querySelectorAll('[class]').forEach(el => {
            const cls = String(el.className);
            if (/spin|load|slide|carousel|swiper/i.test(cls)) {
                const key = `${el.tagName.toLowerCase()}.${cls.trim().replace(/\s+/g, '.')}` + (visible(el) ? '' : ' (hidden)');
                special[key] = (special[key] || 0) + 1;
            }
        });
        const buttons = [...document.querySelectorAll('button, [role="button"]')].map(b =>
            `${b.tagName.toLowerCase()} text="${b.textContent.trim().slice(0, 30)}" aria-label="${b.getAttribute('aria-label') || ''}" data-test="${b.getAttribute('data-test') || ''}" id="${b.id}"`);
        return { dataTest, special, buttons: [...new Set(buttons)] };
    });
}