import { expect, test, type Page } from "@playwright/test";
import {
  routeSound,
  say,
  speechStarts,
  withFakeSpeech,
  withoutSpeech,
} from "./trial-fakes.support";
import {
  type TrialModel,
  correctTiles,
  expectStep,
  imageLoaded,
  openTrial,
  pageData,
  passEnding,
  playToRoleplay,
  shown,
  spoken,
  tap,
  tileTurn,
  turnShown,
  watchErrors,
  wrongTiles,
} from "./trial.support";

// 웹 체험판 `/try/`의 흐름입니다(테스트 계획 TE1 · TE2). 기본은 움직임 줄이기 — 탭 한 번에 컷 하나.

async function finishTiles(page: Page, model: TrialModel, from = 0) {
  for (let index = from; index < model.roleplay.turns.length; index += 1) {
    const turn = model.roleplay.turns[index];
    if (!turn) throw new Error("턴 없음");
    await expect(turnShown(page)).toHaveAttribute("data-turn-index", String(index));
    await expect(turnShown(page)).toHaveAttribute("data-mode", "tiles");
    await tileTurn(page, correctTiles(turn));
    await tap(page, "trial-turn-next");
  }
}

test.describe("TE1 타일 경로(말하기 없음) — 클릭으로 완료까지", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await withoutSpeech(page);
    await routeSound(page);
  });

  test("단계마다 u00 글 · 그림이 보이고 완료 화면에 닿는다", async ({ page }) => {
    const errors = watchErrors(page);
    await openTrial(page);
    const { model, copy } = await pageData(page);
    // TE-B1 표지 없이 컷 1이 첫 화면.
    await expect(page.getByTestId("trial-step-start")).toHaveCount(0);
    await expect(shown(page, "trial-cut")).toHaveAttribute("data-cut-index", "1");
    await expect(page.getByTestId("trial-progress")).toHaveAttribute("aria-valuenow", "1");

    for (const cut of model.prologue) {
      await expectStep(page, "prologue");
      const article = shown(page, "trial-cut");
      await expect(article).toHaveAttribute("data-cut-index", String(cut.index));
      await expect(article.getByTestId("trial-cut-line")).toContainText(cut.text.ko);
      if (cut.imageUrl) await imageLoaded(article.getByTestId("trial-cut-image"));
      await tap(page, "trial-cuts-next");
    }

    await expectStep(page, "vocab");
    await expect(shown(page, "trial-vocab-word")).toHaveText(model.vocab.word.ko);
    await expect(shown(page, "trial-vocab-meaning")).toContainText(model.vocab.word.en ?? "");
    await tap(page, "trial-vocab-next");

    await expectStep(page, "image-match");
    await imageLoaded(shown(page, "trial-image-match-image"));
    await expect(shown(page, "trial-image-match-prompt")).toHaveText(model.imageMatch.prompt);
    await expect(shown(page, "trial-option")).toHaveCount(model.imageMatch.options.length);
    for (const [index, option] of model.imageMatch.options.entries()) {
      await expect(shown(page, "trial-option").nth(index)).toContainText(option.ko);
    }
    await expect(shown(page, "trial-choice-next")).toHaveCount(0);
    // 오답을 골라도 정답을 보이고 넘어간다.
    const wrong = model.imageMatch.answerIndex === 0 ? 1 : 0;
    await tap(page, "trial-option", wrong);
    await expect(shown(page, "trial-option").nth(wrong)).toHaveAttribute(
      "data-result",
      "incorrect",
    );
    await expect(shown(page, "trial-option").nth(model.imageMatch.answerIndex)).toHaveAttribute(
      "data-result",
      "correct",
    );
    // 정답 공개 줄은 앞말과 정답 사이 공백이 렌더된 글자에도 남는다(flex 항목이면 공백이 사라진다).
    const answer = model.imageMatch.options[model.imageMatch.answerIndex]?.ko ?? "";
    const reveal = page.locator('[data-testid="trial-step-image-match"] .trial-reveal');
    expect(await reveal.evaluate((node) => (node as HTMLElement).innerText.trim())).toBe(
      `Answer: ${answer}`,
    );
    await tap(page, "trial-choice-next");

    await expectStep(page, "reply-select");
    await expect(shown(page, "trial-reply-select-line")).toHaveText(model.replySelect.line.ko);
    await tap(page, "trial-option", model.replySelect.answerIndex);
    await expect(shown(page, "trial-option").nth(model.replySelect.answerIndex)).toHaveAttribute(
      "data-result",
      "correct",
    );
    await tap(page, "trial-choice-next");

    await expectStep(page, "culture");
    await expect(shown(page, "trial-culture-title")).toContainText(model.culture.title.ko);
    if (model.culture.imageUrl) await imageLoaded(shown(page, "trial-culture-image"));
    await tap(page, "trial-culture-flip");
    await expect(page.getByTestId("trial-culture-card")).toHaveAttribute("data-face", "back");
    await tap(page, "trial-culture-next");

    await expectStep(page, "roleplay");
    if (model.roleplay.imageUrl) await imageLoaded(shown(page, "trial-roleplay-image"));
    await expect(shown(page, "trial-turn-notice")).toHaveAttribute("data-notice", "unsupported");
    await expect(shown(page, "trial-turn-notice")).toHaveText(copy.noticeUnsupported);
    for (const [index, turn] of model.roleplay.turns.entries()) {
      await expect(turnShown(page)).toHaveAttribute("data-turn-index", String(index));
      await expect(shown(page, "trial-turn-line")).toHaveText(turn.line.ko);
      const check = shown(page, "trial-turn-check");
      await expect(check).toHaveAttribute("aria-disabled", "true");
      await tileTurn(page, correctTiles(turn));
      await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
      await tap(page, "trial-turn-next");
    }

    // TE-C1 엔딩 4컷 → Episode clear 배너 「What happens next?」 → 곧바로 완료(사전 등록).
    expect(model.epilogue).toHaveLength(4);
    for (const cut of model.epilogue) {
      await expectStep(page, "epilogue");
      await expect(shown(page, "trial-cut").getByTestId("trial-cut-line")).toContainText(
        cut.text.ko,
      );
      if (cut.imageUrl) await imageLoaded(shown(page, "trial-cut").getByTestId("trial-cut-image"));
      await tap(page, "trial-cuts-next");
    }

    await expectStep(page, "clear");
    await expect(shown(page, "trial-clear-title")).toHaveText("What happens next?");
    await expect(page.getByTestId("trial-clear-teaser")).toHaveCount(0);
    // 배너는 유지 시간(1.6초) 뒤 스스로 완료로 넘어간다 — 그 사이 Next 같은 조작은 없다.
    await expectStep(page, "complete");
    await expect(page.getByTestId("trial-step-complete")).toHaveAttribute("data-result", "passed");
    await expect(page.getByTestId("trial-progress")).toHaveAttribute("aria-valuenow", "7");
    await expect(page.getByTestId("trial-store")).toHaveCount(0);
    await expect(page.locator('a[href*="apps.apple.com"], a[href*="play.google.com"]')).toHaveCount(
      0,
    );
    await expect(shown(page, "trial-prereg-email")).toBeVisible();
    await expect(shown(page, "trial-complete-home")).toHaveAttribute("href", "/");
    expect(errors).toEqual([]);
  });

  test("TE-C1 롤플레이를 둘 틀려도 엔딩 · Episode clear를 지나 완료(미통과 문구)로 간다", async ({
    page,
  }) => {
    await openTrial(page);
    const { model } = await pageData(page);
    await playToRoleplay(page, model);
    for (const [index, turn] of model.roleplay.turns.entries()) {
      const order = index < 2 && turn.tiles.length > 1 ? wrongTiles(turn) : correctTiles(turn);
      await tileTurn(page, order);
      await tap(page, "trial-turn-next");
    }
    await passEnding(page, model);
    await expect(page.getByTestId("trial-step-complete")).toHaveAttribute("data-result", "failed");
    await expect(page.locator("[data-complete-missed]")).toContainText("1");
  });
});

test.describe("TE2 말하기(가짜 인식기)", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await withFakeSpeech(page);
    await routeSound(page);
  });

  test("정답 → Great · 오답 → Not quite · Try again · not-allowed → 타일", async ({ page }) => {
    const errors = watchErrors(page);
    await openTrial(page);
    const { model, copy } = await pageData(page);
    const [first, second] = model.roleplay.turns;
    if (!first || !second) throw new Error("턴이 둘 이상이어야 한다");
    await playToRoleplay(page, model);
    await expect(turnShown(page)).toHaveAttribute("data-mode", "speech");
    await expect(shown(page, "trial-turn-notice")).toHaveCount(0);

    // 턴 1: 정답
    await say(page, { heard: [spoken(first)] });
    await tap(page, "trial-turn-speak");
    await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
    await expect(shown(page, "trial-turn-verdict")).toHaveText(copy.great, {
      useInnerText: true,
    });
    expect(await speechStarts(page)).toEqual([{ lang: "ko-KR", maxAlternatives: 3 }]);
    await tap(page, "trial-turn-next");

    // 턴 2: 오답 → Not quite · Try again → 다시 준비
    await expect(turnShown(page)).toHaveAttribute("data-turn-index", "1");
    await say(page, { heard: ["바나나"] });
    await tap(page, "trial-turn-speak");
    await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "incorrect");
    await expect(shown(page, "trial-turn-verdict")).toHaveText(copy.notQuite, {
      useInnerText: true,
    });
    await expect(shown(page, "trial-turn-heard")).toHaveText("바나나");
    await expect(shown(page, "trial-turn-next")).toHaveCount(0);
    await tap(page, "trial-turn-retry");
    await expect(turnShown(page)).toHaveAttribute("data-phase", "ready");
    await expect(shown(page, "trial-turn-reply")).toHaveCount(0);

    // 마이크 거부 → 같은 턴부터 타일
    await say(page, { error: "not-allowed" });
    await tap(page, "trial-turn-speak");
    await expect(turnShown(page)).toHaveAttribute("data-mode", "tiles");
    await expect(shown(page, "trial-turn-notice")).toHaveAttribute("data-notice", "denied");
    await expect(shown(page, "trial-turn-notice")).toHaveText(copy.noticeDenied);
    await tileTurn(page, correctTiles(second));
    await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
    await tap(page, "trial-turn-next");
    await finishTiles(page, model, 2);
    await passEnding(page, model);
    await expect(page.getByTestId("trial-step-complete")).toHaveAttribute("data-result", "passed");
    expect(errors).toEqual([]);
  });

  test("Can't speak now → 그 턴은 타일", async ({ page }) => {
    await openTrial(page);
    const { model } = await pageData(page);
    await playToRoleplay(page, model);
    await tap(page, "trial-turn-cant-speak");
    await expect(turnShown(page)).toHaveAttribute("data-mode", "tiles");
    await expect(shown(page, "trial-turn-notice")).toHaveCount(0);
  });
});
