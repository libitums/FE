import { defineConfig, devices } from "@playwright/test";

const port = 4399;
/** 빌드에 넣는 배포 주소입니다. canonical · hreflang · sitemap이 이 주소로 나오는지 봅니다. */
export const siteUrl = "https://example.test";

/** 산출물의 내용만 보는 테스트입니다. 브라우저마다 달라지지 않아 chromium에서만 돕니다. */
const contentOnly = "content.e2e.ts";

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `astro build --outDir .e2e-dist && node e2e/serve.mjs .e2e-dist ${port}`,
    env: { SITE_URL: siteUrl },
    url: `http://127.0.0.1:${port}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: contentOnly },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: contentOnly },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: contentOnly },
  ],
});
