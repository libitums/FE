// 가짜 LLM 계층(`companion-llm-fake.ts`)의 학습 표현 흉내(PRD §3.7). 답 · 첫 인사 · 선톡 지시에 배운 표현 후보가 있으면 첫 후보를
// 쓰고(「ask only」면 질문) `@state.learned`에 그 id를 적는다. 유저 말에 「[skip-learn]」이 있으면 넘긴다. 피드백은 판정 후보 가운데 글에 든 것을 `learnedUsed`로, 칩은 첫 후보에 그 표현을 넣는다.

import type { Feedback, FeedbackRequest, ReplyRequest } from "./chat-send.contract.ts";
import { containsExpression } from "./companion-learning-match.ts";
import type { SuggestRequest, SuggestionDraft } from "./companion-suggest.contract.ts";

const candidateLine = /^- (e\d+): "([^"]+)"[^\n]* — ([^\n]+)$/m;

/** 답에 덧붙일 줄과 `@state`에 적을 후보 id · 방식. 후보가 없거나 넘기면 null. */
export function fakeLearningLines(
  request: ReplyRequest,
): { line: string; learned: string; how: "say" | "ask" } | null {
  if (request.userText.includes("[skip-learn]")) return null;
  const text = `${request.directive ?? ""}\n${request.system}`;
  const candidate = candidateLine.exec(text);
  if (!candidate) return null;
  const [, ref, surface, hint] = candidate;
  if (hint === "ask only") return { line: "@speech 그럼 이건 어떻게 말해요?", learned: ref!, how: "ask" };
  return { line: `@speech 저는 오늘 '${surface}'라고 말했어요.`, learned: ref!, how: "say" };
}

/** `@state` 줄에 붙일 학습 칸. */
export const fakeLearnedState = (learning: { learned: string; how: string } | null) =>
  learning === null ? "" : `, "learned": "${learning.learned}", "learned_how": "${learning.how}"`;

export function withFakeLearned(request: FeedbackRequest, card: Feedback): Feedback {
  const used = (request.targets ?? []).filter((target) =>
    containsExpression({ id: target.id, kind: "patt", surface: target.surface }, request.text),
  );
  return used.length === 0
    ? card
    : { ...card, learnedUsed: used.map((target) => ({ id: target.id, surface: target.surface })) };
}

export function withFakeTarget(
  request: SuggestRequest,
  items: SuggestionDraft[],
): SuggestionDraft[] {
  const target = request.target;
  if (!target || items.length === 0) return items;
  const surface = target.surface.replace(/\{[^}]*\}/g, "카드");
  const [first, ...rest] = items;
  return [{ ...first!, text: `${surface} 그렇게 할게요.` }, ...rest];
}
