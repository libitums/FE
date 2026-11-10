// 가짜 LLM 계층(`companion-llm-fake.ts`)의 학습 표현 흉내(PRD §3.7). 답 지시 · 첫 인사 · 선톡 줄에 배운 표현이 있으면 그 표현을 쓰고
// `@state.learned`를 켠다. 피드백은 판정 후보 가운데 글에 든 것을 `learnedUsed`로, 칩은 첫 후보에 그 표현을 넣는다.

import type { Feedback, FeedbackRequest, ReplyRequest } from "./chat-send.contract.ts";
import { containsExpression } from "./companion-learning-match.ts";
import type { SuggestRequest, SuggestionDraft } from "./companion-suggest.contract.ts";

const exposeLine =
  /Learned expression for this reply: "([^"]+)"|use the Korean expression "([^"]+)"/;
const elicitLine = /Learned expression to practise: "([^"]+)"/;

/** 답에 덧붙일 줄과 `@state`에 켤 칸. 지시가 없으면 null. */
export function fakeLearningLines(
  request: ReplyRequest,
): { line: string; learned: boolean } | null {
  const text = `${request.directive ?? ""}\n${request.system}`;
  const expose = exposeLine.exec(text);
  if (expose)
    return { line: `@speech 저는 오늘 '${expose[1] ?? expose[2]}'라고 말했어요.`, learned: true };
  const elicit = elicitLine.exec(text);
  if (elicit) return { line: "@speech 그럼 이건 어떻게 말해요?", learned: true };
  return null;
}

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
