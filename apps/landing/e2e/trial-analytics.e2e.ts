import { expect, test, type Page } from "@playwright/test";
import {
  contentHost,
  correctTiles,
  openTrial,
  pageData,
  passEnding,
  playToRoleplay,
  shown,
  spoken,
  tap,
  tileTurn,
} from "./trial.support";
import { routePrereg, routeSound, say, withFakeSpeech, withoutSpeech } from "./trial-fakes.support";

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
/** 보낼 때 접점이 붙이는 공통 속성 — 데스크톱 Chrome은 desktop, Pixel 7 Chrome은 android-chrome. */
const browserOfProject = () =>
  test.info().project.name.endsWith("mobile") ? "android-chrome" : "desktop";
const withBrowser = (list: readonly GaEvent[]): GaEvent[] =>
  list.map((event) => ({ ...event, params: { ...event.params, browser: browserOfProject() } }));
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

  test("GT1 말하기 경로 — trial_start · step ×9 · roleplay_result · complete 차례", async ({
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
    await passEnding(page, model);
    const expected: GaEvent[] = [
      { name: "trial_start", params: { speech: "supported" } },
      step("prologue", "1"),
      step("vocab", "2"),
      step("image-match", "3"),
      step("reply-select", "4"),
      step("culture", "5"),
      step("roleplay", "6"),
      ...(["1", "2", "3"] as const).map((turn): GaEvent => ({
        name: "trial_speech_attempt",
        params: { turn, outcome: "strict", latency_bucket: "0-2s" },
      })),
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
      step("clear", "8"),
      step("complete", "9"),
      { name: "trial_complete", params: { verdict: "passed" } },
    ];
    await expect.poll(() => trialEvents(page)).toEqual(withBrowser(expected));
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
    await passEnding(page, model);
    await expect
      .poll(() => trialEvents(page))
      .toEqual(
        withBrowser([
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
          step("clear", "8"),
          step("complete", "9"),
          { name: "trial_complete", params: { verdict: "passed" } },
        ]),
      );
    for (const event of await events(page))
      expect(JSON.stringify(event.params)).not.toMatch(hangul);
  });

  test("GT1 첫 탭(컷 1 Next) 연타는 trial_start 하나 — 열기만 하면 0", async ({ page }) => {
    await withoutSpeech(page);
    await openTrial(page);
    await page.waitForTimeout(300);
    expect(await trialEvents(page)).toEqual([]);
    await page.getByTestId("trial-cuts-next").filter({ visible: true }).dblclick();
    await expect
      .poll(async () => (await trialEvents(page)).map((event) => event.name))
      .toEqual(["trial_start", "trial_step"]);
  });

  test("GT3 사전 등록 — trial_preregister{status}만 · 이메일 · @ 없음 · 스토어 이벤트 없음", async ({
    page,
  }) => {
    await withoutSpeech(page);
    await routePrereg(page, [201]);
    await openTrial(page);
    const { model } = await pageData(page);
    await playToRoleplay(page, model);
    for (const turn of model.roleplay.turns) {
      await tileTurn(page, correctTiles(turn));
      await tap(page, "trial-turn-next");
    }
    await passEnding(page, model);
    await expect(page.getByTestId("trial-store")).toHaveCount(0);
    await shown(page, "trial-prereg-email").fill("ga.check@example.com");
    await tap(page, "trial-prereg-submit");
    await expect(page.getByTestId("trial-prereg")).toHaveAttribute("data-state", "done");
    await expect
      .poll(async () => (await events(page)).filter((event) => event.name === "trial_preregister"))
      .toEqual(withBrowser([{ name: "trial_preregister", params: { status: "submitted" } }]));
    const all = JSON.stringify(await events(page));
    expect(all).not.toContain("@");
    expect(all).not.toContain("ga.check");
    expect(all).not.toContain("trial_store_click");
  });
});

test.describe("GT4 나가기 · 시도 — 측정 ID가 있는 빌드", () => {
  let seen: Watch;

  test.beforeEach(async ({ page }) => {
    seen = await watch(page);
  });

  test.afterEach(() => {
    expect(seen.errors).toEqual([]);
  });

  test("발음 기준으로만 맞은 시도는 outcome lenient · 나가기는 trial_exit{step} 하나(한글 · 들은 글 없음)", async ({
    page,
  }) => {
    await withFakeSpeech(page);
    await openTrial(page);
    const { model } = await pageData(page);
    await playToRoleplay(page, model);
    await say(page, { heard: ["안녕하세요 네 처음 이에요"] });
    await tap(page, "trial-turn-speak");
    await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
    await page.evaluate(() => {
      document.addEventListener("click", (event) => {
        if ((event.target as Element).closest('[data-testid="trial-exit"]')) event.preventDefault();
      });
    });
    await page.getByTestId("trial-exit").click();
    await expect
      .poll(async () =>
        (await events(page)).filter((event) =>
          ["trial_speech_attempt", "trial_exit"].includes(event.name),
        ),
      )
      .toEqual(
        withBrowser([
          {
            name: "trial_speech_attempt",
            params: { turn: "1", outcome: "lenient", latency_bucket: "0-2s" },
          },
          { name: "trial_exit", params: { step: "roleplay" } },
        ]),
      );
    const all = JSON.stringify(await events(page));
    expect(all).not.toMatch(hangul);
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
