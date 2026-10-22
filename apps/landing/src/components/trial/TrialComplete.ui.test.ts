import { describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import { trialKo } from "../../i18n/trial-ko";
import { render } from "../render.support";
import type { TrialCopy } from "./trial-components.contract";
import TrialComplete from "./TrialComplete.astro";
import { allByTestId, expectStepHeading, oneByTestId, textOf } from "./trial-ui.support";

const renderComplete = (t: TrialCopy, language: "en" | "ko", prereg = true) =>
  render(TrialComplete, { props: { t, language, prereg } });

describe("UT10 TrialComplete", () => {
  it("section hidden · 제목 · data-result · 통과 · 미통과 문구 둘", async () => {
    const t = trialEn;
    const { document } = await renderComplete(t, "en");
    const section = oneByTestId(document, "trial-step-complete");
    expect(section.hasAttribute("hidden")).toBe(true);
    expectStepHeading(section);
    expect(["passed", "failed"]).toContain(section.getAttribute("data-result"));
    const text = section.textContent ?? "";
    expect(text).toContain(t.completeTitle);
    expect(text).toContain(t.completeBody);
    expect(text).toContain(t.completeTitleMissed);
  });

  it.each([
    ["en", trialEn],
    ["ko", trialKo],
  ] as const)(
    "UT-PR4 스토어 링크 · 카드 없음, 사전 등록 폼이 홈 링크 앞에 (%s)",
    async (language, t) => {
      const { document } = await renderComplete(t, language);
      expect(document.querySelectorAll('[data-testid="trial-store"]')).toHaveLength(0);
      expect(document.querySelectorAll("[data-trial-store]")).toHaveLength(0);
      expect(document.querySelectorAll("[data-store]")).toHaveLength(0);
      expect(
        document.querySelectorAll('a[href*="apps.apple.com"], a[href*="play.google.com"]'),
      ).toHaveLength(0);
      const form = oneByTestId(document, "trial-prereg");
      const home = oneByTestId(document, "trial-complete-home");
      expect(form.compareDocumentPosition(home) & 4 /* DOCUMENT_POSITION_FOLLOWING */).toBeTruthy();
      expect(allByTestId(document, "trial-prereg-email")).toHaveLength(1);
    },
  );

  it("UT-PR4 설정이 없으면 폼은 unavailable", async () => {
    const { document } = await renderComplete(trialEn, "en", false);
    expect(oneByTestId(document, "trial-prereg").getAttribute("data-state")).toBe("unavailable");
  });

  it.each([
    ["en", trialEn, "/"],
    ["ko", trialKo, "/ko/"],
  ] as const)("홈 링크 (%s)", async (language, t, home) => {
    const { document } = await renderComplete(t, language);
    const link = oneByTestId(document, "trial-complete-home");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe(home);
    expect(textOf(link)).toBe(t.backHome);
  });
});
