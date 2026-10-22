import { expect, test, type Page } from "@playwright/test";
import {
  contentHost,
  correctTiles,
  expectStep,
  openTrial,
  pageData,
  passCuts,
  playToRoleplay,
  shown,
  spoken,
  tap,
  tileTurn,
} from "./trial.support";
import { routeSound, say, withFakeSpeech, withoutSpeech } from "./trial-fakes.support";

// 측정 ID가 든 빌드(analytics 프로젝트)에서 체험판 이벤트의 dataLayer를 봅니다(GT1 ~ GT3).
// googletagmanager 요청은 빈 JS로 막고, 음성 버킷은 무음 소리로 답합니다.

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
  if (!test.info().project.name.endsWith("mobile")) {
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await routeSound(page);
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

const trialEvents = async (page: Page) =>
  (await events(page)).filter((event) => event.name.startsWith("trial_"));
const step = (name: string, ordinal: string): GaEvent => ({
  name: "trial_step",
  params: { step: name, ordinal },
});
const hangul = /[ᄀ-ᇿ㄰-㆏가-힯]/;

test.describe("체험판 — 측정 ID가 있는 빌드", () => {
  let seen: Watch;

  test.beforeEach(async ({ page }) => {
    seen = await watch(page);
  });

  test.afterEach(() => {
    expect(seen.errors).toEqual([]);
    // 밖으로 가는 요청은 gtag(막음)와 음성 버킷(가로챔)뿐이다.
    expect(seen.external).toContain("www.googletagmanager.com");
    expect(
      seen.external.filter((host) => host !== "www.googletagmanager.com" && host !== contentHost),
    ).toEqual([]);
  });

  test("GT1 말하기 경로 — trial_start · step ×8 · roleplay_result · complete 차례", async ({
    page,
  }) => {
    await withFakeSpeech(page);
    await openTrial(page);
    const { model } = await pageData(page);
    expect(await trialEvents(page)).toEqual([]);
    await playToRoleplay(page, model);
    for (const turn of model.roleplay.turns) {
      await say(page, { heard: [spoken(turn)] });
      await tap(page, "trial-turn-speak");
      await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
      await tap(page, "trial-turn-next");
    }
    await passCuts(page, "epilogue", model.epilogue.length);
    await expectStep(page, "complete");
    const expected: GaEvent[] = [
      { name: "trial_start", params: { speech: "supported" } },
      step("prologue", "1"),
      step("vocab", "2"),
      step("image-match", "3"),
      step("reply-select", "4"),
      step("culture", "5"),
      step("roleplay", "6"),
      {
        name: "trial_roleplay_result",
        params: {
          verdict: "passed",
          correct: "3",
          by_speech: "3",
          by_tiles: "0",
          speech: "supported",
        },
      },
      step("epilogue", "7"),
      step("complete", "8"),
      { name: "trial_complete", params: { verdict: "passed" } },
    ];
    await expect.poll(() => trialEvents(page)).toEqual(expected);
    const all = await events(page);
    expect(all.map((event) => event.name).filter((name) => !name.startsWith("trial_"))).toEqual([]);
    for (const event of all) expect(JSON.stringify(event.params)).not.toMatch(hangul);
  });

  test("GT1 타일 경로(말하기 없음) — speech unsupported · by_tiles 3", async ({ page }) => {
    await withoutSpeech(page);
    await openTrial(page);
    const { model } = await pageData(page);
    await playToRoleplay(page, model);
    for (const turn of model.roleplay.turns) {
      await tileTurn(page, correctTiles(turn));
      await tap(page, "trial-turn-next");
    }
    await passCuts(page, "epilogue", model.epilogue.length);
    await expectStep(page, "complete");
    await expect
      .poll(() => trialEvents(page))
      .toEqual([
        { name: "trial_start", params: { speech: "unsupported" } },
        step("prologue", "1"),
        step("vocab", "2"),
        step("image-match", "3"),
        step("reply-select", "4"),
        step("culture", "5"),
        step("roleplay", "6"),
        {
          name: "trial_roleplay_result",
          params: {
            verdict: "passed",
            correct: "3",
            by_speech: "0",
            by_tiles: "3",
            speech: "unsupported",
          },
        },
        step("epilogue", "7"),
        step("complete", "8"),
        { name: "trial_complete", params: { verdict: "passed" } },
      ]);
    for (const event of await events(page))
      expect(JSON.stringify(event.params)).not.toMatch(hangul);
  });

  test("GT1 Start 연타는 trial_start 하나", async ({ page }) => {
    await withoutSpeech(page);
    await openTrial(page);
    await page.getByTestId("trial-start-button").dblclick();
    await expect
      .poll(async () => (await trialEvents(page)).map((event) => event.name))
      .toEqual(["trial_start", "trial_step"]);
  });

  test("GT3 스토어 주소가 없는 빌드 — 완료 화면에 스토어 링크가 없고 눌러도 이벤트 0", async ({
    page,
  }) => {
    await withoutSpeech(page);
    await openTrial(page);
    const { model } = await pageData(page);
    await playToRoleplay(page, model);
    for (const turn of model.roleplay.turns) {
      await tileTurn(page, correctTiles(turn));
      await tap(page, "trial-turn-next");
    }
    await passCuts(page, "epilogue", model.epilogue.length);
    await expectStep(page, "complete");
    const stores = shown(page, "trial-store");
    await expect(stores).toHaveCount(2);
    await expect(page.locator("a[data-trial-store]")).toHaveCount(0);
    for (const store of await stores.all()) await store.click();
    // 늦게 오는 이벤트가 없음을 확인할 기준점 — 클릭 뒤 한 프레임 넘긴다.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    const names = (await events(page)).map((event) => event.name);
    expect(
      names.filter((name) => name === "trial_store_click" || name === "download_click"),
    ).toEqual([]);
  });
});

test.describe("GT2 랜딩의 체험판 링크 — 측정 ID가 있는 빌드", () => {
  let seen: Watch;

  test.beforeEach(async ({ page }) => {
    seen = await watch(page);
  });

  test.afterEach(() => {
    expect(seen.errors).toEqual([]);
    expect(new Set(seen.external)).toEqual(new Set(["www.googletagmanager.com"]));
  });

  for (const [id, location] of [
    ["hero-trial-link", "hero"],
    ["download-trial-link", "download"],
  ] as const) {
    test(`${id} → trial_link_click{location: ${location}} 한 번`, async ({ page }) => {
      await page.goto("/", { waitUntil: "load" });
      await page.evaluate(() => {
        document.addEventListener("click", (event) => {
          if ((event.target as Element).closest("a[data-trial-link]")) event.preventDefault();
        });
      });
      const link = page.getByTestId(id);
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await expect
        .poll(async () => (await events(page)).filter((event) => event.name === "trial_link_click"))
        .toEqual([{ name: "trial_link_click", params: { location } }]);
      const others = (await events(page))
        .map((event) => event.name)
        .filter((name) => !["trial_link_click", "section_view"].includes(name));
      expect(others).toEqual([]);
    });
  }
});
