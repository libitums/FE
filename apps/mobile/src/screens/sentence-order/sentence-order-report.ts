// 문장 만들기의 문항 판정 보고입니다(측정) — 고른 글자 · 쓴 힌트를 싣습니다(ADR-0153). 순수 함수입니다.

import type { HintUse } from "../../components/assembled-hint/assembled-hint.contract";
import type { ItemAnswerOutcome, ItemAnswerReport } from "../../lib/item-answer";
import { selectedField, selectedTilesText } from "../../lib/item-answer";
import type { LearningDensity } from "../../lib/learning-density";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

export function sentenceOrderReportOf(
  question: SentenceOrderQuestion,
  placedChipIndexes: readonly number[],
  report: {
    readonly questionIndex: number;
    readonly outcome: ItemAnswerOutcome;
    readonly density: LearningDensity;
  },
  hintUsed: HintUse | null,
): ItemAnswerReport {
  return {
    ...report,
    // 대화 순서는 턴을 「 | 」로, 낱말은 공백으로 잇습니다(콘텐츠 정답 표기와 같게).
    ...selectedField(
      selectedTilesText(
        question.chips,
        placedChipIndexes,
        question.dialogue === undefined ? " " : " | ",
      ),
    ),
    ...(hintUsed === null ? {} : { hintUsed }),
  };
}
