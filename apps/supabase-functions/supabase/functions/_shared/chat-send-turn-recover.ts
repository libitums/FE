// 출력 검사(미성년자 · 나이 모름)에 걸린 답을 한 번 다시 만듭니다(ADR-0151). 학습자의 글은 입력 검사를 통과했는데 캐릭터 답이 앞 맥락
// (예: 해변 · 수영복)을 이어 받아 걸리면, 그대로 끝낼 때 학습자에게는 자기 무해한 글이 막힌 것처럼 보이고 다음 답도 같은 맥락으로 또 걸린다.
// 걸린 답의 글은 주지 않고 분류만 준 지시(`recoveryDirective`)로 화제를 돌린 답을 만들고, 같은 출력 검사를 다시 거칩니다. 그것도 걸리거나
// 만들기에 실패하면 null — 턴이 지금처럼 `guardrail_blocked`로 끝냅니다. 번역 · 칩은 따로 끊을 수 있게 시작해, 다시 만들면 새 조각으로 다시 엽니다.

import type {
  HistoryEntry,
  ModerationVerdict,
  PersonaCard,
  Segment,
} from "./chat-send.contract.ts";
import type { TurnContext } from "./chat-send-context.ts";
import type { ModerationRecord } from "./chat-send-finish.ts";
import { chipTarget } from "./chat-send-learning.ts";
import { defaultLlmTimeoutMs, startReply } from "./chat-send-reply.ts";
import { startSuggestions } from "./chat-send-suggest.ts";
import { startTranslation, translationContext } from "./chat-send-translate.ts";
import type { LearningTarget } from "./companion-learning.ts";
import { recoveryDirective, refusalTopic } from "./companion-llm-prompts.ts";
import { segmentsToPlain } from "./companion-segments.ts";
import { effectiveRomanceTier } from "./companion-safety.ts";

/** 동기 출력 검사 — 결과를 검사 목록에 더합니다. 검사 실패는 거부(턴이 `upstream_unavailable`로). 완화 수위(open) 턴도 여기를 지난다. */
export function outputChecker(context: TurnContext, moderation: ModerationRecord[]) {
  const { deps, llm, body, gate } = context;
  return async (segments: readonly Segment[]): Promise<ModerationVerdict> => {
    const output = await llm.moderate({
      layer: "output_sync",
      text: segmentsToPlain(segments),
      context: body.text,
      ageBand: gate.ageBand,
      romanceTier: effectiveRomanceTier(gate.ageBand, gate.romanceTier),
      signal: AbortSignal.timeout(deps.llmTimeoutMs ?? defaultLlmTimeoutMs),
    });
    moderation.push({
      layer: "output_sync",
      category: output.category,
      action: output.action === "allow" ? "allow" : "block",
    });
    return output;
  };
}

/** 답 조각으로 번역 · 칩을 시작합니다. `stop`은 이 둘만 끊습니다(턴 abort에도 이어져 있다). */
export function startFollowUps(
  context: TurnContext,
  input: {
    readonly persona: PersonaCard;
    readonly history: readonly HistoryEntry[];
    readonly target: LearningTarget | null;
    readonly signal: AbortSignal;
  },
  segments: readonly Segment[],
) {
  const { deps, env, llm, body, gate } = context;
  const own = new AbortController();
  const signal = AbortSignal.any([input.signal, own.signal]);
  const translation = startTranslation(
    llm,
    env,
    {
      segments: [...segments],
      l1: gate.l1,
      timeoutMs: deps.translationTimeoutMs,
      context: translationContext([...input.history, { role: "user", text: body.text }]),
      persona: input.persona,
    },
    signal,
  );
  const chips = startSuggestions(
    context,
    input.persona,
    segments,
    signal,
    chipTarget(input.target),
  );
  return { translation, chips, stop: () => own.abort() };
}

/** 걸린 분류로 화제를 돌린 답을 한 번 만들고 다시 검사합니다. 통과한 답(내보내기 전)만 돌려주고, 아니면 null. */
export async function recoverReply(
  context: TurnContext,
  input: {
    readonly history: HistoryEntry[];
    readonly system: string;
    readonly abort: AbortController;
    readonly category: string;
    readonly check: (segments: readonly Segment[]) => Promise<ModerationVerdict>;
  },
) {
  const { gate } = context;
  const tier = effectiveRomanceTier(gate.ageBand, gate.romanceTier);
  const directive = recoveryDirective(refusalTopic(input.category, tier));
  const reply = startReply(context, input.history, input.system, input.abort, directive);
  try {
    const result = await reply.done;
    if (!result.segments.some((segment) => segment.kind === "speech")) return null;
    const verdict = await input.check(result.segments);
    return verdict.action === "allow" ? { reply, result } : null;
  } catch {
    return null;
  }
}
