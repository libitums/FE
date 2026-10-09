import { expect, test, type Page } from "@playwright/test";
import { ports } from "../playwright.config";

// 측정 ID가 든 빌드(analytics 프로젝트)의 dataLayer를 봅니다. googletagmanager 요청은 빈 JS로 막습니다.

interface GaEvent {
  name: string;
  params: Record<string, string>;
}

interface Watch {
  external: string[];
  errors: string[];
}

async function watch(page: Page): Promise<Watch> {
  const seen: Watch = { external: [], errors: [] };
  await page.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.hostname !== "127.0.0.1") {
      seen.external.push(url.hostname);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") seen.errors.push(message.text());
  });
  page.on("pageerror", (error) => seen.errors.push(error.message));
  // 데스크톱 프로젝트는 1440 폭, 모바일 프로젝트는 기기 프로필의 폭 그대로입니다.
  if (!test.info().project.name.endsWith("mobile")) {
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  return seen;
}

function events(page: Page): Promise<GaEvent[]> {
  return page.evaluate(() => {
    const layer = (window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [];
    return layer
      .map((entry) => Array.from(entry))
      .filter((entry) => entry[0] === "event")
      .map(([, name, params]) => ({ name, params }) as GaEvent);
  });
}

const named = (list: GaEvent[], name: string) => list.filter((event) => event.name === name);

async function otherNames(page: Page, ...allowed: string[]) {
  const names = (await events(page)).map((event) => event.name);
  return names.filter((name) => !allowed.includes(name));
}

test.describe("측정 ID가 있는 빌드", () => {
  let seen: Watch;

  test.beforeEach(async ({ page }) => {
    seen = await watch(page);
  });

  test.afterEach(() => {
    expect(seen.errors).toEqual([]);
    expect(seen.external.length).toBeGreaterThanOrEqual(1);
    expect(new Set(seen.external)).toEqual(new Set(["www.googletagmanager.com"]));
  });

  test("GA-E1 받기 버튼은 cta_click header를 한 번 보낸다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.getByTestId("header-cta").click();
    await expect
      .poll(async () => named(await events(page), "cta_click"))
      .toEqual([{ name: "cta_click", params: { location: "header" } }]);
    expect(await otherNames(page, "cta_click", "section_view")).toEqual([]);
  });

  test("GA-E2 언어 메뉴 링크는 language_switch를 한 번 보낸다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.locator("#site-header details summary").click();
    await page.evaluate(() => {
      document.addEventListener("click", (event) => {
        if ((event.target as Element).closest("a[hreflang]")) event.preventDefault();
      });
    });
    await page.locator('a[hreflang="ko"]').click();
    await expect
      .poll(async () => named(await events(page), "language_switch"))
      .toEqual([{ name: "language_switch", params: { to: "ko" } }]);
    expect(page.url().endsWith("/")).toBe(true);
    expect(await otherNames(page, "language_switch", "section_view")).toEqual([]);
  });

  test("GA-E3 FAQ는 열 때만 faq_open을 보낸다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const items = page.getByTestId("faq-item");
    const faq = async () => named(await events(page), "faq_open");

    await items.nth(0).locator("summary").click();
    await expect.poll(faq).toEqual([{ name: "faq_open", params: { question: "what" } }]);

    await items.nth(0).locator("summary").click();
    await expect(items.nth(0)).not.toHaveAttribute("open", "");
    expect(await faq()).toHaveLength(1);

    await items.nth(1).locator("summary").click();
    await expect.poll(faq).toEqual([
      { name: "faq_open", params: { question: "what" } },
      { name: "faq_open", params: { question: "who" } },
    ]);
    expect(await otherNames(page, "faq_open", "section_view")).toEqual([]);
  });

  test("GA-E4 section_view는 섹션마다 처음 보일 때 한 번만 보낸다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const sections = async () =>
      named(await events(page), "section_view").map((event) => event.params);
    const count = async (section: string) =>
      (await sections()).filter((params) => params.section === section).length;

    await expect.poll(() => count("top")).toBe(1);

    for (const id of ["faq", "download", "faq"]) {
      await page.evaluate((target) => {
        document.getElementById(target)?.scrollIntoView({ behavior: "instant" });
      }, id);
      await expect.poll(() => count(id)).toBe(1);
    }
    expect(await count("top")).toBe(1);
    expect(await count("faq")).toBe(1);
    expect(await count("download")).toBe(1);
    for (const params of await sections()) expect(Object.keys(params)).toEqual(["section"]);
  });

  test("GA-E7 화면보다 훨씬 긴 Features 섹션도 지나가면 section_view를 보낸다", async ({
    page,
  }) => {
    // 좁은 화면에서는 네 묶음이 세로로 쌓여 섹션이 화면의 4~6배, 넓은 화면의 연출은 340vh입니다.
    // 둘 다 「30% 이상 보임」을 영원히 못 채우므로 긴 섹션은 화면을 채우는 쪽으로 임계값을 낮춥니다.
    await page.emulateMedia({ reducedMotion: null });
    await page.goto("/", { waitUntil: "load" });
    const count = async () =>
      named(await events(page), "section_view").filter((event) => event.params.section === "ways")
        .length;
    expect(await count()).toBe(0);
    const total = await page.evaluate(() => document.body.scrollHeight);
    for (let top = 0; top <= total; top += 200) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
      await page.waitForTimeout(20);
    }
    await expect.poll(count).toBe(1);
    const ratio = await page.evaluate(
      () => (document.getElementById("ways")?.offsetHeight ?? 0) / window.innerHeight,
    );
    expect(ratio).toBeGreaterThanOrEqual(3.3);
  });

  test("GA-E5 data-store 링크는 download_click만 보낸다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(() => {
      const link = document.createElement("a");
      link.dataset.store = "android";
      link.href = "#download";
      link.id = "ga-store-probe";
      link.textContent = "x";
      document.querySelector("main")?.append(link);
    });
    await page.locator("#ga-store-probe").evaluate((link) => (link as HTMLElement).click());
    await expect
      .poll(async () => named(await events(page), "download_click"))
      .toEqual([{ name: "download_click", params: { store: "android" } }]);
    expect(named(await events(page), "cta_click")).toEqual([]);
    expect(await otherNames(page, "download_click", "section_view")).toEqual([]);
  });
});

test("GA-E6 측정 ID가 없는 빌드는 dataLayer를 만들지 않고 오류도 내지 않는다", async ({ page }) => {
  const seen = await watch(page);
  const probe = () =>
    page.evaluate(() => ({
      layer: typeof (window as unknown as { dataLayer?: unknown }).dataLayer,
      gtag: typeof (window as unknown as { gtag?: unknown }).gtag,
    }));
  await page.goto(`http://127.0.0.1:${ports.site}/`, { waitUntil: "load" });
  expect(await probe()).toEqual({ layer: "undefined", gtag: "undefined" });

  await page.getByTestId("header-cta").click();
  const items = page.getByTestId("faq-item");
  await items.nth(0).locator("summary").click();
  await expect(items.nth(0)).toHaveAttribute("open", "");
  for (const id of ["faq", "download"]) {
    await page.evaluate((target) => {
      document.getElementById(target)?.scrollIntoView({ behavior: "instant" });
    }, id);
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }

  expect(await probe()).toEqual({ layer: "undefined", gtag: "undefined" });
  expect(seen.external).toEqual([]);
  expect(seen.errors).toEqual([]);
});
