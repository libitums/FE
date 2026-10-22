// 상태 → DOM 반영입니다(속성 · hidden · 글자 · 초점 · 낭독). 판정 · 전이는 계산하지 않고 리듀서가 낸 상태를 그립니다.

import type { TrialScriptCopy } from "../components/trial/trial-components.contract";
import { formatCopy } from "./trial-copy-format";
import { announcementOf, renderLive } from "./trial-dom-live";
import { moveTurnFocus } from "./trial-dom-focus";
import { allByTestId, byTestId, setAttr, setHidden } from "./trial-dom-util";
import { applyTurn } from "./trial-dom-turn";
import type { TrialState } from "./trial-machine.contract";
import type { TrialModel } from "./trial-model.contract";
import { trialProgressOf } from "./trial-view";

export type TrialDomInput = {
  readonly root: HTMLElement;
  readonly model: TrialModel;
  readonly copy: TrialScriptCopy;
  readonly prev: TrialState | null;
  readonly next: TrialState;
};

/** 지금 단계의 section. */
export const stepSectionOf = (root: ParentNode, step: string) =>
  byTestId(root, `trial-step-${step}`);

/** 컷 묶음 단계면 지금 보이는 컷 article. */
export function currentCutOf(root: ParentNode, state: TrialState): HTMLElement | null {
  if (state.step !== "prologue" && state.step !== "epilogue") return null;
  const section = stepSectionOf(root, state.step);
  return section === null ? null : (allByTestId(section, "trial-cut")[state.cutIndex] ?? null);
}

function applyCuts(root: HTMLElement, state: TrialState): void {
  if (state.step !== "prologue" && state.step !== "epilogue") return;
  const section = stepSectionOf(root, state.step);
  if (section === null) return;
  allByTestId(section, "trial-cut").forEach((cut, position) =>
    setHidden(cut, position !== state.cutIndex),
  );
}

function applyChoice(root: HTMLElement, model: TrialModel, state: TrialState): void {
  if (state.step !== "image-match" && state.step !== "reply-select") return;
  const section = stepSectionOf(root, state.step);
  if (section === null) return;
  const item = state.step === "image-match" ? model.imageMatch : model.replySelect;
  const { selected, verdict } = state.choice;
  for (const option of allByTestId(section, "trial-option")) {
    const index = Number(option.getAttribute("data-option-index"));
    const picked = index === selected;
    setAttr(option, "aria-pressed", String(picked));
    // 판정 뒤에는 정답 보기도 드러냅니다(오답을 골랐을 때 정답이 어디인지 보이게).
    const result = picked
      ? (verdict ?? "")
      : verdict !== null && index === item.answerIndex
        ? "correct"
        : "";
    setAttr(option, "data-result", result);
    if (verdict === null) option.removeAttribute("aria-disabled");
    else setAttr(option, "aria-disabled", "true");
  }
  setHidden(byTestId(section, "trial-choice-verdict"), verdict === null);
  setHidden(byTestId(section, "trial-choice-next"), verdict === null);
}

function applyCulture(root: HTMLElement, copy: TrialScriptCopy, state: TrialState): void {
  const section = stepSectionOf(root, "culture");
  if (section === null || state.step !== "culture") return;
  const back = state.cultureFace === "back";
  setAttr(byTestId(section, "trial-culture-card"), "data-face", state.cultureFace);
  const flip = byTestId(section, "trial-culture-flip");
  setAttr(flip, "aria-label", back ? copy.cultureFlipToFront : copy.cultureFlipToBack);
}

function applyComplete(root: HTMLElement, copy: TrialScriptCopy, state: TrialState): void {
  if (state.step !== "complete") return;
  const section = stepSectionOf(root, "complete");
  if (section === null) return;
  const { verdict, records } = state.roleplay;
  setAttr(section, "data-result", verdict ?? "passed");
  const missed = section.querySelector("[data-complete-missed]");
  if (missed !== null) {
    const correct = records.filter((record) => record.result === "correct").length;
    missed.textContent = formatCopy(copy.completeBodyMissed, {
      correct: String(correct),
      total: String(records.length),
    });
  }
}

/** 단계가 바뀌면 그 제목, 컷이 바뀌면 Next, 롤플레이 안에서는 상태별 다음 조작에 초점을 둡니다. */
function moveFocus(root: HTMLElement, prev: TrialState | null, next: TrialState): void {
  if (prev === null) return;
  const section = stepSectionOf(root, next.step);
  if (section === null) return;
  if (prev.step !== next.step) {
    section.querySelector<HTMLElement>("[data-step-heading]")?.focus();
  } else if (prev.cutIndex !== next.cutIndex) {
    byTestId(section, "trial-cuts-next")?.focus();
  } else {
    moveTurnFocus(root, prev, next);
  }
}

/** 새 상태를 루트 아래 마크업에 반영합니다. */
export function applyTrialState(input: TrialDomInput): void {
  const { root, model, copy, prev, next } = input;
  setAttr(root, "data-step", next.step);
  for (const section of root.querySelectorAll('[data-testid^="trial-step-"]')) {
    setHidden(section, section.getAttribute("data-testid") !== `trial-step-${next.step}`);
  }
  setAttr(byTestId(root, "trial-progress"), "aria-valuenow", String(trialProgressOf(next).ordinal));
  applyCuts(root, next);
  applyChoice(root, model, next);
  applyCulture(root, copy, next);
  if (next.step === "roleplay") applyTurn(root, model, copy, next);
  applyComplete(root, copy, next);
  moveFocus(root, prev, next);
  const announcement = prev === null ? null : announcementOf(root, model, copy, prev, next);
  const live = byTestId(root, "trial-live");
  // 단계가 바뀌었는데 읽을 글이 없으면 지난 글을 비웁니다(가상 커서로 읽을 때 앞 장면 글이 끼지 않게).
  if (live !== null && announcement !== null) renderLive(live, announcement);
  else if (live !== null && prev !== null && prev.step !== next.step) live.replaceChildren();
}
