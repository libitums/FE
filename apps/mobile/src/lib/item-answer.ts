// 문항 하나가 처음 판정되는 순간의 보고입니다. 어느 유형이 채점 유형인지도 여기서 가립니다.

import type { AnswerResult } from "./answer-result";
import type { LearningItem } from "./episode-content";
import type { LearningDensity } from "./learning-density";
import type { SpokenGrade } from "./speaking-judge";
import type {
  SpeechAttemptPhase,
  SpeechDiagnostic,
  SpeechMissReason,
  SpeechUnavailableReason,
} from "./speech-attempt";

export type ItemAnswerOutcome = AnswerResult | "skipped";

/**
 * 건너뛴 까닭 — 직접 누른 Skip(`user`) · 말하기를 쓸 수 없던 까닭(`unavailable:<reason>`) ·
 * 못 알아들은 뒤 다시 말하지 않고 넘긴 까닭(`missed:<reason>`, ADR-0181)입니다.
 */
export type ItemSkipReason =
  | "user"
  | `unavailable:${SpeechUnavailableReason}`
  | `missed:${SpeechMissReason}`;

export type ItemAnswerReport = {
  readonly questionIndex: number;
  readonly outcome: ItemAnswerOutcome;
  readonly density: LearningDensity;
  /**
   * 처음 판정 때 고른 보기 · 타일의 **자리표시자 치환 전 콘텐츠 원문**(예 「{이름}(으)로 예약했어요.」) — 보기형 · 타일형만.
   * 화면 글자는 학습자 이름 · 나라로 치환돼 있어 쓰지 않습니다. 직접 입력 · 말하기는 싣지 않습니다(사용자 입력 글).
   */
  readonly selectedAnswer?: string;
  /** 건너뛴 까닭 — `"user"` 또는 `"unavailable:<reason>"`. 건너뛸 때만. */
  readonly skipReason?: ItemSkipReason;
  /** 판정 전에 쓴 힌트 — 정답 보기가 정답 듣기보다 앞섭니다(ADR-0153). 안 썼으면 없습니다. */
  readonly hintUsed?: "listen" | "show";
  /** 말하기 문항의 발음 등급(ADR-0201) — 판정이 났을 때만. 들은 글자 자체는 싣지 않습니다(사용자 입력 글). */
  readonly grade?: SpokenGrade;
  /** 말하기 문항에서 인식기가 결과를 올렸을 때의 진단입니다. 결과 없이 판정 · 건너뛰었으면 없습니다. */
  readonly speech?: SpeechDiagnostic;
};

/** 고른 글자가 있을 때만 `selectedAnswer` 키를 싣습니다. */
export function selectedField(text: string | undefined): { readonly selectedAnswer?: string } {
  return text === undefined ? {} : { selectedAnswer: text };
}

/** 보기형 문항의 보고 — 고른 보기의 **치환 전 원문**을 함께 싣습니다. 원문이 없으면 `selectedAnswer`가 없습니다. */
export function choiceReport(
  question: { readonly choicesSource?: readonly string[] },
  questionIndex: number,
  outcome: ItemAnswerOutcome,
  density: LearningDensity,
  index: number,
): ItemAnswerReport {
  const source = question.choicesSource;
  const selected = source === undefined ? undefined : selectedChoiceText(source, index);
  return { questionIndex, outcome, density, ...selectedField(selected) };
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

/**
 * 말하기 건너뜀의 까닭입니다 — 쓸 수 없는 국면이면 `unavailable:<reason>`, 못 알아들은 국면이면
 * `missed:<reason>`, 아니면 `user`.
 */
export function speechSkipReasonOf(phase: SpeechAttemptPhase): ItemSkipReason {
  if (phase.kind === "unavailable") return `unavailable:${phase.reason}`;
  return phase.kind === "missed" ? `missed:${phase.reason}` : "user";
}

/** 국면이 인식 진단을 들고 있을 때만 `speech` 키를 싣습니다. */
export function speechDiagnosticField(phase: SpeechAttemptPhase): {
  readonly speech?: SpeechDiagnostic;
} {
  if (phase.kind === "ready" || phase.kind === "listening") return {};
  return phase.diagnostic === undefined ? {} : { speech: phase.diagnostic };
}

/** 말하기 문항의 보고입니다 — 건너뜀이면 까닭을, 인식기가 결과를 올렸으면 진단을 함께 싣습니다. */
export function speechItemReportOf(
  questionIndex: number,
  outcome: ItemAnswerOutcome,
  density: LearningDensity,
  phase: SpeechAttemptPhase,
): ItemAnswerReport {
  return {
    questionIndex,
    outcome,
    density,
    ...(outcome === "skipped" ? { skipReason: speechSkipReasonOf(phase) } : {}),
    ...speechDiagnosticField(phase),
  };
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
