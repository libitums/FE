// 메인 답변 받기: 조각으로 나누고, 검사가 끝날 때까지 모아 두었다가 내보냅니다. 조각을 내보내기 전 실패는 한 번 다시 시도합니다.

import type { BegunTurn, ChatSendDeps, CompanionLlm, HistoryEntry } from "./chat-send.contract.ts";
import { collectSegments, createSegmentSplitter, type SegmentDelta } from "./companion-segments.ts";

export const defaultLlmTimeoutMs = 45_000;

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

export function historyFrom(turn: BegunTurn): HistoryEntry[] {
  return turn.history.flatMap((entry): HistoryEntry[] => {
    if (entry.role === "user")
      return entry.text === null ? [] : [{ role: "user", text: entry.text }];
    return entry.segments.length === 0 ? [] : [{ role: "assistant", segments: entry.segments }];
  });
}
