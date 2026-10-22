import { describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import { trialKo } from "../../i18n/trial-ko";
import { render } from "../render.support";
import TrialPrereg from "./TrialPrereg.astro";
import { allByTestId, expectButton, oneByTestId, textOf } from "./trial-ui.support";

// `ui` 계층: 완료 화면의 이메일 사전 등록 폼 — 레이블 · 오류 · 개인정보 줄 · 상태 글의 마크업.

const renderForm = (available: boolean, t = trialEn) =>
  render(TrialPrereg, { props: { t, available } });

describe("UT-PR TrialPrereg", () => {
  it("UT-PR1 form[novalidate][data-state=idle] · 제목 · 본문", async () => {
    const { document } = await renderForm(true);
    const form = oneByTestId(document, "trial-prereg");
    expect(form.tagName).toBe("FORM");
    expect(form.hasAttribute("novalidate")).toBe(true);
    expect(form.getAttribute("data-state")).toBe("idle");
    expect(textOf(form)).toContain(trialEn.preregTitle);
    expect(textOf(form)).toContain(trialEn.preregBody);
  });

  it("UT-PR1 레이블 ↔ 입력 · type=email · autocomplete=email · required · 대문자 · 맞춤법 끔", async () => {
    const { document } = await renderForm(true);
    const input = oneByTestId(document, "trial-prereg-email");
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("type")).toBe("email");
    expect(input.getAttribute("name")).toBe("email");
    expect(input.getAttribute("autocomplete")).toBe("email");
    expect(input.getAttribute("inputmode")).toBe("email");
    expect(input.hasAttribute("required")).toBe(true);
    expect(input.getAttribute("autocapitalize")).toBe("off");
    expect(input.getAttribute("spellcheck")).toBe("false");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    const label = document.querySelector(`label[for="${input.id}"]`);
    expect(input.id).not.toBe("");
    expect(textOf(label)).toBe(trialEn.preregEmailLabel);
  });

  it("UT-PR2 입력의 aria-describedby → 오류 줄(hidden) · 개인정보 줄", async () => {
    const { document } = await renderForm(true);
    const input = oneByTestId(document, "trial-prereg-email");
    const ids = (input.getAttribute("aria-describedby") ?? "").split(/\s+/);
    const error = oneByTestId(document, "trial-prereg-error");
    const privacy = oneByTestId(document, "trial-prereg-privacy");
    expect(ids).toEqual([error.id, privacy.id]);
    expect(error.hasAttribute("hidden")).toBe(true);
    expect(textOf(error)).toBe(trialEn.preregInvalid);
    expect(textOf(privacy)).toBe(trialEn.preregPrivacy);
  });

  it("UT-PR2 제출 버튼 type=submit · 글 = preregSubmit, 상태 글 role=status · tabindex -1 · 처음 빈 글", async () => {
    const { document } = await renderForm(true);
    expectButton(oneByTestId(document, "trial-prereg-submit"), trialEn.preregSubmit, "submit");
    const status = oneByTestId(document, "trial-prereg-status");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("tabindex")).toBe("-1");
    expect(textOf(status)).toBe("");
  });

  it("UT-PR3 설정이 없으면 unavailable — 입력 · 버튼 · 오류 없이 안내 글만", async () => {
    const { document } = await renderForm(false);
    const form = oneByTestId(document, "trial-prereg");
    expect(form.getAttribute("data-state")).toBe("unavailable");
    expect(allByTestId(document, "trial-prereg-email")).toHaveLength(0);
    expect(allByTestId(document, "trial-prereg-submit")).toHaveLength(0);
    expect(allByTestId(document, "trial-prereg-error")).toHaveLength(0);
    expect(textOf(oneByTestId(document, "trial-prereg-status"))).toBe(trialEn.preregUnavailable);
    expect(textOf(form)).toContain(trialEn.preregTitle);
  });

  it("UT-PR4 ko 문구", async () => {
    const { document } = await renderForm(true, trialKo);
    expect(textOf(document.querySelector("label"))).toBe(trialKo.preregEmailLabel);
    expect(textOf(oneByTestId(document, "trial-prereg-submit"))).toBe(trialKo.preregSubmit);
    expect(textOf(oneByTestId(document, "trial-prereg-privacy"))).toBe(trialKo.preregPrivacy);
  });
});
