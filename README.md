#Sauce Demo - Playwright + Typescript + Cucumber Test Automation

End-to-end test automation for the [Sauce Demo](https://www.saucedemo.com/) webshop, built with Playwright, Typescript and Cucumber (BDD).

##Tech stack
|Tool	       |    Purpose                      |
|--------------|---------------------------------|
|Playwright	   |    Browser automation (Chromium)|
|TypeScript	   |    Test code                    |
|Cucumber.js.  |    BDD runner and Gherkin feature files|
|ts-node	   |    Runs TypeScript without a build step|
|pdfjs-dist	   |    Reads the text of the order PDF|
|Node.js	   |    Runtime and scripts (test runner, report builder)|


##Setup
```bash
npm init -y                                             # creates package.json
npm install --save-dev @playwright/test                 # Playwright
npx playwright install chromium                         # browser for Playwright
npm install --save-dev typescript ts-node @types/node   # TypeScript and running .ts files
npx tsc --init                                          # creates tsconfig.json
npm install @cucumber/cucumber dotenv                   # Cucumber BDD runner, .env support
npm install --save-dev pdfjs-dist                       # reading the order PDF
```

##How to run
|Goal	                                       |    Command |
|----------------------------------------------|-------------|
|Full regression, all users, browser visible   |	node scripts/runAllUsers.js  |
|One feature for all users	                   |    node scripts/runAllUsers.js tests/Features/<featurename>.feature|
|One feature for chosen user	               |    node scripts/runAllUsers.js tests/Features/<featurename>.feature StandardUser|


##Reports
|Output	                                | Location|
|---------------------------------------|-------------|
|Test case report (open in a browser)	|   tests/Reports/cucumber-report/index.html|
|Screenshot of every step	            |  tests/Reports/Screenshots/<feature>/<user>/<scenario>/|
|Downloaded order PDFs	                |   tests/Reports/Pdfs/<user>/|


##Project Structure
```bash
├── cucumber.js                 Cucumber configuration (steps, hooks, report)
├── package.json                Dependencies and npm scripts
├── tsconfig.json               TypeScript settings
├── scripts/
│   ├── runAllUsers.js          Runs @allUsers features once per user, then the rest
│   └── buildTestCaseReport.js  Builds the test-case-wise HTML report
└── tests/
    ├── Features/               Gherkin feature files
    ├── StepDefinitions/        Step implementations
    ├── PageObject/             Page objects
    ├── Hooks/                  Browser start, screenshots, result saving
    ├── Fixtures/               Cucumber World: shared state per scenario
    ├── TestData/               loginCredentials.json, products.json
    ├── Utils/                  PDF reading, product data helper
    ├── config/                 Environment URLs and timeouts
    └── Reports/                Generated reports and screenshots (not in Git)
```
