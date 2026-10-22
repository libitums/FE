import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { routeSound, say, withFakeSpeech } from "./trial-fakes.support";
import {
  correctTiles,
  expectStep,
  openTrial,
  pageData,
  passCuts,
  root,
  shown,
  spoken,
  tap,
  tileTurn,
  turnShown,
} from "./trial.support";

// 웹 체험판의 키보드 조작(TE4)과 axe 자동 검사(TE5)입니다.

/** 탭으로 그 요소에 닿을 때까지 초점을 옮깁니다. WebKit은 Option+Tab이어야 버튼에 닿습니다. */
async function tabTo(page: Page, id: string, browserName: string, index?: number) {
  const target =
    index === undefined
      ? shown(page, id)
      : shown(page, id).and(
          page.locator(`[data-option-index="${index}"], [data-tile-index="${index}"]`),
        );
  await expect(target).toHaveCount(1);
  // 대상이 지금 초점보다 앞이면 뒤로 돈다(Firefox는 끝에서 브라우저 창으로 나가 돌아오지 않는다).
  const before = await target.evaluate((node) => {
    const active = document.activeElement;
    return active !== null && active !== document.body
      ? Boolean(node.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING)
      : false;
  });
  const tab = before ? "Shift+Tab" : "Tab";
  const key = browserName === "webkit" ? `Alt+${tab}` : tab;
  const trail: string[] = [];
  for (let step = 0; step < 40; step += 1) {
    if (await target.evaluate((node) => node === document.activeElement)) return;
    trail.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        return active?.getAttribute("data-testid") ?? active?.tagName.toLowerCase() ?? "none";
      }),
    );
    await page.keyboard.press(key);
  }
  throw new Error(`탭으로 ${id}에 닿지 못함 — 지나간 초점: ${trail.join(" > ")}`);
}

/** 초점이 body로 빠지지 않고 그 대상에 있다. */
async function expectFocusedOn(page: Page, target: Locator, label: string) {
  await expect(target, label).toHaveCount(1);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const active = document.activeElement;
          if (active === null || active === document.body) return "body";
          return active.getAttribute("data-testid") ?? active.tagName.toLowerCase();
        }),
      { message: `${label}: 초점이 body로 빠지지 않는다` },
    )
    .not.toBe("body");
  await expect(target, `${label}: 초점 대상`).toBeFocused();
}

async function expectHeadingFocused(page: Page, step: string) {
  await expect(root(page)).toHaveAttribute("data-step", step);
  await expect(page.getByTestId(`trial-step-${step}`).locator("[data-step-heading]")).toBeFocused();
}

test.describe("TE4 키보드만으로", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await withFakeSpeech(page);
    await routeSound(page);
  });

  test("Tab · Enter · Space로 완료까지, 단계가 바뀔 때마다 초점은 제목 · 롤플레이 안에서는 초점이 다음 조작으로", async ({
    page,
    browserName,
  }) => {
    await openTrial(page);
    const { model } = await pageData(page);
    let toggle = 0;
    const press = async (id: string, index?: number) => {
      await tabTo(page, id, browserName, index);
      toggle += 1;
      await page.keyboard.press(toggle % 2 === 0 ? "Space" : "Enter");
    };

    await press("trial-start-button");
    await expectHeadingFocused(page, "prologue");
    for (let cut = 0; cut < model.prologue.length; cut += 1) {
      await press("trial-cuts-next");
      if (cut < model.prologue.length - 1)
        await expect(shown(page, "trial-cuts-next")).toBeFocused();
    }
    await expectHeadingFocused(page, "vocab");
    await press("trial-vocab-next");
    await expectHeadingFocused(page, "image-match");
    await press("trial-option", model.imageMatch.answerIndex);
    await expect(shown(page, "trial-choice-next")).toBeVisible();
    await press("trial-choice-next");
    await expectHeadingFocused(page, "reply-select");
    await press("trial-option", model.replySelect.answerIndex);
    await press("trial-choice-next");
    await expectHeadingFocused(page, "culture");
    await press("trial-culture-flip");
    await expect(page.getByTestId("trial-culture-card")).toHaveAttribute("data-face", "back");
    await press("trial-culture-next");
    await expectHeadingFocused(page, "roleplay");

    // 롤플레이 안에서는 다시 Tab으로 찾아가지 않는다 — 누른 뒤 초점이 기대 대상에 있어야 하고, 그 자리에서 다음 키를 누른다.
    const [first, second, third] = model.roleplay.turns;
    if (!first || !second || !third) throw new Error("턴이 셋이어야 한다");
    const pressHere = async (target: Locator, label: string) => {
      await expectFocusedOn(page, target, label);
      toggle += 1;
      await page.keyboard.press(toggle % 2 === 0 ? "Space" : "Enter");
    };
    const turn = () => turnShown(page);
    const firstTile = () => turn().locator('[data-testid="trial-tile"][data-tile-index="0"]');

    // 턴 1 — Show hint → 힌트 글, 오답 → Try again, Try again → Speak, 정답 → Continue.
    await press("trial-turn-hint-button");
    await expect(shown(page, "trial-turn-hint")).toBeVisible();
    await expectFocusedOn(page, shown(page, "trial-turn-hint"), "Show hint 뒤");
    await tabTo(page, "trial-turn-speak", browserName);
    await say(page, { heard: ["바나나"] });
    await pressHere(shown(page, "trial-turn-speak"), "Speak 앞");
    await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "incorrect");
    await pressHere(shown(page, "trial-turn-retry"), "Speak 오답 뒤");
    await expect(turn()).toHaveAttribute("data-phase", "ready");
    await say(page, { heard: [spoken(first)] });
    await pressHere(shown(page, "trial-turn-speak"), "Try again 뒤");
    await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
    await pressHere(shown(page, "trial-turn-next"), "Speak 정답 뒤");

    // 턴 2 — Continue → 새 턴 진행 글, Can't speak now → 첫 타일, Check → Continue.
    await expect(turn()).toHaveAttribute("data-turn-index", "1");
    await expectFocusedOn(page, shown(page, "trial-turn-progress"), "턴 2로 Continue 뒤");
    await press("trial-turn-cant-speak");
    await expect(turn()).toHaveAttribute("data-mode", "tiles");
    await expectFocusedOn(page, firstTile(), "Can't speak now 뒤");
    for (const index of correctTiles(second)) await press("trial-tile", index);
    await press("trial-turn-check");
    await pressHere(shown(page, "trial-turn-next"), "Check 뒤");

    // 턴 3 — 마이크 거부 → 첫 타일, Check → Continue → 엔딩 제목.
    await expect(turn()).toHaveAttribute("data-turn-index", "2");
    await expectFocusedOn(page, shown(page, "trial-turn-progress"), "턴 3으로 Continue 뒤");
    await tabTo(page, "trial-turn-speak", browserName);
    await say(page, { error: "not-allowed" });
    await pressHere(shown(page, "trial-turn-speak"), "Speak 앞(거부)");
    await expect(turn()).toHaveAttribute("data-mode", "tiles");
    await expectFocusedOn(page, firstTile(), "마이크 거부 뒤");
    for (const index of correctTiles(third)) await press("trial-tile", index);
    await press("trial-turn-check");
    await pressHere(shown(page, "trial-turn-next"), "턴 3 Check 뒤");
    await expectHeadingFocused(page, "epilogue");
    for (let cut = 0; cut < model.epilogue.length; cut += 1) await press("trial-cuts-next");
    await expectHeadingFocused(page, "complete");
    await expect(page.getByTestId("trial-step-complete")).toHaveAttribute("data-result", "passed");
  });
});

test.describe("TE5 axe — 단계마다 위반 0", () => {
  test.skip(
    () => test.info().project.name !== "chromium",
    "명도 대비는 엔진과 무관한 값이라 chromium 한 번으로 봅니다.",
  );

  async function audit(page: Page, label: string) {
    const tags = ["wcag2a", "wcag2aa", "wcag21aa"];
    const format = (result: Awaited<ReturnType<AxeBuilder["analyze"]>>) =>
      result.violations.map(
        (violation) =>
          `${label} ${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`,
      );
    // 대비 외 규칙은 전부, 대비는 승인 예외(흰 라벨의 주 버튼 · 놓인 타일 — ADR-0025 · design v1.1)만 빼고 봅니다.
    const rest = await new AxeBuilder({ page })
      .withTags(tags)
      .disableRules(["color-contrast"])
      .analyze();
    const contrast = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .exclude('.trial-button:not([aria-disabled="true"])')
      .exclude('.trial-tile[aria-pressed="true"]')
      .analyze();
    return [...format(rest), ...format(contrast)];
  }

  for (const path of ["/try/", "/ko/try/"]) {
    test(`${path} 시작 ~ 완료`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await withFakeSpeech(page);
      await routeSound(page);
      await openTrial(page, path);
      const { model } = await pageData(page);
      const found: string[] = [];
      const check = async (label: string) => found.push(...(await audit(page, label)));

      await check("start");
      await tap(page, "trial-start-button");
      for (const cut of model.prologue) {
        await check(`prologue ${cut.index}`);
        await tap(page, "trial-cuts-next");
      }
      await check("vocab");
      await tap(page, "trial-vocab-next");
      await check("image-match");
      await tap(page, "trial-option", model.imageMatch.answerIndex === 0 ? 1 : 0);
      await check("image-match judged wrong");
      await tap(page, "trial-choice-next");
      await tap(page, "trial-option", model.replySelect.answerIndex);
      await check("reply-select judged");
      await tap(page, "trial-choice-next");
      await check("culture front");
      await tap(page, "trial-culture-flip");
      await check("culture back");
      await tap(page, "trial-culture-next");

      const [first, second, ...rest] = model.roleplay.turns;
      if (!first || !second) throw new Error("턴이 둘 이상이어야 한다");
      await check("roleplay speech ready");
      await tap(page, "trial-turn-hint-button");
      await check("roleplay hint");
      await say(page, { heard: ["바나나"] });
      await tap(page, "trial-turn-speak");
      await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "incorrect");
      await check("roleplay speech wrong");
      await tap(page, "trial-turn-retry");
      await say(page, { heard: [spoken(first)] });
      await tap(page, "trial-turn-speak");
      await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
      await check("roleplay speech correct");
      await tap(page, "trial-turn-next");
      await say(page, { error: "not-allowed" });
      await tap(page, "trial-turn-speak");
      await expect(turnShown(page)).toHaveAttribute("data-mode", "tiles");
      const [head, ...tail] = correctTiles(second);
      await tap(page, "trial-tile", head);
      await check("roleplay tiles one placed (denied)");
      for (const index of tail) await tap(page, "trial-tile", index);
      await tap(page, "trial-turn-check");
      await check("roleplay tiles judged");
      await tap(page, "trial-turn-next");
      for (const turn of rest) {
        await tileTurn(page, correctTiles(turn));
        await tap(page, "trial-turn-next");
      }
      await check("epilogue");
      await passCuts(page, "epilogue", model.epilogue.length);
      await expectStep(page, "complete");
      await check("complete");
      expect(found).toEqual([]);
    });
  }
});
