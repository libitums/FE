import { describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import { trialKo } from "../../i18n/trial-ko";
import { render } from "../render.support";
import TrialClear from "./TrialClear.astro";
import {
  accessibleNameOf,
  expectButton,
  expectStepHeading,
  isHiddenWithin,
  langOf,
  oneByTestId,
  textOf,
} from "./trial-ui.support";

// `ui` 계층: Episode clear — 배너(앱 EpisodeBannerScreen과 같은 글 · 덮는 버튼) 뒤 다음 이야기 예고.

const IMAGE = "/_astro/post-4.test.webp";

describe("UT-CL TrialClear", () => {
  it("UT-CL1 section hidden · data-phase=banner · 제목 = clearTitle(h2 · 단계 제목)", async () => {
    const { document } = await render(TrialClear, { props: { t: trialEn, imageUrl: IMAGE } });
    const section = oneByTestId(document, "trial-step-clear");
    expect(section.hasAttribute("hidden")).toBe(true);
    expect(section.getAttribute("data-phase")).toBe("banner");
    const heading = expectStepHeading(section);
    expect(heading.getAttribute("data-testid")).toBe("trial-clear-title");
    expect(textOf(heading)).toBe(trialEn.clearTitle);
    expect(trialEn.clearTitle).toBe("Episode clear!");
  });

  it("UT-CL1 배너를 덮는 버튼 — type=button · 이름 = continue · 제목을 감싸지 않음", async () => {
    const { document } = await render(TrialClear, { props: { t: trialEn, imageUrl: IMAGE } });
    const banner = oneByTestId(document, "trial-clear-banner");
    expectButton(banner, trialEn.continue);
    expect(banner.contains(oneByTestId(document, "trial-clear-title"))).toBe(false);
  });

  it("UT-CL2 예고는 처음 hidden — 라벨 · 제목(h3 · tabindex -1) · 본문 · 그림 alt='' · Next", async () => {
    const { document } = await render(TrialClear, { props: { t: trialEn, imageUrl: IMAGE } });
    const section = oneByTestId(document, "trial-step-clear");
    const teaser = oneByTestId(document, "trial-clear-teaser");
    expect(teaser.hasAttribute("hidden")).toBe(true);
    const title = oneByTestId(teaser, "trial-clear-teaser-title");
    expect(title.tagName).toBe("H3");
    expect(title.getAttribute("tabindex")).toBe("-1");
    expect(textOf(title)).toBe(trialEn.teaserTitle);
    expect(textOf(teaser)).toContain(trialEn.teaserLabel);
    expect(textOf(teaser)).toContain(trialEn.teaserBody);
    const image = oneByTestId(teaser, "trial-clear-image");
    expect(image.tagName).toBe("IMG");
    expect(image.getAttribute("src")).toBe(IMAGE);
    expect(image.getAttribute("alt")).toBe("");
    const next = oneByTestId(teaser, "trial-clear-next");
    expectButton(next, trialEn.next);
    // 배너 면은 처음 보이는 자리(section 자체의 hidden은 단계 전환 몫).
    const banner = oneByTestId(document, "trial-clear-banner");
    expect(isHiddenWithin(banner, banner.parentElement as Element)).toBe(false);
    expect(section.contains(banner)).toBe(true);
  });

  it("UT-CL2 그림이 없으면 그림 요소 없이도 예고 글은 선다", async () => {
    const { document } = await render(TrialClear, { props: { t: trialEn, imageUrl: null } });
    expect(document.querySelectorAll('[data-testid="trial-clear-image"]')).toHaveLength(0);
    expect(textOf(oneByTestId(document, "trial-clear-teaser-title"))).toBe(trialEn.teaserTitle);
  });

  it("UT-CL3 ko — 배너는 앱과 같은 영어, 예고는 한국어 문구", async () => {
    const { document } = await render(TrialClear, { props: { t: trialKo, imageUrl: IMAGE } });
    expect(textOf(oneByTestId(document, "trial-clear-title"))).toBe("Episode clear!");
    expect(langOf(oneByTestId(document, "trial-clear-title"))).toBe("en");
    expect(textOf(oneByTestId(document, "trial-clear-teaser-title"))).toBe(
      "다음은 어떤 일이 벌어질까?",
    );
    expect(accessibleNameOf(oneByTestId(document, "trial-clear-banner"))).toBe(trialKo.continue);
  });
});
