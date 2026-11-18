import { expect, test } from "vitest";

import { missionGraderModelEnv, missionModelsFrom } from "./mission-env.ts";
import { scoringFixtures } from "./mission-fixtures.ts";
import { defaultMissionScoring, roundHalfUp, scoreMission } from "./mission-score.ts";

test.each(scoringFixtures.map((fixture) => [fixture.name, fixture] as const))(
  "SC1. %s",
  (_name, fixture) => {
    const score = scoreMission(fixture);
    expect({
      task: score.task,
      expression: score.expression,
      total: score.total,
      outcome: score.outcome,
    }).toEqual(fixture.expected);
  },
);

test("SC2. 가중치 · 감점은 인자 — 바꾸면 최종 점수만 바뀐다", () => {
  const [input] = scoringFixtures;
  if (input === undefined) throw new Error("사례 없음");
  const custom = scoreMission(input, {
    weights: { task: 1, accuracy: 0, expression: 0 },
    hintPenalty: 10,
  });
  expect(custom.total).toBe(75);
  expect(
    scoreMission({ ...input, hintsUsed: 1 }, { ...defaultMissionScoring, hintPenalty: 10 }).total,
  ).toBe(63);
});

test("SC3. 정확도 · 쓴 표현 수는 범위로 자르고, 100을 넘지 않는다", () => {
  const base = { goals: [{ required: true, done: true }], expressionsTotal: 1, hintsUsed: 0 };
  expect(scoreMission({ ...base, accuracy: 140, expressionsUsed: 5 }).accuracy).toBe(100);
  expect(scoreMission({ ...base, accuracy: -3, expressionsUsed: -1 }).expression).toBe(0);
  expect(scoreMission({ ...base, accuracy: Number.NaN, expressionsUsed: 1 }).accuracy).toBe(0);
  expect(
    scoreMission(
      { ...base, accuracy: 100, expressionsUsed: 1 },
      { weights: { task: 1, accuracy: 1, expression: 1 }, hintPenalty: 0 },
    ).total,
  ).toBe(100);
});

test("SC4. 반올림은 0.5에서 올리고 부동소수 오차를 먼저 정리한다", () => {
  expect(roundHalfUp(36.5)).toBe(37);
  expect(roundHalfUp(72.49999999999999)).toBe(73);
  expect(roundHalfUp(72.4)).toBe(72);
  expect(roundHalfUp(0)).toBe(0);
});

test("SC5. 모델 이름 — 코드 기본값과 환경 값의 사슬, 채점은 비우면 답 모델", () => {
  expect(missionModelsFrom(() => undefined)).toEqual({
    turnModel: "claude-opus-5-5",
    feedbackModel: "claude-opus-5-5",
    hintModel: "claude-opus-5-5",
    graderModel: "claude-opus-5-5",
  });
  const env: Record<string, string> = {
    COMPANION_MODEL: "m-turn",
    COMPANION_MODERATION_MODEL: "m-small",
    COMPANION_SUGGEST_MODEL: " ",
    [missionGraderModelEnv]: "m-big",
  };
  expect(missionModelsFrom((name) => env[name])).toEqual({
    turnModel: "m-turn",
    feedbackModel: "m-small",
    hintModel: "m-small",
    graderModel: "m-big",
  });
  expect(
    missionModelsFrom((name) => (name === "COMPANION_MODEL" ? "m-turn" : undefined)).graderModel,
  ).toBe("m-turn");
});
