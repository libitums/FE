import { beforeAll, describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import type { TrialModel } from "../../trial/trial-model.contract";
import { u00TrialModel } from "../../trial/trial.test-support";
import { render } from "../render.support";
import TrialCultureCard from "./TrialCultureCard.astro";
import { accessibleNameOf, expectButton, expectStepHeading, oneByTestId } from "./trial-ui.support";

const t = trialEn;

describe("UT8 TrialCultureCard", () => {
  let model: TrialModel;
  let document: Document;

  beforeAll(async () => {
    model = u00TrialModel();
    ({ document } = await render(TrialCultureCard, { props: { t, culture: model.culture } }));
  });

  it("section hidden · 제목 · 카드 앞면", () => {
    const section = oneByTestId(document, "trial-step-culture");
    expect(section.hasAttribute("hidden")).toBe(true);
    expectStepHeading(section);
    expect(oneByTestId(section, "trial-culture-card").getAttribute("data-face")).toBe("front");
  });

  it("그림 alt 빈 값(제목과 중복) · 제목 · 본문 · 팁", () => {
    const { culture } = model;
    const card = oneByTestId(document, "trial-culture-card");
    const image = oneByTestId(card, "trial-culture-image");
    expect(image.tagName).toBe("IMG");
    expect(image.getAttribute("alt")).toBe("");
    expect(image.getAttribute("src")).toBe(culture.imageUrl);
    expect(oneByTestId(card, "trial-culture-title").textContent).toContain(culture.title.ko);
    const body = oneByTestId(card, "trial-culture-body").textContent ?? "";
    expect(body).toContain(culture.body.ko);
    expect(body).toContain(culture.body.en ?? "-");
    const tip = oneByTestId(card, "trial-culture-tip").textContent ?? "";
    expect(tip).toContain(culture.tip.ko);
    expect(tip).toContain(culture.tip.en ?? "-");
  });

  it("뒤집기 aria-pressed 없음 · 이름 = 앞→뒤 문구 · 계속", () => {
    const flip = oneByTestId(document, "trial-culture-flip");
    expectButton(flip);
    expect(flip.hasAttribute("aria-pressed")).toBe(false);
    expect(accessibleNameOf(flip)).toBe(t.cultureFlipToBack);
    expectButton(oneByTestId(document, "trial-culture-next"));
  });
});
