// 학습 표현 넣기(PRD §3.7 결정 2026-11-10): 언제(주기) · 무엇을(표현 고르기) · 어떻게(노출 · 유도 · 칩). 순수 함수입니다.
//
// 주기 — 직전 삽입 뒤 유저 턴 `minGap`번이 지나야 기회가 열리고, 열린 뒤 `baseProbability`에서 턴마다 올라 `forceTurns`번째부터는
// 매 턴 연다(「오래됐으니 웬만하면 넣어 보라」는 한 줄이 붙지만 넣으라고 강제하지는 않는다). 대화당 하루 `dailyCap`번. 첫 턴 · 유저가
// 화제 전환을 원한 턴 · 무거운 대화(앞 턴 `@state.heavy`) · 화제 전환 턴은 열지 않는다.
// 무엇을 · 어떻게 — 기회가 열리면 칩 방식(코드가 표현 하나를 고른다)이 아닌 한 후보 `offerSize`개를 답 모델에 주고, 모델이 지금 대화에
// 맞는 것 하나를 골라 말하거나(노출) 그 표현으로 답할 질문을 하거나(유도), 맞는 게 없으면 넣지 않는다(맥락 판단은 맥락을 아는 답 모델이 —
// 따로 판정 호출을 두지 않는다). 고른 것은 `@state.learned`(후보 id) · `learned_how`로 보고한다.
// 건너뛰면 — 간격 · 하루 수를 쓰지 않고 다음 턴에 다시 연다. `maxSkipStreak`번 이어 건너뛰면 그때 간격을 새로 센다. 건너뛴 후보는
// 표현마다 세어(`learnSkips`) 두 번 넘게 건너뛴 표현은 후보 뒤로 미룬다 — 고르면 지운다.
// 후보 순서 — 아직 만난 적 없는 것(최근 에피소드부터) → 만난 것 가운데 유저가 아직 안 쓴 것 → 오래 안 본 것, 직전 표현은 뺀다.
// 방식 — 처음 만나는 표현은 노출만. 만난 적 있으면 유저가 아직 안 썼을 때 유도를, 써 봤으면 노출을 권한다. 칩은 앞쪽 셋 가운데 랜덤으로
// 고른 표현의 비중(아직 안 씀 30% · 써 봄 20%)으로 정하고, 칩 스위치가 꺼져 있으면 칩은 없다.
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
  /** 답 모델에 주는 후보 수. */
  readonly offerSize: number;
  /** 이만큼 이어 건너뛰면 간격을 새로 센다. */
  readonly maxSkipStreak: number;
};

export const defaultLearningSettings: LearningSettings = {
  enabled: true,
  minGap: 3,
  baseProbability: 0.3,
  forceTurns: 6,
  dailyCap: 6,
  offerSize: 4,
  maxSkipStreak: 3,
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
  | "chance"
  /** 후보를 줬는데 답 모델이 지금 대화에 맞는 것이 없다고 넘겼다(턴 결과에서만). */
  | "skipped";

export type LearningTarget = {
  readonly expressionId: string;
  readonly kind: string;
  readonly surface: string;
  readonly gloss: string | null;
  readonly mode: LearningMode;
};

/** 답 모델에 주는 후보 하나. `modes[0]`이 권하는 방식(처음 만나는 표현은 노출만). */
export type LearningCandidate = {
  /** 지시 · `@state.learned`에 쓰는 짧은 id(`e1` …). */
  readonly ref: string;
  readonly expressionId: string;
  readonly kind: string;
  readonly surface: string;
  readonly gloss: string | null;
  readonly modes: readonly ("expose" | "elicit")[];
};

export type LearningOffer = {
  readonly candidates: readonly LearningCandidate[];
  /** `forceTurns`가 지났다 — 웬만하면 넣어 보라는 한 줄. */
  readonly nudge: boolean;
};

export type LearningDecision = {
  /** 주기 · 상한을 지나 기회가 열렸는가(삽입률의 분모). */
  readonly open: boolean;
  readonly reason: LearningReason;
  /** 칩 방식 — 코드가 고른 표현 하나(칩 요청에 싣는다). */
  readonly target: LearningTarget | null;
  /** 답 방식 — 답 모델이 고를 후보. */
  readonly offer: LearningOffer | null;
};

const tutorialEpisode = "u00-tutorial";

/** 끝낸 유닛이 튜토리얼에만 있는가 — 그런 유저는 턴에 넣지 않는다(첫 인사 · 선톡에서만). */
export const isTutorialOnly = (episodes: readonly string[]) =>
  episodes.length > 0 && episodes.every((episode) => episode === tutorialEpisode);

const seenCount = (entry: LearningExpression) =>
  (entry.exposed ?? 0) + (entry.elicited ?? 0) + (entry.chipShown ?? 0);

/** 이만큼 넘게 건너뛴 표현은 후보 뒤로 미룬다. */
const skipDemoteAfter = 2;

/** 고를 차례(앞일수록 먼저). 풀은 RPC가 최근 에피소드부터 준다. 자주 건너뛴 표현은 맨 뒤로. */
export function rankExpressions(
  pool: readonly LearningExpression[],
  lastExpressionId: string | null,
  skips: Readonly<Record<string, number>> = {},
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
  const ordered = [...unseen, ...seen];
  const demoted = (entry: LearningExpression) => (skips[entry.id] ?? 0) > skipDemoteAfter;
  return [...ordered.filter((entry) => !demoted(entry)), ...ordered.filter(demoted)];
}

/** 표현의 후보 방식: 처음이면 노출만, 아직 안 썼으면 유도 먼저, 써 봤으면 노출 먼저. */
const candidateModes = (entry: LearningExpression): LearningCandidate["modes"] =>
  seenCount(entry) === 0
    ? ["expose"]
    : (entry.produced ?? 0) === 0
      ? ["elicit", "expose"]
      : ["expose", "elicit"];

export const candidateOf = (
  entry: Pick<LearningExpression, "id" | "kind" | "surface" | "gloss">,
  modes: LearningCandidate["modes"],
  index: number,
): LearningCandidate => ({
  ref: `e${index + 1}`,
  expressionId: entry.id,
  kind: entry.kind,
  surface: entry.surface,
  gloss: entry.gloss,
  modes,
});

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
    offer: null,
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
  if (input.random() >= chance) return { open: true, reason: "chance", target: null, offer: null };
  const ranked = rankExpressions(
    input.pool,
    state.lastExpressionId ?? null,
    state.learnSkips ?? {},
  );
  // 칩은 답 뒤 단계라 코드가 표현 하나를 정한다(앞쪽 셋 가운데 랜덤, 그 표현의 방식 비중으로).
  const top = ranked.slice(0, 3);
  const entry = top[Math.min(top.length - 1, Math.floor(input.random() * top.length))]!;
  if (pickMode(entry, input.chipsOn, input.random) === "chip")
    return { open: true, reason: "ok", target: toTarget(entry, "chip"), offer: null };
  return {
    open: true,
    reason: "ok",
    target: null,
    offer: {
      candidates: ranked
        .slice(0, Math.max(1, settings.offerSize))
        .map((candidate, index) => candidateOf(candidate, candidateModes(candidate), index)),
      nudge: gap >= settings.forceTurns,
    },
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

const quoted = (target: Pick<LearningCandidate, "surface" | "gloss">) =>
  `"${target.surface}"${target.gloss ? ` (${target.gloss})` : ""}`;

const modeHint = (modes: LearningCandidate["modes"]) => {
  const [first, second] = modes;
  if (second === undefined) return first === "elicit" ? "ask only" : "say it only";
  return first === "elicit"
    ? "they have not used it yet: asking is best, saying it is fine"
    : "say it or ask";
};

/**
 * 답 모델에 주는 이번 턴 지시(답 방식 · 첫 인사 · 선톡). 후보 가운데 지금 대화에 맞는 것 하나만, 맞는 게 없으면 넣지 않는다.
 * 고른 것은 `@state`의 `learned`(후보 id) · `learned_how`(say · ask)로 보고한다.
 */
export function offerDirective(offer: LearningOffer): string {
  const lines = offer.candidates.map(
    (candidate) => `- ${candidate.ref}: ${quoted(candidate)} — ${modeHint(candidate.modes)}`,
  );
  return [
    "Learned expressions you may weave into this reply (optional, at most one):",
    ...lines,
    "Pick one only if it fits what you are already talking about. If none fits naturally, use none: skipping is fine, and never bend the conversation or change the topic just to use one.",
    "To say it: use it once in your own line (you may conjugate it or fill its blank). To ask: end with one easy question the learner can naturally answer using it; do not use it yourself, do not mention it, and never quiz or test them.",
    ...(offer.nudge
      ? ["It has been a while since the last one: if one fits even reasonably, use it."]
      : []),
    'In @state set "learned" to the id you used (e.g. "e1") and "learned_how" to "say" or "ask"; if you used none, set "learned" to null.',
  ].join("\n");
}

/** 첫 인사 · 선톡의 노출 하나를 후보 하나짜리 지시로. */
export const openerOffer = (target: LearningTarget): LearningOffer => ({
  candidates: [
    candidateOf(
      { id: target.expressionId, kind: target.kind, surface: target.surface, gloss: target.gloss },
      ["expose"],
      0,
    ),
  ],
  nudge: false,
});
