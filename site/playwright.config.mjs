import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180000,
  use: {baseURL:'http://127.0.0.1:4173/mAI-skills/',browserName:'chromium',permissions:['clipboard-read','clipboard-write']},
  webServer: {command:'node serve.mjs',url:'http://127.0.0.1:4173/mAI-skills/',reuseExistingServer:!process.env.CI},
  reporter: [['list']],
});
