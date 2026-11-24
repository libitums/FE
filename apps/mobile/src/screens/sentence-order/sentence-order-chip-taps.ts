// 문장 조립의 조각 누름 세 갈래입니다 — 줄 배치의 놓기/되돌리기, 대화 조립의 놓기 · 되돌리기. 조각을 **놓을 때만** 그 낱말
// 소리를 냅니다(ADR-0189) — 되돌릴 때는 조용합니다. 판정 · 보고는 상태 리듀서가 그대로 집니다.

import type { LessonAudio } from "../../lib/question-audio";
import { playChipSound } from "../learning/lesson-sound";
import type { SentenceOrderSessionAction, SentenceOrderSessionState } from "./sentence-order";
import { dialogueChipInteractionOf } from "./sentence-order-layout";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

export type SentenceOrderChipTaps = {
  /** 줄 배치 — 창고 조각은 놓고, 놓인 조각은 되돌립니다. */
  readonly toggle: (chipIndex: number) => void;
  /** 대화 조립 — 화자가 맞는 칸에만 놓습니다(잠긴 조각은 탭이 없지만 여기서도 막습니다). */
  readonly placeDialogueChip: (chipIndex: number) => void;
  /** 대화 조립 — 놓은 말풍선은 그 뒤까지 함께 돌아갑니다. */
  readonly returnDialogueChip: (chipIndex: number) => void;
};

export function sentenceOrderChipTaps(args: {
  /** 안내가 떠 있는 동안은 조각이 움직이지 않습니다 — 겹침 층에만 기대지 않습니다. */
  readonly guideVisible: boolean;
  readonly question: SentenceOrderQuestion | null | undefined;
  readonly state: SentenceOrderSessionState;
  readonly dispatch: (action: SentenceOrderSessionAction) => void;
  readonly lesson: LessonAudio;
}): SentenceOrderChipTaps {
  const { guideVisible, question, state, dispatch, lesson } = args;
  const sound = (chipIndex: number): void =>
    playChipSound(question?.chipAudio, chipIndex, lesson, "sentence_order");
  return {
    toggle: (chipIndex) => {
      if (guideVisible) return;
      if (!state.placedChipIndexes.includes(chipIndex)) sound(chipIndex);
      dispatch({ type: "toggleChip", chipIndex });
    },
    placeDialogueChip: (chipIndex) => {
      if (guideVisible || question == null) return;
      if (dialogueChipInteractionOf(question, state, chipIndex) === "locked") return;
      sound(chipIndex);
      dispatch({ type: "toggleChip", chipIndex });
    },
    returnDialogueChip: (chipIndex) => {
      if (guideVisible) return;
      dispatch({ type: "returnChip", chipIndex });
    },
  };
}
