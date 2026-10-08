// Page object for the login page, the start page of saucedemo.com.
// loginAs() takes a user type such as "StandardUser" and looks up the username and
// password in tests/TestData/loginCredentials.json, so the feature files only name the user type.
import{Locator, Page} from "@playwright/test";
import { BasePage } from "./basePage";
import * as users from "../TestData/loginCredentials.json";

// The JSON file is imported as a module. The cast gives it a type, so USERS[userType] is typed.
type UserCredentials = { username: string; password: string };
const USERS = users as Record<string, UserCredentials>;

export class LoginPage extends BasePage
{
    // Login form. The inputs have stable ids; the button is found by its value "Login".
    readonly username: Locator;
    readonly password: Locator;
    readonly loginButton: Locator;

    constructor(page: Page) 
    {
        super(page);
        this.username = page.locator('#user-name');
        this.password = page.locator('#password');
        this.loginButton = page.locator('[value="Login"]');
    }

    // Opens the login page by its name in PAGES ("login" is the base URL)
    async navigateToLoginPage(pageName: string)
    {
        await this.navigateTo(pageName);
    }
    
    async enterCredentials(username: string, password: string) {
        await this.username.fill(username);
        await this.password.fill(password);
    }

    async submitLogin() {
        await this.loginButton.click();
    }

    // Fills both fields and clicks Login. Empty strings are allowed for the negative tests.
    async login(username: string, password: string) {
        await this.enterCredentials(username, password);
        await this.submitLogin();
    }

    // Logs in as a user type from loginCredentials.json, e.g. "StandardUser" or "ProblemUser"
    async loginAs(userType: string) {
        const user = USERS[userType];
        if (!user) {
            throw new Error(`Unknown user type: "${userType}". Add it to loginCredentials.json`);
        }
        await this.login(user.username, user.password);
    }
}