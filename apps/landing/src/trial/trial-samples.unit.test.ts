import { describe, expect, it } from "vitest";

import { reduceTrial } from "./trial-machine";
import type { TrialAction } from "./trial-machine.contract";
import {
  resolveSamplesConfig,
  trialSampleOf,
  trialSampleRequestOf,
  trialSampleRowOf,
} from "./trial-samples";
import type { TrialSample, TrialSampleContext } from "./trial-samples.contract";
import { run, speechCorrectTurn, stateAt, u00TrialModel } from "./trial.test-support";

// `unit` 계층: 인식 글자 수집의 순수 함수 — 무엇을 언제 보내는가 · 본문 모양 · 빌드 설정.

const speak: TrialAction = { type: "speak" };
const heard = (...alternatives: string[]): TrialAction => ({ type: "heard", alternatives });

const CONTEXT: TrialSampleContext = {
  sessionId: "6f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f",
  episodeVersion: "u00-tutorial@1",
  browser: "android-chrome",
  locale: "ko",
};

describe("SM1 trialSampleOf", () => {
  it("듣는 중 → heard 판정 전이마다 시도 하나(대안 전부 · 가까운 정답 · 결과 · 일치도)", () => {
    const model = u00TrialModel();
    const listening = run(stateAt("roleplay", model), [speak], model);
    const action = heard("안녕 가세요", "안녕하세요 네 처음 이에요");
    expect(trialSampleOf(listening, reduceTrial(listening, action, model), action)).toEqual({
      turnIndex: 0,
      expected: "안녕하세요! 네, 처음이에요!",
      alternatives: ["안녕 가세요", "안녕하세요 네 처음 이에요"],
      outcome: "lenient",
      similarity: 1,
    });
    const second = run(stateAt("roleplay", model), [...speechCorrectTurn(0), speak], model);
    const wrong = heard("죄송합니다");
    expect(trialSampleOf(second, reduceTrial(second, wrong, model), wrong)).toMatchObject({
      turnIndex: 1,
      expected: "진짜요? 감사합니다!",
      alternatives: ["죄송합니다"],
      outcome: "incorrect",
    });
  });

  it("실패 · 타일 · 듣는 중 아님 · 같은 참조 · 빈 대안은 null", () => {
    const model = u00TrialModel();
    const ready = stateAt("roleplay", model);
    const listening = reduceTrial(ready, speak, model);
    const noSpeech: TrialAction = { type: "speech-failed", reason: "no-speech" };
    expect(trialSampleOf(listening, reduceTrial(listening, noSpeech, model), noSpeech)).toBeNull();
    const late = heard("지금부터요");
    expect(trialSampleOf(ready, reduceTrial(ready, late, model), late)).toBeNull();
    expect(trialSampleOf(listening, listening, late)).toBeNull();
    const empty = heard();
    expect(trialSampleOf(listening, reduceTrial(listening, empty, model), empty)).toBeNull();
    const tiles = stateAt("roleplay", model, "unsupported");
    const check: TrialAction = { type: "check" };
    expect(trialSampleOf(tiles, reduceTrial(tiles, check, model), check)).toBeNull();
  });
});

describe("SM2 trialSampleRowOf", () => {
  const sample: TrialSample = {
    turnIndex: 2,
    expected: "지금부터요!",
    alternatives: ["지금 부터요", "지금부터 요", "치금부터요"],
    outcome: "lenient",
    similarity: 0.94444,
  };

  it("열 아홉 — 문맥 + 시도, 일치도 소수 셋째", () => {
    const row = trialSampleRowOf(sample, CONTEXT);
    expect(row).toEqual({
      session_id: CONTEXT.sessionId,
      episode_version: "u00-tutorial@1",
      turn_index: 2,
      expected: "지금부터요!",
      alternatives: ["지금 부터요", "지금부터 요", "치금부터요"],
      outcome: "lenient",
      similarity: 0.944,
      browser: "android-chrome",
      locale: "ko",
    });
    expect(Object.keys(row).sort()).toEqual(
      [
        "alternatives",
        "browser",
        "episode_version",
        "expected",
        "locale",
        "outcome",
        "session_id",
        "similarity",
        "turn_index",
      ].sort(),
    );
  });

  it("글은 앞뒤 공백 뒤 200자 · 대안은 앞 셋 · 빈 대안은 뺀다 · 일치도는 0~1", () => {
    const long = "가".repeat(260);
    const row = trialSampleRowOf(
      {
        ...sample,
        expected: `  ${long}  `,
        alternatives: [" 하나 ", "", long, "넷", "다섯"],
        similarity: 1.2,
      },
      CONTEXT,
    );
    expect(row.expected).toBe("가".repeat(200));
    expect(row.alternatives).toEqual(["하나", "가".repeat(200), "넷"]);
    expect(row.similarity).toBe(1);
    expect(trialSampleRowOf({ ...sample, similarity: -0.1 }, CONTEXT).similarity).toBe(0);
  });
});

describe("SM3 trialSampleRequestOf", () => {
  it("PostgREST insert — apikey · JSON · return=minimal · keepalive · credentials omit · Authorization 없음", () => {
    const config = {
      endpoint: "https://proj.example.test/rest/v1/trial_speech_samples",
      apiKey: "sb_publishable_test_key_0000000000",
    };
    const row = trialSampleRowOf(
      {
        turnIndex: 0,
        expected: "지금부터요!",
        alternatives: ["지금 부터요"],
        outcome: "lenient",
        similarity: 1,
      },
      CONTEXT,
    );
    const request = trialSampleRequestOf(config, row);
    expect(request.url).toBe(config.endpoint);
    expect(request.init).toMatchObject({
      method: "POST",
      credentials: "omit",
      keepalive: true,
      headers: {
        apikey: config.apiKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
    });
    expect(Object.keys(request.init.headers).map((key) => key.toLowerCase())).not.toContain(
      "authorization",
    );
    expect(JSON.parse(request.init.body)).toEqual(row);
  });
});

describe("SM4 resolveSamplesConfig", () => {
  it("URL · 공개 키가 둘 다 있으면 <url>/rest/v1/trial_speech_samples(끝 / 없음)", () => {
    expect(
      resolveSamplesConfig("https://proj.supabase.co/", " sb_publishable_test_key_0000000000 "),
    ).toEqual({
      endpoint: "https://proj.supabase.co/rest/v1/trial_speech_samples",
      apiKey: "sb_publishable_test_key_0000000000",
    });
  });

  it("어느 하나라도 없으면 null, 키 모양이 틀리면 던진다(값은 싣지 않음)", () => {
    expect(resolveSamplesConfig("https://proj.supabase.co", "")).toBeNull();
    expect(resolveSamplesConfig("https://proj.supabase.co", undefined)).toBeNull();
    expect(resolveSamplesConfig("", "sb_publishable_test_key_0000000000")).toBeNull();
    expect(() => resolveSamplesConfig("https://proj.supabase.co", "bad key value here!!")).toThrow(
      /PUBLIC_SUPABASE_ANON_KEY/,
    );
    try {
      resolveSamplesConfig("https://proj.supabase.co", "bad key value here!!");
    } catch (error) {
      expect(String(error)).not.toContain("bad key value");
    }
  });
});
