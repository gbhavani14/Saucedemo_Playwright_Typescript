// Cucumber configuration, used by every cucumber-js run (directly or through scripts/runAllUsers.js).

// Report file name: set by scripts/runAllUsers.js for each run (e.g. "ProblemUser", "General"),
// "report" when cucumber-js is run directly
const reportName = process.env.REPORT_NAME || 'report';
 
module.exports = {
    default: {
        // Files Cucumber loads before running: the World class, step definitions and hooks
        require: [
            'tests/Fixtures/*.ts',
            'tests/StepDefinitions/*.ts',
            'tests/Hooks/*.ts'
        ],
        // Lets Cucumber load the TypeScript files directly, without a separate build step
        requireModule: [
            'ts-node/register'
        ],
        // progress: one character per step in the console; html: the Cucumber HTML report of this run
        format: [
            'progress',
            `html:tests/Reports/cucumber-report/${reportName}.html`
        ],
    }
}