import { defineConfig, devices } from "@playwright/test";

const basePath = process.env.VITE_BASE_PATH ?? "/";
const applicationUrl = `http://127.0.0.1:4173${basePath}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: applicationUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4173",
    url: applicationUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
