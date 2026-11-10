// 유저 말 없이 캐릭터가 먼저 거는 말(첫 인사 · 선톡)의 공통 조각: 배운 표현 하나를 노출로 넣기(PRD §3.7 — 튜토리얼만 끝낸 유저는
// 주로 여기서 「안녕하세요」 · 「감사합니다」를 만난다)와 답 모델로 말 만들기 + 출력 검사(연령과 상관없이 — 유저 말 없이 나가는 글).

import type {
  AgeBand,
  ChatSendEnv,
  CompanionLlm,
  HistoryEntry,
  LearningContext,
  LearningExpression,
  Segment,
  TurnState,
} from "./chat-send.contract.ts";
import {
  type LearningEvent,
  learningSettingsFrom,
  recordLearning,
  targetDone,
} from "./chat-send-learning.ts";
import {
  type LearningTarget,
  openerLearningLine,
  pickOpenerExpression,
} from "./companion-learning.ts";
import { callRpc } from "./companion-rpc.ts";
import { collectSegments, createSegmentSplitter, segmentsToPlain } from "./companion-segments.ts";
import type { Outbound } from "./delete-account.contract.ts";

/** 첫 인사 · 선톡 프롬프트에 넣는 배운 표현 수의 상한. */
const openerExpressionLimit = 30;

export type OpenerLearning = {
  readonly pool: readonly LearningExpression[];
  readonly target: LearningTarget | null;
};

/** 학습 맥락을 읽고 노출할 표현 하나를 고른다. 읽지 못하면(옛 DB · 오류) 넣지 않는다. */
export async function openerLearning(
  outbound: Outbound,
  env: ChatSendEnv,
  userId: string,
  random: () => number,
): Promise<OpenerLearning> {
  try {
    const learning = await callRpc<LearningContext>(outbound, env, "companion_learning_context", {
      p_user_id: userId,
      p_limit: openerExpressionLimit,
    });
    const pool = learning?.expressions ?? [];
    return { pool, target: pickOpenerExpression(pool, learningSettingsFrom(learning), random) };
  } catch {
    return { pool: [], target: null };
  }
}

/** 이번 말 지시에 노출 줄을 붙인다. */
export const withOpenerLine = (directive: string, target: LearningTarget | null) =>
  target === null ? directive : `${directive}\n${openerLearningLine(target)}`;

/** 저장 meta의 `learning`과 기록할 사건 — 정해진 줄(생성 실패)이면 넣지 않은 것으로 센다. */
export function openerOutcome(
  target: LearningTarget | null,
  state: TurnState | null,
  segments: readonly Segment[],
): { meta: Record<string, unknown> | null; events: LearningEvent[] } {
  if (target === null) return { meta: null, events: [] };
  const done = targetDone(target, state, segments, false);
  return {
    meta: { mode: "expose", expressionId: target.expressionId, surface: target.surface, done },
    events: done ? [{ expressionId: target.expressionId, kind: "exposed" }] : [],
  };
}

export const recordOpener = (
  outbound: Outbound,
  env: ChatSendEnv,
  userId: string,
  events: readonly LearningEvent[],
  now: string,
) => recordLearning(outbound, env, userId, events, now);

/**
 * 답 모델로 말을 만들고 출력 검사한다. `outcome`이 `model`이 아니면(빈 답 · 차단 · 실패) 부르는 쪽이 정해진 줄로 바꾼다.
 */
export async function generateOpener(
  llm: CompanionLlm,
  input: {
    readonly system: string;
    /** 지난 대화(선톡). 첫 인사는 없다. */
    readonly history?: readonly HistoryEntry[];
    readonly userText: string;
    readonly ageBand: AgeBand;
    readonly timeoutMs: number;
  },
): Promise<{ segments: Segment[]; state: TurnState | null; outcome: string }> {
  try {
    const splitter = createSegmentSplitter();
    const deltas = [];
    for await (const chunk of llm.reply({
      system: input.system,
      history: input.history ?? [],
      userText: input.userText,
      signal: AbortSignal.timeout(input.timeoutMs),
    })) {
      deltas.push(...splitter.push(chunk));
    }
    deltas.push(...splitter.end());
    const segments = collectSegments(deltas);
    if (segments.length === 0) return { segments, state: null, outcome: "empty_reply" };
    const verdict = await llm.moderate({
      layer: "output_sync",
      text: segmentsToPlain(segments),
      context: null,
      ageBand: input.ageBand,
      signal: AbortSignal.timeout(input.timeoutMs),
    });
    return {
      segments,
      state: splitter.state(),
      outcome: verdict.action === "allow" ? "model" : "blocked",
    };
  } catch {
    return { segments: [], state: null, outcome: "failed" };
  }
}
