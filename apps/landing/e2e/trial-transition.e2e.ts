import { expect, test, type Page } from "@playwright/test";
import { routeSound, withoutSpeech } from "./trial-fakes.support";
import { openTrial, pageData, root, tap } from "./trial.support";

// 꿈 전환(TE-T1) — 컷 사이 구름빛(dream), 꿈 → 승무원(컷 5 → 6)은 깨어남(wake), 움직임 줄이기면 없음.
// 루트 data-transition과, 그 표식으로 전환 애니메이션(trial-transition.css)이 실제로 도는지를 본다.

/** 다음 탭 직후 루트 data-transition 값과 돌고 있는 전환 애니메이션(베일 · 눈꺼풀 · 그림 초점) 수. */
async function nextAndRead(page: Page): Promise<{ kind: string | null; veil: number }> {
  await tap(page, "trial-cuts-next");
  return root(page).evaluate((main) => ({
    kind: main.getAttribute("data-transition"),
    veil: main
      .getAnimations({ subtree: true })
      .filter(
        (animation) =>
          animation.playState === "running" &&
          /^trial-(veil-clear|eyelid-open|dream-focus|wake-focus)$/.test(
            (animation as CSSAnimation).animationName ?? "",
          ),
      ).length,
  }));
}

test.describe("TE-T1 꿈 전환", () => {
  test.beforeEach(async ({ page }) => {
    await withoutSpeech(page);
    await routeSound(page);
  });

  test("움직임 켬 — 컷 1 → 5는 dream, 컷 5 → 6은 wake, 전환이 끝나면 표식이 없다", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openTrial(page);
    const { model } = await pageData(page);
    expect(model.prologue).toHaveLength(6);
    const kinds: (string | null)[] = [];
    for (let cut = 0; cut < 5; cut += 1) {
      // 타자 효과가 다 끝난 뒤 넘긴다(드러나는 중 탭은 넘기지 않는다).
      await expect(page.getByTestId("trial-cut").filter({ visible: true })).not.toHaveAttribute(
        "data-revealing",
        "true",
        { timeout: 10_000 },
      );
      const read = await nextAndRead(page);
      kinds.push(read.kind);
      expect(read.veil, `컷 ${cut + 1} → ${cut + 2} 베일 애니메이션`).toBeGreaterThan(0);
    }
    expect(kinds).toEqual(["dream", "dream", "dream", "dream", "wake"]);
    await expect(root(page)).not.toHaveAttribute("data-transition", /./, { timeout: 3_000 });
  });

  test("움직임 줄이기 — 표식 · 베일 애니메이션 없음", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openTrial(page);
    for (let cut = 0; cut < 5; cut += 1) {
      expect(await nextAndRead(page)).toEqual({ kind: null, veil: 0 });
    }
  });
});
