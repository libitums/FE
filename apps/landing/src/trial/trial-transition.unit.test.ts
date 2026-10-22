import { describe, expect, it } from "vitest";

import { initialTrialState, reduceTrial } from "./trial-machine";
import type { TrialAction, TrialState } from "./trial-machine.contract";
import { trialTransitionOf } from "./trial-transition";
import { run, stateAt, tilesTurn, u00AudioUrl, u00TrialModel } from "./trial.test-support";

// `unit` 계층: 전이 → 꿈 전환(순수). 깨어남은 순번 규칙(prologue 마지막 자리로)으로 고정하고,
// u00에서 그것이 꿈(pre-5-dream) → 승무원(d-01)임을 핀으로 잰다.

const next: TrialAction = { type: "next" };
const model = () => u00TrialModel();
const transitionOf = (prev: TrialState, action: TrialAction) => {
  const m = model();
  return trialTransitionOf(prev, reduceTrial(prev, action, m), m);
};

describe("trialTransitionOf", () => {
  it("TT1 prologue 컷 사이는 dream — 컷 1 → 2 … 4 → 5", () => {
    const m = model();
    const opened = stateAt("prologue", m);
    for (let index = 0; index < 4; index += 1) {
      const at = run(opened, Array<TrialAction>(index).fill(next), m);
      expect(at.cutIndex).toBe(index);
      expect(transitionOf(at, next)).toBe("dream");
    }
  });

  it("TT2 prologue 마지막 자리로(컷 5 → 6)는 wake — u00에서 꿈 pre-5-dream → 승무원 d-01", () => {
    const m = model();
    const dream = run(stateAt("prologue", m), [next, next, next, next], m);
    expect(dream.cutIndex).toBe(m.prologue.length - 2);
    expect(m.prologue[dream.cutIndex]?.audioUrl).toBe(u00AudioUrl("pre-5-dream"));
    expect(m.prologue[dream.cutIndex + 1]?.audioUrl).toBe(u00AudioUrl("d-01"));
    expect(transitionOf(dream, next)).toBe("wake");
  });

  it("TT3 epilogue 컷 사이 · roleplay → epilogue는 dream", () => {
    const m = model();
    const epilogue = stateAt("epilogue", m);
    for (let index = 0; index < 3; index += 1) {
      const at = run(epilogue, Array<TrialAction>(index).fill(next), m);
      expect(transitionOf(at, next)).toBe("dream");
    }
    const lastJudged = run(
      stateAt("roleplay", m, "unsupported"),
      [...tilesTurn([2, 0, 1]), ...tilesTurn([1, 0]), ...tilesTurn([0]).slice(0, -1)],
      m,
    );
    expect(transitionOf(lastJudged, next)).toBe("dream");
  });

  it("TT4 clear banner → teaser는 dream", () => {
    expect(transitionOf(stateAt("clear", model()), next)).toBe("dream");
  });

  it("TT5 학습 단계 사이 · prologue → vocab · epilogue → clear · clear → complete는 null", () => {
    const m = model();
    const lastPrologue = run(stateAt("prologue", m), [next, next, next, next, next], m);
    expect(transitionOf(lastPrologue, next)).toBeNull();
    expect(transitionOf(stateAt("vocab", m), next)).toBeNull();
    const judged = reduceTrial(stateAt("image-match", m), { type: "choose", optionIndex: 0 }, m);
    expect(transitionOf(judged, next)).toBeNull();
    expect(transitionOf(stateAt("culture", m), next)).toBeNull();
    expect(transitionOf(run(stateAt("epilogue", m), [next, next, next], m), next)).toBeNull();
    expect(transitionOf(run(stateAt("clear", m), [next], m), next)).toBeNull();
  });

  it("TT6 begin · 같은 참조 · 같은 단계 안 다른 전이는 null", () => {
    const m = model();
    expect(transitionOf(initialTrialState(), { type: "begin", speech: "supported" })).toBeNull();
    const vocab = stateAt("vocab", m);
    expect(trialTransitionOf(vocab, vocab, m)).toBeNull();
    expect(transitionOf(stateAt("culture", m), { type: "flip" })).toBeNull();
    expect(transitionOf(stateAt("roleplay", m), { type: "hint" })).toBeNull();
  });
});
