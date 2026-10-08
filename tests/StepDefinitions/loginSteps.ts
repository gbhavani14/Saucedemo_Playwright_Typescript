// Login steps.
// "I am loggedin user" is the Background of most features (TC02-TC020). It logs in as the user
// in the TEST_USER environment variable, so the same feature runs for every user type.
// TC01, TC02 and TC016 log in as a named user. TC014 checks the login form after logout.

import {Given, When, Then} from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { BrowserInitiation } from '../Fixtures/browserInitiation';
import { getPageUrl } from '../config/env';
import { TIMEOUTS } from '../config/timeouts';


// Logs in as TEST_USER (StandardUser if not set) and waits until the products page is open
Given('I am loggedin user', async function (this: BrowserInitiation) {
    const userType = process.env.TEST_USER || 'StandardUser';
    await this.loginPage.navigateTo('login');
    await this.loginPage.loginAs(userType);
    await expect(this.page).toHaveURL(getPageUrl('inventory'), { timeout: TIMEOUTS.PAGE });
});

// Logs in with a user key from tests/TestData/loginCredentials.json, e.g. When I login as "LockedOutUser"
When('I login as {string}', async function (this: BrowserInitiation, userType:string) {
    // Remember the user, so the report shows this scenario in this user's column
    this.loginUser = userType;
    await this.loginPage.loginAs(userType);
});

// Logs in with a username and password written in the feature file.
// Not used by the current feature files. Kept for credentials that are not in the JSON file.
When('I login as {string} and {string}', async function (this: BrowserInitiation, username:string, password:string) {
    await this.loginPage.login(username, password);
});

// After logout (TC014) the form must be visible and both fields empty, so no credentials are left behind
Then('the login form should be shown with empty fields', async function (this: BrowserInitiation) {
    const username = this.page.locator('#user-name');
    const password = this.page.locator('#password');
    const loginButton = this.page.locator('[value="Login"]');

    const problems: string[] = [];
    if (!(await username.isVisible())) problems.push('Username field is not shown');
    if (!(await password.isVisible())) problems.push('Password field is not shown');
    if (!(await loginButton.isVisible())) problems.push('Login button is not shown');

    // Values are only read when the fields exist. Otherwise inputValue() would wait until it times out.
    if (problems.length === 0) {
        const usernameValue = await username.inputValue();
        const passwordValue = await password.inputValue();
        if (usernameValue !== '') problems.push(`Username field still contains "${usernameValue}"`);
        if (passwordValue !== '') problems.push('Password field is not empty');
    }

    if (problems.length > 0) {
        throw new Error(`The login form is not shown correctly after logging out:\n - ${problems.join('\n - ')}`);
    }
});