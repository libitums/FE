import { describe, expect, it } from "vitest";

import { initialTrialState, reduceTrial } from "./trial-machine";
import type { TrialAction, TrialState, TrialStepId } from "./trial-machine.contract";
import { trialProgressOf, trialRoleplayVerdictOf, trialSfxOf, trialVoiceCueOf } from "./trial-view";
import { run, stateAt, tilesTurn, u00AudioUrl, u00TrialModel } from "./trial.test-support";

// `unit` 계층: 상태에서 파생하는 진행 · 음성 단서 · 효과음 · 롤플레이 결과(순수).

const next: TrialAction = { type: "next" };
const speak: TrialAction = { type: "speak" };
const heard = (...alternatives: string[]): TrialAction => ({ type: "heard", alternatives });

describe("trialProgressOf", () => {
  it("TV-R1 단계마다 진행 값 — prologue 1 … roleplay 6 · epilogue · clear · complete 7, 전체 7", () => {
    const model = u00TrialModel();
    const expected: Record<TrialStepId, number> = {
      prologue: 1,
      vocab: 2,
      "image-match": 3,
      "reply-select": 4,
      culture: 5,
      roleplay: 6,
      epilogue: 7,
      clear: 7,
      complete: 7,
    };
    for (const [step, ordinal] of Object.entries(expected) as [TrialStepId, number][]) {
      const state = stateAt(step, model);
      expect(state.step).toBe(step);
      expect(trialProgressOf(state)).toEqual({ ordinal, total: 7 });
    }
  });
});

describe("trialVoiceCueOf", () => {
  it("TV2 컷 — 음성 없는 컷은 null, 있는 컷은 prologue:i · epilogue:i", () => {
    const model = u00TrialModel();
    const prologue = stateAt("prologue", model);
    expect(trialVoiceCueOf(prologue, model)).toBeNull();
    const fifth = run(prologue, [next, next, next, next], model);
    expect(trialVoiceCueOf(fifth, model)).toEqual({
      key: "prologue:4",
      url: u00AudioUrl("pre-5-dream"),
    });
    expect(trialVoiceCueOf(reduceTrial(fifth, next, model), model)).toEqual({
      key: "prologue:5",
      url: u00AudioUrl("d-01"),
    });
    const epilogue = stateAt("epilogue", model);
    expect(trialVoiceCueOf(epilogue, model)).toEqual({
      key: "epilogue:0",
      url: u00AudioUrl("post-1"),
    });
    expect(trialVoiceCueOf(reduceTrial(epilogue, next, model), model)).toEqual({
      key: "epilogue:1",
      url: u00AudioUrl("post-2"),
    });
    // 엔딩 3 · 4(독백)는 음성이 없다.
    expect(trialVoiceCueOf(run(epilogue, [next, next], model), model)).toBeNull();
    expect(trialVoiceCueOf(run(epilogue, [next, next, next], model), model)).toBeNull();
  });

  it("TV2 · TV-R3 단어 · 고르기 둘은 단계 이름 키, 문화 · clear(배너 · 예고) · 완료는 null", () => {
    const model = u00TrialModel();
    expect(trialVoiceCueOf(stateAt("vocab", model), model)).toEqual({
      key: "vocab",
      url: u00AudioUrl("s1-01-word"),
    });
    expect(trialVoiceCueOf(stateAt("image-match", model), model)).toEqual({
      key: "image-match",
      url: u00AudioUrl("s1-01-word"),
    });
    expect(trialVoiceCueOf(stateAt("reply-select", model), model)).toEqual({
      key: "reply-select",
      url: u00AudioUrl("d-03"),
    });
    expect(trialVoiceCueOf(stateAt("culture", model), model)).toBeNull();
    const banner = stateAt("clear", model);
    expect(banner.step).toBe("clear");
    expect(trialVoiceCueOf(banner, model)).toBeNull();
    expect(trialVoiceCueOf(reduceTrial(banner, next, model), model)).toBeNull();
    expect(trialVoiceCueOf(stateAt("complete", model), model)).toBeNull();
  });

  it("TV2 롤플레이 — ready는 상대 줄, listening · 오답은 null, 정답은 내 줄", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model);
    expect(trialVoiceCueOf(rp, model)).toEqual({ key: "rp:0:line", url: u00AudioUrl("d-01") });
    expect(trialVoiceCueOf(run(rp, [speak], model), model)).toBeNull();
    expect(trialVoiceCueOf(run(rp, [speak, heard("감사합니다")], model), model)).toBeNull();
    const right = run(rp, [speak, heard("안녕하세요 네 처음이에요")], model);
    expect(trialVoiceCueOf(right, model)).toEqual({ key: "rp:0:reply", url: u00AudioUrl("d-02") });
    expect(trialVoiceCueOf(reduceTrial(right, next, model), model)).toEqual({
      key: "rp:1:line",
      url: u00AudioUrl("d-03"),
    });
  });

  it("TV2 타일 턴도 ready는 상대 줄 · 정답은 내 줄 · 오답은 null", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model, "unsupported");
    expect(trialVoiceCueOf(rp, model)).toEqual({ key: "rp:0:line", url: u00AudioUrl("d-01") });
    const toggles = (placed: number[]): TrialAction[] => [
      ...placed.map((tileIndex): TrialAction => ({ type: "toggle-tile", tileIndex })),
      { type: "check" },
    ];
    expect(trialVoiceCueOf(run(rp, toggles([2, 0, 1]), model), model)?.key).toBe("rp:0:reply");
    expect(trialVoiceCueOf(run(rp, toggles([0, 1, 2]), model), model)).toBeNull();
  });

  it("TV2 다시 하기로 ready에 돌아오면 같은 키가 다시 나온다(그 사이 null)", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model);
    const wrong = run(rp, [speak, heard("감사합니다")], model);
    expect(trialVoiceCueOf(wrong, model)).toBeNull();
    expect(trialVoiceCueOf(reduceTrial(wrong, { type: "retry" }, model), model)?.key).toBe(
      "rp:0:line",
    );
  });

  it("TV2 음성 주소가 없는 모델이면 늘 null", () => {
    const silent = u00TrialModel("");
    for (const step of [
      "prologue",
      "vocab",
      "image-match",
      "reply-select",
      "roleplay",
      "epilogue",
    ] as const) {
      expect(trialVoiceCueOf(stateAt(step, silent), silent)).toBeNull();
    }
  });
});

describe("trialSfxOf", () => {
  const model = () => u00TrialModel();
  const sfxOf = (prev: TrialState, action: TrialAction) => {
    const m = model();
    return trialSfxOf(prev, reduceTrial(prev, action, m), action);
  };

  it("TV3 · TV-R2 vocab next · culture next → button, begin · prologue next · flip · 고르기 Continue → null", () => {
    const m = model();
    const opened = run(stateAt("prologue", m), [], m);
    expect(opened.begun).toBe(true);
    expect(
      trialSfxOf(initialTrialState(), opened, { type: "begin", speech: "supported" }),
    ).toBeNull();
    expect(sfxOf(stateAt("prologue", m), next)).toBeNull();
    expect(sfxOf(stateAt("vocab", m), next)).toBe("button");
    expect(sfxOf(stateAt("culture", m), { type: "flip" })).toBeNull();
    expect(sfxOf(stateAt("culture", m), next)).toBe("button");
    const judged = reduceTrial(stateAt("image-match", m), { type: "choose", optionIndex: 0 }, m);
    expect(sfxOf(judged, next)).toBeNull();
  });

  it("TV3 판정이 생긴 전이 — choose · heard · no-speech · check가 정답이면 correct_answer, 아니면 wrong_answer", () => {
    const m = model();
    expect(sfxOf(stateAt("image-match", m), { type: "choose", optionIndex: 0 })).toBe(
      "correct_answer",
    );
    expect(sfxOf(stateAt("image-match", m), { type: "choose", optionIndex: 1 })).toBe(
      "wrong_answer",
    );
    const listening = run(stateAt("roleplay", m), [speak], m);
    expect(sfxOf(listening, heard("안녕하세요 네 처음이에요"))).toBe("correct_answer");
    expect(sfxOf(listening, heard("감사합니다"))).toBe("wrong_answer");
    expect(sfxOf(listening, { type: "speech-failed", reason: "no-speech" })).toBe("wrong_answer");
    const tiles = stateAt("roleplay", m, "unsupported");
    const place = (placed: number[]) =>
      run(
        tiles,
        placed.map((tileIndex): TrialAction => ({ type: "toggle-tile", tileIndex })),
        m,
      );
    expect(sfxOf(place([2, 0, 1]), { type: "check" })).toBe("correct_answer");
    expect(sfxOf(place([0, 1, 2]), { type: "check" })).toBe("wrong_answer");
    expect(sfxOf(listening, speak)).toBeNull();
  });

  it("TV3 롤플레이 → 엔딩: passed면 pass_lesson, failed면 null; 턴 사이 next는 null", () => {
    const m = model();
    const rp = stateAt("roleplay", m, "unsupported");
    const firstJudged = run(rp, tilesTurn([2, 0, 1]).slice(0, -1), m);
    expect(sfxOf(firstJudged, next)).toBeNull();
    const passLast = run(
      rp,
      [...tilesTurn([2, 0, 1]), ...tilesTurn([1, 0]), ...tilesTurn([0]).slice(0, -1)],
      m,
    );
    expect(sfxOf(passLast, next)).toBe("pass_lesson");
    const failLast = run(
      rp,
      [...tilesTurn([0, 1, 2]), ...tilesTurn([0, 1]), ...tilesTurn([0]).slice(0, -1)],
      m,
    );
    expect(sfxOf(failLast, next)).toBeNull();
  });

  it("TV-R2 epilogue → clear는 lesson_complete, epilogue 안 · banner → teaser · clear → complete는 null", () => {
    const m = model();
    const epilogue = stateAt("epilogue", m);
    expect(sfxOf(epilogue, next)).toBeNull();
    const lastCut = run(epilogue, [next, next, next], m);
    expect(lastCut).toMatchObject({ step: "epilogue", cutIndex: 3 });
    expect(sfxOf(lastCut, next)).toBe("lesson_complete");
    const banner = stateAt("clear", m);
    expect(sfxOf(banner, next)).toBeNull();
    expect(sfxOf(reduceTrial(banner, next, m), next)).toBeNull();
  });
});

describe("trialRoleplayVerdictOf", () => {
  it("TV4 세 턴 중 2 정답 → passed, 1 → failed", () => {
    expect(
      trialRoleplayVerdictOf([
        { result: "correct", mode: "speech" },
        { result: "incorrect", mode: "tiles" },
        { result: "correct", mode: "tiles" },
      ]),
    ).toBe("passed");
    expect(
      trialRoleplayVerdictOf([
        { result: "incorrect", mode: "tiles" },
        { result: "incorrect", mode: "tiles" },
        { result: "correct", mode: "tiles" },
      ]),
    ).toBe("failed");
    expect(
      trialRoleplayVerdictOf([
        { result: "correct", mode: "speech" },
        { result: "correct", mode: "speech" },
        { result: "correct", mode: "speech" },
      ]),
    ).toBe("passed");
  });
});
