import { expect, test, type Locator, type Page } from "@playwright/test";
import { routeSound, say, withFakeSpeech } from "./trial-fakes.support";
import {
  correctTiles,
  expectStep,
  openTrial,
  pageData,
  passCuts,
  playToRoleplay,
  shown,
  tap,
  tileTurn,
  turnShown,
} from "./trial.support";

// 그림 위 장면 글의 명도 대비 — axe는 발 그늘(::after) 때문에 이 글을 incomplete로 넘깁니다.
// 글 색을 잠시 투명하게 한 뒤 글 상자 스크린샷에서 가장 밝은 화소를 배경으로 삼아 최악의 대비를 잽니다.

const MIN_RATIO = 4.5;

const luminance = ([r, g, b]: readonly number[]) => {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r ?? 0) + 0.7152 * channel(g ?? 0) + 0.0722 * channel(b ?? 0);
};

const ratioOf = (a: readonly number[], b: readonly number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** 글 색 대 그 글 상자 아래 가장 밝은 화소의 대비. */
async function worstContrast(page: Page, decoder: Page, target: Locator): Promise<number> {
  await expect(target).toBeVisible();
  await page.mouse.move(0, 0);
  const color = await target.evaluate((node) => getComputedStyle(node).color);
  const clip = await target.boundingBox();
  if (clip === null) throw new Error("글 상자 없음");
  await target.evaluate((node) => {
    for (const element of [node as HTMLElement, ...node.querySelectorAll<HTMLElement>("*")]) {
      element.style.setProperty("color", "transparent", "important");
      element.style.setProperty("-webkit-text-fill-color", "transparent", "important");
    }
  });
  const shot = await page.screenshot({ clip });
  await target.evaluate((node) => {
    for (const element of [node as HTMLElement, ...node.querySelectorAll<HTMLElement>("*")]) {
      element.style.removeProperty("color");
      element.style.removeProperty("-webkit-text-fill-color");
    }
  });
  const lightest = await decoder.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("canvas 없음");
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let best = [0, 0, 0];
    let bestL = -1;
    for (let i = 0; i < data.length; i += 4) {
      const l = 0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0);
      if (l > bestL) {
        bestL = l;
        best = [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
      }
    }
    return best;
  }, shot.toString("base64"));
  const fg = (color.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3);
  return ratioOf(fg, lightest);
}

test.describe("W4 타일 모드 안내 줄 대비", () => {
  test.skip(
    () => test.info().project.name !== "chromium",
    "화소 표본 대비는 chromium 한 번으로 봅니다.",
  );

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await withFakeSpeech(page);
    await routeSound(page, "missing");
  });

  for (const path of ["/try/", "/ko/try/"]) {
    test(`${path} 마이크 거부 → 타일 모드 안내 줄 ≥ ${MIN_RATIO}:1(그림 위 최악 화소 기준)`, async ({
      page,
    }) => {
      const decoder = await page.context().newPage();
      await openTrial(page, path);
      const { model } = await pageData(page);
      await playToRoleplay(page, model);

      // 같은 자리의 말하기 모드 힌트 줄(감사 실측 11.47:1)로 측정 방식 자체를 먼저 확인한다.
      await shown(page, "trial-turn-hint-button").click();
      const hint = await worstContrast(page, decoder, shown(page, "trial-turn-hint"));
      expect(hint, `힌트 줄 대비 ${hint.toFixed(2)}`).toBeGreaterThanOrEqual(MIN_RATIO);

      await say(page, { error: "not-allowed" });
      await shown(page, "trial-turn-speak").click();
      await expect(turnShown(page)).toHaveAttribute("data-mode", "tiles");
      const notice = shown(page, "trial-turn-notice");
      await expect(notice).toHaveAttribute("data-notice", "denied");
      const ratio = await worstContrast(page, decoder, notice);
      expect(ratio, `타일 모드 안내 줄 대비 ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        MIN_RATIO,
      );
      await decoder.close();
    });
  }

  for (const path of ["/try/", "/ko/try/"]) {
    test(`${path} Episode clear 예고 — 라벨 · 제목 · 본문 ≥ ${MIN_RATIO}:1(그림 위 최악 화소 기준)`, async ({
      page,
    }) => {
      const decoder = await page.context().newPage();
      await openTrial(page, path);
      const { model } = await pageData(page);
      await playToRoleplay(page, model);
      for (const turn of model.roleplay.turns) {
        await tap(page, "trial-turn-cant-speak");
        await tileTurn(page, correctTiles(turn));
        await tap(page, "trial-turn-next");
      }
      await passCuts(page, "epilogue", model.epilogue.length);
      await expectStep(page, "clear");
      await expect(page.getByTestId("trial-step-clear")).toHaveAttribute("data-phase", "teaser");
      const teaser = shown(page, "trial-clear-teaser");
      for (const [label, target] of [
        ["라벨", teaser.locator(".trial-chip")],
        ["제목", shown(page, "trial-clear-teaser-title")],
        ["본문", teaser.locator(".trial-clear__teaser-body")],
      ] as const) {
        const ratio = await worstContrast(page, decoder, target);
        expect(ratio, `예고 ${label} 대비 ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(MIN_RATIO);
      }
      await decoder.close();
    });
  }
});
