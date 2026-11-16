// 문장 만들기의 문항 판정 보고입니다(측정) — 고른 조각 원문 · 쓴 힌트를 싣습니다(ADR-0153). 순수 함수입니다.

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
    // 치환 전 원문으로 잇습니다(학습자 이름 · 나라가 분석 도구로 가지 않게). 대화 순서는 놓은 턴만 — 고정된 첫 턴은
    // 조각이 아니라 빠집니다 — 「 | 」로, 낱말은 공백으로 잇습니다(ADR-0084 측정).
    ...selectedField(
      selectedTilesText(
        question.chipsSource ?? [],
        placedChipIndexes,
        question.dialogue === undefined ? " " : " | ",
      ),
    ),
    ...(hintUsed === null ? {} : { hintUsed }),
  };
}
