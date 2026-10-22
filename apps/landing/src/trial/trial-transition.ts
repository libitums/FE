// 전이 → 꿈 전환(순수). 모양은 trial-motion이 루트 `data-transition`으로 붙입니다.
// 깨어남은 순번으로 정합니다 — prologue 마지막 컷(승무원이 부름)으로 들어가는 전환. 콘텐츠 id 글자에 기대지 않습니다.

import type { TrialState, TrialTransitionOf } from "./trial-machine.contract";

const inCuts = (state: TrialState) => state.step === "prologue" || state.step === "epilogue";

export const trialTransitionOf: TrialTransitionOf = (prev, next, model) => {
  if (prev === next) return null;
  if (prev.step === next.step && inCuts(next) && prev.cutIndex !== next.cutIndex) {
    const wake = next.step === "prologue" && next.cutIndex === model.prologue.length - 1;
    return wake ? "wake" : "dream";
  }
  if (prev.step === "roleplay" && next.step === "epilogue") return "dream";
  if (
    prev.step === "clear" &&
    next.step === "clear" &&
    prev.clearPhase === "banner" &&
    next.clearPhase === "teaser"
  ) {
    return "dream";
  }
  return null;
};
