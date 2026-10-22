import { describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import { trialKo } from "../../i18n/trial-ko";
import { render } from "../render.support";
import TrialBar from "./TrialBar.astro";
import { oneByTestId } from "./trial-ui.support";

describe("UT2 TrialBar", () => {
  it.each([
    ["en", trialEn, "/"],
    ["ko", trialKo, "/ko/"],
  ] as const)("나가기 링크는 그 언어 홈 (%s)", async (language, t, home) => {
    const { document } = await render(TrialBar, { props: { language, t } });
    oneByTestId(document, "trial-bar");
    const exit = oneByTestId(document, "trial-exit");
    expect(exit.tagName).toBe("A");
    expect(exit.getAttribute("href")).toBe(home);
    expect(exit.getAttribute("aria-label")).toBe(t.exit);
  });

  it("진행 막대는 progressbar · 0 / 0 ~ 7 · 이름", async () => {
    const { document } = await render(TrialBar, { props: { language: "en", t: trialEn } });
    const progress = oneByTestId(document, "trial-progress");
    expect(progress.getAttribute("role")).toBe("progressbar");
    expect(progress.getAttribute("aria-valuemin")).toBe("0");
    expect(progress.getAttribute("aria-valuemax")).toBe("7");
    expect(progress.getAttribute("aria-valuenow")).toBe("0");
    expect(progress.getAttribute("aria-label")).toBe(trialEn.progressLabel);
  });
});
