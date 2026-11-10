// `companion-eval`의 학습 표현 한 케이스(PRD §3.7 · §6 평가 축 「학습 표현 자연스러움」). 운영과 같은 페르소나 시스템 프롬프트에 그 방식의
// 이번 턴 지시(노출 · 유도)를 붙여 답을 만들거나, 칩 방식이면 그 표현을 넣은 칩 셋을 만든다. `text`는 학습자의 마지막 말이고 `history`
// (앞 대화) 뒤에 붙인다. 답 · 모델 보고(`learned`) · 서버 판정(`done`)을 낸다 — 자연스러움 채점은 대시보드가 한다.

import type { CompanionLlm, FeedbackHistoryEntry, HistoryEntry } from "./chat-send.contract.ts";
import { targetDone } from "./chat-send-learning.ts";
import type { ReplySuggestion, SpeechLevel } from "./companion-contract/index.ts";
import { evalSuggestions } from "./companion-eval-suggest.ts";
import { systemSplit } from "./companion-llm.ts";
import { type LearningMode, type LearningTarget, learningDirective } from "./companion-learning.ts";
import { containsExpression } from "./companion-learning-match.ts";
import { companionSystemPrompt } from "./companion-prompt.ts";
import { collectSegments, createSegmentSplitter, type SegmentDelta } from "./companion-segments.ts";

export type LearningEvalCase = {
  readonly text: string;
  readonly l1?: string | null;
  readonly speechLevel?: SpeechLevel | null;
  readonly character?: { readonly name: string; readonly role?: string | null } | null;
  readonly history?: readonly FeedbackHistoryEntry[];
  readonly summary?: string | null;
  readonly target?: {
    readonly surface: string;
    readonly gloss?: string | null;
    readonly kind?: string;
    readonly mode: LearningMode;
  };
};

export type LearningEvalOutput = {
  readonly mode: LearningMode;
  readonly segments: { kind: string; text: string }[];
  readonly items?: ReplySuggestion[];
  readonly learned: boolean;
  readonly done: boolean;
};

export async function evalLearning(
  llm: CompanionLlm,
  item: LearningEvalCase,
  signal: AbortSignal,
): Promise<LearningEvalOutput> {
  const given = item.target ?? { surface: "괜찮아요.", mode: "expose" as const };
  const target: LearningTarget = {
    expressionId: "eval",
    kind: given.kind ?? "expr",
    surface: given.surface,
    gloss: given.gloss ?? null,
    mode: given.mode,
  };
  if (target.mode === "chip") {
    const chips = await evalSuggestions(
      llm,
      {
        ...item,
        // 칩 케이스의 `text`는 캐릭터의 마지막 말이다(추천 칩 평가와 같은 모양).
        learnedTarget: {
          id: "eval",
          kind: target.kind,
          surface: target.surface,
          gloss: target.gloss,
        },
      },
      signal,
    );
    const done = chips.items.some((chip) =>
      containsExpression({ id: "eval", kind: target.kind, surface: target.surface }, chip.text),
    );
    return { mode: "chip", segments: [], items: chips.items, learned: done, done };
  }
  const name = item.character?.name ?? "캐릭터";
  const prompt = companionSystemPrompt({
    persona: { name, ...(item.character?.role ? { role: item.character.role } : {}) },
    speechLevel: item.speechLevel ?? "polite",
    ageBand: "adult",
    l1: item.l1 ?? null,
    expressions: [
      { id: "eval", kind: target.kind, surface: target.surface, roman: null, gloss: target.gloss },
    ],
    summary: item.summary ?? null,
    feedbackMode: "separate",
    memories: [],
    directive: null,
  });
  const history = (item.history ?? []).map((entry): HistoryEntry =>
    entry.role === "user"
      ? { role: "user", text: entry.text }
      : { role: "assistant", segments: [{ kind: "speech", text: entry.text }] },
  );
  const splitter = createSegmentSplitter();
  const deltas: SegmentDelta[] = [];
  for await (const chunk of llm.reply({
    system: `${prompt.stable}${systemSplit}${prompt.dynamic}`,
    history,
    userText: item.text,
    directive: learningDirective(target),
    signal,
  })) {
    deltas.push(...splitter.push(chunk));
  }
  deltas.push(...splitter.end());
  const segments = collectSegments(deltas);
  const state = splitter.state();
  return {
    mode: target.mode,
    segments: segments.map(({ kind, text }) => ({ kind, text })),
    learned: state?.learned === true,
    done: targetDone(target, state, segments, false),
  };
}
