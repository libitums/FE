// 대화 분기(PRD §3.8): 신호가 임계값을 넘으면 후보를 열고, 그 안에서 랜덤으로 고른다. 순수 함수입니다.
//   화제 전환 — 짧은 답이 k번 이어짐 · 같은 화제가 M턴 넘음 · 유저가 전환을 원함(앞 턴의 @state) → 확률로 화제 뱅크 씨앗.
//   학습 표현 삽입 — 쿨다운이 지났으면 확률로 하나. 넣을 자리가 아니면 모델이 넘긴다.
// 값은 PRD §8 C(만들면서 깎을 것)의 초안입니다.

import type {
  LearningExpression,
  PersonaCard,
  TopicState,
  TurnState,
} from "./chat-send.contract.ts";

export const branchingConfig = {
  shortLength: 6,
  shortStreakForSwitch: 2,
  sameTopicTurns: 6,
  switchProbability: 0.7,
  insertCooldown: 4,
  insertProbability: 0.35,
} as const;

export type BranchAction =
  | { readonly kind: "switch"; readonly seed: string }
  | { readonly kind: "insert"; readonly expressionId: string };

const isShort = (text: string) =>
  [...text.replace(/\s+/g, "")].length <= branchingConfig.shortLength;

export function topicStateFrom(raw: Partial<TopicState> | null | undefined): TopicState {
  const num = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const nullableNum = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  return {
    turn: num(raw?.turn, 0),
    topic: typeof raw?.topic === "string" ? raw.topic : null,
    topicTurns: num(raw?.topicTurns, 0),
    shortStreak: num(raw?.shortStreak, 0),
    wantsSwitch: raw?.wantsSwitch === true,
    lastInsertTurn: nullableNum(raw?.lastInsertTurn),
    lastSwitchTurn: nullableNum(raw?.lastSwitchTurn),
  };
}

function pick<T>(items: readonly T[], random: () => number): T | undefined {
  return items.length === 0
    ? undefined
    : items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

export function chooseBranch(
  state: TopicState,
  input: {
    readonly userText: string;
    readonly persona: PersonaCard;
    readonly expressions: readonly LearningExpression[];
    readonly random: () => number;
  },
): { action: BranchAction | null; directive: string | null } {
  const shortStreak = isShort(input.userText) ? state.shortStreak + 1 : 0;
  const switchSignal =
    shortStreak >= branchingConfig.shortStreakForSwitch ||
    state.topicTurns >= branchingConfig.sameTopicTurns ||
    state.wantsSwitch;
  const seed = pick(
    (input.persona.topics ?? []).filter((topic) => topic !== state.topic),
    input.random,
  );
  if (switchSignal && seed !== undefined && input.random() < branchingConfig.switchProbability) {
    return {
      action: { kind: "switch", seed },
      directive: `The conversation is slowing down. After answering briefly, smoothly bring up a new topic in character: "${seed}".`,
    };
  }

  const cooled =
    state.lastInsertTurn === null ||
    state.turn - state.lastInsertTurn >= branchingConfig.insertCooldown;
  const expression = pick(input.expressions, input.random);
  if (cooled && expression !== undefined && input.random() < branchingConfig.insertProbability) {
    return {
      action: { kind: "insert", expressionId: expression.id },
      directive: `If it fits naturally, use the Korean expression "${expression.surface}"${expression.gloss ? ` (${expression.gloss})` : ""} once in this reply. If it does not fit, skip it.`,
    };
  }
  return { action: null, directive: null };
}

export function nextTopicState(
  state: TopicState,
  input: {
    readonly userText: string;
    readonly turnState: TurnState | null;
    readonly action: BranchAction | null;
  },
): TopicState {
  const topic = input.turnState?.topic ?? state.topic;
  const switched = input.action?.kind === "switch";
  return {
    turn: state.turn + 1,
    topic,
    topicTurns: switched || topic !== state.topic ? 1 : state.topicTurns + 1,
    shortStreak: isShort(input.userText) ? state.shortStreak + 1 : 0,
    wantsSwitch: input.turnState?.userWantsSwitch === true,
    lastInsertTurn: input.action?.kind === "insert" ? state.turn + 1 : state.lastInsertTurn,
    lastSwitchTurn: switched ? state.turn + 1 : state.lastSwitchTurn,
  };
}
