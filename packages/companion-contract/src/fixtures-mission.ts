// 롤플레이 미션(ADR-0177)의 재생용 값입니다. 6화 「커피 주문」 한 판 — 시작 → 힌트 → 끝(리포트는 PRD 부록 B의 예 그대로) —
// 과 목록 · 지난 리포트입니다. 턴 스트림은 `fixtures-streams.ts`의 `turn-mission`입니다.
import type {
  MissionDefinition,
  MissionGoalState,
  MissionHintResponse,
  MissionStartResponse,
} from "./mission";
import type {
  MissionFinishResponse,
  MissionList,
  MissionReport,
  MissionResults,
} from "./mission-report";

const ids = {
  conversation: "6c2d8f3b-5d2e-4a8f-8b62-3e4f5a6b7c81",
  opening: "7d3e9a4c-6e3f-4b90-9c73-4f5a6b7c8d92",
} as const;

/** 6화 미션 정의(서버 미션 파일과 같은 모양 — 문구는 줄였다). */
export const missionDefinitionFixture: MissionDefinition = {
  id: "u06-cafe",
  episodeId: "u06-cafe",
  version: 1,
  title: { ko: "커피 주문하기", en: "Order a coffee" },
  scene: "아침, 익선동 카페 끌림.",
  counterpart: {
    characterId: "doyun",
    label: "카페 직원",
    role: "카페 끌림의 아르바이트 직원.",
    relation: "손님과 직원 사이다.",
    register: "손님 응대의 서비스 존댓말.",
    samples: ["뭐 드릴까요?"],
  },
  opening: {
    ko: "반가워요. 뭐 드릴까요?",
    roman: "bangawoyo. mwo deurilkkayo?",
    en: "Good to see you. What can I get you?",
  },
  goals: [
    { id: "order", required: true, label: { en: "Order a drink" }, criteria: "음료를 주문했다." },
    {
      id: "pay",
      required: true,
      label: { en: "Say how you'll pay" },
      criteria: "결제 수단을 말했다.",
    },
    {
      id: "stay",
      required: false,
      label: { en: "Say for here or to go" },
      criteria: "매장 · 포장을 밝혔다.",
    },
    {
      id: "price",
      required: false,
      label: { en: "Ask how much it is" },
      criteria: "가격을 물었다.",
    },
  ],
  targetExpressions: [
    { id: "patt:83586289", ko: "{음료} 한 잔 주세요.", meaning: "Please give me one {drink}." },
    { id: "patt:fbe5e354", ko: "{명사} 얼마예요?", meaning: "How much is/are the {N}?" },
  ],
  turnLimit: 10,
};

const goalStates = (done: readonly string[]): MissionGoalState[] =>
  missionDefinitionFixture.goals.map((goal) => ({
    id: goal.id,
    required: goal.required,
    label: goal.label,
    done: done.includes(goal.id),
  }));

/** `mission-start` 응답 — 하루 무료 횟수로 시작한 판. */
export const missionStartFixture: MissionStartResponse = {
  conversationId: ids.conversation,
  missionId: "u06-cafe",
  missionVersion: 1,
  title: { ko: "커피 주문하기", en: "Order a coffee" },
  scene: "아침, 익선동 카페 끌림.",
  counterpart: { label: "카페 직원", characterId: "doyun" },
  opening: {
    messageId: ids.opening,
    ko: "반가워요. 뭐 드릴까요?",
    roman: "bangawoyo. mwo deurilkkayo?",
    en: "Good to see you. What can I get you?",
    translation: null,
  },
  goals: goalStates([]),
  turnLimit: 10,
  turnsLeft: 10,
  hintsLeft: 3,
  charge: { source: "free", credits: 0 },
};

/** `mission-hint` 응답 — 결제(필수, 아직 못 이룸)의 예시 문장. */
export const missionHintFixture: MissionHintResponse = {
  goalId: "pay",
  ko: "카드로 할게요.",
  roman: "kadeuro halgeyo.",
  meaning: "I'll pay by card.",
  hintsLeft: 2,
};

const evidence: Record<string, string> = {
  order: "아이스 아메리카노 한 잔 주세요.",
  pay: "카드로 할게요.",
  stay: "가지고 가요.",
};

/** PRD 부록 B의 리포트 — 과업 75 · 정확도 85 · 목표 표현 50 · 힌트 0 → 73점, 성공(필수를 이룬 뒤 학습자가 끝냄). */
export const missionReportFixture: MissionReport = {
  conversationId: ids.conversation,
  missionId: "u06-cafe",
  missionVersion: 1,
  outcome: "success",
  endReason: "finish",
  totalScore: 73,
  taskScore: 75,
  accuracyScore: 85,
  expressionScore: 50,
  hintsUsed: 0,
  weights: { task: 0.5, accuracy: 0.3, expression: 0.2, hintPenalty: 5 },
  scoreParts: { task: 37.5, accuracy: 25.5, expression: 10, hintPenalty: 0 },
  headline: "You ordered and paid — mission complete!",
  goals: goalStates(["order", "pay", "stay"]).map((goal) => ({
    ...goal,
    evidence: evidence[goal.id] ?? null,
    tip: goal.done ? null : { ko: "아메리카노 얼마예요?", meaning: "How much is an americano?" },
  })),
  expressions: [
    {
      id: "patt:83586289",
      ko: "{음료} 한 잔 주세요.",
      meaning: "Please give me one {drink}.",
      used: true,
    },
    {
      id: "patt:fbe5e354",
      ko: "{명사} 얼마예요?",
      meaning: "How much is/are the {N}?",
      used: false,
    },
  ],
  corrections: [
    {
      original: "가지고 가요",
      corrected: "포장이요",
      kind: "better",
      items: [
        {
          original: "가지고 가요",
          corrected: "포장이요",
          reason: "At a café, 포장이요 is the usual way to say take-out.",
        },
      ],
    },
  ],
  focus: [
    {
      examples: [{ original: "가지고 가요", corrected: "포장이요" }],
      reason: "At a café, say 포장이요 for take-out.",
    },
  ],
  strengths: [
    {
      quote: "아이스 아메리카노 한 잔 주세요.",
      note: "A complete, polite order using the target pattern.",
    },
  ],
  retry: [{ ko: "아메리카노 얼마예요?", meaning: "How much is an americano?" }],
  summary:
    "You ordered clearly with 한 잔 주세요 and paid without trouble. Next time, try asking the price with 얼마예요. You're ready for the next café visit!",
  nextStep: "Play again and ask how much your drink is.",
  bestScore: 73,
  graderModel: "claude-opus-5-5",
  createdAt: "2026-11-18T09:12:00+09:00",
};

/** `mission-finish` 응답 셋 — 리포트 · 그만둠 · 채점 실패(값을 돌려줌). */
export const missionFinishFixtures = {
  "finish-graded": { status: "graded", report: missionReportFixture },
  "finish-abandoned": { status: "abandoned", conversationId: ids.conversation },
  "finish-grading-failed": {
    status: "grading_failed",
    conversationId: ids.conversation,
    retryable: true,
    refunded: true,
  },
} satisfies Record<string, MissionFinishResponse>;

/** `companion_list_missions()` — 6화는 한 번 해 봤고 1화는 아직 안 열렸다. */
export const missionListFixture: MissionList = {
  missions: [
    {
      id: "u01-water",
      episodeId: "u01-water",
      version: 1,
      title: { ko: "편의점에서 계산하기", en: "Pay at the convenience store" },
      counterpartLabel: "편의점 점원",
      characterId: null,
      goals: [
        { id: "bag", required: true, label: { en: "Answer about the bag" } },
        { id: "pay", required: true, label: { en: "Say how you'll pay" } },
        { id: "receipt", required: false, label: { en: "Answer about the receipt" } },
        { id: "ask", required: false, label: { en: "Ask for something else" } },
      ],
      turnLimit: 8,
      unlocked: false,
      best: null,
    },
    {
      id: "u06-cafe",
      episodeId: "u06-cafe",
      version: 1,
      title: { ko: "커피 주문하기", en: "Order a coffee" },
      counterpartLabel: "카페 직원",
      characterId: "doyun",
      goals: missionDefinitionFixture.goals.map(({ id, required, label }) => ({
        id,
        required,
        label,
      })),
      turnLimit: 10,
      unlocked: true,
      best: { totalScore: 73, outcome: "success", createdAt: "2026-11-18T09:12:00+09:00" },
    },
  ],
  price: { freeLeft: 0, cost: 5, balance: 42 },
};

/** `companion_list_mission_results('u06-cafe')` — 지난 리포트 하나. */
export const missionResultsFixture: MissionResults = {
  missionId: "u06-cafe",
  bestScore: 73,
  results: [missionReportFixture],
};
