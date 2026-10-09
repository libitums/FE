import { defineConfig, devices } from "@playwright/test";

/** 정적 서버 포트입니다. `site`는 측정 ID 없는 빌드, `analytics`는 측정 ID가 든 빌드입니다. */
export const ports = { site: 4399, analytics: 4398 } as const;
/** 빌드에 넣는 배포 주소입니다. canonical · hreflang · sitemap이 이 주소로 나오는지 봅니다. */
export const siteUrl = "https://example.test";
/** 테스트 전용 측정 ID입니다. 요청은 막으므로 어디로도 나가지 않습니다. */
export const measurementId = "G-E2ETEST00";

/** 산출물의 내용만 보는 테스트입니다. 브라우저마다 달라지지 않아 chromium에서만 돕니다. */
const contentOnly = "content.e2e.ts";
/** 측정 ID가 든 빌드에서만 도는 테스트입니다. `analytics` 프로젝트가 맡습니다. */
const analyticsOnly = "analytics.e2e.ts";

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${ports.site}` },
  // 빌드 둘을 차례로 짓고(동시에 지으면 Astro의 캐시 폴더를 두 빌드가 함께 쓴다) 한 프로세스가 둘 다 내립니다.
  webServer: {
    command: [
      `astro build --outDir .e2e-dist`,
      `PUBLIC_GA_MEASUREMENT_ID=${measurementId} astro build --outDir .e2e-dist-ga`,
      `node e2e/serve.mjs .e2e-dist:${ports.site} .e2e-dist-ga:${ports.analytics}`,
    ].join(" && "),
    env: { SITE_URL: siteUrl },
    url: `http://127.0.0.1:${ports.site}/robots.txt`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: [analyticsOnly] },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: [contentOnly, analyticsOnly],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: [contentOnly, analyticsOnly],
    },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: [contentOnly, analyticsOnly] },
    {
      name: "analytics",
      testMatch: analyticsOnly,
      use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${ports.analytics}` },
    },
    {
      name: "analytics-mobile",
      testMatch: analyticsOnly,
      use: { ...devices["Pixel 7"], baseURL: `http://127.0.0.1:${ports.analytics}` },
    },
  ],
});
