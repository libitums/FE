import { describe, expect, test } from "vitest";

import {
  initialSplashUpdateState,
  splashClosedEventOf,
  splashUpdateProgress,
  splashUpdateReducer,
  splashUpdateViewOf,
  type SplashUpdateSignal,
  type SplashUpdateState,
} from "./splash-update-state";

// `unit` 계층: 받기 신호를 게이지 뷰와 측정 이벤트로 바꾸는 순수 리듀서만 봅니다. 시각은 값으로 주입합니다.

const START = 1000;

function reduce(...signals: SplashUpdateSignal[]): SplashUpdateState {
  return signals.reduce(splashUpdateReducer, initialSplashUpdateState(START));
}

const planned = (...ids: string[]): SplashUpdateSignal => ({ type: "planned", ids });
const progressed = (id: string, done: number, total: number): SplashUpdateSignal => ({
  type: "progressed",
  id,
  done,
  total,
});
const ready = (id: string): SplashUpdateSignal => ({ type: "ready", id });
const finished: SplashUpdateSignal = { type: "finished" };
const closed: SplashUpdateSignal = { type: "closed" };

const percentOf = (state: SplashUpdateState): number | null => {
  const view = splashUpdateViewOf(state);
  return view.kind === "gauge" ? view.percent : null;
};

describe("splashUpdateReducer · splashUpdateViewOf", () => {
  test("SU1. 처음에는 응답 전이라 뷰가 checking(게이지 없이 기다림)이고 창이 열려 있다", () => {
    const state = initialSplashUpdateState(START);

    expect(state).toEqual({
      window: "open",
      waitsForCheck: true,
      check: { kind: "pending" },
      startedAt: START,
      logoFinishedAt: null,
    });
    expect(splashUpdateViewOf(state)).toEqual({ kind: "checking" });
    // 받아 둘 수 없는 환경(파일 모듈 없음)은 응답을 기다리지 않습니다 — 게이지도 서지 않으므로.
    expect(splashUpdateViewOf(initialSplashUpdateState(START, false))).toEqual({ kind: "plain" });
  });

  test("SU2. planned([])는 받을 것 없음이라 뷰가 plain이다", () => {
    const state = reduce(planned());

    expect(state.check).toEqual({ kind: "nothing" });
    expect(splashUpdateViewOf(state)).toEqual({ kind: "plain" });
  });

  test("SU3. planned([a, b])는 0 퍼센트로 기다리는 게이지다", () => {
    const state = reduce(planned("a", "b"));

    expect(state.check).toEqual({
      kind: "updating",
      episodes: [
        { id: "a", done: 0, total: null, ready: "no" },
        { id: "b", done: 0, total: null, ready: "no" },
      ],
    });
    expect(splashUpdateViewOf(state)).toEqual({ kind: "gauge", percent: 0, hold: "wait" });
  });

  test("SU4. 진행률은 에피소드 평균이고 줄지 않으며 다 갖추기 전에는 99 이하다", () => {
    expect(percentOf(reduce(planned("a", "b"), progressed("a", 1, 5)))).toBe(10);
    expect(percentOf(reduce(planned("a", "b"), progressed("a", 5, 5)))).toBe(50);
    expect(percentOf(reduce(planned("a", "b"), progressed("a", 5, 5), progressed("b", 1, 2)))).toBe(
      75,
    );

    const lowered = reduce(planned("a", "b"), progressed("a", 5, 5), progressed("a", 3, 5));
    expect(percentOf(lowered)).toBe(50);

    const allDone = reduce(planned("a", "b"), progressed("a", 5, 5), progressed("b", 2, 2));
    expect(splashUpdateViewOf(allDone)).toEqual({ kind: "gauge", percent: 99, hold: "wait" });
  });

  test("SU5. 모두 ready가 되면 complete이고 100 퍼센트로 풀어 준다", () => {
    const first = reduce(planned("a", "b"), ready("a"));
    expect(first.check.kind).toBe("updating");

    const state = reduce(planned("a", "b"), ready("a"), ready("b"));

    expect(state.check.kind).toBe("complete");
    expect(splashUpdateViewOf(state)).toEqual({ kind: "gauge", percent: 100, hold: "release" });
  });

  test("SU6. 갱신 중에 끝나면 failed이고 멈춘 그 값으로 풀어 준다", () => {
    const base = reduce(planned("a", "b"), progressed("a", 5, 5), progressed("b", 1, 2));
    const value = percentOf(base);

    const state = splashUpdateReducer(base, finished);

    expect(state.check.kind).toBe("failed");
    expect(value).toBe(75);
    expect(splashUpdateViewOf(state)).toEqual({ kind: "gauge", percent: 75, hold: "release" });
  });

  test("SU7. 응답 전에 끝나면 unanswered이고 plain이며 그 뒤 planned는 무시한다", () => {
    const state = reduce(finished);
    expect(state.check).toEqual({ kind: "unanswered" });
    expect(splashUpdateViewOf(state)).toEqual({ kind: "plain" });

    expect(splashUpdateReducer(state, planned("a"))).toEqual(state);
  });

  test("SU8. 창이 닫히면 뷰가 plain이고 그 뒤 planned · progressed · ready는 상태를 바꾸지 않는다", () => {
    const base = reduce(planned("a", "b"), progressed("a", 2, 5));
    const after = splashUpdateReducer(base, closed);

    expect(after.window).toBe("closed");
    expect(splashUpdateViewOf(after)).toEqual({ kind: "plain" });
    for (const signal of [planned("c"), progressed("a", 5, 5), ready("a"), ready("b")]) {
      expect(splashUpdateReducer(after, signal)).toEqual(after);
    }

    const early = reduce(closed, planned("a"));
    expect(early.check).toEqual({ kind: "pending" });
  });

  test("SU9. 모르는 id의 progressed · ready는 무시하고 리듀서는 입력 상태를 바꾸지 않는다", () => {
    const base = reduce(planned("a"), progressed("a", 1, 3));

    expect(splashUpdateReducer(base, progressed("zzz", 1, 2))).toEqual(base);
    expect(splashUpdateReducer(base, ready("zzz"))).toEqual(base);

    const frozen = deepFreeze(structuredClone(base));
    const signals: SplashUpdateSignal[] = [
      planned("a", "b"),
      progressed("a", 2, 3),
      progressed("zzz", 1, 1),
      ready("a"),
      finished,
      { type: "logo-finished", at: 4000 },
      closed,
    ];
    for (const signal of signals) {
      expect(() => splashUpdateReducer(frozen, signal)).not.toThrow();
    }
    expect(frozen).toEqual(base);
  });

  test("SU9. 로고 끝 시각은 처음 한 번만 적는다", () => {
    const state = reduce({ type: "logo-finished", at: 3400 }, { type: "logo-finished", at: 5000 });

    expect(state.logoFinishedAt).toBe(3400);
  });
});

describe("splashClosedEventOf", () => {
  const outcomeOf = (state: SplashUpdateState, replaced: number): string | null =>
    splashClosedEventOf(state, 6400, replaced)?.outcome ?? null;

  test("SU10. 결과: 응답 전 · 못 받음은 교체가 있을 때만 unchecked이고 나머지는 상태 이름 그대로다", () => {
    expect(splashClosedEventOf(reduce(), 6400, 0)).toBeNull();
    expect(outcomeOf(reduce(), 1)).toBe("unchecked");
    expect(splashClosedEventOf(reduce(finished), 6400, 0)).toBeNull();
    expect(outcomeOf(reduce(finished), 2)).toBe("unchecked");
    expect(outcomeOf(reduce(planned()), 0)).toBe("nothing");
    expect(outcomeOf(reduce(planned("a"), ready("a")), 1)).toBe("complete");
    expect(outcomeOf(reduce(planned("a"), progressed("a", 1, 3)), 0)).toBe("timed-out");
    expect(outcomeOf(reduce(planned("a"), progressed("a", 1, 3), finished), 0)).toBe("failed");
  });

  test("SU11. 값: waitMs · splashMs · episodeCount · replacedCount가 문자열이고 키는 name과 다섯뿐이다", () => {
    const state = reduce(planned("a", "b"), progressed("a", 1, 5), {
      type: "logo-finished",
      at: 3400,
    });

    const event = splashClosedEventOf(state, 6400, 1);

    expect(event).toEqual({
      name: "episode_update_splash_closed",
      outcome: "timed-out",
      waitMs: "3000",
      splashMs: "5400",
      episodeCount: "2",
      replacedCount: "1",
    });
    expect(Object.keys(event ?? {}).sort()).toEqual(
      ["episodeCount", "name", "outcome", "replacedCount", "splashMs", "waitMs"].sort(),
    );
    for (const value of Object.values(event ?? {})) expect(typeof value).toBe("string");
  });

  test("SU11. 로고 끝이 없었으면 waitMs가 0이고 갱신 상태가 아니면 episodeCount가 0이다", () => {
    const withoutLogo = splashClosedEventOf(reduce(planned("a")), 6400, 0);
    expect(withoutLogo?.waitMs).toBe("0");
    expect(withoutLogo?.episodeCount).toBe("1");

    const pending = splashClosedEventOf(reduce(), 6400, 2);
    expect(pending?.episodeCount).toBe("0");
    expect(pending?.replacedCount).toBe("2");
  });
});

describe("splashUpdateProgress", () => {
  test("SU12. 빈 목록은 0, ready는 1, 총량을 모르면 0이고 평균은 [0, 1]이다", () => {
    expect(splashUpdateProgress([])).toBe(0);
    expect(splashUpdateProgress([{ id: "a", done: 1, total: 1, ready: "yes" }])).toBe(1);
    expect(splashUpdateProgress([{ id: "a", done: 0, total: null, ready: "no" }])).toBe(0);
    expect(
      splashUpdateProgress([
        { id: "a", done: 1, total: 2, ready: "no" },
        { id: "b", done: 0, total: null, ready: "no" },
      ]),
    ).toBe(0.25);
  });
});

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
