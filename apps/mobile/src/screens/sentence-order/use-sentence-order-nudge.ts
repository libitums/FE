import { nextOrderedIndex } from "../../components/answer-nudge/answer-nudge";
import { useAnswerNudge } from "../../components/answer-nudge/use-answer-nudge";
import type { SentenceOrderSessionState } from "./sentence-order";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

/**
 * 고민 힌트(ADR-0177) — 줄 배치(문장 조립 · 듣고 조립)에서 5초 동안 아무것도 누르지 않으면 다음에 놓을 창고 조각의 인덱스를 냅니다.
 * 대화 조립은 조각이 화자 색 면이라 넣지 않습니다. 채점 뒤 · 안내가 떠 있는 동안(`paused`) · 틀린 조각이 놓여 있으면 null.
 */
export function useSentenceOrderNudge(
  question: SentenceOrderQuestion | null | undefined,
  state: SentenceOrderSessionState,
  paused: boolean,
): number | null {
  const next =
    question == null || question.dialogue !== undefined || state.phase !== "arranging" || paused
      ? null
      : nextOrderedIndex(question.answerOrder, state.placedChipIndexes);
  const on = useAnswerNudge(
    `${state.questionIndex}:${state.placedChipIndexes.join(",")}`,
    next !== null,
  );
  return on ? next : null;
}
