import { expect, test } from "@playwright/test";
import { routeSound, withoutSpeech } from "./trial-fakes.support";
import {
  correctTiles,
  expectStep,
  openTrial,
  pageData,
  root,
  shown,
  tap,
  tileTurn,
  watchErrors,
} from "./trial.support";

// 웹 체험판의 소리 요청(TE3)과 움직임 줄이기(TE6)입니다.

test.describe("TE3 소리 요청", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await withoutSpeech(page);
  });

  for (const mode of ["ok", "missing"] as const) {
    test(`Start 전 요청 0 · 장면마다 그 음성 요청 · 끝까지 감(${mode})`, async ({ page }) => {
      const errors = watchErrors(page);
      const log = await routeSound(page, mode);
      await page.goto("/try/", { waitUntil: "networkidle" });
      const { model } = await pageData(page);
      expect(log.voice).toEqual([]);
      expect(log.sfx).toEqual([]);
      const requested = (url: string | null) =>
        url ? expect.poll(() => log.voice.includes(url), { message: url }).toBe(true) : null;

      await tap(page, "trial-start-button");
      await expect.poll(() => new Set(log.sfx).size, { message: "효과음 다섯" }).toBe(5);
      for (const cut of model.prologue) {
        await expect(shown(page, "trial-cut")).toHaveAttribute("data-cut-index", String(cut.index));
        await requested(cut.audioUrl);
        await tap(page, "trial-cuts-next");
      }
      await expectStep(page, "vocab");
      await requested(model.vocab.audioUrl);
      await tap(page, "trial-vocab-next");
      await expectStep(page, "image-match");
      await requested(model.imageMatch.audioUrl);
      await tap(page, "trial-option", model.imageMatch.answerIndex);
      await tap(page, "trial-choice-next");
      await expectStep(page, "reply-select");
      await requested(model.replySelect.audioUrl);
      await tap(page, "trial-option", model.replySelect.answerIndex);
      await tap(page, "trial-choice-next");
      await tap(page, "trial-culture-flip");
      await tap(page, "trial-culture-next");
      for (const turn of model.roleplay.turns) {
        await requested(turn.counterpartAudioUrl);
        await tileTurn(page, correctTiles(turn));
        await requested(turn.replyAudioUrl);
        await tap(page, "trial-turn-next");
      }
      for (const cut of model.epilogue) {
        await requested(cut.audioUrl);
        await tap(page, "trial-cuts-next");
      }
      await expectStep(page, "complete");
      const host = new URL(log.voice[0] ?? "https://x.invalid").hostname;
      expect(host).toBe("content.example.test");
      for (const url of log.voice) expect(url).toMatch(/\/audio\/u00-tutorial\/[\w-]+\.m4a$/);
      expect(errors).toEqual([]);
    });
  }
});

test.describe("TE6 움직임 줄이기", () => {
  test.beforeEach(async ({ page }) => {
    await withoutSpeech(page);
    await routeSound(page);
  });

  test("reduce면 컷 글이 첫 프레임에 다 보이고 움직임이 없다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openTrial(page);
    const { model } = await pageData(page);
    await expect(root(page)).toHaveAttribute("data-motion", "reduced");
    for (const cut of model.prologue.slice(0, 2)) {
      await (cut.index === model.prologue[0]?.index
        ? tap(page, "trial-start-button")
        : tap(page, "trial-cuts-next"));
      const article = shown(page, "trial-cut");
      await expect(article).toHaveAttribute("data-cut-index", String(cut.index));
      // 클릭 직후 같은 틱에서 — 기다리지 않고 바로 잰다.
      const frame = await article.evaluate((node) => ({
        revealing: node.getAttribute("data-revealing"),
        layers: node.querySelectorAll("[data-trial-reveal]").length,
        line: node.querySelector('[data-testid="trial-cut-line"]')?.textContent?.trim() ?? "",
        animations: node.closest("section")?.getAnimations({ subtree: true }).length ?? -1,
        entering: node.closest("section")?.getAttribute("data-entering") ?? null,
        opacity: getComputedStyle(node.querySelector('[data-testid="trial-cut-line"]') as Element)
          .opacity,
      }));
      expect(frame).toEqual({
        revealing: null,
        layers: 0,
        line: expect.stringContaining(cut.text.ko) as unknown as string,
        animations: 0,
        entering: null,
        opacity: "1",
      });
    }
  });

  test("기본(움직임 켬)은 컷 글을 타자 효과로 드러낸다 — 위 단언이 가르는 차이", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openTrial(page);
    await expect(root(page)).toHaveAttribute("data-motion", "full");
    await tap(page, "trial-start-button");
    await expect(shown(page, "trial-cut")).toHaveAttribute("data-revealing", "true");
    // 타자 중 Next는 먼저 끝까지 보인다(넘기지 않음).
    await tap(page, "trial-cuts-next");
    await expect(shown(page, "trial-cut")).not.toHaveAttribute("data-revealing", "true");
    await expect(shown(page, "trial-cut")).toHaveAttribute("data-cut-index", "1");
  });
});
