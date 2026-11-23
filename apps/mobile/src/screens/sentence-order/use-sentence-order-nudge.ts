import { nextOrderedIndex } from "../../components/answer-nudge/answer-nudge";
import { useAnswerNudge } from "../../components/answer-nudge/use-answer-nudge";
import type { SentenceOrderSessionState } from "./sentence-order";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

/**
 * 고민 힌트(ADR-0177) — 줄 배치(문장 조립 · 듣고 조립)에서 5초 동안 아무것도 누르지 않으면 다음에 놓을 창고 조각의 인덱스를 냅니다.
 * 대화 조립은 조각이 화자 색 면이라 넣지 않습니다. 채점 뒤 · 틀린 조각이 놓여 있음 · 잠시 멈춤(`paused` — 문항 안내나 힌트 시트가
 * 떠 있음 · 문항 음성이 나오는 중)에는 null이고, 멈춤이 풀리면 그때부터 다시 셉니다.
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
  return useAnswerNudge(`${state.questionIndex}:${state.placedChipIndexes.join(",")}`, next);
}
