import { expect, test } from "@playwright/test";
import { box, narrow, wide } from "./layout.support";
import { routeSound, withoutSpeech } from "./trial-fakes.support";
import {
  correctTiles,
  expectStep,
  openTrial,
  pageData,
  passCuts,
  root,
  tap,
} from "./trial.support";

// 웹 체험판의 배치(TE7)와 랜딩 링크(TE8)입니다.

test.describe("TE7 390 · 1440 폭", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await withoutSpeech(page);
    await routeSound(page);
  });

  for (const viewport of [narrow, wide]) {
    test(`${viewport.width}px — 단계마다 가로 넘침 0 · 보이는 버튼이 화면 안`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openTrial(page);
      const { model } = await pageData(page);
      const problems: string[] = [];
      const measure = async (label: string) => {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        if (overflow > 0) problems.push(`${label}: 가로 넘침 ${overflow}px`);
        const buttons = page.getByTestId("trial").locator("button").filter({ visible: true });
        for (const button of await buttons.all()) {
          const rect = await box(button);
          if (rect.left < 0 || rect.right > viewport.width + 0.5) {
            const id = await button.getAttribute("data-testid");
            problems.push(`${label}: ${id} 가로 ${rect.left}~${rect.right}`);
          }
        }
        // 그 단계의 주 버튼은 스크롤해 닿으면 화면 안에 온전히 든다.
        const primary = page
          .getByTestId("trial")
          .locator(".trial-button")
          .filter({ visible: true })
          .last();
        if ((await primary.count()) > 0) {
          await primary.scrollIntoViewIfNeeded();
          const rect = await box(primary);
          if (rect.top < 0 || rect.bottom > viewport.height + 0.5) {
            problems.push(`${label}: 주 버튼 세로 ${rect.top}~${rect.bottom}`);
          }
        }
      };

      for (const cut of model.prologue) {
        await measure(`prologue ${cut.index}`);
        await tap(page, "trial-cuts-next");
      }
      await measure("vocab");
      await tap(page, "trial-vocab-next");
      await tap(page, "trial-option", model.imageMatch.answerIndex);
      await measure("image-match judged");
      await tap(page, "trial-choice-next");
      await tap(page, "trial-option", model.replySelect.answerIndex);
      await measure("reply-select judged");
      await tap(page, "trial-choice-next");
      await measure("culture");
      await tap(page, "trial-culture-flip");
      await measure("culture back");
      await tap(page, "trial-culture-next");
      for (const [index, turn] of model.roleplay.turns.entries()) {
        await measure(`turn ${index} ready`);
        const order = correctTiles(turn);
        for (const tile of order) await tap(page, "trial-tile", tile);
        await measure(`turn ${index} placed`);
        await tap(page, "trial-turn-check");
        await measure(`turn ${index} judged`);
        await tap(page, "trial-turn-next");
      }
      await measure("epilogue");
      await passCuts(page, "epilogue", model.epilogue.length);
      await expectStep(page, "clear");
      await expect(page.getByTestId("trial-step-clear")).toHaveAttribute("data-phase", "teaser");
      await measure("clear teaser");
      // 예고 글 · Next는 컷 장면처럼 아래에 모인다(그림이 위를 채움).
      const next = await box(page.getByTestId("trial-clear-next").filter({ visible: true }));
      const stage = await box(root(page));
      if (stage.bottom - next.bottom > 120) {
        problems.push(
          `clear teaser: Next가 무대 아래에서 ${Math.round(stage.bottom - next.bottom)}px 떠 있다`,
        );
      }
      await tap(page, "trial-clear-next");
      await measure("complete");
      expect(problems).toEqual([]);
    });
  }
});

test.describe("TE8 랜딩에서 체험판으로", () => {
  for (const [home, target] of [
    ["/", "/try/"],
    ["/ko/", "/ko/try/"],
  ] as const) {
    for (const id of ["hero-trial-link", "download-trial-link"]) {
      test(`${home} ${id} → ${target}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(home, { waitUntil: "load" });
        const link = page.getByTestId(id);
        await expect(link).toHaveAttribute("href", target);
        await link.scrollIntoViewIfNeeded();
        await link.click();
        await expect(page).toHaveURL(new RegExp(`${target.replace(/\//g, "\\/")}$`));
        await expect(root(page)).toHaveAttribute("data-step", "prologue");
        await expect(page.getByTestId("trial-cuts-next").filter({ visible: true })).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("lang", home === "/" ? "en" : "ko");
      });
    }
  }
});
