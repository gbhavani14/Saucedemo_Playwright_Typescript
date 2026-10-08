// Cucumber hooks: what happens around every scenario and step.
//   BeforeAll - once per cucumber-js run: clears old screenshots and results
//   Before    - before each scenario: starts a new browser and creates the page objects
//   AfterStep - after each step: waits for the page, takes a screenshot, optional speed check
//   After     - after each scenario: saves the result for the report and closes the browser
import { BrowserInitiation } from "../Fixtures/browserInitiation";
import { Before, BeforeAll, After, AfterStep, Status, setDefaultTimeout, ITestCaseHookParameter } from "@cucumber/cucumber";
import { chromium, errors } from "@playwright/test";
import { LoginPage } from "../PageObject/loginPage";
import { InventoryPage } from "../PageObject/inventoryPage";
import { InventoryItemPage } from "../PageObject/inventoryItemPage";
import { CartPage } from "../PageObject/cartPage";
import { CheckoutStepOnePage } from "../PageObject/checkoutStepOnePage";
import { CheckoutStepTwoPage } from "../PageObject/checkoutStepTwoPage";
import { CheckoutCompletePage } from "../PageObject/checkoutCompletePage";
import * as path from "path";
import * as fs from "fs";
import { TIMEOUTS } from '../config/timeouts';

// Maximum time for one whole step. Cucumber's own default (5 s) is too short for slow users.
setDefaultTimeout(TIMEOUTS.STEP);

// Step duration check (performance). Only active for scenarios tagged @performance,
// or for every scenario when CHECK_STEP_DURATION=true is set. Functional tests are not
// failed just because a step was slow (e.g. browser start, login, full page loads).
// The reason: PerformanceGlitchUser is slow on purpose, and its functional tests should still pass.
// MAX_STEP_MS changes the limit (default 5000 ms).
const MAX_STEP_DURATION_MS = Number(process.env.MAX_STEP_MS || 5000);
const CHECK_ALL_STEP_DURATIONS = process.env.CHECK_STEP_DURATION === 'true';
const PAGE_LOAD_TIMEOUT_MS = TIMEOUTS.PAGE_LOAD;
const SCREENSHOT_TIMEOUT_MS = TIMEOUTS.SCREENSHOT;

// Absolute paths: tests/Hooks -> tests/Reports/...
const REPORTS_DIR = path.resolve(__dirname, '..', 'Reports');
const SCREENSHOT_DIR = path.join(REPORTS_DIR, 'Screenshots');
// One line per scenario run; scripts/buildTestCaseReport.js turns it into the test case report
const RESULTS_FILE = path.join(REPORTS_DIR, 'results', 'results.jsonl');

// TEST_USER is set by scripts/runAllUsers.js for @allUsers features.
// Scenarios that choose their own users (e.g. TC01) are filed under "General".
const userFolder = process.env.TEST_USER || 'General';
const user = process.env.TEST_USER || 'StandardUser';

// Step and scenario texts contain spaces and quotes; keep only letters and digits for file names
function safeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '_');
}

// Delete everything inside the Screenshots folder (the folder itself is kept)
function clearScreenshots(): void {
    if (!fs.existsSync(SCREENSHOT_DIR)) return;
    for (const entry of fs.readdirSync(SCREENSHOT_DIR)) {
        fs.rmSync(path.join(SCREENSHOT_DIR, entry), { recursive: true, force: true });
    }
    console.log(`Cleared screenshots folder: ${SCREENSHOT_DIR}`);
}

// Runs once before all scenarios of one cucumber-js run.
// runAllUsers.js starts cucumber-js several times (once per user, then once for the rest).
// It clears tests/Reports itself before the first run and sets REPORTS_CLEARED=true, so the
// later runs do not delete the screenshots and results of the earlier ones.
// When cucumber-js is run directly, only the screenshots and old results are cleared here.
// The HTML report is not deleted, because Cucumber has already opened that file.
BeforeAll(function () {
    if (process.env.REPORTS_CLEARED !== 'true') {
        clearScreenshots();
        fs.rmSync(RESULTS_FILE, { force: true });
    }
});

// A new browser for every scenario, so scenarios never share cookies, cart contents
// or login state, and one failing scenario cannot affect the next.
Before(async function (this: BrowserInitiation, { pickle }) {
    try {
        // HEADLESS=true runs without a visible browser window (e.g. on a CI server)
        this.browser = await chromium.launch({
            headless: process.env.HEADLESS === 'true',
        });
    } catch (error) {
        const reason = (error instanceof Error ? error.message : String(error)).split('\n')[0];
        throw new Error(
            `The browser could not be started. Run "npx playwright install chromium" and try again.\n   Technical reason: ${reason}`
        );
    }
    this.context = await this.browser.newContext();
    this.context.setDefaultTimeout(TIMEOUTS.ACTION); // Playwright actions: fail with a clear locator error
    this.page = await this.context.newPage();
    // Page objects on the World, so step definitions can use this.loginPage, this.cartPage, ...
    this.loginPage = new LoginPage(this.page);
    this.inventoryPage = new InventoryPage(this.page);
    this.inventoryItemPage = new InventoryItemPage(this.page);
    this.cartPage = new CartPage(this.page);
    this.checkoutStepOnePage = new CheckoutStepOnePage(this.page);
    this.checkoutStepTwoPage = new CheckoutStepTwoPage(this.page);
    this.checkoutCompletePage = new CheckoutCompletePage(this.page);

    // Screenshots/<feature>/<user or General>/<scenario>/
    const featureFileName = path.basename(pickle.uri, '.feature');
    const scenarioName = safeFileName(pickle.name);
    this.screenshotFolder = path.join(SCREENSHOT_DIR, featureFileName, userFolder, scenarioName);
});

// After every step, also after a failed one, so the screenshot shows what went wrong
AfterStep(async function (this: BrowserInitiation, { pickle, pickleStep, result }) {
    // Nothing to capture if the browser never started (the Before hook failed)
    if (!this.page || !this.screenshotFolder) return;

    // Step number in the scenario, two digits so the files sort in step order (01, 02, ... 10)
    const stepNumber = String(pickle.steps.findIndex(step => step.id === pickleStep.id) + 1).padStart(2, '0');
    // Cucumber reports the duration as seconds plus nanoseconds
    const stepMs = Number(result.duration.seconds) * 1000 + result.duration.nanos / 1e6;
    const waitStart = Date.now();

    // 1. Wait for the page, so slowness is included in the timing
    let pageLoadTimedOut = false;
    try {
        await this.page.waitForLoadState('load', { timeout: PAGE_LOAD_TIMEOUT_MS });
    } catch (error) {
        if (error instanceof errors.TimeoutError) {
            pageLoadTimedOut = true;
        }
        // Any other error (e.g. page already closed) is not a test failure; the step result decides
    }

    const totalMs = Math.round(stepMs + (Date.now() - waitStart));
    // Speed is checked only for @performance scenarios (or with CHECK_STEP_DURATION=true).
    // Only passed steps are checked; a failed step already has its own error.
    const checkDuration = CHECK_ALL_STEP_DURATIONS || pickle.tags.some(tag => tag.name === '@performance');
    const tooSlow = checkDuration && result.status === Status.PASSED && totalMs > MAX_STEP_DURATION_MS;

    // 2. Label the screenshot with the real outcome
    let label: string = String(result.status);
    if (pageLoadTimedOut) label = 'FAILED_PAGE_LOAD';
    else if (tooSlow) label = 'FAILED_TOO_SLOW';

    const filePath = path.join(this.screenshotFolder, `${stepNumber}_${label}_${safeFileName(pickleStep.text)}.png`);

    // 3. Take the screenshot. A full-page screenshot can fail or time out on long or still
    //    changing pages, so the visible area is tried next. A missing screenshot only logs
    //    a warning; it never fails the test.
    try {
        const screenshot = await this.page.screenshot({ path: filePath, fullPage: true, timeout: SCREENSHOT_TIMEOUT_MS });
        this.attach(screenshot, 'image/png'); // also embed it in the HTML report
    } catch {
        try {
            const screenshot = await this.page.screenshot({ path: filePath, fullPage: false, timeout: SCREENSHOT_TIMEOUT_MS });
            this.attach(screenshot, 'image/png');
        } catch {
            console.warn(`Could not take a screenshot after step "${pickleStep.text}" (user: ${user}).`);
        }
    }

    // 4. Fail the scenario only after the screenshot is saved.
    //    A step that already failed keeps its own error message; no second error is added.
    if (result.status !== Status.PASSED) return;

    if (pageLoadTimedOut) {
        throw new Error(
            `The page did not finish loading within ${PAGE_LOAD_TIMEOUT_MS / 1000} seconds after the step "${pickleStep.text}" (user: ${user}).`
        );
    }
    if (tooSlow) {
        throw new Error(
            `Performance: the step "${pickleStep.text}" took ${totalMs} ms including page load, ` +
            `which is more than the limit of ${MAX_STEP_DURATION_MS} ms (user: ${user}).`
        );
    }
});

// Saves the result of each scenario for the test-case-wise report
function saveScenarioResult(world: BrowserInitiation, { pickle, gherkinDocument, result }: ITestCaseHookParameter): void {
    try {
        const durationMs = result
            ? Math.round(Number(result.duration.seconds) * 1000 + result.duration.nanos / 1e6)
            : 0;
        // Readable error for the report: first lines only, without long stack traces
        const error = (result?.message ?? '')
            .split('\n')
            .filter(line => !line.trim().startsWith('at '))
            .slice(0, 15)
            .join('\n')
            .trim();

        // Which user column the result belongs to in the report:
        // - @allUsers features: the TEST_USER of this run (set by runAllUsers.js)
        // - scenarios that log in as a specific user ("I login as ..."): that user
        // - everything else: "General"
        const reportUser = process.env.TEST_USER || world.loginUser || 'General';

        // Scenario Outlines over users (e.g. "Successful login as <user>") get one name per
        // user. Replacing the user name with "<user>" puts them in one report row with one
        // column per user, the same way as the @allUsers features.
        const scenario = !process.env.TEST_USER && world.loginUser
            ? pickle.name.split(world.loginUser).join('<user>')
            : pickle.name;

        const record = {
            featureFile: path.basename(pickle.uri, '.feature'),   // e.g. TC03_ShowAllProducts
            featureName: gherkinDocument.feature?.name ?? '',
            scenario,
            user: reportUser,                                      // user name, or "General"
            status: result ? String(result.status) : 'UNKNOWN',    // PASSED, FAILED, SKIPPED, ...
            durationMs,
            error,
            screenshotFolder: world.screenshotFolder ? path.relative(REPORTS_DIR, world.screenshotFolder) : '',
            finishedAt: new Date().toISOString(),
        };
        // JSON Lines: one object per line, appended. Several cucumber-js runs (one per user)
        // add to the same file, and the report is built from it at the end.
        fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
        fs.appendFileSync(RESULTS_FILE, JSON.stringify(record) + '\n');
    } catch (error) {
        // Saving report data must never fail the test itself
        console.warn('Could not save the scenario result for the report:', error);
    }
}

// Save the result first, then close everything. The ?. is needed because the Before hook
// may have failed before the browser or page existed.
After(async function (this: BrowserInitiation, scenario) {
    saveScenarioResult(this, scenario);
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
});