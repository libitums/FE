import { expect, test, type Locator, type Page } from "@playwright/test";
import { routeSound, say, withFakeSpeech } from "./trial-fakes.support";
import {
  correctTiles,
  openTrial,
  pageData,
  playToRoleplay,
  root,
  shown,
  spoken,
  tap,
  turnShown,
} from "./trial.support";

// 짧은 뷰포트(1280×720의 200% 확대 = 640×360, 가로 폰 · 큰 글자 = 390×422)에서 조작이 잘리지 않는지 봅니다.
// 프로그램 스크롤(scrollIntoView · Playwright 자동 스크롤)은 overflow:hidden 안도 움직이므로 쓰지 않습니다 —
// 사용자가 하듯 휠로만 굴리고, 그 조작의 여러 점에 elementFromPoint가 그 조작 자신을 맞히는지 봅니다.

const SHORT_VIEWPORTS = [
  { width: 640, height: 360, label: "640×360(1280×720 · 200%)" },
  { width: 390, height: 422, label: "390×422(가로 폰 · 큰 글자)" },
] as const;

/** 모든 스크롤 위치를 처음으로 되돌립니다(앞 단계의 자동 스크롤을 지움). */
const resetScroll = (page: Page) =>
  page.evaluate(() => {
    for (const element of document.querySelectorAll<HTMLElement>("*")) {
      if (element.scrollTop !== 0) element.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });

interface Reach {
  inside: boolean;
  hits: boolean;
  rect: { left: number; top: number; right: number; bottom: number };
  missed: string[];
}

/** 조작이 화면 안에 온전히 있고, 안쪽 다섯 점(가운데 · 1/4 · 3/4)이 모두 그 조작을 맞히는가. */
const reachOf = (target: Locator) =>
  target.evaluate((node): Reach => {
    const { left, top, right, bottom, width, height } = node.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const inside = width > 0 && height > 0 && left >= 0 && top >= 0 && right <= vw && bottom <= vh;
    const points: [number, number][] = [
      [left + width / 2, top + height / 2],
      [left + width * 0.25, top + height * 0.25],
      [left + width * 0.75, top + height * 0.25],
      [left + width * 0.25, top + height * 0.75],
      [left + width * 0.75, top + height * 0.75],
    ];
    const missed: string[] = [];
    for (const [x, y] of points) {
      const hit = document.elementFromPoint(x, y);
      if (hit === null || !(hit === node || node.contains(hit))) {
        const name = hit === null ? "none" : (hit.getAttribute("data-testid") ?? hit.className);
        missed.push(`(${Math.round(x)},${Math.round(y)})→${String(name)}`);
      }
    }
    return { inside, hits: missed.length === 0, rect: { left, top, right, bottom }, missed };
  });

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

/** 휠로만 굴려 그 조작에 닿는지 — 닿으면 null, 아니면 문제 글. */
async function reachByWheel(page: Page, target: Locator, label: string): Promise<string | null> {
  await expect(target, `${label}: 보이는 조작 하나`).toHaveCount(1);
  await resetScroll(page);
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  let reach = await reachOf(target);
  for (let step = 0; step < 16 && !(reach.inside && reach.hits); step += 1) {
    const cx = (reach.rect.left + reach.rect.right) / 2;
    const cy = (reach.rect.top + reach.rect.bottom) / 2;
    // 조작 쪽과 화면 가운데를 번갈아 가리키며 굴린다(어느 쪽이 스크롤 영역이든 닿게).
    const [x, y] =
      step % 2 === 0
        ? [clamp(cx, 4, viewport.width - 4), clamp(cy, 4, viewport.height - 4)]
        : [viewport.width / 2, viewport.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, cy > viewport.height / 2 ? 120 : -120);
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    reach = await reachOf(target);
  }
  if (reach.inside && reach.hits) return null;
  const r = reach.rect;
  return `${label}: 휠로 닿지 않음 — 세로 ${Math.round(r.top)}~${Math.round(r.bottom)} / 화면 ${viewport.height}${
    reach.missed.length > 0 ? ` · 가림 ${reach.missed.join(" ")}` : ""
  }`;
}

test.describe("C2 짧은 뷰포트 — 조작이 잘리지 않고 휠로 닿는다", () => {
  test.skip(
    () => test.info().project.name === "mobile",
    "뷰포트를 직접 정하고 휠로 굴립니다 — 데스크톱 엔진 셋에서 봅니다.",
  );

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await withFakeSpeech(page);
    await routeSound(page);
  });

  for (const viewport of SHORT_VIEWPORTS) {
    test(`${viewport.label} — Next · Speak · Show hint · Can't speak now · Continue · Check`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openTrial(page);
      const { model } = await pageData(page);
      const [first, second] = model.roleplay.turns;
      if (!first || !second) throw new Error("턴이 둘 이상이어야 한다");
      const problems: string[] = [];
      const check = async (id: string, label: string) => {
        const problem = await reachByWheel(page, shown(page, id), label);
        if (problem !== null) problems.push(problem);
      };

      await tap(page, "trial-start-button");
      await expect(root(page)).toHaveAttribute("data-step", "prologue");
      await check("trial-cuts-next", "컷 1 Next");
      await resetScroll(page);

      await page.goto("/try/", { waitUntil: "load" });
      await expect(root(page)).toHaveAttribute("data-step", "start");
      await playToRoleplay(page, model);
      await check("trial-turn-speak", "턴 1 Speak");
      await check("trial-turn-hint-button", "턴 1 Show hint");
      await check("trial-turn-cant-speak", "턴 1 Can't speak now");

      await say(page, { heard: [spoken(first)] });
      await tap(page, "trial-turn-speak");
      await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
      await check("trial-turn-next", "턴 1 Continue(말하기 정답 뒤)");

      await tap(page, "trial-turn-next");
      await expect(turnShown(page)).toHaveAttribute("data-turn-index", "1");
      await tap(page, "trial-turn-cant-speak");
      await expect(turnShown(page)).toHaveAttribute("data-mode", "tiles");
      for (const index of correctTiles(second)) await tap(page, "trial-tile", index);
      await check("trial-turn-check", "턴 2 Check");
      await tap(page, "trial-turn-check");
      await check("trial-turn-next", "턴 2 Continue(타일 판정 뒤)");

      expect(problems).toEqual([]);
    });
  }
});
