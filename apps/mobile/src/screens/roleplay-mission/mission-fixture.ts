// 가짜 출처가 재생하는 값입니다 — 계약 패키지의 fixture(`fixtures-mission.ts`)와 **같은 값**을 손으로 옮겼습니다.
// 패키지의 `./fixtures`를 값으로 가져오면 SSE 파서를 거쳐 zod가 번들에 들어오므로 옮겨 적고, 같은지는 단위 테스트
// (`mission-fixture.unit.test.ts`)가 패키지 fixture와 견줘 지킵니다.

import type {
  MissionHintResponse,
  MissionList,
  MissionReport,
  MissionStartResponse,
} from "./roleplay-mission.contract";

export const MISSION_FIXTURE_IDS = {
  conversation: "6c2d8f3b-5d2e-4a8f-8b62-3e4f5a6b7c81",
  opening: "7d3e9a4c-6e3f-4b90-9c73-4f5a6b7c8d92",
} as const;

const cafeGoals = [
  { id: "order", required: true, label: { en: "Order a drink" } },
  { id: "pay", required: true, label: { en: "Say how you'll pay" } },
  { id: "stay", required: false, label: { en: "Say for here or to go" } },
  { id: "price", required: false, label: { en: "Ask how much it is" } },
] as const;

/** `companion_list_missions()` — 6화는 한 번 해 봤고 1화는 아직 안 열렸다. 하루 무료는 다 썼고 엽전 5 · 잔액 42. */
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
      goals: cafeGoals.map((goal) => ({ ...goal })),
      turnLimit: 10,
      unlocked: true,
      best: { totalScore: 73, outcome: "success", createdAt: "2026-11-18T09:12:00+09:00" },
    },
  ],
  price: { freeLeft: 0, cost: 5, balance: 42 },
};

/** `mission-start` 응답 — 하루 무료 횟수로 시작한 판. */
export const missionStartFixture: MissionStartResponse = {
  conversationId: MISSION_FIXTURE_IDS.conversation,
  missionId: "u06-cafe",
  missionVersion: 1,
  title: { ko: "커피 주문하기", en: "Order a coffee" },
  scene: "아침, 익선동 카페 끌림.",
  counterpart: { label: "카페 직원", characterId: "doyun" },
  opening: {
    messageId: MISSION_FIXTURE_IDS.opening,
    ko: "반가워요. 뭐 드릴까요?",
    roman: "bangawoyo. mwo deurilkkayo?",
    en: "Good to see you. What can I get you?",
    translation: null,
  },
  goals: cafeGoals.map((goal) => ({ ...goal, done: false })),
  turnLimit: 10,
  turnsLeft: 10,
  hintsLeft: 3,
  charge: { source: "free", credits: 0 },
};

/** 목표마다의 예시 문장 — 첫째(`pay`)가 계약의 `missionHintFixture`와 같은 값입니다. */
export const missionHintExamples: Readonly<
  Record<string, Omit<MissionHintResponse, "hintsLeft" | "goalId">>
> = {
  pay: { ko: "카드로 할게요.", roman: "kadeuro halgeyo.", meaning: "I'll pay by card." },
  order: {
    ko: "아이스 아메리카노 한 잔 주세요.",
    roman: "aiseu amerikano han jan juseyo.",
    meaning: "One iced americano, please.",
  },
  stay: { ko: "포장이요.", roman: "pojangiyo.", meaning: "To go, please." },
  price: {
    ko: "아메리카노 얼마예요?",
    roman: "amerikano eolmayeyo?",
    meaning: "How much is an americano?",
  },
};

/** PRD 부록 B의 리포트 — 과업 75 · 정확도 85 · 목표 표현 50 · 힌트 0 → 73점, 성공(필수를 이룬 뒤 학습자가 끝냄). */
export const missionReportFixture: MissionReport = {
  conversationId: MISSION_FIXTURE_IDS.conversation,
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
  goals: [
    { ...cafeGoals[0], done: true, evidence: "아이스 아메리카노 한 잔 주세요.", tip: null },
    { ...cafeGoals[1], done: true, evidence: "카드를 할게요.", tip: null },
    { ...cafeGoals[2], done: true, evidence: "가지고 가요.", tip: null },
    {
      ...cafeGoals[3],
      done: false,
      evidence: null,
      tip: { ko: "아메리카노 얼마예요?", meaning: "How much is an americano?" },
    },
  ],
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
      original: "카드를 할게요",
      corrected: "카드로 할게요",
      kind: "correction",
      items: [{ original: "카드를", corrected: "카드로", reason: "Use 로 to say how you pay." }],
    },
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
      examples: [{ original: "카드를 할게요", corrected: "카드로 할게요" }],
      reason: "Use 로 after 카드 to say how you pay.",
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
