// 문항 하나가 처음 판정되는 순간의 보고입니다. 어느 유형이 채점 유형인지도 여기서 가립니다.

import type { AnswerResult } from "./answer-result";
import type { LearningItem } from "./episode-content";
import type { LearningDensity } from "./learning-density";

export type ItemAnswerOutcome = AnswerResult | "skipped";

export type ItemAnswerReport = {
  readonly questionIndex: number;
  readonly outcome: ItemAnswerOutcome;
  readonly density: LearningDensity;
};

export type ItemAnswerReporter = (report: ItemAnswerReport) => void;

export type ScoredItemType = Extract<
  LearningItem["type"],
  | "LISTEN_SELECT"
  | "MIN_PAIR_AB"
  | "IMG_MATCH"
  | "CLOZE"
  | "CLOZE_CHOICE"
  | "REPLY_SELECT"
  | "ROLE_LINE"
  | "TRANSLATE_TO_EN"
  | "PARTICLE_FILL"
  | "PARTICLE_SWAP"
  | "CULTURE_CHECK"
  | "LISTEN_BUILD"
  | "WORD_ORDER"
  | "TURN_ORDER"
  | "SYLLABLE_BUILD"
  | "SPEAK_WORD"
>;

const scoredTypes: ReadonlySet<LearningItem["type"]> = new Set<ScoredItemType>([
  "LISTEN_SELECT",
  "MIN_PAIR_AB",
  "IMG_MATCH",
  "CLOZE",
  "CLOZE_CHOICE",
  "REPLY_SELECT",
  "ROLE_LINE",
  "TRANSLATE_TO_EN",
  "PARTICLE_FILL",
  "PARTICLE_SWAP",
  "CULTURE_CHECK",
  "LISTEN_BUILD",
  "WORD_ORDER",
  "TURN_ORDER",
  "SYLLABLE_BUILD",
  "SPEAK_WORD",
]);

function isScoredType(type: LearningItem["type"]): type is ScoredItemType {
  return scoredTypes.has(type);
}

/** 채점 유형이면 그 유형, 아니면 `null`입니다. */
export function scoredItemTypeOf(type: LearningItem["type"]): ScoredItemType | null {
  return isScoredType(type) ? type : null;
}
