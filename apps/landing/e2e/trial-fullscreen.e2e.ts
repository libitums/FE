import { expect, test, type Page } from "@playwright/test";
import { routeSound, withoutSpeech } from "./trial-fakes.support";
import { openTrial, pageData, playToComplete, tap, watchErrors } from "./trial.support";

// 모바일 전체화면(TE-F1 ~ TE-F3) — init 스크립트로 requestFullscreen · exitFullscreen을 세는 가짜를 넣는다
// (헤드리스 브라우저의 실제 전체화면 상태에 기대지 않는다). mobile 프로젝트(Pixel 7)는 coarse + hover none이다.

type Mode = "count" | "missing";

function fakeFullscreen(page: Page, mode: Mode) {
  return page.addInitScript((kind: Mode) => {
    const scope = window as unknown as { __fs: { requests: unknown[]; exits: number } };
    scope.__fs = { requests: [], exits: 0 };
    const element = Element.prototype as unknown as Record<string, unknown>;
    const doc = Document.prototype as unknown as Record<string, unknown>;
    if (kind === "missing") {
      for (const name of ["requestFullscreen", "webkitRequestFullscreen"]) {
        Object.defineProperty(element, name, { value: undefined, configurable: true });
      }
      return;
    }
    let active: Element | null = null;
    Object.defineProperty(element, "requestFullscreen", {
      configurable: true,
      value(this: Element, options: unknown) {
        scope.__fs.requests.push(options ?? null);
        active = this;
        return Promise.resolve();
      },
    });
    Object.defineProperty(doc, "fullscreenElement", { configurable: true, get: () => active });
    Object.defineProperty(doc, "exitFullscreen", {
      configurable: true,
      value() {
        scope.__fs.exits += 1;
        active = null;
        return Promise.resolve();
      },
    });
  }, mode);
}

const fullscreenLog = (page: Page) =>
  page.evaluate(() => (window as unknown as { __fs: { requests: unknown[]; exits: number } }).__fs);

const mobile = () => test.info().project.name === "mobile";

test.describe("TE-F 모바일 전체화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await withoutSpeech(page);
    await routeSound(page);
  });

  test("TE-F1 모바일은 첫 탭에 한 번(navigationUI hide), 데스크톱은 0 · 완료에서 푼다", async ({
    page,
  }) => {
    await fakeFullscreen(page, "count");
    await openTrial(page);
    const { model } = await pageData(page);
    expect((await fullscreenLog(page)).requests).toEqual([]);
    await tap(page, "trial-cuts-next");
    await tap(page, "trial-cuts-next");
    const expected = mobile() ? [{ navigationUI: "hide" }] : [];
    expect((await fullscreenLog(page)).requests).toEqual(expected);
    // 이미 넘긴 컷 둘부터 이어 간다.
    await playToComplete(page, model, 2);
    expect((await fullscreenLog(page)).exits).toBe(mobile() ? 1 : 0);
  });

  test("TE-F2 함수가 없어도(iPhone Safari처럼) 오류 0 · 그대로 진행", async ({ page }) => {
    const errors = watchErrors(page);
    await fakeFullscreen(page, "missing");
    await openTrial(page);
    await tap(page, "trial-cuts-next");
    await expect(page.getByTestId("trial-cut").filter({ visible: true })).toHaveAttribute(
      "data-cut-index",
      "2",
    );
    expect(errors).toEqual([]);
  });

  test("TE-F3 나가기를 누르면 푼다", async ({ page }) => {
    test.skip(!mobile(), "전체화면은 모바일에서만 요청한다");
    await fakeFullscreen(page, "count");
    await openTrial(page);
    await tap(page, "trial-cuts-next");
    await page.evaluate(() =>
      document.addEventListener("click", (event) => event.preventDefault(), { capture: true }),
    );
    await page.getByTestId("trial-exit").click();
    expect((await fullscreenLog(page)).exits).toBe(1);
  });
});
