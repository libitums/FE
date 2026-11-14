// 대화 분기(PRD §3.8): 신호가 임계값을 넘으면 후보를 열고, 그 안에서 랜덤으로 고른다. 순수 함수입니다.
//   화제 전환 — 짧은 답이 k번 이어짐 · 같은 화제가 M턴 넘음 · 유저가 전환을 원함(앞 턴의 @state) → 확률로 화제 뱅크 씨앗.
//   짧은 답은 그 유저의 평소 길이(`lenAvg`)에 비춰 본다(초급자는 원래 짧다). 전환 뒤 `cooldownTurns` 동안 · 무거운 대화(`heavy`)에서는
//   신호만으로 바꾸지 않는다 — 유저가 원할 때는 예외. 유저가 원했는데 그 턴 답이 이미 화제를 바꿨으면 다음 턴에 또 바꾸지 않는다.
//   같은 화제는 모델이 쓴 화제 글을 띄어쓰기 없이 견주고, 한쪽이 다른 쪽을 품으면 같다고 본다(「점심 메뉴」 · 「점심 메뉴 고민」).
//   학습 표현 — 기회 · 후보 · 칩은 `companion-learning.ts`(PRD §3.7)가 정하고, 답 방식이면 후보를 답 모델에 주어 고르게 한다(맞는 게
//   없으면 넘김). 화제 전환이 열린 턴이면 넣지 않는다.
// 화제 전환 값은 PRD §8 C(만들면서 깎을 것)의 초안, 학습 삽입 값은 운영 설정(`settings.learning_*`)입니다.

import type {
  LearningExpression,
  PersonaCard,
  TopicState,
  TurnState,
} from "./chat-send.contract.ts";
import {
  decideLearning,
  defaultLearningSettings,
  type LearningDecision,
  type LearningSettings,
  offerDirective,
} from "./companion-learning.ts";
import type { Beat } from "./companion-story-data.ts";
import { nextStoryState, type StoryPick } from "./companion-story.ts";
import {
  type LearningResult,
  nextLearningState,
  noLearningResult,
} from "./companion-learning-state.ts";

export const branchingConfig = {
  shortLength: 6,
  /** 평소 길이의 이 비율 이하면 짧은 답(평균을 안 뒤). 그래도 `shortLength`를 넘지 않고 `shortFloor` 밑으로 가지 않는다. */
  shortRatio: 0.5,
  shortFloor: 2,
  /** 평균을 믿기 전 턴 수. 그 전에는 `shortLength`. */
  lenAvgTurns: 3,
  /** 평소 길이 이동 평균의 새 값 비중. */
  lenAvgWeight: 0.3,
  shortStreakForSwitch: 2,
  sameTopicTurns: 6,
  switchProbability: 0.7,
  cooldownTurns: 3,
} as const;

export type BranchAction =
  | { readonly kind: "switch"; readonly seed: string; readonly beatId?: string }
  /** 칩 방식 — 코드가 고른 표현을 칩 요청에 싣는다. */
  | { readonly kind: "insert"; readonly expressionId: string; readonly mode: "chip" }
  /** 답 방식 — 후보를 답 모델에 주고 고르게 한다. */
  | { readonly kind: "offer"; readonly expressionIds: readonly string[] };

const lengthOf = (text: string) => [...text.replace(/\s+/g, "")].length;

/** 짧은 답 문턱 — 평소 길이를 안 뒤에는 그 절반(바닥 · 천장 사이). */
export function shortLimit(state: Pick<TopicState, "turn" | "lenAvg">): number {
  const avg = state.lenAvg ?? null;
  if (avg === null || state.turn < branchingConfig.lenAvgTurns) return branchingConfig.shortLength;
  return Math.max(
    branchingConfig.shortFloor,
    Math.min(branchingConfig.shortLength, Math.round(avg * branchingConfig.shortRatio)),
  );
}

const isShort = (text: string, state: Pick<TopicState, "turn" | "lenAvg">) =>
  lengthOf(text) <= shortLimit(state);

/** 모델이 쓴 화제 글끼리 같은 화제인가 — 띄어쓰기를 빼고 한쪽이 다른 쪽을 품으면 같다. */
export function sameTopic(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  const x = a.replace(/\s+/g, "");
  const y = b.replace(/\s+/g, "");
  return x !== "" && y !== "" && (x.includes(y) || y.includes(x));
}

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
    lenAvg: nullableNum(raw?.lenAvg),
    storySeen: strings(raw?.storySeen, 60),
    storyShow: strings(raw?.storyShow, 10),
    storyShowUntil: nullableNum(raw?.storyShowUntil),
    beatsUsed: strings(raw?.beatsUsed, 60),
    learnDay: typeof raw?.learnDay === "string" ? raw.learnDay : null,
    learnToday: num(raw?.learnToday, 0),
    lastExpressionId: typeof raw?.lastExpressionId === "string" ? raw.lastExpressionId : null,
    recentTargets: Array.isArray(raw?.recentTargets)
      ? raw.recentTargets.filter((id): id is string => typeof id === "string").slice(-5)
      : [],
    learnSkipStreak: num(raw?.learnSkipStreak, 0),
    learnSkips:
      raw?.learnSkips !== null &&
      typeof raw?.learnSkips === "object" &&
      !Array.isArray(raw.learnSkips)
        ? Object.fromEntries(
            Object.entries(raw.learnSkips).filter(
              (entry): entry is [string, number] =>
                typeof entry[1] === "number" && Number.isFinite(entry[1]),
            ),
          )
        : {},
  };
}

function strings(value: unknown, max: number): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(-max)
    : [];
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
    /** 진도가 맞고 이 대화에서 안 쓴 메신저 비트(`eligibleBeats`). 있으면 페르소나 화제보다 먼저. */
    readonly beats?: readonly Beat[];
  },
): { action: BranchAction | null; directive: string | null; learning: LearningDecision } {
  const shortStreak = isShort(input.userText, state) ? state.shortStreak + 1 : 0;
  const cooling =
    state.lastSwitchTurn !== null &&
    state.turn - state.lastSwitchTurn < branchingConfig.cooldownTurns;
  const switchSignal =
    state.wantsSwitch ||
    (!cooling &&
      state.heavy !== true &&
      (shortStreak >= branchingConfig.shortStreakForSwitch ||
        state.topicTurns >= branchingConfig.sameTopicTurns));
  const beat = pick(input.beats ?? [], input.random);
  const seed =
    beat?.seed ??
    pick(
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
      action: beat
        ? { kind: "switch", seed: seed!, beatId: beat.id }
        : { kind: "switch", seed: seed! },
      directive: `The conversation is slowing down. After answering briefly, smoothly bring up a new topic in character: "${seed}".`,
      learning,
    };
  }
  if (learning.target !== null)
    return {
      action: { kind: "insert", expressionId: learning.target.expressionId, mode: "chip" },
      directive: null,
      learning,
    };
  if (learning.offer !== null)
    return {
      action: {
        kind: "offer",
        expressionIds: learning.offer.candidates.map((candidate) => candidate.expressionId),
      },
      directive: offerDirective(learning.offer),
      learning,
    };
  return { action: null, directive: null, learning };
}

export function nextTopicState(
  state: TopicState,
  input: {
    readonly userText: string;
    readonly turnState: TurnState | null;
    readonly action: BranchAction | null;
    /** 턴 결과의 학습(넣음 · 건너뜀) — `resolveLearning`. */
    readonly learning?: LearningResult;
    readonly today?: string;
    readonly maxSkipStreak?: number;
    /** 이번 턴에 실은 「지금까지 이야기」 카드(`pickStory`). */
    readonly story?: StoryPick;
  },
): TopicState {
  const topic = input.turnState?.topic ?? state.topic;
  const switched = input.action?.kind === "switch";
  const kept = !switched && sameTopic(topic, state.topic);
  const length = lengthOf(input.userText);
  const { inserted, restartGap, ...learning } = nextLearningState(
    state,
    input.learning ?? noLearningResult,
    input.today ?? "",
    input.maxSkipStreak ?? defaultLearningSettings.maxSkipStreak,
  );
  return {
    turn: state.turn + 1,
    // 같은 화제로 본 동안은 처음 글을 지켜 견주는 기준이 흘러가지 않게 한다.
    topic: kept ? state.topic : topic,
    topicTurns: kept ? state.topicTurns + 1 : 1,
    // 전환하면 짧은 답을 새로 센다 — 안 그러면 짧게 답하는 초급자에게 매 턴 또 바꾼다.
    shortStreak: switched ? 0 : isShort(input.userText, state) ? state.shortStreak + 1 : 0,
    // 유저가 원했어도 이번 답이 이미 화제를 바꿨으면 다음 턴에 또 바꾸지 않는다.
    wantsSwitch: input.turnState?.userWantsSwitch === true && kept,
    ...(input.story === undefined
      ? {
          storySeen: state.storySeen ?? [],
          storyShow: state.storyShow ?? [],
          storyShowUntil: state.storyShowUntil ?? null,
        }
      : nextStoryState(state, input.story)),
    beatsUsed:
      input.action?.kind === "switch" && input.action.beatId !== undefined
        ? [...(state.beatsUsed ?? []), input.action.beatId].slice(-60)
        : (state.beatsUsed ?? []),
    lenAvg:
      state.lenAvg == null
        ? length
        : Math.round(
            (state.lenAvg * (1 - branchingConfig.lenAvgWeight) +
              length * branchingConfig.lenAvgWeight) *
              10,
          ) / 10,
    lastInsertTurn: inserted || restartGap ? state.turn + 1 : state.lastInsertTurn,
    lastSwitchTurn: switched ? state.turn + 1 : state.lastSwitchTurn,
    heavy: input.turnState?.heavy === true,
    ...learning,
  };
}
