import { expect, test, type Page } from "@playwright/test";
import { ports, webToken } from "../playwright.config";

// 토큰이 든 빌드(analytics 프로젝트)에서 Airbridge Web SDK 결선을 봅니다. SDK 로더 요청은 빈 JS로 막고,
// window.airbridge는 호출 기록을 남기는 스텁으로 갈아 끼웁니다.

type Call = [string, unknown?];

interface Watch {
  external: string[];
  errors: string[];
}

const ALLOWED_HOSTS = ["www.googletagmanager.com", "static.airbridge.io"];

async function watch(page: Page): Promise<Watch> {
  const seen: Watch = { external: [], errors: [] };
  for (const pattern of ["https://www.googletagmanager.com/**", "https://static.airbridge.io/**"]) {
    await page.route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
    );
  }
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
  return seen;
}

function expectCleanHosts(seen: Watch) {
  expect(seen.errors).toEqual([]);
  for (const host of new Set(seen.external)) expect(ALLOWED_HOSTS).toContain(host);
}

/** 공식 스니펫이 덮어쓰든 비켜 가든 같은 스텁이 보이도록 getter로 심습니다. */
async function installStub(page: Page) {
  await page.addInitScript(() => {
    const calls: Call[] = [];
    const stub = {
      isSDKEnabled: true,
      calls,
      init(options: unknown) {
        calls.push(["init", options]);
      },
      startTracking() {
        calls.push(["startTracking"]);
      },
      openDeeplink(options: unknown) {
        calls.push(["openDeeplink", options]);
      },
    };
    Object.defineProperty(window, "airbridge", { get: () => stub, set() {}, configurable: true });
  });
}

const callsOf = (page: Page, name: string) =>
  page.evaluate(
    (target) =>
      (window as unknown as { airbridge: { calls: Call[] } }).airbridge.calls.filter(
        ([callName]) => callName === target,
      ),
    name,
  );

/** 스토어 링크 클릭을 기록한 뒤 막아 새 창 · 실제 이동이 일어나지 않게 합니다. */
async function installClickProbe(page: Page) {
  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      const link = (event.target as Element).closest<HTMLElement>("a[data-store]");
      if (!link) return;
      (window as unknown as { __probe: unknown }).__probe = {
        prevented: event.defaultPrevented,
        store: link.dataset.store,
      };
      event.preventDefault();
    });
  });
}

const probeOf = (page: Page) =>
  page.evaluate(() => (window as unknown as { __probe?: unknown }).__probe);

function dataLayerEvents(page: Page, name: string) {
  return page.evaluate((target) => {
    const layer = (window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [];
    return layer
      .map((entry) => Array.from(entry))
      .filter((entry) => entry[0] === "event" && entry[1] === target)
      .map((entry) => entry[2]);
  }, name);
}

const androidCard = (page: Page) => page.locator('a[data-testid="store"][data-store="android"]');

const initOptions = {
  app: "duru",
  webToken,
  utmParsing: true,
  defaultChannel: "k-duru.com",
  autoStartTrackingEnabled: false,
};

test.describe("AB-E1 스텁 SDK", () => {
  let seen: Watch;

  test.beforeEach(async ({ page }) => {
    seen = await watch(page);
    await installStub(page);
  });

  test.afterEach(() => expectCleanHosts(seen));

  for (const path of ["/", "/ko/"]) {
    test(`init 한 번 · Android 카드 클릭은 openDeeplink로 가고 이동하지 않는다 (${path})`, async ({
      page,
      baseURL,
    }) => {
      await page.goto(path, { waitUntil: "load" });
      await expect.poll(() => callsOf(page, "init")).toEqual([["init", initOptions]]);
      await installClickProbe(page);
      const before = page.url();
      const pageCount = page.context().pages().length;

      await androidCard(page).click();

      const home = `${new URL(baseURL ?? "").origin}${path}`;
      await expect
        .poll(() => callsOf(page, "openDeeplink"))
        .toEqual([
          [
            "openDeeplink",
            {
              type: "click",
              deeplinks: { android: "duru://journey", ios: "duru://journey", desktop: home },
              fallbacks: { android: "google-play", ios: home },
            },
          ],
        ]);
      expect(await probeOf(page)).toEqual({ prevented: true, store: "android" });
      expect(page.url()).toBe(before);
      expect(page.context().pages()).toHaveLength(pageCount);
      expect(await dataLayerEvents(page, "download_click")).toEqual([{ store: "android" }]);
    });
  }
});

test.describe("AB-E2 시간대 Asia/Seoul", () => {
  test.use({ timezoneId: "Asia/Seoul" });

  test("startTracking을 한 번 부른다", async ({ page }) => {
    const seen = await watch(page);
    await installStub(page);
    await page.goto("/", { waitUntil: "load" });
    await expect.poll(() => callsOf(page, "startTracking")).toEqual([["startTracking"]]);
    expectCleanHosts(seen);
  });
});

test.describe("AB-E2 시간대 Europe/Paris", () => {
  test.use({ timezoneId: "Europe/Paris" });

  test("startTracking을 부르지 않고 init은 부른다", async ({ page }) => {
    const seen = await watch(page);
    await installStub(page);
    await page.goto("/", { waitUntil: "load" });
    await expect.poll(() => callsOf(page, "init")).toEqual([["init", initOptions]]);
    // 「부르지 않는다」는 단언이라 load 뒤 한 틱을 더 보낸 다음 확인합니다.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(true))));
    expect(await callsOf(page, "startTracking")).toEqual([]);
    expectCleanHosts(seen);
  });
});

test("AB-E3 SDK가 비어 있으면 기본 이동을 그대로 두고 GA 이벤트는 간다", async ({ page }) => {
  const seen = await watch(page);
  await page.goto("/", { waitUntil: "load" });
  // 로더가 심은 자리표시자는 isSDKEnabled가 false입니다.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { airbridge?: { isSDKEnabled?: boolean } }).airbridge?.isSDKEnabled,
      ),
    )
    .toBe(false);
  await installClickProbe(page);
  await androidCard(page).click();
  expect(await probeOf(page)).toEqual({ prevented: false, store: "android" });
  await expect.poll(() => dataLayerEvents(page, "download_click")).toEqual([{ store: "android" }]);
  expectCleanHosts(seen);
});

test("AB-E4 토큰이 없는 빌드는 Airbridge를 싣지 않는다", async ({ page }) => {
  const seen = await watch(page);
  await page.goto(`http://127.0.0.1:${ports.site}/`, { waitUntil: "load" });
  expect(
    await page.evaluate(() => typeof (window as unknown as { airbridge?: unknown }).airbridge),
  ).toBe("undefined");
  await installClickProbe(page);
  await androidCard(page).click();
  expect(await probeOf(page)).toEqual({ prevented: false, store: "android" });
  expect(seen.external).toEqual([]);
  expect(seen.errors).toEqual([]);
});
