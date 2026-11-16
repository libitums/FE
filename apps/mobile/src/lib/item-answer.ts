// 문항 하나가 처음 판정되는 순간의 보고입니다. 어느 유형이 채점 유형인지도 여기서 가립니다.

import type { AnswerResult } from "./answer-result";
import type { LearningItem } from "./episode-content";
import type { LearningDensity } from "./learning-density";
import type { SpeechAttemptPhase } from "./speech-attempt";

export type ItemAnswerOutcome = AnswerResult | "skipped";

export type ItemAnswerReport = {
  readonly questionIndex: number;
  readonly outcome: ItemAnswerOutcome;
  readonly density: LearningDensity;
  /** 처음 판정 때 고른 글자 — 보기형 · 타일형만. 직접 입력 · 말하기는 싣지 않습니다(사용자 입력 글). */
  readonly selectedAnswer?: string;
  /** 건너뛴 까닭 — `"user"` 또는 `"unavailable:<reason>"`. 건너뛸 때만. */
  readonly skipReason?: string;
};

/** 고른 글자가 있을 때만 `selectedAnswer` 키를 싣습니다. */
export function selectedField(text: string | undefined): { readonly selectedAnswer?: string } {
  return text === undefined ? {} : { selectedAnswer: text };
}

/** 보기형 문항의 보고 — 고른 보기의 글자를 함께 싣습니다. */
export function choiceReport(
  questionIndex: number,
  outcome: ItemAnswerOutcome,
  density: LearningDensity,
  choices: readonly string[],
  index: number,
): ItemAnswerReport {
  return { questionIndex, outcome, density, ...selectedField(selectedChoiceText(choices, index)) };
}

/** 고른 보기의 글자입니다. 범위 밖이면 `undefined`. */
export function selectedChoiceText(choices: readonly string[], index: number): string | undefined {
  return choices[index];
}

/** 놓은 타일을 놓은 순서대로 이은 글자입니다. 놓은 것이 없으면 `undefined`. */
export function selectedTilesText(
  tiles: readonly string[],
  placedIndexes: readonly number[],
  joiner: string,
): string | undefined {
  const placed = placedIndexes
    .map((index) => tiles[index])
    .filter((tile): tile is string => tile !== undefined);
  return placed.length === 0 ? undefined : placed.join(joiner);
}

/** 말하기 건너뜀의 까닭입니다 — 쓸 수 없는 국면이면 `unavailable:<reason>`, 아니면 `user`. */
export function speechSkipReasonOf(phase: SpeechAttemptPhase): string {
  return phase.kind === "unavailable" ? `unavailable:${phase.reason}` : "user";
}

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
