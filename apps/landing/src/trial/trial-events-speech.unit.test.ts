import { describe, expect, it } from "vitest";

import type { AnalyticsEvent } from "../scripts/analytics.contract";
import {
  latencyBucketOf,
  trialExitEventOf,
  trialGtagParamsOf,
  trialSpeechAttemptOf,
} from "./trial-events";
import { reduceTrial } from "./trial-machine";
import type { SpeechFailure, TrialAction, TrialState } from "./trial-machine.contract";
import type { TrialModel } from "./trial-model.contract";
import { run, speechCorrectTurn, stateAt, u00TrialModel } from "./trial.test-support";

// `unit` 계층: 말하기 시도 · 나가기 이벤트와 gtag 공통 속성(순수). 들은 글 · 정답은 싣지 않는다.

const speak: TrialAction = { type: "speak" };
const heard = (...alternatives: string[]): TrialAction => ({ type: "heard", alternatives });
const failed = (reason: SpeechFailure): TrialAction => ({ type: "speech-failed", reason });

/** 듣는 중인 턴(`turn` 번째)에서 action 하나 → 시도 이벤트. */
function attempt(model: TrialModel, action: TrialAction, turn = 0, latencyMs = 1500) {
  const before = run(
    stateAt("roleplay", model),
    [...Array.from({ length: turn }, (_, index) => speechCorrectTurn(index)).flat(), speak],
    model,
  );
  return trialSpeechAttemptOf(before, reduceTrial(before, action, model), action, latencyMs);
}

describe("EV-S1 trialSpeechAttemptOf", () => {
  it("판정 셋 — strict · lenient · incorrect", () => {
    const model = u00TrialModel();
    expect(attempt(model, heard("안녕하세요 네 처음이에요"))).toEqual({
      name: "trial_speech_attempt",
      params: { turn: "1", outcome: "strict", latency_bucket: "0-2s" },
    });
    expect(attempt(model, heard("감사함니다 진짜요"), 1, 2500)).toEqual({
      name: "trial_speech_attempt",
      params: { turn: "2", outcome: "lenient", latency_bucket: "2-4s" },
    });
    expect(attempt(model, heard("언제부터요"), 2, 9000)).toEqual({
      name: "trial_speech_attempt",
      params: { turn: "3", outcome: "incorrect", latency_bucket: "8s+" },
    });
  });

  it("실패 넷 — no-speech · denied · unavailable · aborted, 언어 미지원은 unavailable", () => {
    const model = u00TrialModel();
    const outcomeOf = (reason: SpeechFailure) =>
      (attempt(model, failed(reason)) as Extract<AnalyticsEvent, { name: "trial_speech_attempt" }>)
        .params.outcome;
    expect(outcomeOf("no-speech")).toBe("no-speech");
    expect(outcomeOf("denied")).toBe("denied");
    expect(outcomeOf("unavailable")).toBe("unavailable");
    expect(outcomeOf("aborted")).toBe("aborted");
    expect(outcomeOf("unsupported")).toBe("unavailable");
  });

  it("듣는 중이 아니면 · 같은 참조면 · 다른 행동이면 null", () => {
    const model = u00TrialModel();
    const ready = stateAt("roleplay", model);
    const late = heard("안녕하세요 네 처음이에요");
    expect(trialSpeechAttemptOf(ready, reduceTrial(ready, late, model), late, 100)).toBeNull();
    const listening = reduceTrial(ready, speak, model);
    expect(trialSpeechAttemptOf(ready, listening, speak, 0)).toBeNull();
    const hint: TrialAction = { type: "hint" };
    expect(
      trialSpeechAttemptOf(listening, reduceTrial(listening, hint, model), hint, 0),
    ).toBeNull();
    expect(trialSpeechAttemptOf(listening, listening, late, 100)).toBeNull();
  });
});

describe("EV-S2 latencyBucketOf", () => {
  it.each([
    [0, "0-2s"],
    [1999, "0-2s"],
    [2000, "2-4s"],
    [3999, "2-4s"],
    [4000, "4-6s"],
    [6000, "6-8s"],
    [7999, "6-8s"],
    [8000, "8s+"],
    [60_000, "8s+"],
    [-5, "0-2s"],
    [Number.NaN, "0-2s"],
  ] as const)("%s ms → %s", (ms, bucket) => {
    expect(latencyBucketOf(ms)).toBe(bucket);
  });
});

describe("EV-S3 나가기 · gtag 공통 속성", () => {
  it("trialExitEventOf — 지금 단계", () => {
    const model = u00TrialModel();
    expect(trialExitEventOf(stateAt("culture", model))).toEqual({
      name: "trial_exit",
      params: { step: "culture" },
    });
    expect(trialExitEventOf(stateAt("roleplay", model)).params).toEqual({ step: "roleplay" });
  });

  it("trialGtagParamsOf — 속성 + browser, 원본 이벤트는 그대로", () => {
    const event: AnalyticsEvent = { name: "trial_step", params: { step: "vocab", ordinal: "2" } };
    expect(trialGtagParamsOf(event, { browser: "ios-safari" })).toEqual({
      step: "vocab",
      ordinal: "2",
      browser: "ios-safari",
    });
    expect(event.params).toEqual({ step: "vocab", ordinal: "2" });
  });

  it("시도 · 나가기 이벤트 속성에 한글 · @ 없음", () => {
    const model = u00TrialModel();
    const events = [
      attempt(model, heard("안녕하세요 네 처음 이에요")),
      attempt(model, heard("누구세요 test@example.com")),
      trialExitEventOf(stateAt("roleplay", model) as TrialState),
    ];
    for (const event of events) {
      for (const value of Object.values(event?.params ?? {})) {
        expect(value).not.toMatch(/[ᄀ-ᇿ㄰-㆏가-힣]/);
        expect(value).not.toContain("@");
      }
    }
  });
});
