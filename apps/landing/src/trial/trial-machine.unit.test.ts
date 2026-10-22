import { describe, expect, it } from "vitest";

import { initialTrialState, reduceTrial } from "./trial-machine";
import type { TrialAction, TrialState } from "./trial-machine.contract";
import type { TrialModel } from "./trial-model.contract";
import { run, speechCorrectTurn, stateAt, tilesTurn, u00TrialModel } from "./trial.test-support";

// `unit` 계층: 체험판 흐름 리듀서(순수). 모델은 실제 u00 사본으로 만든 것이다.
// 바뀔 것이 없는 행동은 같은 참조를 돌려준다(늦게 온 인식 결과 · 연타).

const next: TrialAction = { type: "next" };
const speak: TrialAction = { type: "speak" };
const heard = (...alternatives: string[]): TrialAction => ({ type: "heard", alternatives });
const failed = (
  reason: "no-speech" | "denied" | "unsupported" | "unavailable" | "aborted",
): TrialAction => ({
  type: "speech-failed",
  reason,
});
const reduce = (state: TrialState, action: TrialAction, model: TrialModel) =>
  reduceTrial(state, action, model);

describe("첫 탭 · 컷", () => {
  it("TR-B1 처음 상태 — 표지 없이 prologue · cut 0 · begun false · reached 비어 있음", () => {
    const state = initialTrialState();
    expect(state).toMatchObject({
      step: "prologue",
      cutIndex: 0,
      begun: false,
      reached: [],
      choice: { selected: null, verdict: null },
      cultureFace: "front",
      roleplay: { records: [], verdict: null },
    });
  });

  it("TR-B2 begin → begun · speech · reached [prologue], 두 번째 begin은 같은 참조", () => {
    const model = u00TrialModel();
    const begun = reduce(initialTrialState(), { type: "begin", speech: "supported" }, model);
    expect(begun).toMatchObject({
      step: "prologue",
      cutIndex: 0,
      begun: true,
      speech: "supported",
      reached: ["prologue"],
    });
    expect(reduce(begun, { type: "begin", speech: "unsupported" }, model)).toBe(begun);
    const unsupported = reduce(
      initialTrialState(),
      { type: "begin", speech: "unsupported" },
      model,
    );
    expect(unsupported.speech).toBe("unsupported");
  });

  it("TR-B2 begin이 정한 말하기 지원으로 롤플레이 첫 턴 모드가 정해진다", () => {
    const model = u00TrialModel();
    expect(stateAt("roleplay", model, "supported").roleplay.turn.mode).toBe("speech");
    expect(stateAt("roleplay", model, "unsupported").roleplay.turn.mode).toBe("tiles");
  });

  it("TR2 prologue next ×5 → cut 5, 여섯째 → vocab", () => {
    const model = u00TrialModel();
    const fifth = run(stateAt("prologue", model), [next, next, next, next, next], model);
    expect(fifth).toMatchObject({ step: "prologue", cutIndex: 5 });
    const vocab = reduce(fifth, next, model);
    expect(vocab.step).toBe("vocab");
    expect(vocab.reached).toEqual(["prologue", "vocab"]);
  });

  it("TR-C1 epilogue 4컷 → 마지막 next → clear(배너) → 다음 next에 곧바로 complete(예고 없음), complete의 next는 같은 참조", () => {
    const model = u00TrialModel();
    const epilogue = stateAt("epilogue", model);
    expect(epilogue).toMatchObject({ step: "epilogue", cutIndex: 0 });
    const fourth = run(epilogue, [next, next, next], model);
    expect(fourth).toMatchObject({ step: "epilogue", cutIndex: 3 });
    const banner = reduce(fourth, next, model);
    expect(banner).toMatchObject({ step: "clear" });
    expect(Object.keys(banner)).not.toContain("clearPhase");
    const complete = reduce(banner, next, model);
    expect(complete.step).toBe("complete");
    expect(complete.reached.slice(-3)).toEqual(["epilogue", "clear", "complete"]);
    expect(reduce(complete, next, model)).toBe(complete);
  });

  it("TR-C1 clear 안의 다른 행동은 같은 참조", () => {
    const model = u00TrialModel();
    const banner = stateAt("clear", model);
    expect(reduce(banner, { type: "flip" }, model)).toBe(banner);
    expect(reduce(banner, { type: "check" }, model)).toBe(banner);
  });
});

describe("고르기", () => {
  it("TR3 고르기 전 next · 범위 밖 choose는 같은 참조", () => {
    const model = u00TrialModel();
    const state = stateAt("image-match", model);
    expect(state.step).toBe("image-match");
    expect(reduce(state, next, model)).toBe(state);
    expect(reduce(state, { type: "choose", optionIndex: 9 }, model)).toBe(state);
    expect(reduce(state, { type: "choose", optionIndex: -1 }, model)).toBe(state);
  });

  it("TR3 오답 choose → verdict incorrect, 다시 choose는 같은 참조, next → reply-select · choice 초기화", () => {
    const model = u00TrialModel();
    const chosen = reduce(stateAt("image-match", model), { type: "choose", optionIndex: 1 }, model);
    expect(chosen.choice).toEqual({ selected: 1, verdict: "incorrect" });
    expect(reduce(chosen, { type: "choose", optionIndex: 0 }, model)).toBe(chosen);
    const replySelect = reduce(chosen, next, model);
    expect(replySelect.step).toBe("reply-select");
    expect(replySelect.choice).toEqual({ selected: null, verdict: null });
  });

  it("TR3 정답 자리(image-match 0 · reply-select 2)는 correct", () => {
    const model = u00TrialModel();
    expect(
      reduce(stateAt("image-match", model), { type: "choose", optionIndex: 0 }, model).choice,
    ).toEqual({
      selected: 0,
      verdict: "correct",
    });
    const reply = reduce(stateAt("reply-select", model), { type: "choose", optionIndex: 2 }, model);
    expect(reply.choice).toEqual({ selected: 2, verdict: "correct" });
    const culture = reduce(reply, next, model);
    expect(culture).toMatchObject({
      step: "culture",
      cultureFace: "front",
      choice: { selected: null, verdict: null },
    });
  });
});

describe("문화 카드 → 롤플레이", () => {
  it("TR4 flip 두 번 → 다시 front", () => {
    const model = u00TrialModel();
    const back = reduce(stateAt("culture", model), { type: "flip" }, model);
    expect(back.cultureFace).toBe("back");
    expect(reduce(back, { type: "flip" }, model).cultureFace).toBe("front");
  });

  it("TR4 next → roleplay 첫 턴 — 지원이면 speech, 아니면 tiles + notice unsupported", () => {
    const model = u00TrialModel();
    expect(stateAt("roleplay", model).roleplay.turn).toEqual({
      index: 0,
      mode: "speech",
      phase: "ready",
      heard: "",
      placed: [],
      verdict: null,
      hintShown: false,
      notice: null,
      spoken: null,
    });
    expect(stateAt("roleplay", model, "unsupported").roleplay.turn).toMatchObject({
      index: 0,
      mode: "tiles",
      phase: "ready",
      notice: "unsupported",
    });
  });
});

describe("롤플레이 — 말하기", () => {
  it("TR5 speak → listening, 대안 중 맞는 첫 것으로 correct, next → 다음 턴 · 기록", () => {
    const model = u00TrialModel();
    const listening = reduce(stateAt("roleplay", model), speak, model);
    expect(listening.roleplay.turn.phase).toBe("listening");
    const judged = reduce(listening, heard("안녕 하세요", "안녕하세요 네 처음이에요"), model);
    expect(judged.roleplay.turn).toMatchObject({
      phase: "judged",
      verdict: "correct",
      heard: "안녕하세요 네 처음이에요",
    });
    const second = reduce(judged, next, model);
    expect(second.roleplay.turn).toMatchObject({
      index: 1,
      mode: "speech",
      phase: "ready",
      verdict: null,
    });
    expect(second.roleplay.records).toEqual([{ result: "correct", mode: "speech" }]);
  });

  it("TR6 오답 → incorrect · heard = 첫 대안, next는 같은 참조, retry → ready", () => {
    const model = u00TrialModel();
    const wrong = run(stateAt("roleplay", model), [speak, heard("감사합니다", "감사")], model);
    expect(wrong.roleplay.turn).toMatchObject({
      phase: "judged",
      verdict: "incorrect",
      heard: "감사합니다",
    });
    expect(reduce(wrong, next, model)).toBe(wrong);
    const retried = reduce(wrong, { type: "retry" }, model);
    expect(retried.roleplay.turn).toMatchObject({ phase: "ready", heard: "", verdict: null });
  });

  it('TR6 빈 대안 · no-speech → judged · heard "" · incorrect, aborted → ready', () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model);
    expect(run(rp, [speak, heard()], model).roleplay.turn).toMatchObject({
      phase: "judged",
      heard: "",
      verdict: "incorrect",
    });
    expect(run(rp, [speak, failed("no-speech")], model).roleplay.turn).toMatchObject({
      phase: "judged",
      heard: "",
      verdict: "incorrect",
    });
    expect(run(rp, [speak, failed("aborted")], model).roleplay.turn).toMatchObject({
      phase: "ready",
      verdict: null,
    });
  });

  it("TR7 denied(ready · listening) → speech denied · 이 턴 tiles · 다음 턴도 tiles + notice denied", () => {
    const model = u00TrialModel();
    for (const before of [[], [speak]] as TrialAction[][]) {
      const denied = run(stateAt("roleplay", model), [...before, failed("denied")], model);
      expect(denied.speech).toBe("denied");
      expect(denied.roleplay.turn).toMatchObject({
        index: 0,
        mode: "tiles",
        phase: "ready",
        notice: "denied",
      });
      const second = run(denied, tilesTurn([2, 0, 1]), model);
      expect(second.roleplay.turn).toMatchObject({ index: 1, mode: "tiles", notice: "denied" });
      expect(second.roleplay.records).toEqual([{ result: "correct", mode: "tiles" }]);
    }
  });

  it("TR7 unavailable → 이 턴만 tiles(notice unavailable), 다음 턴은 다시 speech", () => {
    const model = u00TrialModel();
    const unavailable = run(stateAt("roleplay", model), [speak, failed("unavailable")], model);
    expect(unavailable.speech).toBe("supported");
    expect(unavailable.roleplay.turn).toMatchObject({ mode: "tiles", notice: "unavailable" });
    const second = run(unavailable, tilesTurn([2, 0, 1]), model);
    expect(second.roleplay.turn).toMatchObject({ index: 1, mode: "speech", notice: null });
  });

  it("TR7 unsupported → speech unsupported, 이후 턴 전부 tiles + notice unsupported", () => {
    const model = u00TrialModel();
    const unsupported = run(stateAt("roleplay", model), [speak, failed("unsupported")], model);
    expect(unsupported.speech).toBe("unsupported");
    expect(unsupported.roleplay.turn).toMatchObject({ mode: "tiles", notice: "unsupported" });
    const third = run(unsupported, [...tilesTurn([2, 0, 1]), ...tilesTurn([1, 0])], model);
    expect(third.roleplay.turn).toMatchObject({ index: 2, mode: "tiles", notice: "unsupported" });
  });

  it("TR8 cant-speak(ready · judged incorrect) → tiles · ready · notice null, judged correct에서는 같은 참조", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model);
    expect(reduce(rp, { type: "cant-speak" }, model).roleplay.turn).toMatchObject({
      mode: "tiles",
      phase: "ready",
      notice: null,
    });
    const wrong = run(rp, [speak, heard("감사합니다")], model);
    expect(reduce(wrong, { type: "cant-speak" }, model).roleplay.turn).toMatchObject({
      mode: "tiles",
      phase: "ready",
      notice: null,
      verdict: null,
    });
    const right = run(rp, [speak, heard("안녕하세요 네 처음이에요")], model);
    expect(reduce(right, { type: "cant-speak" }, model)).toBe(right);
  });
});

describe("롤플레이 — 발음 기준 판정(r3)", () => {
  it("TR-L1 발음 기준으로만 맞는 대안 → correct(Great) · heard = 그 대안 · spoken lenient", () => {
    const model = u00TrialModel();
    const judged = run(
      stateAt("roleplay", model),
      [speak, heard("안녕 가세요", "안녕하세요 네 처음 이에요")],
      model,
    );
    expect(judged.roleplay.turn).toMatchObject({
      phase: "judged",
      verdict: "correct",
      heard: "안녕하세요 네 처음 이에요",
      spoken: {
        outcome: "lenient",
        similarity: 1,
        heard: "안녕하세요 네 처음 이에요",
        expected: "안녕하세요! 네, 처음이에요!",
      },
    });
    const second = reduce(judged, next, model);
    expect(second.roleplay.turn).toMatchObject({ index: 1, phase: "ready", spoken: null });
    expect(second.roleplay.records).toEqual([{ result: "correct", mode: "speech" }]);
  });

  it("TR-L1 앱 규칙으로 맞으면 spoken strict, 오답이면 incorrect · heard 첫 대안 · 가장 가까운 일치도", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model);
    expect(run(rp, [speak, heard("안녕하세요 네 처음이에요")], model).roleplay.turn.spoken).toEqual(
      {
        outcome: "strict",
        similarity: 1,
        heard: "안녕하세요 네 처음이에요",
        expected: "안녕하세요! 네, 처음이에요!",
      },
    );
    const wrong = run(rp, [speak, heard("안녕하세요", "처음이에요")], model);
    expect(wrong.roleplay.turn).toMatchObject({
      verdict: "incorrect",
      heard: "안녕하세요",
      spoken: { outcome: "incorrect", similarity: 0.684, heard: "안녕하세요" },
    });
  });

  it("TR-L1 retry · cant-speak · 실패는 spoken null", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model);
    const wrong = run(rp, [speak, heard("감사합니다")], model);
    expect(wrong.roleplay.turn.spoken?.outcome).toBe("incorrect");
    expect(reduce(wrong, { type: "retry" }, model).roleplay.turn.spoken).toBeNull();
    expect(reduce(wrong, { type: "cant-speak" }, model).roleplay.turn.spoken).toBeNull();
    expect(run(rp, [speak, failed("no-speech")], model).roleplay.turn.spoken).toBeNull();
  });
});

describe("롤플레이 — 타일", () => {
  const toggle = (tileIndex: number): TrialAction => ({ type: "toggle-tile", tileIndex });

  it("TR9 toggle-tile은 넣고 빼고, 다 놓기 전 check는 같은 참조", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model, "unsupported");
    expect(run(rp, [toggle(0)], model).roleplay.turn.placed).toEqual([0]);
    expect(run(rp, [toggle(0), toggle(0)], model).roleplay.turn.placed).toEqual([]);
    const partial = run(rp, [toggle(2), toggle(0)], model);
    expect(partial.roleplay.turn.placed).toEqual([2, 0]);
    expect(reduce(partial, { type: "check" }, model)).toBe(partial);
  });

  it("TR9 다 놓으면 check → judged(바른 순서 correct), judged 뒤 toggle은 같은 참조", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model, "unsupported");
    const judged = run(rp, [toggle(2), toggle(0), toggle(1), { type: "check" }], model);
    expect(judged.roleplay.turn).toMatchObject({ phase: "judged", verdict: "correct" });
    expect(reduce(judged, toggle(0), model)).toBe(judged);
  });

  it("TR9 타일 오답도 next로 넘어가고 기록된다", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model, "unsupported");
    const wrong = run(rp, [toggle(0), toggle(1), toggle(2), { type: "check" }], model);
    expect(wrong.roleplay.turn.verdict).toBe("incorrect");
    const second = reduce(wrong, next, model);
    expect(second.roleplay.turn.index).toBe(1);
    expect(second.roleplay.records).toEqual([{ result: "incorrect", mode: "tiles" }]);
  });

  it("TR9 말하기 턴의 toggle-tile · check는 같은 참조", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model);
    expect(reduce(rp, toggle(0), model)).toBe(rp);
    expect(reduce(rp, { type: "check" }, model)).toBe(rp);
  });
});

describe("롤플레이 끝 → 엔딩", () => {
  it("TR10 2/3 정답 → epilogue · cut 0 · verdict passed", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model, "unsupported");
    const done = run(rp, [...tilesTurn([0, 1, 2]), ...tilesTurn([1, 0]), ...tilesTurn([0])], model);
    expect(done).toMatchObject({ step: "epilogue", cutIndex: 0 });
    expect(done.roleplay.verdict).toBe("passed");
    expect(done.roleplay.records.map((record) => record.result)).toEqual([
      "incorrect",
      "correct",
      "correct",
    ]);
    expect(done.reached).toContain("epilogue");
  });

  it("TR10 1/3 정답 → 역시 epilogue · cut 0 · verdict failed, 그 뒤는 보통 엔딩 흐름(4컷 → clear 둘 → complete)", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model, "unsupported");
    const done = run(rp, [...tilesTurn([0, 1, 2]), ...tilesTurn([0, 1]), ...tilesTurn([0])], model);
    expect(done).toMatchObject({ step: "epilogue", cutIndex: 0 });
    expect(done.roleplay.verdict).toBe("failed");
    expect(reduce(done, { type: "retry" }, model)).toBe(done);
    expect(run(done, [next, next, next, next], model)).toMatchObject({ step: "clear" });
    expect(run(done, [next, next, next, next, next], model).step).toBe("complete");
  });

  it("TR10 말하기 세 턴을 모두 맞히면 passed", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model);
    const done = run(
      rp,
      [...speechCorrectTurn(0), ...speechCorrectTurn(1), ...speechCorrectTurn(2)],
      model,
    );
    expect(done.step).toBe("epilogue");
    expect(done.roleplay.verdict).toBe("passed");
    expect(done.roleplay.records).toEqual([
      { result: "correct", mode: "speech" },
      { result: "correct", mode: "speech" },
      { result: "correct", mode: "speech" },
    ]);
  });
});

describe("같은 참조", () => {
  it("TR11 hint → hintShown, 두 번째 hint는 같은 참조", () => {
    const model = u00TrialModel();
    const hinted = reduce(stateAt("roleplay", model), { type: "hint" }, model);
    expect(hinted.roleplay.turn.hintShown).toBe(true);
    expect(reduce(hinted, { type: "hint" }, model)).toBe(hinted);
  });

  it("TR11 ready에서 늦게 온 heard · no-speech는 같은 참조", () => {
    const model = u00TrialModel();
    const rp = stateAt("roleplay", model);
    expect(reduce(rp, heard("안녕하세요 네 처음이에요"), model)).toBe(rp);
    expect(reduce(rp, failed("no-speech"), model)).toBe(rp);
    expect(reduce(rp, { type: "retry" }, model)).toBe(rp);
  });

  it("TR11 다른 단계의 롤플레이 행동은 같은 참조", () => {
    const model = u00TrialModel();
    const vocab = stateAt("vocab", model);
    for (const action of [
      speak,
      { type: "flip" },
      { type: "hint" },
      { type: "choose", optionIndex: 0 },
    ] as TrialAction[]) {
      expect(reduce(vocab, action, model)).toBe(vocab);
    }
  });
});
