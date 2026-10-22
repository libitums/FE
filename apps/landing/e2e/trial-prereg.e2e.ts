import { expect, test } from "@playwright/test";
import { anonKey } from "../playwright.config";
import { routePrereg, routeSound, withoutSpeech } from "./trial-fakes.support";
import { openTrial, pageData, playToComplete, shown, tap, watchErrors } from "./trial.support";

// 완료 화면 이메일 사전 등록(TE-P1 ~ TE-P4) — PostgREST 요청은 route가 가짜로 답한다(실제 DB · 실제 이메일 없음).

const form = (page: import("@playwright/test").Page) => page.getByTestId("trial-prereg");

test.describe("TE-P 사전 등록", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await withoutSpeech(page);
    await routeSound(page);
  });

  test("TE-P1 형식이 틀리면 요청 0 · 오류 보임 · 입력에 초점, 스토어 링크 없음", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const requests = await routePrereg(page, [201]);
    await openTrial(page);
    await playToComplete(page, (await pageData(page)).model);
    await expect(page.getByTestId("trial-store")).toHaveCount(0);
    await expect(page.locator('a[href*="apps.apple.com"], a[href*="play.google.com"]')).toHaveCount(
      0,
    );
    const input = shown(page, "trial-prereg-email");
    await input.fill("mina@example");
    await tap(page, "trial-prereg-submit");
    await expect(form(page)).toHaveAttribute("data-state", "invalid");
    await expect(shown(page, "trial-prereg-error")).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toBeFocused();
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("TE-P2 201 → 완료 · 몸은 소문자 email · locale · source, 머리는 apikey(Authorization 없음)", async ({
    page,
  }) => {
    const requests = await routePrereg(page, [201]);
    await openTrial(page);
    const { model, copy } = await pageData(page);
    await playToComplete(page, model);
    await shown(page, "trial-prereg-email").fill("  E2E.Person@Example.TEST ");
    await shown(page, "trial-prereg-email").press("Enter");
    await expect(form(page)).toHaveAttribute("data-state", "done");
    await expect(shown(page, "trial-prereg-status")).toContainText(copy.preregDone);
    await expect(shown(page, "trial-prereg-status")).toBeFocused();
    await expect(shown(page, "trial-prereg-email")).toHaveCount(0);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.body).toEqual({
      email: "e2e.person@example.test",
      locale: "en",
      source: "web-trial",
    });
    expect(requests[0]?.headers.apikey).toBe(anonKey);
    expect(requests[0]?.headers.prefer).toBe("return=minimal");
    expect(requests[0]?.headers.authorization).toBeUndefined();
  });

  test("TE-P3 409(중복)도 완료로 보인다", async ({ page }) => {
    await routePrereg(page, [409]);
    await openTrial(page);
    const { model, copy } = await pageData(page);
    await playToComplete(page, model);
    await shown(page, "trial-prereg-email").fill("e2e.person@example.test");
    await tap(page, "trial-prereg-submit");
    await expect(form(page)).toHaveAttribute("data-state", "done");
    await expect(shown(page, "trial-prereg-status")).toContainText(copy.preregDone);
  });

  for (const first of [500, "abort"] as const) {
    test(`TE-P4 ${first} → 다시 시도 → 201 완료`, async ({ page }) => {
      const errors = watchErrors(page);
      const requests = await routePrereg(page, [first, 201]);
      await openTrial(page);
      const { model, copy } = await pageData(page);
      await playToComplete(page, model);
      await shown(page, "trial-prereg-email").fill("e2e.person@example.test");
      await tap(page, "trial-prereg-submit");
      await expect(form(page)).toHaveAttribute("data-state", "failed");
      await expect(shown(page, "trial-prereg-status")).toContainText(copy.preregFailed);
      await expect(shown(page, "trial-prereg-submit")).toHaveText(copy.preregRetry);
      await tap(page, "trial-prereg-submit");
      await expect(form(page)).toHaveAttribute("data-state", "done");
      expect(requests).toHaveLength(2);
      expect(errors).toEqual([]);
    });
  }

  test("TE-P2 ko 페이지는 locale ko로 보낸다", async ({ page }) => {
    const requests = await routePrereg(page, [201]);
    await openTrial(page, "/ko/try/");
    await playToComplete(page, (await pageData(page)).model);
    await shown(page, "trial-prereg-email").fill("e2e.person@example.test");
    await tap(page, "trial-prereg-submit");
    await expect(form(page)).toHaveAttribute("data-state", "done");
    const body = (requests[0]?.body ?? {}) as { locale?: string };
    expect(body.locale).toBe("ko");
  });
});
