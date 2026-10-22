import { expect, test } from "@playwright/test";
import { anonKey } from "../playwright.config";
import { routeSamples, routeSound, say, withFakeSpeech } from "./trial-fakes.support";
import {
  openTrial,
  pageData,
  playToRoleplay,
  shown,
  spoken,
  tap,
  turnShown,
  watchErrors,
} from "./trial.support";

// 발음 기준 판정(가짜 인식기) · 인식 글자 수집(가짜 PostgREST 응답만 — 실제 Supabase 요청 0) · 안내 줄.

const ROW_KEYS = [
  "alternatives",
  "browser",
  "episode_version",
  "expected",
  "locale",
  "outcome",
  "session_id",
  "similarity",
  "turn_index",
].sort();

test.describe("TE-L1 · TE-S1 · TE-S2 발음 기준 판정 · 수집", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await withFakeSpeech(page);
    await routeSound(page);
  });

  test("TE-L1 띄어쓰기 · 발음이 다른 대안도 Great, strict도 Great · 판정마다 수집 한 번(본문 열 아홉)", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const samples = await routeSamples(page);
    await openTrial(page);
    const { model, copy } = await pageData(page);
    const [first, second] = model.roleplay.turns;
    if (!first || !second) throw new Error("턴이 둘 이상이어야 한다");
    await playToRoleplay(page, model);

    // TE-S2 안내 줄 — 말하기 모드에서 마이크 아래에 보인다.
    await expect(shown(page, "trial-turn-saved")).toHaveText(
      "What you say is saved as text to improve scoring.",
    );

    // 턴 1: 앱 규칙으로는 틀린 띄어쓰기 → lenient → Great
    await say(page, { heard: ["안녕 가세요", "안녕하세요 네 처음 이에요"] });
    await tap(page, "trial-turn-speak");
    await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
    await expect(shown(page, "trial-turn-verdict")).toHaveText(copy.great, { useInnerText: true });
    await expect(shown(page, "trial-turn-heard")).toHaveText("안녕하세요 네 처음 이에요");
    await expect(shown(page, "trial-turn-saved")).toHaveCount(0);
    await expect.poll(() => samples.length).toBe(1);
    await tap(page, "trial-turn-next");

    // 턴 2: 앱 규칙으로 맞음 → strict → Great
    await say(page, { heard: [spoken(second)] });
    await tap(page, "trial-turn-speak");
    await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
    await expect.poll(() => samples.length).toBe(2);

    const [lenient, strict] = samples;
    expect(Object.keys(lenient?.body ?? {}).sort()).toEqual(ROW_KEYS);
    expect(lenient?.body).toMatchObject({
      turn_index: 0,
      expected: first.accepted[0],
      alternatives: ["안녕 가세요", "안녕하세요 네 처음 이에요"],
      outcome: "lenient",
      similarity: 1,
      locale: "en",
    });
    expect(strict?.body).toMatchObject({ turn_index: 1, outcome: "strict" });
    expect(strict?.body["session_id"]).toBe(lenient?.body["session_id"]);
    expect(lenient?.headers["apikey"]).toBe(anonKey);
    expect(lenient?.headers["authorization"]).toBeUndefined();
    expect(errors).toEqual([]);
  });

  for (const failure of [500, "abort"] as const) {
    test(`TE-S1 수집이 ${failure}이어도 판정 · 다음 턴은 그대로 · 다시 보내지 않는다`, async ({
      page,
    }) => {
      const samples = await routeSamples(page, failure);
      await openTrial(page);
      const { model } = await pageData(page);
      const [first, second] = model.roleplay.turns;
      if (!first || !second) throw new Error("턴이 둘 이상이어야 한다");
      await playToRoleplay(page, model);
      await say(page, { heard: [spoken(first)] });
      await tap(page, "trial-turn-speak");
      await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
      await tap(page, "trial-turn-next");
      await expect(turnShown(page)).toHaveAttribute("data-turn-index", "1");
      await say(page, { heard: [spoken(second)] });
      await tap(page, "trial-turn-speak");
      await expect(shown(page, "trial-turn-reply")).toHaveAttribute("data-verdict", "correct");
      await expect.poll(() => samples.length).toBe(2);
      await page.waitForTimeout(300);
      expect(samples).toHaveLength(2);
    });
  }

  test("TE-S2 타일 모드에서는 안내 줄이 숨는다(말하기 묶음과 함께)", async ({ page }) => {
    await openTrial(page, "/ko/try/");
    const { model } = await pageData(page);
    await playToRoleplay(page, model);
    await expect(shown(page, "trial-turn-saved")).toHaveText(
      "말한 문장은 글자로 저장되어 채점을 개선하는 데 쓰여요.",
    );
    await tap(page, "trial-turn-cant-speak");
    await expect(turnShown(page)).toHaveAttribute("data-mode", "tiles");
    await expect(shown(page, "trial-turn-saved")).toHaveCount(0);
  });
});
