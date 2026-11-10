// `companion-eval`의 추천 칩 한 케이스. `text`는 캐릭터의 마지막 말이고 `history`(앞 대화) 뒤에 붙인다. 운영처럼 후보마다 검증하고
// 의도가 다른 것을 기본 수(2)까지 고른다. 보인 칩(`items`, 0개일 수 있다)과 후보 전부 · 빠진 까닭(`candidates`)을 낸다 — 채점(맥락 ·
// 다양성 · 의도 보존 · 안전)은 대시보드가 한다. 미성년자 출력 검사는 돌리지 않는다(검사 평가는 `moderation` 종류).

import type { CompanionLlm, FeedbackHistoryEntry } from "./chat-send.contract.ts";
import type { ReplySuggestion, SpeechLevel } from "./companion-contract/index.ts";
import { recentSuggestionHistory } from "./companion-suggest-prompts.ts";
import {
  type CandidateRecord,
  checkCandidates,
  defaultSuggestionDisplayMax,
  pickShown,
} from "./companion-suggest-select.ts";
import type { ChoiceSet, SuggestRequest } from "./companion-suggest.contract.ts";
import { containsExpression } from "./companion-learning-match.ts";

export type SuggestEvalCase = {
  readonly text: string;
  readonly l1?: string | null;
  readonly speechLevel?: SpeechLevel | null;
  readonly character?: { readonly name: string; readonly role?: string | null } | null;
  readonly history?: readonly FeedbackHistoryEntry[];
  readonly summary?: string | null;
  /** 이 대화에서 앞서 보인 칩 글 — 반복 검사 · 프롬프트의 지난 칩. */
  readonly pastSuggestions?: readonly string[];
  /** 학습 표현 평가(`companion-eval-learning.ts`)의 칩 방식 — 후보 하나에 넣을 배운 표현. */
  readonly learnedTarget?: SuggestRequest["target"];
};

export async function evalSuggestions(
  llm: CompanionLlm,
  item: SuggestEvalCase,
  signal: AbortSignal,
): Promise<{ items: ReplySuggestion[]; candidates: CandidateRecord[] }> {
  const past: ChoiceSet[] = item.pastSuggestions?.length
    ? [
        {
          messageId: "eval",
          items: item.pastSuggestions.map((text) => ({ text, intent: null })),
          outcome: null,
        },
      ]
    : [];
  const drafts = await llm.suggest({
    character: { name: item.character?.name ?? "캐릭터", role: item.character?.role ?? null },
    speechLevel: item.speechLevel ?? null,
    l1: item.l1 ?? null,
    history: recentSuggestionHistory([
      ...(item.history ?? []),
      { role: "assistant", text: item.text },
    ]),
    summary: item.summary ?? null,
    recentChoiceSets: past,
    ...(item.learnedTarget ? { target: item.learnedTarget } : {}),
    signal,
  });
  const candidates = checkCandidates(drafts, item.l1 ?? null, past);
  const target = item.learnedTarget ?? null;
  const keep =
    target === null
      ? -1
      : candidates.findIndex(
          (candidate) => !candidate.reason && containsExpression(target, candidate.text),
        );
  return pickShown(candidates, defaultSuggestionDisplayMax, keep < 0 ? null : keep);
}
