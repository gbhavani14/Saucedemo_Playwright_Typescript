// Runs the test suite for every user in tests/TestData/loginCredentials.json.
//  1. Features tagged @allUsers run once per user that can log in (user passed via TEST_USER).
//  2. All other scenarios (e.g. TC01, TC02) choose their own users, so they run once.
//  3. A test-case-wise report is built: index.html plus one page per test case (TC01, TC02, ...).
//
// Usage:
//   npm run test:allusers                                                       -> everything
//   node scripts/runAllUsers.js tests/Features/TC01_LoginFunctionality.feature  -> one feature
//   node scripts/runAllUsers.js tests/Features/TC03_ShowAllProducts.feature ProblemUser
//                                                                               -> one feature, chosen users only

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const users = require('../tests/TestData/loginCredentials.json');
const { buildTestCaseReport } = require('./buildTestCaseReport');

// Users that cannot log in, so they are skipped for @allUsers features
const EXCLUDED_USERS = ['LockedOutUser', 'InvalidUser', 'EmptyUsername', 'EmptyPassword'];

// Absolute paths, so it works no matter which folder the command is started from
const REPORTS_DIR = path.join(__dirname, '..', 'tests', 'Reports');
const HTML_REPORT_DIR = path.join(REPORTS_DIR, 'cucumber-report');

// The cucumber-js program inside node_modules. It is started with the current Node executable
// instead of "npx", because spawning "npx" directly does not work on Windows (it is npx.cmd there).
const CUCUMBER_BIN = path.join(__dirname, '..', 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber.js');

// "--headless" runs without a visible browser window on every operating system
// (the same as setting HEADLESS=true, which only works in Mac/Linux shells)
let args = process.argv.slice(2);
if (args.includes('--headless')) {
    process.env.HEADLESS = 'true';
    args = args.filter(arg => arg !== '--headless');
}

if (!fs.existsSync(CUCUMBER_BIN)) {
    console.error('Cucumber is not installed. Run "npm install" in the project folder first.');
    process.exit(1);
}

// Arguments containing ".feature" (optionally with a line number) are feature paths,
// everything else is a user name
const featurePaths = args.filter(arg => arg.includes('.feature'));
const requestedUsers = args.filter(arg => !arg.includes('.feature'));

const userTypes = requestedUsers.length > 0
    ? requestedUsers
    : Object.keys(users).filter(user => !EXCLUDED_USERS.includes(user));

const targets = featurePaths.length > 0 ? featurePaths : ['tests/Features'];

// Delete everything inside tests/Reports (HTML reports and screenshots); the folder itself is kept
function clearReports() {
    if (!fs.existsSync(REPORTS_DIR)) return;
    for (const entry of fs.readdirSync(REPORTS_DIR)) {
        fs.rmSync(path.join(REPORTS_DIR, entry), { recursive: true, force: true });
    }
    console.log(`Cleared reports folder: ${REPORTS_DIR}`);
}

// Runs cucumber-js as a child process and waits until it ends. Returns true if everything passed.
// Each run writes its own HTML report (REPORT_NAME), so the runs do not overwrite each other.
function runCucumber(label, reportName, cucumberArgs, extraEnv = {}) {
    console.log(`\n========== ${label} ==========`);
    const run = spawnSync(process.execPath, [CUCUMBER_BIN, ...targets, ...cucumberArgs], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),   // cucumber.js config and feature paths are relative to the project folder
        env: {
            ...process.env,
            ...extraEnv,
            REPORT_NAME: reportName,  // read by cucumber.js for the HTML report file name
            REPORTS_CLEARED: 'true',  // tells the hooks not to clear the folder again
        },
    });
    // If cucumber-js could not be started at all, say why instead of only reporting FAILED
    if (run.error) {
        console.error(`Could not start cucumber-js: ${run.error.message}`);
    }
    return run.status === 0;
}

// ---------- Run ----------

clearReports();

const results = [];

// 1. @allUsers scenarios, once per user
for (const user of userTypes) {
    if (!users[user]) {
        console.error(`Unknown user "${user}". Available: ${Object.keys(users).join(', ')}`);
        results.push({ label: user, passed: false });
        continue;
    }
    const passed = runCucumber(
        `@allUsers scenarios as ${user}`,
        user,
        ['--tags', '@allUsers'],
        { TEST_USER: user }
    );
    results.push({ label: `@allUsers as ${user}`, passed, report: `${user}.html` });
}

// 2. All other scenarios, once. Also runs when feature files are given, so a feature
//    without @allUsers (like TC01) still runs. Skipped only when specific users are requested.
if (requestedUsers.length === 0) {
    const passed = runCucumber(
        'User-specific scenarios (not @allUsers)',
        'General',
        ['--tags', 'not @allUsers']
    );
    results.push({ label: 'User-specific scenarios (not @allUsers)', passed, report: 'General.html' });
}

// 3. Summary and test-case-wise report (index.html + one page per test case)
const indexPath = buildTestCaseReport(REPORTS_DIR);

console.log('\n========== Summary ==========');
results.forEach(r => console.log(`${r.passed ? 'PASSED' : 'FAILED'}  ${r.label}`));
console.log(`\nTest report:     ${indexPath}`);
console.log(`Screenshots:     ${path.join(REPORTS_DIR, 'Screenshots')}`);

// Exit code 1 if any run failed, so a CI pipeline marks the build as failed
process.exit(results.every(r => r.passed) ? 0 : 1);