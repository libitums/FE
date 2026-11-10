// 학습 표현 넣기(PRD §3.7 결정 2026-11-10): 언제(주기) · 무엇을(표현 고르기) · 어떻게(노출 · 유도 · 칩). 순수 함수입니다.
//
// 주기 — 직전 삽입 뒤 유저 턴 `minGap`번이 지나야 후보가 열리고, 열린 뒤 `baseProbability`에서 턴마다 올라 `forceTurns`번째에는 반드시
// 넣는다. 대화당 하루 `dailyCap`번. 첫 턴 · 유저가 화제 전환을 원한 턴 · 무거운 대화(앞 턴 `@state.heavy`) · 화제 전환 턴은 넣지 않는다.
// 표현 — 아직 만난 적 없는 것(최근 에피소드부터) → 만난 것 가운데 유저가 아직 안 쓴 것 → 오래 안 본 것. 앞쪽 셋 가운데 랜덤, 직전
// 표현은 다시 고르지 않는다.
// 방식 — 처음 만나는 표현은 노출. 만난 적 있으면 유저가 아직 안 썼을 때 유도 · 칩 쪽 비중을 올린다. 칩 스위치가 꺼져 있으면 칩 대신 유도.
// 튜토리얼만 끝낸 유저(「안녕하세요」 · 「감사합니다」)는 턴에 넣지 않고 첫 인사 · 선톡에서만 노출한다(`pickOpenerExpression`).

import type { LearningExpression, TopicState } from "./chat-send.contract.ts";

export type LearningMode = "expose" | "elicit" | "chip";

/** 운영 설정(`companion.settings.learning_*`, 20261125). 옛 DB면 `defaultLearningSettings`. */
export type LearningSettings = {
  readonly enabled: boolean;
  readonly minGap: number;
  readonly baseProbability: number;
  readonly forceTurns: number;
  readonly dailyCap: number;
};

export const defaultLearningSettings: LearningSettings = {
  enabled: true,
  minGap: 3,
  baseProbability: 0.3,
  forceTurns: 6,
  dailyCap: 6,
};

/** 넣지 않은 까닭 — 지표(`meta.learning.reason`). `ok`면 넣었다. */
export type LearningReason =
  | "ok"
  | "disabled"
  | "no_pool"
  | "manual_empty"
  | "tutorial_only"
  | "first_turn"
  | "wants_switch"
  | "heavy"
  | "switch"
  | "cooldown"
  | "daily_cap"
  | "chance";

export type LearningTarget = {
  readonly expressionId: string;
  readonly kind: string;
  readonly surface: string;
  readonly gloss: string | null;
  readonly mode: LearningMode;
};

export type LearningDecision = {
  /** 주기 · 상한을 지나 후보가 열렸는가(삽입률의 분모). */
  readonly open: boolean;
  readonly reason: LearningReason;
  readonly target: LearningTarget | null;
};

const tutorialEpisode = "u00-tutorial";

/** 끝낸 유닛이 튜토리얼에만 있는가 — 그런 유저는 턴에 넣지 않는다(첫 인사 · 선톡에서만). */
export const isTutorialOnly = (episodes: readonly string[]) =>
  episodes.length > 0 && episodes.every((episode) => episode === tutorialEpisode);

const seenCount = (entry: LearningExpression) =>
  (entry.exposed ?? 0) + (entry.elicited ?? 0) + (entry.chipShown ?? 0);

/** 고를 차례(앞일수록 먼저). 풀은 RPC가 최근 에피소드부터 준다. */
export function rankExpressions(
  pool: readonly LearningExpression[],
  lastExpressionId: string | null,
): LearningExpression[] {
  const usable =
    pool.length > 1 ? pool.filter((entry) => entry.id !== lastExpressionId) : [...pool];
  const unseen = usable.filter((entry) => seenCount(entry) === 0);
  const seen = usable
    .filter((entry) => seenCount(entry) > 0)
    .sort((a, b) => {
      const produced = Number((a.produced ?? 0) > 0) - Number((b.produced ?? 0) > 0);
      if (produced !== 0) return produced;
      return (a.lastSeenAt ?? "").localeCompare(b.lastSeenAt ?? "");
    });
  return [...unseen, ...seen];
}

function pickMode(entry: LearningExpression, chipsOn: boolean, random: () => number): LearningMode {
  if (seenCount(entry) === 0) return "expose";
  const notYet = (entry.produced ?? 0) === 0;
  const weights: [LearningMode, number][] = notYet
    ? [
        ["elicit", 0.5],
        ["chip", 0.3],
        ["expose", 0.2],
      ]
    : [
        ["expose", 0.5],
        ["elicit", 0.3],
        ["chip", 0.2],
      ];
  const usable = chipsOn ? weights : weights.filter(([mode]) => mode !== "chip");
  const total = usable.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [mode, weight] of usable) {
    roll -= weight;
    if (roll < 0) return mode;
  }
  return usable[usable.length - 1]![0];
}

const toTarget = (entry: LearningExpression, mode: LearningMode): LearningTarget => ({
  expressionId: entry.id,
  kind: entry.kind,
  surface: entry.surface,
  gloss: entry.gloss,
  mode,
});

/** 이번 턴의 학습 삽입 판정. 화제 전환이 열린 턴이면 `switching`으로 부르고 넣지 않는다. */
export function decideLearning(
  state: TopicState,
  input: {
    readonly pool: readonly LearningExpression[];
    readonly episodes: readonly string[];
    readonly settings: LearningSettings;
    /** 수동 범위인데 고른 에피소드가 없다(20261126) — `no_pool`과 따로 센다. */
    readonly manualEmpty?: boolean;
    readonly chipsOn: boolean;
    readonly switching: boolean;
    readonly today: string;
    readonly random: () => number;
  },
): LearningDecision {
  const closed = (reason: LearningReason): LearningDecision => ({
    open: false,
    reason,
    target: null,
  });
  const { settings } = input;
  if (!settings.enabled) return closed("disabled");
  if (input.manualEmpty === true) return closed("manual_empty");
  if (input.pool.length === 0) return closed("no_pool");
  if (isTutorialOnly(input.episodes)) return closed("tutorial_only");
  if (state.turn === 0) return closed("first_turn");
  if (state.wantsSwitch) return closed("wants_switch");
  if (state.heavy === true) return closed("heavy");
  if (input.switching) return closed("switch");
  const gap = state.turn + 1 - (state.lastInsertTurn ?? 0);
  if (gap < settings.minGap) return closed("cooldown");
  if (state.learnDay === input.today && (state.learnToday ?? 0) >= settings.dailyCap)
    return closed("daily_cap");
  const span = Math.max(1, settings.forceTurns - settings.minGap);
  const chance =
    gap >= settings.forceTurns
      ? 1
      : settings.baseProbability +
        ((1 - settings.baseProbability) * (gap - settings.minGap)) / span;
  if (input.random() >= chance) return { open: true, reason: "chance", target: null };
  const ranked = rankExpressions(input.pool, state.lastExpressionId ?? null);
  const top = ranked.slice(0, 3);
  const entry = top[Math.min(top.length - 1, Math.floor(input.random() * top.length))]!;
  return {
    open: true,
    reason: "ok",
    target: toTarget(entry, pickMode(entry, input.chipsOn, input.random)),
  };
}

/** 첫 인사 · 선톡에 노출로 넣을 표현 하나(설정이 꺼졌거나 풀이 비면 null). 튜토리얼만 끝낸 유저도 여기서는 넣는다. */
export function pickOpenerExpression(
  pool: readonly LearningExpression[],
  settings: LearningSettings,
  random: () => number,
): LearningTarget | null {
  if (!settings.enabled || pool.length === 0) return null;
  const top = rankExpressions(pool, null).slice(0, 3);
  const entry = top[Math.min(top.length - 1, Math.floor(random() * top.length))]!;
  return toTarget(entry, "expose");
}

const quoted = (target: LearningTarget) =>
  `"${target.surface}"${target.gloss ? ` (${target.gloss})` : ""}`;

/** 답 모델에 주는 이번 턴 지시. 칩 방식은 답이 아니라 칩 쪽이라 지시가 없다. */
export function learningDirective(target: LearningTarget): string | null {
  if (target.mode === "expose")
    return `Learned expression for this reply: ${quoted(target)}. If it fits naturally, use it once in your own line (you may conjugate it or fill its blank). If it would feel forced, skip it: never bend the conversation just to use it. In @state set "learned" to true only if you used it.`;
  if (target.mode === "elicit")
    return `Learned expression to practise: ${quoted(target)}. If it fits the conversation, end with one easy question the learner can naturally answer using it. Do not use it yourself, do not mention it, and never quiz or test them. If it would feel forced, skip it. In @state set "learned" to true only if you asked such a question.`;
  return null;
}

/** 첫 인사 · 선톡 지시에 붙이는 한 줄. */
export const openerLearningLine = (target: LearningTarget) =>
  `If it fits naturally, use the Korean expression ${quoted(target)} once. If it would feel forced, skip it.`;

/** 최근 지시한 표현(피드백이 유저 산출을 판정할 후보) — 최대 5개. */
const recentLimit = 5;

/** 삽입 뒤 화제 상태의 학습 칸. 지시를 냈으면(모델이 넘겼어도) 간격 · 하루 수를 센다. */
export function nextLearningState(
  state: TopicState,
  target: LearningTarget | null,
  today: string,
): Pick<TopicState, "learnDay" | "learnToday" | "lastExpressionId" | "recentTargets"> {
  if (target === null)
    return {
      learnDay: state.learnDay ?? null,
      learnToday: state.learnToday ?? 0,
      lastExpressionId: state.lastExpressionId ?? null,
      recentTargets: state.recentTargets ?? [],
    };
  return {
    learnDay: today,
    learnToday: state.learnDay === today ? (state.learnToday ?? 0) + 1 : 1,
    lastExpressionId: target.expressionId,
    recentTargets: [
      ...(state.recentTargets ?? []).filter((id) => id !== target.expressionId),
      target.expressionId,
    ].slice(-recentLimit),
  };
}
