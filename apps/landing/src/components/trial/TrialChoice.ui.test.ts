import { beforeAll, describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import type { TrialModel, TrialOption } from "../../trial/trial-model.contract";
import { u00TrialModel } from "../../trial/trial.test-support";
import { render } from "../render.support";
import TrialImageMatch from "./TrialImageMatch.astro";
import TrialReplySelect from "./TrialReplySelect.astro";
import {
  allByTestId,
  expectButton,
  expectStepHeading,
  langOf,
  oneByTestId,
  shapeOf,
  textOf,
} from "./trial-ui.support";

const t = trialEn;

/** 보기 버튼 — 처음 상태 · 글. */
function expectOptions(scope: Element, options: readonly TrialOption[]): Element[] {
  const buttons = allByTestId(scope, "trial-option");
  expect(buttons).toHaveLength(options.length);
  buttons.forEach((button, index) => {
    const option = options[index] as TrialOption;
    expectButton(button);
    expect(button.getAttribute("data-option-index")).toBe(String(index));
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.getAttribute("data-result")).toBe("");
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    const korean = [...button.querySelectorAll('[lang="ko"]')].map(textOf);
    expect(korean, "보기 한국어는 lang=ko").toContain(option.ko);
    expect(button.textContent).toContain(option.roman ?? "-");
    expect(button.textContent).toContain(option.en ?? "-");
  });
  return buttons;
}

/** 판정 줄 · Continue — 처음엔 숨김. */
function expectFooterHidden(section: Element): void {
  const verdict = oneByTestId(section, "trial-choice-verdict");
  expect(verdict.hasAttribute("hidden"), "판정 줄 hidden").toBe(true);
  const next = oneByTestId(section, "trial-choice-next");
  expectButton(next, t.continue);
  expect(next.hasAttribute("hidden"), "Continue hidden").toBe(true);
}

describe("TrialImageMatch · TrialReplySelect", () => {
  let model: TrialModel;
  let imageMatch: Document;
  let replySelect: Document;

  beforeAll(async () => {
    model = u00TrialModel();
    ({ document: imageMatch } = await render(TrialImageMatch, {
      props: { t, item: model.imageMatch },
    }));
    ({ document: replySelect } = await render(TrialReplySelect, {
      props: { t, item: model.replySelect },
    }));
  });

  describe("UT6 TrialImageMatch", () => {
    it("section hidden · 제목 · 지시문", () => {
      const section = oneByTestId(imageMatch, "trial-step-image-match");
      expect(section.hasAttribute("hidden")).toBe(true);
      expectStepHeading(section);
      expect(textOf(oneByTestId(section, "trial-choice-instruction"))).toBe(
        "Which word matches the picture?",
      );
    });

    it("그림 alt = 제시문 Hello · 제시문 · 다시 듣기", () => {
      const image = oneByTestId(imageMatch, "trial-image-match-image");
      expect(image.tagName).toBe("IMG");
      expect(image.getAttribute("alt")).toBe("Hello");
      expect(image.getAttribute("src")).toBe(model.imageMatch.imageUrl);
      expect(textOf(oneByTestId(imageMatch, "trial-image-match-prompt"))).toBe("Hello");
      expectButton(oneByTestId(imageMatch, "trial-choice-listen"));
    });

    it("보기 2 — aria-pressed=false · data-result 빈 값 · ko lang=ko · 로마자 · 뜻", () => {
      const section = oneByTestId(imageMatch, "trial-step-image-match");
      expectOptions(section, model.imageMatch.options);
    });

    it("판정 · Continue 숨김", () => {
      expectFooterHidden(oneByTestId(imageMatch, "trial-step-image-match"));
    });
  });

  describe("UT7 TrialReplySelect", () => {
    it("section hidden · 제목 · 지시문 · 상대 말", () => {
      const section = oneByTestId(replySelect, "trial-step-reply-select");
      expect(section.hasAttribute("hidden")).toBe(true);
      expectStepHeading(section);
      expect(textOf(oneByTestId(section, "trial-choice-instruction"))).toBe("How do you reply?");
      const line = oneByTestId(section, "trial-reply-select-line");
      expect(langOf(line)).toBe("ko");
      expect(line.textContent).toContain("오, 한국어 잘하시네요!");
      expectButton(oneByTestId(section, "trial-choice-listen"));
    });

    it("보기 3 · 판정 · Continue 숨김", () => {
      const section = oneByTestId(replySelect, "trial-step-reply-select");
      expectOptions(section, model.replySelect.options);
      expectFooterHidden(section);
    });

    it("두 고르기 화면의 보기 마크업이 같은 꼴", () => {
      const first = (document: Document) => allByTestId(document, "trial-option")[0];
      const a = first(imageMatch);
      const b = first(replySelect);
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      expect(shapeOf(b as Element)).toBe(shapeOf(a as Element));
    });

    it("음성 주소가 없으면 다시 듣기를 그리지 않는다", async () => {
      const silent = u00TrialModel("");
      const { document: quiet } = await render(TrialReplySelect, {
        props: { t, item: silent.replySelect },
      });
      oneByTestId(quiet, "trial-reply-select-line");
      expect(allByTestId(quiet, "trial-choice-listen")).toHaveLength(0);
    });
  });
});
