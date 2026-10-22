import { beforeAll, describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import type { TrialModel } from "../../trial/trial-model.contract";
import { u00TrialModel } from "../../trial/trial.test-support";
import { render } from "../render.support";
import TrialVocabCard from "./TrialVocabCard.astro";
import {
  allByTestId,
  expectButton,
  expectStepHeading,
  langOf,
  oneByTestId,
  textOf,
} from "./trial-ui.support";

const t = trialEn;

describe("UT5 TrialVocabCard", () => {
  let model: TrialModel;
  let document: Document;

  beforeAll(async () => {
    model = u00TrialModel();
    ({ document } = await render(TrialVocabCard, { props: { t, vocab: model.vocab } }));
  });

  it("section hidden · 제목", () => {
    const section = oneByTestId(document, "trial-step-vocab");
    expect(section.hasAttribute("hidden")).toBe(true);
    expectStepHeading(section);
  });

  it("낱말 · 로마자 · 뜻 · 예문", () => {
    const word = oneByTestId(document, "trial-vocab-word");
    expect(textOf(word)).toBe("안녕하세요");
    expect(langOf(word)).toBe("ko");
    expect(textOf(oneByTestId(document, "trial-vocab-roman"))).toBe("annyeonghaseyo");
    expect(textOf(oneByTestId(document, "trial-vocab-meaning"))).toBe("Hello");
    const example = oneByTestId(document, "trial-vocab-example");
    expect(example.textContent).toContain(model.vocab.example?.ko ?? "-");
    expect(langOf(example.querySelector('[lang="ko"]') ?? example)).toBe("ko");
  });

  it("다시 듣기 둘 · Got it", () => {
    expectButton(oneByTestId(document, "trial-vocab-listen"));
    expectButton(oneByTestId(document, "trial-vocab-example-listen"));
    expectButton(oneByTestId(document, "trial-vocab-next"), t.gotIt);
  });

  it("음성 주소가 없으면 다시 듣기 둘을 그리지 않는다", async () => {
    const silent = u00TrialModel("");
    expect(silent.vocab.audioUrl).toBeNull();
    const { document: quiet } = await render(TrialVocabCard, { props: { t, vocab: silent.vocab } });
    oneByTestId(quiet, "trial-vocab-word");
    expect(allByTestId(quiet, "trial-vocab-listen")).toHaveLength(0);
    expect(allByTestId(quiet, "trial-vocab-example-listen")).toHaveLength(0);
    oneByTestId(quiet, "trial-vocab-next");
  });
});
