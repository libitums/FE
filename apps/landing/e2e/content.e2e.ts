import { expect, test } from "@playwright/test";
import { siteUrl } from "../playwright.config";

// 산출물의 내용을 봅니다. 브라우저마다 달라지지 않으므로 chromium 프로젝트에서만 돕니다(playwright.config.ts).

const crawlers = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
];

test("robots.txt는 모든 수집기와 답변 엔진 수집기 여섯을 허용한다", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const body = await response.text();
  for (const agent of ["*", ...crawlers]) {
    expect(body).toContain(`User-agent: ${agent}\nAllow: /`);
  }
  expect(body).not.toContain("Disallow");
  expect(body).toContain(`Sitemap: ${siteUrl}/sitemap-index.xml`);
});

test("llms.txt는 영어로만 쓰고 FAQ 일곱을 담는다", async ({ request }) => {
  const body = await (await request.get("/llms.txt")).text();
  const lines = body.split("\n");
  expect(lines[0]).toBe("# Duru");
  expect(lines.filter((line) => line.startsWith("### "))).toHaveLength(7);
  expect(body).toContain(`(${siteUrl}/ko/): Korean`);
  expect(body).not.toMatch(/[ᄀ-ᇿ㄰-㆏가-힣]/);
});

test("llms.txt의 FAQ가 화면의 FAQ와 글자까지 같다", async ({ page, request }) => {
  await page.goto("/");
  const shown = await page.getByTestId("faq-item").evaluateAll((items) =>
    items.map((item) => ({
      question: item.querySelector('[data-testid="faq-question"]')?.textContent?.trim(),
      answer: item.querySelector('[data-testid="faq-answer"]')?.textContent?.trim(),
    })),
  );
  expect(shown).toHaveLength(7);
  const body = await (await request.get("/llms.txt")).text();
  for (const { question, answer } of shown) {
    expect(body).toContain(`### ${question}\n\n${answer}`);
  }
});

test("sitemap에는 언어별 홈 둘뿐이고 404는 없다", async ({ request }) => {
  const index = await (await request.get("/sitemap-index.xml")).text();
  expect(index).toContain(`${siteUrl}/sitemap-0.xml`);
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort();
  expect(locs).toEqual([`${siteUrl}/`, `${siteUrl}/ko/`]);
});

for (const [path, language, locale] of [
  ["/", "en", "en_US"],
  ["/ko/", "ko", "ko_KR"],
] as const) {
  test(`${path}의 head — 언어 · canonical · hreflang · 구조화 데이터`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", siteUrl + path);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", locale);
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(3);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(1);

    const graph = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
    )["@graph"] as { "@type": string; inLanguage?: string; mainEntity?: unknown[] }[];
    expect(graph.map((node) => node["@type"]).sort()).toEqual([
      "FAQPage",
      "SoftwareApplication",
      "WebSite",
    ]);
    expect(graph.find((node) => node["@type"] === "FAQPage")?.mainEntity).toHaveLength(7);
  });
}

test("히어로 첫 그림은 높은 우선순위로 가장 먼저 요청된다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  const scenes: { name: string; priority: string }[] = [];
  client.on("Network.requestWillBeSent", ({ request }) => {
    const name = /\/(scene-[a-z-]+)\./.exec(request.url)?.[1];
    if (name) scenes.push({ name, priority: request.initialPriority });
  });
  await page.goto("/", { waitUntil: "load" });
  expect(scenes[0]).toEqual({ name: "scene-plane", priority: "High" });
  // 좁은 화면에서는 세 패널이 겹쳐 있어 나머지도 요청되지만, 처음 우선순위는 첫 그림보다 낮아야 합니다.
  for (const scene of scenes.filter((entry) => entry.name !== "scene-plane")) {
    expect(scene.priority).not.toBe("High");
  }
});
