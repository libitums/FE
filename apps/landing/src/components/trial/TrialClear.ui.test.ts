import { describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import { trialKo } from "../../i18n/trial-ko";
import { render } from "../render.support";
import TrialClear from "./TrialClear.astro";
import {
  accessibleNameOf,
  expectButton,
  expectStepHeading,
  langOf,
  oneByTestId,
  textOf,
} from "./trial-ui.support";

// `ui` 계층: Episode clear 배너 — 검은 면에 영어 한 줄(「What happens next?」) · 덮는 버튼. 예고 장면은 없다(r3 정정).

describe("UT-CL TrialClear", () => {
  it("UT-CL1 section hidden · 제목 = clearTitle 「What happens next?」(h2 · 단계 제목 · lang=en)", async () => {
    const { document } = await render(TrialClear, { props: { t: trialEn } });
    const section = oneByTestId(document, "trial-step-clear");
    expect(section.hasAttribute("hidden")).toBe(true);
    const heading = expectStepHeading(section);
    expect(heading.getAttribute("data-testid")).toBe("trial-clear-title");
    expect(textOf(heading)).toBe("What happens next?");
    expect(langOf(heading)).toBe("en");
  });

  it("UT-CL1 배너를 덮는 버튼 — type=button · 이름 = continue · 제목을 감싸지 않음", async () => {
    const { document } = await render(TrialClear, { props: { t: trialEn } });
    const banner = oneByTestId(document, "trial-clear-banner");
    expectButton(banner, trialEn.continue);
    expect(banner.contains(oneByTestId(document, "trial-clear-title"))).toBe(false);
  });

  it("UT-CL2 예고 장면이 없다 — 그림 · 예고 제목 · Next · data-phase 없음, 버튼은 배너 하나", async () => {
    const { document } = await render(TrialClear, { props: { t: trialEn } });
    const section = oneByTestId(document, "trial-step-clear");
    for (const gone of [
      "trial-clear-teaser",
      "trial-clear-image",
      "trial-clear-teaser-title",
      "trial-clear-next",
    ]) {
      expect(document.querySelectorAll(`[data-testid="${gone}"]`), gone).toHaveLength(0);
    }
    expect(section.hasAttribute("data-phase")).toBe(false);
    expect(section.querySelectorAll("button")).toHaveLength(1);
    expect(section.querySelectorAll("img")).toHaveLength(0);
  });

  it("UT-CL3 ko — 배너는 en과 같은 영어 한 문구 · lang=en, 버튼 이름은 ko", async () => {
    const { document } = await render(TrialClear, { props: { t: trialKo } });
    expect(textOf(oneByTestId(document, "trial-clear-title"))).toBe("What happens next?");
    expect(langOf(oneByTestId(document, "trial-clear-title"))).toBe("en");
    expect(accessibleNameOf(oneByTestId(document, "trial-clear-banner"))).toBe(trialKo.continue);
  });
});
