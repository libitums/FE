// 미션 코어의 고정 사례 — 단위 테스트와 실험실 번들(`scoring.fixtures` · `output.fixtures` · `transitions.fixtures`)이 같은 것을 씁니다.
// 대시보드(Python)가 이 사례로 포팅을 검증하므로, 사례를 고치면 번들을 다시 만듭니다(`pnpm mission:bundle`).

const goals = (done: readonly boolean[]) =>
  [
    { id: "order", required: true },
    { id: "pay", required: true },
    { id: "stay", required: false },
    { id: "price", required: false },
  ].map((goal, index) => ({ ...goal, done: done[index] ?? false }));

export type ScoringFixture = {
  readonly name: string;
  readonly goals: readonly { id: string; required: boolean; done: boolean }[];
  readonly accuracy: number;
  readonly expressionsUsed: number;
  readonly expressionsTotal: number;
  readonly hintsUsed: number;
  readonly expected: {
    readonly task: number;
    readonly expression: number;
    readonly total: number;
    readonly outcome: "success" | "fail";
  };
};

/** 기본 가중치(0.5 · 0.3 · 0.2, 감점 5)에서의 사례. */
export const scoringFixtures: readonly ScoringFixture[] = [
  {
    name: "부록 B — 넷 중 셋, 표현 둘 중 하나, 힌트 없음",
    goals: goals([true, true, true, false]),
    accuracy: 85,
    expressionsUsed: 1,
    expressionsTotal: 2,
    hintsUsed: 0,
    expected: { task: 75, expression: 50, total: 73, outcome: "success" },
  },
  {
    name: "힌트 두 번은 10점 감점",
    goals: goals([true, true, true, false]),
    accuracy: 85,
    expressionsUsed: 1,
    expressionsTotal: 2,
    hintsUsed: 2,
    expected: { task: 75, expression: 50, total: 63, outcome: "success" },
  },
  {
    name: "필수 하나를 못 이루면 점수와 상관없이 실패",
    goals: goals([true, false, true, false]),
    accuracy: 70,
    expressionsUsed: 0,
    expressionsTotal: 1,
    hintsUsed: 1,
    expected: { task: 50, expression: 0, total: 41, outcome: "fail" },
  },
  {
    name: "목표 표현이 없으면 표현 점수는 100",
    goals: goals([true, true, true, true]),
    accuracy: 90,
    expressionsUsed: 0,
    expressionsTotal: 0,
    hintsUsed: 3,
    expected: { task: 100, expression: 100, total: 82, outcome: "success" },
  },
  {
    name: "최종 점수는 0 밑으로 내려가지 않는다",
    goals: goals([false, false, false, false]),
    accuracy: 0,
    expressionsUsed: 0,
    expressionsTotal: 2,
    hintsUsed: 3,
    expected: { task: 0, expression: 0, total: 0, outcome: "fail" },
  },
  {
    name: "반올림은 0.5에서 올린다 — 36.5 → 37(은행가 반올림이면 36)",
    goals: goals([true, false, false, false]),
    accuracy: 80,
    expressionsUsed: 0,
    expressionsTotal: 2,
    hintsUsed: 0,
    expected: { task: 25, expression: 0, total: 37, outcome: "fail" },
  },
];

export type OutputFixture = {
  readonly name: string;
  readonly raw: string;
  readonly expected: {
    readonly segments: readonly { kind: "speech" | "action" | "narration"; text: string }[];
    readonly state: { goals_done: string[]; off_task: boolean; closing: boolean } | null;
  };
};

/** 원문 → 조각 + 상태. 상태는 해석만 한 것이고 미션의 id로 거르는 것은 전이(`transitionFixtures`)가 한다. */
export const outputFixtures: readonly OutputFixture[] = [
  {
    name: "번들 규격의 예",
    raw: '@speech 네, 아이스 라떼요.\n@state {"goals_done":["order"],"off_task":false,"closing":false}',
    expected: {
      segments: [{ kind: "speech", text: "네, 아이스 라떼요." }],
      state: { goals_done: ["order"], off_task: false, closing: false },
    },
  },
  {
    name: "행동 · 말 여러 줄과 마무리",
    raw: '@action 컵을 건넨다\n@speech 주문하신 아메리카노 나왔습니다.\n@speech 좋은 하루 보내세요!\n@state {"goals_done":["order","pay"],"off_task":false,"closing":true}',
    expected: {
      segments: [
        { kind: "action", text: "컵을 건넨다" },
        { kind: "speech", text: "주문하신 아메리카노 나왔습니다." },
        { kind: "speech", text: "좋은 하루 보내세요!" },
      ],
      state: { goals_done: ["order", "pay"], off_task: false, closing: true },
    },
  },
  {
    name: "태그 없는 줄은 speech, 빈 줄은 버린다",
    raw: '드시고 가세요?\n\n@state {"goals_done":[],"off_task":true,"closing":false}',
    expected: {
      segments: [{ kind: "speech", text: "드시고 가세요?" }],
      state: { goals_done: [], off_task: true, closing: false },
    },
  },
  {
    name: "상태 줄이 없으면 state는 null",
    raw: "@speech 카드 여기 있습니다.",
    expected: { segments: [{ kind: "speech", text: "카드 여기 있습니다." }], state: null },
  },
  {
    name: "상태 줄이 깨졌으면 state는 null",
    raw: '@speech 네.\n@state {"goals_done":["order"',
    expected: { segments: [{ kind: "speech", text: "네." }], state: null },
  },
  {
    name: "글자가 아닌 id · 빈 글 · 중복은 버리고 앞뒤 공백은 걷는다, 모르는 칸은 거짓",
    raw: '@speech 네.\n@state {"goals_done":["order",3," pay ","order",""],"closing":"yes"}',
    expected: {
      segments: [{ kind: "speech", text: "네." }],
      state: { goals_done: ["order", "pay"], off_task: false, closing: false },
    },
  },
];

export type TransitionFixture = {
  readonly name: string;
  readonly mission: string;
  readonly before: { goals_done: string[]; learner_turns: number; hints_used: number };
  readonly state: { goals_done: string[]; off_task: boolean; closing: boolean } | null;
  readonly expected: {
    readonly goals_done: string[];
    readonly learner_turns: number;
    readonly ended: "goals" | "turn_limit" | null;
  };
};

/** 학습자 턴 하나의 전이 — 미션 파일(`u06-cafe`: 필수 order · pay, 턴 상한 10) 위에서. */
export const transitionFixtures: readonly TransitionFixture[] = [
  {
    name: "모르는 id는 버리고 파일 순서로 합친다",
    mission: "u06-cafe",
    before: { goals_done: [], learner_turns: 0, hints_used: 0 },
    state: { goals_done: ["stay", "dance", "order"], off_task: false, closing: false },
    expected: { goals_done: ["order", "stay"], learner_turns: 1, ended: null },
  },
  {
    name: "한 번 이룬 목표는 모델이 빠뜨려도 남는다 — 필수를 다 이루면 goals",
    mission: "u06-cafe",
    before: { goals_done: ["order"], learner_turns: 3, hints_used: 1 },
    state: { goals_done: ["pay"], off_task: false, closing: true },
    expected: { goals_done: ["order", "pay"], learner_turns: 4, ended: "goals" },
  },
  {
    name: "상태 줄이 없으면 진척은 그대로, 턴만 센다",
    mission: "u06-cafe",
    before: { goals_done: ["order"], learner_turns: 4, hints_used: 0 },
    state: null,
    expected: { goals_done: ["order"], learner_turns: 5, ended: null },
  },
  {
    name: "상한에 닿으면 turn_limit",
    mission: "u06-cafe",
    before: { goals_done: ["order", "stay"], learner_turns: 9, hints_used: 0 },
    state: { goals_done: ["order", "stay", "price"], off_task: false, closing: false },
    expected: { goals_done: ["order", "stay", "price"], learner_turns: 10, ended: "turn_limit" },
  },
  {
    name: "마지막 턴에 필수를 다 이루면 turn_limit가 아니라 goals",
    mission: "u06-cafe",
    before: { goals_done: ["order"], learner_turns: 9, hints_used: 0 },
    state: { goals_done: ["order", "pay"], off_task: false, closing: true },
    expected: { goals_done: ["order", "pay"], learner_turns: 10, ended: "goals" },
  },
];
