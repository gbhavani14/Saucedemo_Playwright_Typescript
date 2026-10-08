export const TIMEOUTS = {
    STEP: 60 * 1000,          // whole Cucumber step
    ACTION: 20 * 1000,        // every click / fill / waitFor
    PAGE: 20 * 1000,          // login, navigation, URL checks
    ELEMENT: 10 * 1000,       // buttons, badge, rows, sort option
    PAGE_LOAD: 30 * 1000,     // page load before the screenshot
    SCREENSHOT: 10 * 1000,
    DOWNLOAD: 20 * 1000,      // order PDF
    EXTERNAL_PAGE: 30 * 1000, // saucelabs.com (About menu)
};