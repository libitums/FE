import { beforeAll, describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import type { TrialModel } from "../../trial/trial-model.contract";
import { u00TrialModel } from "../../trial/trial.test-support";
import { render } from "../render.support";
import TrialCuts from "./TrialCuts.astro";
import {
  allByTestId,
  expectButton,
  expectStepHeading,
  langOf,
  oneByTestId,
  textOf,
} from "./trial-ui.support";

const t = trialEn;

describe("UT4 TrialCuts", () => {
  let model: TrialModel;
  let document: Document;

  beforeAll(async () => {
    model = u00TrialModel();
    ({ document } = await render(TrialCuts, {
      props: { t, step: "prologue", cuts: model.prologue },
    }));
  });

  const cut = (index: number) => {
    const found = allByTestId(document, "trial-cut").filter(
      (element) => element.getAttribute("data-cut-index") === String(index),
    );
    expect(found, `컷 ${index}`).toHaveLength(1);
    return found[0] as Element;
  };
  const speakerOf = (element: Element) =>
    element.querySelector('[data-testid="trial-cut-speaker"]');

  it("prologue section · 제목 · 컷 6 · 첫째만 보임 · 표지가 없어 section은 처음부터 보임(UT-P1)", () => {
    const section = oneByTestId(document, "trial-step-prologue");
    expectStepHeading(section);
    expect(section.hasAttribute("hidden")).toBe(false);
    const cuts = allByTestId(section, "trial-cut");
    expect(cuts.map((c) => c.tagName)).toEqual(Array(6).fill("ARTICLE"));
    expect(cuts.map((c) => c.getAttribute("data-cut-index"))).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
    expect(cuts.map((c) => c.hasAttribute("hidden"))).toEqual([
      false,
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it("컷 1 — 화자 「Me」 + 독백 표시", () => {
    const first = cut(1);
    const speaker = speakerOf(first);
    expect(speaker).not.toBeNull();
    expect(textOf(speaker)).toContain(t.me);
    // 독백은 「Thinking」 표시 또는 괄호로 감싼 대사로 드러난다.
    const marked =
      textOf(first).includes(t.thinking) ||
      /^\(.*\)$/.test(textOf(first.querySelector('[data-testid="trial-cut-line"]')));
    expect(marked, "독백 표시").toBe(true);
  });

  it("컷 3 — 내레이션은 화자가 없다", () => {
    expect(textOf(speakerOf(cut(3)))).toBe("");
  });

  it("컷 6 — 화자 승무원 + 지문", () => {
    const sixth = cut(6);
    const source = model.prologue[5];
    expect(textOf(speakerOf(sixth))).toContain("승무원");
    expect(source?.aside).not.toBeNull();
    expect(textOf(sixth)).toContain(source?.aside?.ko ?? "");
  });

  it("컷마다 대사 lang=ko 원문 · 로마자 · 번역 · 그림 alt 빈 값", () => {
    for (const source of model.prologue) {
      const element = cut(source.index);
      const line = oneByTestId(element, "trial-cut-line");
      expect(langOf(line)).toBe("ko");
      expect(textOf(line)).toContain(source.text.ko);
      expect(textOf(oneByTestId(element, "trial-cut-roman"))).toBe(source.text.roman);
      expect(textOf(oneByTestId(element, "trial-cut-translation"))).toBe(source.text.en);
      const image = oneByTestId(element, "trial-cut-image");
      expect(image.getAttribute("alt")).toBe("");
      expect(image.getAttribute("src")).toBe(source.imageUrl);
    }
  });

  it("Next 버튼 하나", () => {
    const next = oneByTestId(document, "trial-cuts-next");
    expectButton(next, t.next);
  });

  it("epilogue 변형 — 같은 꼴 · 컷 4(post_cuts 전부)", async () => {
    const { document: epilogue } = await render(TrialCuts, {
      props: { t, step: "epilogue", cuts: model.epilogue },
    });
    const section = oneByTestId(epilogue, "trial-step-epilogue");
    expect(section.hasAttribute("hidden")).toBe(true);
    expectStepHeading(section);
    expect(allByTestId(section, "trial-cut").map((c) => c.getAttribute("data-cut-index"))).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    oneByTestId(epilogue, "trial-cuts-next");
    expect(allByTestId(epilogue, "trial-step-prologue")).toHaveLength(0);
  });
});
