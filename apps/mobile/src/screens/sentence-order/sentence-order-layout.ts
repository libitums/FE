// 문장 순서 화면의 배치 · 아래 버튼 · 읽기 줄 · 줄 위 판정을 정하는 순수 함수입니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { UiCopy } from "../../lib/ui-copy.contract";
import { canCheckArrangement } from "./sentence-order";
import type { SentenceOrderPhase, SentenceOrderSessionState } from "./sentence-order";
import type {
  DialogueSpeaker,
  SentenceOrderQuestion,
  SentenceOrderReading,
} from "./sentence-order-questions";

/** 대화(말풍선 칸)인가 줄 배치(답 줄 둘)인가입니다. */
export type SentenceOrderLayout = "lines" | "dialogue";

export function sentenceOrderLayoutOf(question: SentenceOrderQuestion): SentenceOrderLayout {
  return question.dialogue === undefined ? "lines" : "dialogue";
}

export type SentenceOrderBottomAction =
  | { readonly kind: "none" }
  | { readonly kind: "check"; readonly availability: "enabled" | "disabled" }
  | { readonly kind: "next" }
  | { readonly kind: "results" };

/**
 * 아래 버튼입니다. 줄 배치는 Check가 늘 서고(놓은 조각이 하나라도 있으면 켜짐) 다 놓아도 저절로 채점되지
 * 않습니다. 대화는 칸이 다 차야 Check가 섭니다. 채점 뒤는 같은 자리가 Next, 문항이 없으면 결과입니다.
 */
export function sentenceOrderBottomActionOf(
  question: SentenceOrderQuestion | null,
  state: SentenceOrderSessionState,
): SentenceOrderBottomAction {
  if (question === null) return { kind: "results" };
  if (state.phase === "checked") return { kind: "next" };
  if (sentenceOrderLayoutOf(question) === "lines") {
    return {
      kind: "check",
      availability: state.placedChipIndexes.length >= 1 ? "enabled" : "disabled",
    };
  }
  return canCheckArrangement(question, state)
    ? { kind: "check", availability: "enabled" }
    : { kind: "none" };
}

/** 지금 보일 읽기 줄(로마자)입니다. 아직 보이지 않거나 없으면 `null`입니다. */
export function sentenceOrderReadingShown(
  reading: SentenceOrderReading | undefined,
  phase: SentenceOrderPhase,
): string | null {
  if (reading === undefined) return null;
  return reading.shown === "always" || phase === "checked" ? reading.romanization : null;
}

/** 줄 위 조각의 자리별 판정입니다. 덜 놓은 자리는 `null`입니다. */
export function sentenceOrderPlacedResultsOf(
  question: SentenceOrderQuestion,
  placed: readonly number[],
): readonly (AnswerResult | null)[] {
  const length = Math.max(placed.length, question.answerOrder.length);
  return Array.from({ length }, (_, position): AnswerResult | null => {
    if (position >= placed.length) return null;
    return placed[position] === question.answerOrder[position] ? "correct" : "incorrect";
  });
}

/** 창고 대화 조각의 낭독 이름입니다(화자 + 글 + 뜻). */
export function dialogueChipAccessibilityLabel(
  speaker: DialogueSpeaker,
  text: string,
  meaning: string | undefined,
  copy: UiCopy,
): string {
  const line = copy.sentenceOrder.dialogueLine[speaker](text);
  return meaning === undefined || meaning === "" ? line : `${line}, ${meaning}`;
}

/** 조각을 누를 수 있는가(`tappable`) 잠겼는가(`locked`)입니다. */
export type SentenceOrderInteraction = "tappable" | "locked";
