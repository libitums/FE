// 판의 전이 · 끝내기의 고정 사례(`mission-fixtures.ts`에서 나눔 — 줄 수). 실험실 번들의 `transitions.fixtures` ·
// `transitions.finishFixtures`가 이것이고, 대시보드(Python)가 같은 끝 규칙을 이 사례로 검증합니다. 고치면 `pnpm mission:bundle`.

export type TransitionFixture = {
  readonly name: string;
  readonly mission: string;
  /** 있으면 미션 파일의 목표 대신 이 목록으로 판정한다(선택 목표가 없는 미션의 사례). */
  readonly goals?: readonly { id: string; required: boolean }[];
  readonly before: { goals_done: string[]; learner_turns: number; hints_used: number };
  readonly state: { goals_done: string[]; off_task: boolean; closing: boolean } | null;
  readonly expected: {
    readonly goals_done: string[];
    readonly learner_turns: number;
    readonly ended: "goals" | "turn_limit" | null;
    /** 필수 목표를 모두 이뤘는가. ended가 null인데 참이면 「성공 확정 · 계속 가능」. */
    readonly required_done: boolean;
  };
};

const cafe = "u06-cafe";
const turn = (goals_done: string[], learner_turns: number) => ({
  goals_done,
  learner_turns,
  hints_used: 0,
});
const said = (goals_done: string[], closing = false) => ({ goals_done, off_task: false, closing });

/**
 * 학습자 턴 하나의 전이 — 미션 파일(`u06-cafe`: 필수 order · pay, 선택 stay · price, 턴 상한 10) 위에서.
 * 판은 모든 목표(goals) · 턴 상한(turn_limit)에서만 닫힌다. 필수만 이루면 required_done이 참이고 판은 이어진다.
 */
export const transitionFixtures: readonly TransitionFixture[] = [
  {
    name: "모르는 id는 버리고 파일 순서로 합친다",
    mission: cafe,
    before: turn([], 0),
    state: said(["stay", "dance", "order"]),
    expected: {
      goals_done: ["order", "stay"],
      learner_turns: 1,
      ended: null,
      required_done: false,
    },
  },
  {
    name: "한 번 이룬 목표는 모델이 빠뜨려도 남는다 — 필수를 다 이뤄도 선택이 남으면 닫히지 않는다",
    mission: cafe,
    before: { goals_done: ["order"], learner_turns: 3, hints_used: 1 },
    state: said(["pay"], true),
    expected: { goals_done: ["order", "pay"], learner_turns: 4, ended: null, required_done: true },
  },
  {
    name: "상태 줄이 없으면 진척은 그대로, 턴만 센다",
    mission: cafe,
    before: turn(["order"], 4),
    state: null,
    expected: { goals_done: ["order"], learner_turns: 5, ended: null, required_done: false },
  },
  {
    name: "필수 뒤 계속 — 남은 선택 목표를 모두 이루면 goals",
    mission: cafe,
    before: turn(["order", "pay"], 5),
    state: said(["stay", "price"], true),
    expected: {
      goals_done: ["order", "pay", "stay", "price"],
      learner_turns: 6,
      ended: "goals",
      required_done: true,
    },
  },
  {
    name: "필수 뒤 계속 — 선택 하나만 이루면 아직 닫히지 않는다",
    mission: cafe,
    before: turn(["order", "pay"], 5),
    state: said(["stay"]),
    expected: {
      goals_done: ["order", "pay", "stay"],
      learner_turns: 6,
      ended: null,
      required_done: true,
    },
  },
  {
    name: "필수를 못 이룬 채 상한에 닿으면 turn_limit(실패)",
    mission: cafe,
    before: turn(["order", "stay"], 9),
    state: said(["order", "stay", "price"]),
    expected: {
      goals_done: ["order", "stay", "price"],
      learner_turns: 10,
      ended: "turn_limit",
      required_done: false,
    },
  },
  {
    name: "필수를 이룬 뒤 상한에 닿으면 turn_limit(필수를 이뤘으니 성공)",
    mission: cafe,
    before: turn(["order", "pay", "stay"], 9),
    state: null,
    expected: {
      goals_done: ["order", "pay", "stay"],
      learner_turns: 10,
      ended: "turn_limit",
      required_done: true,
    },
  },
  {
    name: "마지막 턴에 필수만 이루면 turn_limit(성공)",
    mission: cafe,
    before: turn(["order"], 9),
    state: said(["order", "pay"]),
    expected: {
      goals_done: ["order", "pay"],
      learner_turns: 10,
      ended: "turn_limit",
      required_done: true,
    },
  },
  {
    name: "마지막 턴에 모든 목표를 이루면 turn_limit가 아니라 goals",
    mission: cafe,
    before: turn(["order", "pay", "stay"], 9),
    state: said(["price"], true),
    expected: {
      goals_done: ["order", "pay", "stay", "price"],
      learner_turns: 10,
      ended: "goals",
      required_done: true,
    },
  },
  {
    name: "선택 목표가 없는 미션은 필수를 이루는 순간 goals",
    mission: cafe,
    goals: [
      { id: "order", required: true },
      { id: "pay", required: true },
    ],
    before: turn(["order"], 2),
    state: said(["pay"], true),
    expected: {
      goals_done: ["order", "pay"],
      learner_turns: 3,
      ended: "goals",
      required_done: true,
    },
  },
];

export type FinishFixture = {
  readonly name: string;
  readonly mission: string;
  readonly before: { goals_done: string[]; learner_turns: number; hints_used: number };
  /** 끝내기(`mission-finish`, abandon 없이) 뒤의 끝난 까닭. null이면 닫지 않는다(서버는 409 mission_not_ended). */
  readonly expected: { readonly ended: "goals" | "turn_limit" | "finish" | null };
};

/** 학습자의 끝내기 — 같은 미션 파일 위에서. 필수를 이뤘으면 finish(채점 · 늘 성공), 아니면 닫지 않는다. */
export const finishFixtures: readonly FinishFixture[] = [
  {
    name: "필수를 모두 이룬 진행 중인 판은 finish로 닫힌다",
    mission: cafe,
    before: turn(["order", "pay", "stay"], 4),
    expected: { ended: "finish" },
  },
  {
    name: "필수를 못 이뤘으면 닫지 않는다 — 그만두기(abandon)만 된다",
    mission: cafe,
    before: turn(["order", "stay", "price"], 4),
    expected: { ended: null },
  },
  {
    name: "이미 끝난 판은 그 까닭 그대로",
    mission: cafe,
    before: turn(["order"], 10),
    expected: { ended: "turn_limit" },
  },
];
