// Where the tests run: the base URL and the path of every page.
// ENV chooses an environment from the list below (default "demo"); BASE_URL overrides it.
// Steps and page objects use page names like "inventory", never full URLs.
const environments: Record<string, string> = {
  demo: 'https://www.saucedemo.com',
};

const env = process.env.ENV || 'demo';

export const BASE_URL = process.env.BASE_URL || environments[env];

// Page name -> path after the base URL. "login" is the start page, so its path is empty.
export const PAGES: Record<string, string> = {
  login: '',
  inventory: 'inventory.html',
  cart: 'cart.html',
  checkout_step_one: 'checkout-step-one.html',
  checkout_step_two: 'checkout-step-two.html',
  checkout_complete: 'checkout-complete.html',
};

// Full URL of a page. Unknown names throw an error, so a typo in a feature file fails clearly.
export function getPageUrl(pageName: string): string {
  const path = PAGES[pageName];
  if (path === undefined) {
    throw new Error(`Unknown page name: "${pageName}". Add it to PAGES in env.ts`);
  }
  return path ? `${BASE_URL}/${path}` : `${BASE_URL}/`;
}