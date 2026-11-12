// 턴의 학습 표현(PRD §3.7): 판정 입력 만들기 · 피드백이 산출을 판정할 후보 · 유저가 쓴 표현 붙이기 · 답 모델이 고른 후보 읽기
// (`resolveLearning`) · 턴 결과(meta · 기록) · 기록 저장.
// 판정 규칙은 `companion-learning.ts`, 글자 판정은 `companion-learning-match.ts`. 기록은 `companion_record_learning`(20261125)이 센다 —
// 노출(캐릭터가 실제로 썼다: `@state.learned` + 글자 확인, 문형은 보고만) · 유도(`@state.learned`) · 칩(표현을 넣은 칩이 보였다) ·
// 산출(유저가 직접 입력해 썼다 — 칩 전송은 세지 않는다).

import type {
  ChatSendDeps,
  ChatSendEnv,
  Feedback,
  LearningContext,
  LearningExpression,
  Segment,
  TopicState,
  TurnState,
} from "./chat-send.contract.ts";
import type { Choice } from "./chat-send-choice.ts";
import type { LearnedTarget, LearnedUse } from "./companion-feedback.contract.ts";
import {
  defaultLearningSettings,
  type LearningDecision,
  type LearningOffer,
  type LearningSettings,
  type LearningTarget,
} from "./companion-learning.ts";
import type { LearningResult } from "./companion-learning-state.ts";
import {
  containsExpression,
  isPatternLike,
  matchedExpressions,
} from "./companion-learning-match.ts";
import { callRpc } from "./companion-rpc.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { segmentsToPlain } from "./companion-segments.ts";

export type LearningEvent = {
  readonly expressionId: string;
  readonly kind: "exposed" | "elicited" | "chip_shown" | "produced";
};

/** 운영 설정 + 기본값. 옛 DB면 기본값만. */
export const learningSettingsFrom = (learning: LearningContext): LearningSettings => ({
  ...defaultLearningSettings,
  ...Object.fromEntries(
    Object.entries(learning.settings ?? {}).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  ),
});

/** 칩 방식이면 칩 요청에 실을 표현, 아니면 null. */
export const chipTarget = (target: LearningTarget | null) =>
  target?.mode === "chip"
    ? { id: target.expressionId, kind: target.kind, surface: target.surface, gloss: target.gloss }
    : null;

/** 대화당 하루 상한을 세는 날(UTC). */
export const learningDay = (nowMs: number) => new Date(nowMs).toISOString().slice(0, 10);

/** 피드백 모델이 산출을 판정할 후보 — 최근 지시한 표현 가운데 글자 판정이 어려운 것(문형 · 자리). */
export function learnedTargets(
  pool: readonly LearningExpression[],
  state: TopicState,
): LearnedTarget[] {
  const byId = new Map(pool.map((entry) => [entry.id, entry]));
  return (state.recentTargets ?? [])
    .map((id) => byId.get(id))
    .filter((entry): entry is LearningExpression => entry !== undefined && isPatternLike(entry))
    .map((entry, index) => ({
      ref: `t${index + 1}`,
      id: entry.id,
      surface: entry.surface,
      gloss: entry.gloss,
    }));
}

/**
 * 피드백 카드에 유저가 쓴 배운 표현을 붙인다 — 글자 판정(배운 표현 전체) + 피드백 모델의 판정(문형). 칩을 그대로 보냈으면 붙이지 않는다.
 */
export function withLearnedUse(
  feedback: Feedback,
  pool: readonly LearningExpression[],
  text: string,
  choice: Choice,
): Feedback {
  if (choice.inputSource === "suggestion" || feedback.status === "skipped") {
    const { learnedUsed: _ignored, ...rest } = feedback;
    return rest;
  }
  const used = new Map<string, LearnedUse>();
  for (const entry of matchedExpressions(pool, text))
    used.set(entry.id, { id: entry.id, surface: entry.surface });
  for (const entry of feedback.learnedUsed ?? []) used.set(entry.id, entry);
  return used.size === 0 ? feedback : { ...feedback, learnedUsed: [...used.values()] };
}

/** 캐릭터가 지시를 실제로 따랐는가. 노출은 보고 + 글자 확인(문형은 보고만), 유도는 보고만, 칩은 표현을 넣은 칩이 보였는가. */
export function targetDone(
  target: LearningTarget,
  reported: boolean,
  segments: readonly Segment[],
  chipShown: boolean,
): boolean {
  if (target.mode === "chip") return chipShown;
  if (!reported) return false;
  if (target.mode === "elicit") return true;
  const expression = { id: target.expressionId, kind: target.kind, surface: target.surface };
  return isPatternLike(expression) || containsExpression(expression, segmentsToPlain(segments));
}

/** 답 모델이 `@state`에 보고한 후보와 방식. 고른 게 없으면 null(넘김). 옛 모양 `true`는 후보가 하나일 때만 그것으로. */
export function pickedCandidate(
  offer: LearningOffer,
  state: TurnState | null,
): LearningTarget | null {
  const learned = state?.learned;
  const candidate =
    typeof learned === "string"
      ? offer.candidates.find((entry) => entry.ref === learned)
      : learned === true && offer.candidates.length === 1
        ? offer.candidates[0]
        : undefined;
  if (candidate === undefined) return null;
  const mode =
    state?.learnedHow === "ask"
      ? "elicit"
      : state?.learnedHow === "say"
        ? "expose"
        : candidate.modes[0]!;
  return {
    expressionId: candidate.expressionId,
    kind: candidate.kind,
    surface: candidate.surface,
    gloss: candidate.gloss,
    mode,
  };
}

/** 턴 결과의 학습: 칩이면 그 표현, 후보를 줬으면 답 모델이 고른 것(없으면 건너뜀), 따랐는가. */
export function resolveLearning(
  decision: LearningDecision,
  state: TurnState | null,
  segments: readonly Segment[],
  chipShown: boolean,
): LearningResult & { readonly done: boolean } {
  if (decision.target !== null)
    return {
      target: decision.target,
      skipped: false,
      offered: [],
      done: targetDone(decision.target, false, segments, chipShown),
    };
  if (decision.offer === null) return { target: null, skipped: false, offered: [], done: false };
  const offered = decision.offer.candidates.map((candidate) => candidate.expressionId);
  const target = pickedCandidate(decision.offer, state);
  if (target === null) return { target: null, skipped: true, offered, done: false };
  return { target, skipped: false, offered, done: targetDone(target, true, segments, false) };
}

/** 턴 결과 — 저장 meta의 `learning`과 기록할 사건들. */
export function learningOutcome(input: {
  readonly decision: LearningDecision;
  readonly result: LearningResult & { readonly done: boolean };
  readonly feedback: Feedback;
}): { meta: Record<string, unknown>; events: LearningEvent[] } {
  const { decision, result } = input;
  const { target, done } = result;
  const events: LearningEvent[] = [];
  if (target !== null && done) {
    const kind =
      target.mode === "expose" ? "exposed" : target.mode === "elicit" ? "elicited" : "chip_shown";
    events.push({ expressionId: target.expressionId, kind });
  }
  for (const used of input.feedback.learnedUsed ?? [])
    events.push({ expressionId: used.id, kind: "produced" });
  const meta: Record<string, unknown> = {
    open: decision.open,
    reason: result.skipped ? "skipped" : decision.reason,
    ...(decision.offer === null
      ? {}
      : { offered: decision.offer.candidates.map((candidate) => candidate.surface) }),
    ...(target === null
      ? {}
      : { mode: target.mode, expressionId: target.expressionId, surface: target.surface, done }),
    ...(input.feedback.learnedUsed?.length
      ? { produced: input.feedback.learnedUsed.map((used) => used.id) }
      : {}),
  };
  return { meta, events };
}

/** 기록을 센다. 실패해도 턴에는 영향이 없다 — 실패하면 false(부르는 쪽이 로그). 사건이 없으면 부르지 않는다. */
export async function recordLearning(
  outbound: Outbound,
  env: ChatSendEnv,
  userId: string,
  events: readonly LearningEvent[],
  now: string,
): Promise<boolean> {
  if (events.length === 0) return true;
  try {
    await callRpc(outbound, env, "companion_record_learning", {
      p_user_id: userId,
      p_events: events.map((event) => ({ expression_id: event.expressionId, kind: event.kind })),
      p_now: now,
    });
    return true;
  } catch {
    return false;
  }
}

/** 턴의 기록 세기 — 실패는 로그만 남긴다. */
export async function recordTurnLearning(
  deps: Pick<ChatSendDeps, "outbound" | "log" | "nowMs">,
  env: ChatSendEnv,
  userId: string,
  events: readonly LearningEvent[],
): Promise<void> {
  const now = new Date(deps.nowMs()).toISOString();
  if (!(await recordLearning(deps.outbound, env, userId, events, now)))
    deps.log({ event: "chat_send", status: "stream", outcome: "learning_record_failed" });
}
