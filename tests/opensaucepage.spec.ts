import { test, expect } from '@playwright/test';

test('Sauce Labs Webshop', async ({ page }) => {

  const title = await page.title();
  const products = page.locator(".inventory_list .inventory_item a")

  await page.goto('https://www.saucedemo.com/');
  await expect(page).toHaveTitle(/Swag Labs/);
  console.log("Title of the page is : " + await page.title());

  await page.locator('#user-name').fill('standard_user');
  await page.locator('#password').fill('secret_sauce');
  await page.locator('[value="Login"]').click();  
  await expect(page).toHaveURL('https://www.saucedemo.com/inventory.html');
  
  page.once('dialog', async dialog => {
    console.log(dialog.message());
    await dialog.accept();
  });

  const allProducts = await products.allTextContents();

  console.log(allProducts);

});
