// 음절 조립 활동의 계약입니다. 타입만 둡니다.

import type { AnswerEchoAudio } from "../../lib/question-audio";
import type { NonEmpty } from "../../lib/non-empty";
import type { ActivityFinish, LessonPosition } from "../learning/activity-finish";

export type SyllableBuildQuestion = {
  /** 만들 낱말의 영어 뜻 — 카드의 제시입니다. */
  readonly meaning: string;
  /** 보일 순서의 음절 타일입니다(섞인 뒤, 오답 음절 포함). 이 배열의 인덱스가 타일의 식별자입니다. */
  readonly tiles: readonly string[];
  /** 칸 수 = 첫 정답을 이루는 타일 수입니다(1 이상 · `tiles.length` 이하, 매핑이 보장). */
  readonly slotCount: number;
  /** 받는 낱말들 — 공백 없음 · 비지 않음. 판정은 놓인 타일을 이은 문자열이 이 중 하나와 같은가입니다. 첫째 = 공개용 정답. */
  readonly answers: NonEmpty<string>;
  /** 있으면 `copy.syllableBuild.instruction` 대신 서는 지시문입니다(콘텐츠 `prompt.en`). */
  readonly instruction?: string;
  /** 판정 뒤 한 번 들려 주는 정답 음성입니다. 없으면 키가 없습니다. */
  readonly audio?: AnswerEchoAudio;
};

export type SyllableBuildPhase = "building" | "checked";

/** 판정을 상태에 적지 않습니다 — 제출한 배치만 적고 정오는 파생입니다(문장 조립과 같은 규율). */
export type SyllableBuildSessionState = {
  readonly questionIndex: number;
  /** 놓인 타일의 인덱스 — 배열 순서가 곧 칸 순서입니다. */
  readonly placedTileIndexes: readonly number[];
  readonly phase: SyllableBuildPhase;
  readonly submittedTileIndexes: readonly (readonly number[])[];
};

export type SyllableBuildSessionAction =
  /** 놓인 타일이면 빼고, 아니면 칸이 남을 때만 붙입니다 — 칸 수를 실어 와 리듀서가 막습니다. */
  | { readonly type: "toggleTile"; readonly tileIndex: number; readonly slotCount: number }
  | { readonly type: "check" }
  | { readonly type: "nextQuestion" };

/** 타일 · 칸을 누를 수 있는가 — boolean 대신 이름 있는 두 값입니다. */
export type SyllableTileInteraction = "tappable" | "locked";

/** 낱말 줄의 낭독 방식 — 줄 하나가 요소(빈 줄 · 채점 뒤) 또는 타일이 각자 요소(놓이는 중). */
export type SyllableBuildWordAccessibility =
  | { readonly kind: "row"; readonly label: string }
  | { readonly kind: "tiles" };

export type SyllableBuildActivityProps = {
  readonly questions: readonly SyllableBuildQuestion[];
  readonly gemCount: number;
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
  /** 카탈로그 레슨 안의 위치입니다. 주지 않으면 이 활동이 한 세션입니다. */
  readonly lesson?: LessonPosition;
};

/** 음절 타일 하나 — 창고에서는 타일, 칸에서는 놓인 글자입니다. testid `syllable-build-tile-<index>`, `data-placed`. */
export type SyllableTileProps = {
  readonly index: number;
  readonly text: string;
  /** 놓인 칸(1-based)입니다 — `null`이면 창고에 있습니다. */
  readonly placedOrdinal: number | null;
  /** 낱말의 전체 칸 수입니다 — 놓인 타일의 낭독(`position 1 of 2`)에만 쓰고 창고 타일은 주지 않습니다. */
  readonly slotCount?: number;
  readonly interaction: SyllableTileInteraction;
  readonly onTap: (index: number) => void;
};

/** 창고에서 빠진 자리 — 같은 폭의 빈 자리입니다. testid `syllable-build-bank-slot-<index>`, 낭독하지 않습니다. */
export type SyllableTilePlaceholderProps = { readonly index: number; readonly text: string };

/** 칸 줄 — `slotCount`개의 칸이 띄어쓰기 없이 붙어 섭니다. testid `syllable-build-word` · `syllable-build-slot-<position>`(`data-filled`). */
export type SyllableBuildWordProps = {
  readonly tiles: readonly string[];
  readonly slotCount: number;
  readonly placedTileIndexes: readonly number[];
  readonly interaction: SyllableTileInteraction;
  readonly accessibility: SyllableBuildWordAccessibility;
  readonly onReturn: (tileIndex: number) => void;
};

export type SyllableBuildCopy = {
  readonly instruction: string;
  readonly meaning: (meaning: string) => string;
  readonly placedTile: (text: string, position: number, slotCount: number) => string;
  readonly wordEmpty: (slotCount: number) => string;
  readonly word: (word: string) => string;
};

// 판정 뒤 정답 상자(`AnswerReveal`)는 타자 입력과 같은 문구(`copy.typing.answerReveal`)로 첫 정답
// (`answers[0]`)을 보입니다 — 맞혀도 보입니다.
export type SyllableBuildTestId =
  | "syllable-build-content"
  | "syllable-build-meaning"
  | "syllable-build-word"
  | `syllable-build-slot-${number}`
  | "syllable-build-bank"
  | `syllable-build-tile-${number}`
  | `syllable-build-bank-slot-${number}`
  | "syllable-build-reveal"
  | "syllable-build-complete";
