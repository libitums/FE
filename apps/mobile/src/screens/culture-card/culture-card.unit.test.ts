import { describe, expect, test } from "vitest";

import type { LessonPosition } from "../learning/activity-finish";
import {
  cultureCardSessionReducer,
  cultureCardStepOf,
  initialCultureCardSessionState,
} from "./culture-card";

// `unit` 계층: 문화 카드 활동의 걸음 계산과 리듀서만 봅니다(순수 함수).

const middle: LessonPosition = { offset: 0, total: 6, last: false };
const lastActivity: LessonPosition = { offset: 3, total: 6, last: true };

describe("cultureCardStepOf (CC1)", () => {
  test.each([
    [0, "advance"],
    [1, "advance"],
    [2, "finish"],
  ] as const)("CC1. 레슨 없이 3장 중 %s번째는 %s다", (cardIndex, expected) => {
    expect(cultureCardStepOf(undefined, cardIndex, 3)).toBe(expected);
  });

  test("CC1. 레슨 중간(last: false)의 마지막 카드는 hand-off다", () => {
    expect(cultureCardStepOf(middle, 0, 3)).toBe("advance");
    expect(cultureCardStepOf(middle, 1, 3)).toBe("advance");
    expect(cultureCardStepOf(middle, 2, 3)).toBe("hand-off");
  });

  test("CC1. 레슨 끝(last: true)의 마지막 카드는 finish다", () => {
    expect(cultureCardStepOf(lastActivity, 1, 3)).toBe("advance");
    expect(cultureCardStepOf(lastActivity, 2, 3)).toBe("finish");
  });

  test("CC1. 카드가 한 장뿐이면 곧바로 finish 또는 hand-off다", () => {
    expect(cultureCardStepOf(undefined, 0, 1)).toBe("finish");
    expect(cultureCardStepOf(lastActivity, 0, 1)).toBe("finish");
    expect(cultureCardStepOf(middle, 0, 1)).toBe("hand-off");
  });
});

describe("cultureCardSessionReducer (CC2 · CC3)", () => {
  test("CC2. 초기 상태는 첫 카드다", () => {
    expect(initialCultureCardSessionState).toEqual({ cardIndex: 0 });
  });

  test("CC2. nextCard는 cardIndex를 하나 올린 새 객체를 낸다", () => {
    const next = cultureCardSessionReducer(initialCultureCardSessionState, { type: "nextCard" });

    expect(next).toEqual({ cardIndex: 1 });
    expect(next).not.toBe(initialCultureCardSessionState);
    expect(cultureCardSessionReducer(next, { type: "nextCard" })).toEqual({ cardIndex: 2 });
  });

  test("CC3. 입력 상태는 바뀌지 않고 같은 입력은 같은 결과다", () => {
    const state = { cardIndex: 4 };
    const snapshot = structuredClone(state);

    expect(cultureCardSessionReducer(state, { type: "nextCard" })).toEqual(
      cultureCardSessionReducer(state, { type: "nextCard" }),
    );
    expect(state).toEqual(snapshot);
    expect(cultureCardStepOf(middle, 1, 3)).toBe(cultureCardStepOf(middle, 1, 3));
  });
});
