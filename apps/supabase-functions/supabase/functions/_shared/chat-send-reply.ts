// 메인 답변과 피드백(M2) 받기: 조각으로 나누고, 검사가 끝날 때까지 모아 두었다가 내보냅니다. 조각을 내보내기 전 실패는 한 번 다시 시도합니다.

import type {
  BegunTurn,
  ChatSendDeps,
  CompanionLlm,
  Feedback,
  HistoryEntry,
  TurnState,
} from "./chat-send.contract.ts";
import { emptyFeedback, recentFeedbackHistory } from "./companion-llm-prompts.ts";
import {
  collectSegments,
  createSegmentSplitter,
  segmentsToPlain,
  type SegmentDelta,
} from "./companion-segments.ts";

export const defaultLlmTimeoutMs = 45_000;
export const defaultFeedbackTimeoutMs = 8_000;

type FeedbackContext = ReplyContext & {
  readonly turn: Pick<BegunTurn, "history" | "speechLevel" | "persona">;
  readonly gate: { readonly l1: string | null };
};

type ReplyContext = {
  readonly deps: ChatSendDeps;
  readonly llm: CompanionLlm;
  readonly body: { readonly text: string };
};

export class ReplyFailed extends Error {}

/**
 * 메인 답변을 받아 조각으로 나눕니다. `live`가 켜지면 받는 대로 `onLive`로 내보내고, 그 전에는 모아 둡니다.
 * 조각을 하나도 내보내기 전에 실패하면 한 번만 다시 시도합니다(API §2.1).
 */
export function startReply(
  context: ReplyContext,
  history: HistoryEntry[],
  system: string,
  abort: AbortController,
) {
  const deltas: SegmentDelta[] = [];
  let emitted = 0;
  let live: ((delta: SegmentDelta) => void) | null = null;
  let firstDeltaMs: number | null = null;
  let state: TurnState | null = null;
  const started = context.deps.nowMs();

  const push = (items: SegmentDelta[]) => {
    for (const item of items) {
      if (firstDeltaMs === null) firstDeltaMs = context.deps.nowMs() - started;
      deltas.push(item);
      if (live !== null) {
        live(item);
        emitted += 1;
      }
    }
  };

  const attempt = async () => {
    const timeout = AbortSignal.timeout(context.deps.llmTimeoutMs ?? defaultLlmTimeoutMs);
    const signal = AbortSignal.any([abort.signal, timeout]);
    const splitter = createSegmentSplitter();
    for await (const chunk of context.llm.reply({
      system,
      history,
      userText: context.body.text,
      signal,
    })) {
      push(splitter.push(chunk));
    }
    push(splitter.end());
    state = splitter.state();
  };

  const done = (async () => {
    try {
      await attempt();
    } catch (error) {
      if (abort.signal.aborted) throw error;
      if (emitted > 0) throw new ReplyFailed(String(error));
      deltas.length = 0;
      firstDeltaMs = null;
      try {
        await attempt();
      } catch (retryError) {
        throw new ReplyFailed(String(retryError));
      }
    }
    return {
      segments: collectSegments(deltas),
      firstDeltaMs,
      totalMs: context.deps.nowMs() - started,
      state: state as TurnState | null,
    };
  })();
  // 결과를 아무도 기다리지 않는 경로(위기 · 차단으로 버림)에서 처리되지 않은 거부가 되지 않게 합니다.
  done.catch(() => undefined);

  return {
    done,
    /** 지금까지 모은 조각을 내보내고, 이후 조각은 받는 대로 내보냅니다. */
    goLive(onLive: (delta: SegmentDelta) => void) {
      for (const item of deltas) onLive(item);
      emitted += deltas.length;
      live = onLive;
    },
  };
}

export function historyFrom(turn: Pick<BegunTurn, "history">): HistoryEntry[] {
  return turn.history.flatMap((entry): HistoryEntry[] => {
    if (entry.role === "user")
      return entry.text === null ? [] : [{ role: "user", text: entry.text }];
    // 저장된 번역은 다시 넣지 않습니다 — 모델이 번역문 투로 답하지 않게.
    if (entry.segments.length === 0) return [];
    return [
      { role: "assistant", segments: entry.segments.map(({ kind, text }) => ({ kind, text })) },
    ];
  });
}

/** 피드백을 제한 시간 안에 받습니다. 실패 · 시간 초과는 `unavailable` — 턴을 실패시키지 않습니다(PRD §3.5). */
export function startFeedback(context: FeedbackContext, abort: AbortController): Promise<Feedback> {
  const lastAssistant = [...context.turn.history]
    .reverse()
    .find((entry) => entry.role === "assistant");
  const timeoutMs = context.deps.feedbackTimeoutMs ?? defaultFeedbackTimeoutMs;
  const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(timeoutMs)]);
  const unavailable = emptyFeedback("unavailable", context.body.text);
  let timer: ReturnType<typeof setTimeout> | undefined;
  // 구현이 신호를 따르지 않아도 제한 시간에 끝나게 타이머와 겨룹니다.
  return Promise.race([
    context.llm
      .feedback({
        text: context.body.text,
        l1: context.gate.l1,
        previous: lastAssistant === undefined ? null : segmentsToPlain(lastAssistant.segments),
        // 숨김 · 차단 메시지는 판정 함수가 이미 뺐다. 번역은 글자만 쓰니 들어가지 않는다.
        history: recentFeedbackHistory(historyFrom(context.turn)),
        speechLevel: context.turn.speechLevel,
        character:
          context.turn.persona === null
            ? null
            : {
                name: context.turn.persona.name,
                role: context.turn.persona.role ?? null,
                banmalFeedback: context.turn.persona.banmalFeedback ?? "better",
              },
        signal,
      })
      .catch(() => unavailable),
    new Promise<Feedback>((resolve) => {
      timer = setTimeout(() => resolve(unavailable), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}
