import { describe, expect, test, vi } from "vitest";

import type { ProgressLoadEvent } from "../lib/progress-load-event.contract";
import { productJourneySeed } from "./journey-progress";
import type { JourneyProgressState } from "./learning-progress";
import type { ProgressLoadAction, ProgressLoadPhase } from "./progress-load.contract";
import {
  PROGRESS_LOAD_ROW_DELAY_MS,
  initialProgressLoadPhase,
  journeyMapProgressLoadOf,
  localProgressFrom,
  progressLoadEventFor,
  progressLoadReducer,
} from "./progress-load";

const phases: readonly ProgressLoadPhase[] = [
  "idle",
  "hydrated",
  "checking",
  "loading",
  "failed",
  "retrying",
  "loaded",
];

const started = (local: "restored" | "none"): ProgressLoadAction => ({ type: "started", local });
const settled = (outcome: "loaded" | "failed"): ProgressLoadAction => ({
  type: "settled",
  outcome,
});
const delayElapsed: ProgressLoadAction = { type: "delayElapsed" };
const retryRequested: ProgressLoadAction = { type: "retryRequested" };

// 전이표(spec D5) — 열 순서는 phases와 같다. null은 「·」(입력과 같은 값)이다.
type Row = readonly [string, ProgressLoadAction, readonly (ProgressLoadPhase | null)[]];
const transitionTable: readonly Row[] = [
  ["started/restored", started("restored"), phases.map((): ProgressLoadPhase => "hydrated")],
  ["started/none", started("none"), phases.map((): ProgressLoadPhase => "checking")],
  ["delayElapsed", delayElapsed, [null, null, "loading", null, null, null, null]],
  [
    "settled/loaded",
    settled("loaded"),
    [null, "loaded", "loaded", "loaded", "loaded", "loaded", null],
  ],
  ["settled/failed", settled("failed"), [null, null, "failed", "failed", null, "failed", null]],
  ["retryRequested", retryRequested, [null, null, null, null, "retrying", null, null]],
];
const cells = transitionTable.flatMap(([label, action, results]) =>
  phases.map((phase, index) => [label, phase, action, results[index] ?? phase] as const),
);

function walk(actions: readonly ProgressLoadAction[], from = initialProgressLoadPhase) {
  const trail: ProgressLoadPhase[] = [];
  let phase = from;
  for (const action of actions) {
    phase = progressLoadReducer(phase, action);
    trail.push(phase);
  }
  return trail;
}

describe("PL1 전이표 42칸", () => {
  test("PL1. 표는 일곱 phase 곱하기 여섯 action이다", () => {
    expect(cells).toHaveLength(42);
  });

  test.each(cells)("PL1. %s @ %s", (_label, phase, action, expected) => {
    expect(progressLoadReducer(phase, action)).toBe(expected);
  });
});

describe("PL2~PL8 걸음", () => {
  test("PL2. 문턱을 넘기면 checking에서 loading, 응답이 오면 loaded", () => {
    expect(walk([started("none"), delayElapsed, settled("loaded")])).toEqual([
      "checking",
      "loading",
      "loaded",
    ]);
  });

  test("PL3. 응답이 먼저 오면 늦게 온 타이머가 loaded를 loading으로 되돌리지 않는다", () => {
    expect(walk([started("none"), settled("loaded"), delayElapsed])).toEqual([
      "checking",
      "loaded",
      "loaded",
    ]);
  });

  test("PL4. 문턱 전의 실패는 기다리지 않고 곧바로 failed다", () => {
    expect(walk([started("none"), settled("failed")])).toEqual(["checking", "failed"]);
  });

  test("PL5. 자동 재시도의 실패는 failed를 흔들지 않고 사용자 재시도만 retrying을 거친다", () => {
    const actions = [
      settled("failed"),
      settled("failed"),
      settled("failed"),
      retryRequested,
      settled("failed"),
      retryRequested,
      settled("loaded"),
    ];
    expect(walk(actions, "failed")).toEqual([
      "failed",
      "failed",
      "failed",
      "retrying",
      "failed",
      "retrying",
      "loaded",
    ]);
  });

  test("PL6. 저장본으로 시작하면 실패 · 문턱이 hydrated를 흔들지 않고 성공에서만 loaded다", () => {
    const actions = [
      started("restored"),
      delayElapsed,
      settled("failed"),
      settled("failed"),
      settled("loaded"),
    ];
    expect(walk(actions)).toEqual(["hydrated", "hydrated", "hydrated", "hydrated", "loaded"]);
  });

  test("PL7. loaded는 실패 · 문턱 · 재시도 요청을 흡수한다", () => {
    expect(walk([settled("failed"), delayElapsed, retryRequested], "loaded")).toEqual([
      "loaded",
      "loaded",
      "loaded",
    ]);
  });

  test("PL8. 문턱은 1초이고 처음 상태는 idle이다", () => {
    expect(PROGRESS_LOAD_ROW_DELAY_MS).toBe(1_000);
    expect(initialProgressLoadPhase).toBe("idle");
  });
});

const empty: JourneyProgressState = {
  ...productJourneySeed,
  completedEpisodeIntroIds: [],
  catalogProgress: {},
};
const cached: JourneyProgressState = {
  ...empty,
  completedStepCount: 2,
  completedEpisodeIntroIds: ["tutorial-intro"],
};
const pending: JourneyProgressState = {
  ...empty,
  completedStepCount: 3,
  completedMessengerUnitIds: ["appointment-confirmation"],
};

describe("PL9 localProgressFrom", () => {
  test("PL9. 둘 다 없으면 null", () => {
    expect(localProgressFrom(null, null)).toBeNull();
  });

  test("PL9. 저장본만 있으면 저장본", () => {
    expect(localProgressFrom(cached, null)).toEqual(cached);
  });

  test("PL9. 미전송만 있으면 미전송", () => {
    expect(localProgressFrom(null, pending)).toEqual(pending);
  });

  test("PL9. 둘 다 있으면 합친 진행이고 입력은 그대로다", () => {
    const before = structuredClone([cached, pending]);
    const merged = localProgressFrom(cached, pending);
    expect(merged).toEqual({
      ...empty,
      completedStepCount: 3,
      completedEpisodeIntroIds: ["tutorial-intro"],
      completedMessengerUnitIds: ["appointment-confirmation"],
    });
    expect([cached, pending]).toEqual(before);
  });
});

describe("PL10 journeyMapProgressLoadOf", () => {
  test.each([
    ["idle", "known"],
    ["hydrated", "known"],
    ["loaded", "known"],
    ["checking", "checking"],
    ["loading", "loading"],
    ["retrying", "retrying"],
    ["failed", "failed"],
  ] as const)("PL10'. %s -> %s", (phase, status) => {
    const onRetry = vi.fn<() => void>();
    const result = journeyMapProgressLoadOf(phase, onRetry);
    expect(result.status).toBe(status);
    expect(onRetry).not.toHaveBeenCalled();
    expect("onRetry" in result).toBe(status === "failed");
    expect("onRetry" in result ? result.onRetry : undefined).toBe(
      status === "failed" ? onRetry : undefined,
    );
  });
});

describe("PL11 progressLoadEventFor 49쌍", () => {
  const mapped = new Map<string, ProgressLoadEvent>([
    ["checking>loading", { name: "progress_load_delayed" }],
    ["checking>failed", { name: "progress_load_failed", attempt: "first" }],
    ["loading>failed", { name: "progress_load_failed", attempt: "first" }],
    ["retrying>failed", { name: "progress_load_failed", attempt: "retry" }],
    ["failed>loaded", { name: "progress_load_recovered", trigger: "auto" }],
    ["retrying>loaded", { name: "progress_load_recovered", trigger: "manual" }],
  ]);
  const pairs = phases.flatMap((previous) =>
    phases.map((next) => [previous, next, mapped.get(`${previous}>${next}`) ?? null] as const),
  );

  test("PL11. 쌍은 49개이고 이벤트가 나는 쌍은 여섯이다", () => {
    expect(pairs).toHaveLength(49);
    expect(pairs.filter(([, , event]) => event !== null)).toHaveLength(6);
  });

  test.each(pairs)("PL11. %s -> %s", (previous, next, expected) => {
    expect(progressLoadEventFor(previous, next)).toEqual(expected);
  });
});

describe("PL12 이벤트 모양", () => {
  test("PL12. 키는 name과 attempt 또는 trigger뿐이고 값은 문자열이다", () => {
    const real = phases
      .flatMap((a) => phases.map((b) => progressLoadEventFor(a, b)))
      .filter((event): event is ProgressLoadEvent => event !== null);
    expect(real.length).toBeGreaterThan(0);
    for (const event of real) {
      expect([["name"], ["attempt", "name"], ["name", "trigger"]]).toContainEqual(
        Object.keys(event).sort(),
      );
      for (const value of Object.values(event)) expect(typeof value).toBe("string");
    }
  });
});
