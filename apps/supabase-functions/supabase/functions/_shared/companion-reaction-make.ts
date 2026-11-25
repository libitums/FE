// 내 스토리 반응 하나를 만든다(ADR-0191 D5) — 선톡과 같은 맥락(`companion_proactive_context`: 페르소나 · 말투 · 연령 · 기억 · 최근 대화)에
// 각도가 실린 반응 지시를 얹어 답 + 출력 검사(`generateOpener`) → 번역 · 추천 답안 칩(동시에). 저장은 핸들러가 한다.
// 반응은 그 인물 방의 메시지가 되므로 번역은 대화와 같은 언어(L1, 없으면 스토리를 올린 화면 언어)로 붙인다.

import type { ChatSendEnv, CompanionLlm, HistoryEntry, Segment } from "./chat-send.contract.ts";
import { defaultSuggestionTimeoutMs, suggestionsMeta } from "./chat-send-suggest.ts";
import { startTranslation, translationContext, withTranslations } from "./chat-send-translate.ts";
import { systemSplit } from "./companion-llm.ts";
import { generateOpener } from "./companion-opener.ts";
import type { ProactiveContext } from "./companion-proactive-context.ts";
import { companionSystemPrompt } from "./companion-prompt.ts";
import {
  reactionDirective,
  reactionTextOf,
  reactionUserText,
  type ReactionStory,
} from "./companion-reaction-prompt.ts";
import { callRpc } from "./companion-rpc.ts";
import { effectiveRomanceTier, offeredRomanceLine, romanceLine } from "./companion-safety.ts";
import { generateSuggestions, suggestionRecord } from "./companion-suggest-generate.ts";
import { recentSuggestionHistory } from "./companion-suggest-prompts.ts";
import type { Outbound } from "./delete-account.contract.ts";

const historyLimit = 8;
const defaultLlmTimeoutMs = 20_000;

export type ReactionClaim = ReactionStory & {
  readonly reactionId: string;
  readonly userId: string;
  readonly characterId: string;
  readonly storyId: string;
  readonly lang: string;
};

export type MadeReaction =
  | {
      readonly ok: true;
      /** 저장할 조각(번역 포함). */
      readonly segments: Segment[];
      /** 푸시 미리보기 · 로그용 — 번역을 붙이기 전 조각. */
      readonly spoken: readonly Segment[];
      readonly name: string;
      /** 번역한 언어(학습자 L1) — 푸시는 이 언어 한 줄만 싣는다. */
      readonly lang: string | null;
      readonly meta: Record<string, unknown>;
      readonly suggestions: Record<string, unknown> | null;
    }
  | { readonly ok: false; readonly outcome: string };

export type ReactionMakeDeps = {
  readonly outbound: Outbound;
  readonly llmTimeoutMs?: number;
  readonly translationTimeoutMs?: number;
  readonly suggestionTimeoutMs?: number;
};

export async function makeReaction(
  deps: ReactionMakeDeps,
  env: ChatSendEnv,
  llm: CompanionLlm,
  claim: ReactionClaim,
  now: string,
): Promise<MadeReaction> {
  const context = await callRpc<ProactiveContext>(
    deps.outbound,
    env,
    "companion_proactive_context",
    {
      p_user_id: claim.userId,
      p_character_id: claim.characterId,
      p_history_limit: historyLimit,
      p_now: now,
    },
  );
  if (context === null || !context.allowed) return { ok: false, outcome: "not_allowed" };
  if (!context.hasConversation) return { ok: false, outcome: "no_conversation" };
  const history = context.history.flatMap((entry): HistoryEntry[] =>
    entry.role === "user"
      ? entry.text === null
        ? []
        : [{ role: "user", text: entry.text }]
      : [{ role: "assistant", segments: entry.segments.map(({ kind, text }) => ({ kind, text })) }],
  );
  const line = romanceLine(
    context.ageBand,
    context.romanceTier,
    context.persona,
    context.speechLevel,
  );
  const prompt = companionSystemPrompt({
    persona: context.persona,
    speechLevel: context.speechLevel,
    ageBand: context.ageBand,
    romanceTier: context.romanceTier,
    l1: context.l1,
    expressions: [],
    summary: context.summary,
    feedbackMode: "separate",
    memories: context.memories,
    directive: reactionDirective(claim),
  });
  const timeoutMs = deps.llmTimeoutMs ?? defaultLlmTimeoutMs;
  const made = await generateOpener(llm, {
    system: `${prompt.stable}${systemSplit}${prompt.dynamic}`,
    history,
    userText: reactionUserText(claim),
    ageBand: context.ageBand,
    romanceLine: line,
    timeoutMs,
  });
  if (made.outcome !== "model") return { ok: false, outcome: made.outcome };
  const spoken = made.segments;
  if (reactionTextOf(spoken) === "") return { ok: false, outcome: "empty_reply" };

  // 대화 턴 · 선톡과 같이 번역과 칩을 붙인다. 둘 다 실패해도 반응은 나간다.
  const displayMax = context.suggestionDisplayMax ?? 0;
  const chipsOn =
    context.replySuggestions === true && context.suggestionsEnabled !== false && displayMax > 0;
  const budgetMs = deps.suggestionTimeoutMs ?? defaultSuggestionTimeoutMs;
  const [translated, chips] = await Promise.all([
    startTranslation(
      llm,
      env,
      {
        segments: spoken,
        l1: context.l1 ?? claim.lang,
        timeoutMs: deps.translationTimeoutMs,
        context: translationContext(history),
        persona: context.persona,
      },
      AbortSignal.timeout(timeoutMs),
    ),
    chipsOn
      ? generateSuggestions(llm, {
          request: {
            character: { name: context.persona.name, role: context.persona.role ?? null },
            speechLevel: context.speechLevel,
            romanceLine: offeredRomanceLine(line, context.persona),
            l1: context.l1,
            history: recentSuggestionHistory([...history, { role: "assistant", segments: spoken }]),
            summary: context.summary,
            recentChoiceSets: context.recentChoiceSets ?? [],
          },
          ageBand: context.ageBand,
          timeoutMs: budgetMs,
          budgetMs,
          displayMax,
        })
      : Promise.resolve(null),
  ]);
  return {
    ok: true,
    segments: withTranslations(spoken, translated),
    spoken,
    name: context.persona.name,
    lang: context.l1 ?? claim.lang,
    meta: {
      model: llm.model,
      // 모델이 고른 방식(ADR-0191 D16) — 저장이 아는 값만 meta.angle로 쓴다.
      ...(made.state?.mode === undefined ? {} : { mode: made.state.mode }),
      romanceTier: effectiveRomanceTier(context.ageBand, context.romanceTier),
      romanceLine: line,
      translation: translated.status,
      ...suggestionsMeta(chips),
    },
    suggestions:
      chips?.status === "ok"
        ? suggestionRecord({
            items: chips.items,
            candidates: chips.candidates,
            ms: chips.ms,
            model: llm.model,
            createdAt: now,
            playground: false,
          })
        : null,
  };
}
