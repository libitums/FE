// 대화 분기(PRD §3.8): 신호가 임계값을 넘으면 후보를 열고, 그 안에서 랜덤으로 고른다. 순수 함수입니다.
//   화제 전환 — 짧은 답이 k번 이어짐 · 같은 화제가 M턴 넘음 · 유저가 전환을 원함(앞 턴의 @state) → 확률로 화제 뱅크 씨앗.
//   학습 표현 삽입 — 주기 · 표현 · 방식은 `companion-learning.ts`(PRD §3.7)가 정한다. 화제 전환이 열린 턴이면 넣지 않는다.
// 화제 전환 값은 PRD §8 C(만들면서 깎을 것)의 초안, 학습 삽입 값은 운영 설정(`settings.learning_*`)입니다.

import type {
  LearningExpression,
  PersonaCard,
  TopicState,
  TurnState,
} from "./chat-send.contract.ts";
import {
  decideLearning,
  type LearningDecision,
  learningDirective,
  type LearningMode,
  type LearningSettings,
  nextLearningState,
} from "./companion-learning.ts";

export const branchingConfig = {
  shortLength: 6,
  shortStreakForSwitch: 2,
  sameTopicTurns: 6,
  switchProbability: 0.7,
} as const;

export type BranchAction =
  | { readonly kind: "switch"; readonly seed: string }
  | { readonly kind: "insert"; readonly expressionId: string; readonly mode: LearningMode };

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
    heavy: raw?.heavy === true,
    learnDay: typeof raw?.learnDay === "string" ? raw.learnDay : null,
    learnToday: num(raw?.learnToday, 0),
    lastExpressionId: typeof raw?.lastExpressionId === "string" ? raw.lastExpressionId : null,
    recentTargets: Array.isArray(raw?.recentTargets)
      ? raw.recentTargets.filter((id): id is string => typeof id === "string").slice(-5)
      : [],
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
    readonly learning: {
      readonly pool: readonly LearningExpression[];
      readonly episodes: readonly string[];
      readonly settings: LearningSettings;
      readonly manualEmpty?: boolean;
      readonly chipsOn: boolean;
      readonly today: string;
    };
    readonly random: () => number;
  },
): { action: BranchAction | null; directive: string | null; learning: LearningDecision } {
  const shortStreak = isShort(input.userText) ? state.shortStreak + 1 : 0;
  const switchSignal =
    shortStreak >= branchingConfig.shortStreakForSwitch ||
    state.topicTurns >= branchingConfig.sameTopicTurns ||
    state.wantsSwitch;
  const seed = pick(
    (input.persona.topics ?? []).filter((topic) => topic !== state.topic),
    input.random,
  );
  const switching =
    switchSignal && seed !== undefined && input.random() < branchingConfig.switchProbability;
  const learning = decideLearning(state, {
    ...input.learning,
    switching,
    random: input.random,
  });
  if (switching) {
    return {
      action: { kind: "switch", seed: seed! },
      directive: `The conversation is slowing down. After answering briefly, smoothly bring up a new topic in character: "${seed}".`,
      learning,
    };
  }
  const target = learning.target;
  if (target === null) return { action: null, directive: null, learning };
  return {
    action: { kind: "insert", expressionId: target.expressionId, mode: target.mode },
    directive: learningDirective(target),
    learning,
  };
}

export function nextTopicState(
  state: TopicState,
  input: {
    readonly userText: string;
    readonly turnState: TurnState | null;
    readonly action: BranchAction | null;
    readonly learning?: LearningDecision;
    readonly today?: string;
  },
): TopicState {
  const topic = input.turnState?.topic ?? state.topic;
  const switched = input.action?.kind === "switch";
  const inserted = input.action?.kind === "insert";
  return {
    turn: state.turn + 1,
    topic,
    topicTurns: switched || topic !== state.topic ? 1 : state.topicTurns + 1,
    shortStreak: isShort(input.userText) ? state.shortStreak + 1 : 0,
    wantsSwitch: input.turnState?.userWantsSwitch === true,
    lastInsertTurn: inserted ? state.turn + 1 : state.lastInsertTurn,
    lastSwitchTurn: switched ? state.turn + 1 : state.lastSwitchTurn,
    heavy: input.turnState?.heavy === true,
    ...nextLearningState(state, input.learning?.target ?? null, input.today ?? ""),
  };
}
