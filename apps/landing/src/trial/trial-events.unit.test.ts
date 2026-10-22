import { describe, expect, it } from "vitest";

import type { AnalyticsEvent } from "../scripts/analytics.contract";
import { trialEventsOf, trialStoreClickOf } from "./trial-events";
import { initialTrialState, reduceTrial } from "./trial-machine";
import type { TrialAction, TrialState } from "./trial-machine.contract";
import type { TrialModel } from "./trial-model.contract";
import {
  actionsTo,
  run,
  speechCorrectTurn,
  stateAt,
  tilesTurn,
  trace,
  u00TrialModel,
} from "./trial.test-support";

// `unit` 계층: 체험판 전이 → GA4 이벤트(순수). 들은 문장 · 대사 · 이름은 싣지 않는다.

const next: TrialAction = { type: "next" };
const cantSpeak: TrialAction = { type: "cant-speak" };

const eventsOf = (prev: TrialState, action: TrialAction, model: TrialModel) =>
  trialEventsOf(prev, reduceTrial(prev, action, model), action);

/** 흐름 전체의 이벤트를 차례로. */
function eventsAlong(
  state: TrialState,
  actions: readonly TrialAction[],
  model: TrialModel,
): AnalyticsEvent[] {
  return trace(state, actions, model).flatMap(({ prev, next: after, action }) => [
    ...trialEventsOf(prev, after, action),
  ]);
}

/** 말하기 2(1 · 2턴) + 타일 오답 1(첫 턴) — 2/3 passed. */
function mixedTurns(): TrialAction[] {
  return [cantSpeak, ...tilesTurn([0, 1, 2]), ...speechCorrectTurn(1), ...speechCorrectTurn(2)];
}

/** 타일 1/3 — failed. */
function failingTiles(): TrialAction[] {
  return [...tilesTurn([0, 1, 2]), ...tilesTurn([0, 1]), ...tilesTurn([0])];
}

describe("trialEventsOf", () => {
  it("EV1 start → trial_start(speech) · trial_step(prologue, 1)", () => {
    const model = u00TrialModel();
    expect(eventsOf(initialTrialState("supported"), { type: "start" }, model)).toEqual([
      { name: "trial_start", params: { speech: "supported" } },
      { name: "trial_step", params: { step: "prologue", ordinal: "1" } },
    ]);
    expect(eventsOf(initialTrialState("unsupported"), { type: "start" }, model)[0]).toEqual({
      name: "trial_start",
      params: { speech: "unsupported" },
    });
  });

  it("EV1 바뀌지 않은 전이 · 같은 단계 안의 전이는 이벤트가 없다", () => {
    const model = u00TrialModel();
    const started = stateAt("prologue", model);
    expect(eventsOf(started, { type: "start" }, model)).toEqual([]);
    expect(eventsOf(started, next, model)).toEqual([]);
    expect(eventsOf(stateAt("culture", model), { type: "flip" }, model)).toEqual([]);
  });

  it("EV2 처음부터 끝까지 trial_step은 단계마다 한 번 · ordinal 1 ~ 8 차례", () => {
    const model = u00TrialModel();
    const events = eventsAlong(
      initialTrialState("supported"),
      actionsTo("complete", "supported"),
      model,
    );
    const steps = events
      .filter((event) => event.name === "trial_step")
      .map((event) => event.params);
    expect(steps).toEqual([
      { step: "prologue", ordinal: "1" },
      { step: "vocab", ordinal: "2" },
      { step: "image-match", ordinal: "3" },
      { step: "reply-select", ordinal: "4" },
      { step: "culture", ordinal: "5" },
      { step: "roleplay", ordinal: "6" },
      { step: "epilogue", ordinal: "7" },
      { step: "complete", ordinal: "8" },
    ]);
    expect(events.filter((event) => event.name === "trial_start")).toHaveLength(1);
  });

  it("EV2 롤플레이 턴 사이 next는 trial_step을 다시 내지 않는다", () => {
    const model = u00TrialModel();
    const judged = run(stateAt("roleplay", model), speechCorrectTurn(0).slice(0, -1), model);
    expect(eventsOf(judged, next, model)).toEqual([]);
  });

  it("EV3 마지막 턴 next → trial_roleplay_result 다음 trial_step(epilogue, 7)", () => {
    const model = u00TrialModel();
    const lastJudged = run(stateAt("roleplay", model), mixedTurns().slice(0, -1), model);
    expect(eventsOf(lastJudged, next, model)).toEqual([
      {
        name: "trial_roleplay_result",
        params: {
          verdict: "passed",
          correct: "2",
          by_speech: "2",
          by_tiles: "1",
          speech: "supported",
        },
      },
      { name: "trial_step", params: { step: "epilogue", ordinal: "7" } },
    ]);
  });

  it("EV3 실패해도 결과 다음 epilogue 단계 이벤트가 나온다", () => {
    const model = u00TrialModel();
    const lastJudged = run(
      stateAt("roleplay", model, "unsupported"),
      failingTiles().slice(0, -1),
      model,
    );
    expect(eventsOf(lastJudged, next, model)).toEqual([
      {
        name: "trial_roleplay_result",
        params: {
          verdict: "failed",
          correct: "1",
          by_speech: "0",
          by_tiles: "3",
          speech: "unsupported",
        },
      },
      { name: "trial_step", params: { step: "epilogue", ordinal: "7" } },
    ]);
  });

  it("EV3 거부된 뒤의 결과는 speech denied", () => {
    const model = u00TrialModel();
    const actions: TrialAction[] = [
      { type: "speech-failed", reason: "denied" },
      ...tilesTurn([2, 0, 1]),
      ...tilesTurn([1, 0]),
      ...tilesTurn([0]).slice(0, -1),
    ];
    const lastJudged = run(stateAt("roleplay", model), actions, model);
    expect(eventsOf(lastJudged, next, model)[0]).toEqual({
      name: "trial_roleplay_result",
      params: { verdict: "passed", correct: "3", by_speech: "0", by_tiles: "3", speech: "denied" },
    });
  });

  it("EV4 epilogue → complete: trial_step(complete, 8) 다음 trial_complete(verdict)", () => {
    const model = u00TrialModel();
    const lastCut = run(stateAt("epilogue", model), [next], model);
    expect(eventsOf(lastCut, next, model)).toEqual([
      { name: "trial_step", params: { step: "complete", ordinal: "8" } },
      { name: "trial_complete", params: { verdict: "passed" } },
    ]);
    const failedCut = run(
      stateAt("roleplay", model, "unsupported"),
      [...failingTiles(), next],
      model,
    );
    expect(eventsOf(failedCut, next, model)).toEqual([
      { name: "trial_step", params: { step: "complete", ordinal: "8" } },
      { name: "trial_complete", params: { verdict: "failed" } },
    ]);
  });
});

describe("trialStoreClickOf", () => {
  it("EV5 ios · android → trial_store_click, 모르는 값 · 없음 → null", () => {
    expect(trialStoreClickOf("ios")).toEqual({
      name: "trial_store_click",
      params: { store: "ios" },
    });
    expect(trialStoreClickOf("android")).toEqual({
      name: "trial_store_click",
      params: { store: "android" },
    });
    expect(trialStoreClickOf(undefined)).toBeNull();
    expect(trialStoreClickOf("web")).toBeNull();
    expect(trialStoreClickOf("")).toBeNull();
  });
});

describe("이벤트 속성", () => {
  it("EV6 모든 이벤트의 속성 값은 문자열이고 한글이 없다", () => {
    const model = u00TrialModel();
    const all: AnalyticsEvent[] = [
      ...eventsAlong(initialTrialState("supported"), actionsTo("complete", "supported"), model),
      ...eventsAlong(initialTrialState("unsupported"), actionsTo("complete", "unsupported"), model),
      ...eventsAlong(
        initialTrialState("supported"),
        [...actionsTo("roleplay", "supported"), ...mixedTurns(), next, next],
        model,
      ),
      ...eventsAlong(
        initialTrialState("unsupported"),
        [...actionsTo("roleplay", "unsupported"), ...failingTiles(), next, next],
        model,
      ),
      ...[trialStoreClickOf("ios"), trialStoreClickOf("android")].filter(
        (event): event is AnalyticsEvent => event !== null,
      ),
    ];
    const names = new Set(all.map((event) => event.name));
    expect([...names].sort()).toEqual(
      [
        "trial_complete",
        "trial_roleplay_result",
        "trial_start",
        "trial_step",
        "trial_store_click",
      ].sort(),
    );
    for (const event of all) {
      for (const value of Object.values(event.params)) {
        expect(typeof value).toBe("string");
        expect(value).not.toMatch(/[ᄀ-ᇿ㄰-㆏가-힣]/);
      }
    }
  });
});
