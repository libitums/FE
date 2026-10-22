// 문장 순서 화면의 배치 · 아래 버튼 · 읽기 줄 · 줄 위 판정을 정하는 순수 함수입니다. 껍데기만 있는 단계입니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { SentenceOrderPhase, SentenceOrderSessionState } from "./sentence-order";
import type {
  DialogueSpeaker,
  SentenceOrderQuestion,
  SentenceOrderReading,
} from "./sentence-order-questions";

/** 대화(말풍선 칸)인가 줄 배치(답 줄 둘)인가입니다. */
export type SentenceOrderLayout = "lines" | "dialogue";

export function sentenceOrderLayoutOf(_question: SentenceOrderQuestion): SentenceOrderLayout {
  return "lines";
}

export type SentenceOrderBottomAction =
  | { readonly kind: "none" }
  | { readonly kind: "check"; readonly availability: "enabled" | "disabled" }
  | { readonly kind: "next" }
  | { readonly kind: "results" };

export function sentenceOrderBottomActionOf(
  _question: SentenceOrderQuestion | null,
  _state: SentenceOrderSessionState,
): SentenceOrderBottomAction {
  return { kind: "none" };
}

/** 지금 보일 읽기 줄(로마자)입니다. 아직 보이지 않거나 없으면 `null`입니다. */
export function sentenceOrderReadingShown(
  _reading: SentenceOrderReading | undefined,
  _phase: SentenceOrderPhase,
): string | null {
  return null;
}

/** 줄 위 조각의 자리별 판정입니다. 덜 놓은 자리는 `null`입니다. */
export function sentenceOrderPlacedResultsOf(
  _question: SentenceOrderQuestion,
  _placed: readonly number[],
): readonly (AnswerResult | null)[] {
  return [];
}

/** 창고 대화 조각의 낭독 이름입니다(화자 + 글 + 뜻). */
export function dialogueChipAccessibilityLabel(
  _speaker: DialogueSpeaker,
  _text: string,
  _meaning: string | undefined,
  _copy: UiCopy,
): string {
  return "";
}

/** 조각을 누를 수 있는가(`tappable`) 잠겼는가(`locked`)입니다. */
export type SentenceOrderInteraction = "tappable" | "locked";
