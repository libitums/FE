import { describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import { u00TrialModel } from "../../trial/trial.test-support";
import { render } from "../render.support";
import TrialStart from "./TrialStart.astro";
import { expectButton, expectStepHeading, oneByTestId, textOf } from "./trial-ui.support";

describe("UT3 TrialStart", () => {
  it("그림 alt 빈 값 · 제목 · Start 버튼", async () => {
    const imageUrl = u00TrialModel().startImageUrl;
    expect(imageUrl).not.toBeNull();
    const { document } = await render(TrialStart, { props: { t: trialEn, imageUrl } });
    const section = oneByTestId(document, "trial-step-start");
    expect(section.hasAttribute("hidden")).toBe(false);
    const heading = expectStepHeading(section);

    const image = oneByTestId(document, "trial-start-image");
    expect(image.tagName).toBe("IMG");
    expect(image.getAttribute("alt")).toBe("");
    expect(image.getAttribute("src")).toBe(imageUrl);

    const title = oneByTestId(document, "trial-start-title");
    expect(title).toBe(heading);
    expect(textOf(title)).toBe(trialEn.startTitle);
    expect(section.textContent).toContain(trialEn.startBody);

    expectButton(oneByTestId(document, "trial-start-button"), trialEn.start);
  });
});
