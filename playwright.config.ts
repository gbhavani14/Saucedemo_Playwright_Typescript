import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  timeout: 30 * 1000,
  
  expect: {
    timeout: 50 * 1000
  },
  reporter: 'html',
  
  use: {
    browserName: 'chromium',
    headless:false,
    launchOptions: {
      slowMo: 1000,           // 1 second delay between each action
    },
   },

});
