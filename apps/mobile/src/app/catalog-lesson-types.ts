// 카탈로그 수업 계획의 타입입니다(타입만).

import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { LearningItem } from "../lib/episode-content";
import type { NonEmpty } from "../lib/non-empty";
import type { FillScript } from "../lib/placeholder-fill";
import type { CultureCardQuestion } from "../screens/culture-card/culture-card.contract";
import type { ListeningQuestion } from "../screens/listening/listening-questions";
import type { ReadAloudQuestion } from "../screens/read-aloud/read-aloud.contract";
import type { SpeakWordQuestion } from "../screens/speak-word/speak-word.contract";
import type { SentenceOrderQuestion } from "../screens/sentence-order/sentence-order-questions";
import type { PairMatchQuestion } from "../screens/pair-match/pair-match.contract";
import type { SyllableBuildQuestion } from "../screens/syllable-build/syllable-build.contract";
import type { TypingQuestion } from "../screens/typing/typing.contract";
import type { VocabCardQuestion } from "../screens/vocab-card/vocab-card.contract";
import type { WordChoiceQuestion } from "../screens/word-choice/word-choice-questions";

export type { NonEmpty };

export type CatalogActivity =
  | { readonly form: "listening"; readonly questions: NonEmpty<ListeningQuestion> }
  | { readonly form: "sentence-order"; readonly questions: NonEmpty<SentenceOrderQuestion> }
  | { readonly form: "word-choice"; readonly questions: NonEmpty<WordChoiceQuestion> }
  | { readonly form: "typing"; readonly questions: NonEmpty<TypingQuestion> }
  | { readonly form: "vocab-card"; readonly questions: NonEmpty<VocabCardQuestion> }
  | { readonly form: "pair-match"; readonly questions: NonEmpty<PairMatchQuestion> }
  | { readonly form: "culture-card"; readonly questions: NonEmpty<CultureCardQuestion> }
  | { readonly form: "syllable-build"; readonly questions: NonEmpty<SyllableBuildQuestion> }
  | { readonly form: "read-aloud"; readonly questions: NonEmpty<ReadAloudQuestion> }
  | { readonly form: "speak-word"; readonly questions: NonEmpty<SpeakWordQuestion> };

export type CatalogActivityForm = CatalogActivity["form"];

/** 활동 문항이 채점되는가입니다 — 단어 카드는 채점하지 않습니다. */
export type CatalogActivityScoring = "graded" | "ungraded";

export type CatalogSkipReason =
  | "no-options"
  | "no-source"
  | "audio-missing"
  /** 그림 주소가 없거나 풀 수 없음. */
  | "image-missing"
  /** 보일 영어 뜻이 없음. */
  | "no-gloss"
  | "untypeable"
  | "malformed";

export type CatalogMappedItem =
  | { readonly kind: "listening"; readonly itemId: string; readonly question: ListeningQuestion }
  | {
      readonly kind: "sentence-order";
      readonly itemId: string;
      readonly question: SentenceOrderQuestion;
    }
  | {
      readonly kind: "word-choice";
      readonly itemId: string;
      readonly question: WordChoiceQuestion;
    }
  | { readonly kind: "typing"; readonly itemId: string; readonly question: TypingQuestion }
  | { readonly kind: "vocab-card"; readonly itemId: string; readonly question: VocabCardQuestion }
  | { readonly kind: "pair-match"; readonly itemId: string; readonly question: PairMatchQuestion }
  | {
      readonly kind: "culture-card";
      readonly itemId: string;
      readonly question: CultureCardQuestion;
    }
  | {
      readonly kind: "syllable-build";
      readonly itemId: string;
      readonly question: SyllableBuildQuestion;
    }
  | { readonly kind: "read-aloud"; readonly itemId: string; readonly question: ReadAloudQuestion }
  | { readonly kind: "speak-word"; readonly itemId: string; readonly question: SpeakWordQuestion }
  | {
      readonly kind: "skipped";
      readonly itemId: string;
      readonly type: LearningItem["type"];
      readonly reason: CatalogSkipReason;
    };

/** 학습자 프로필을 묶은 치환입니다. 한글 줄은 `"ko"`, 로마자 줄은 `"roman"`, 영어 줄은 `"en"` 스크립트로 치환합니다. */
export type CatalogFill = (text: string, script: FillScript) => string;

export type CatalogItemPort = { readonly fill: CatalogFill; readonly episodeId: string };

/** `ref`의 영어 뜻(치환 · trim 뒤)입니다. 없는 ref · 모르는 ref · 빈 뜻이면 `null`. */
export type CatalogGlossOf = (ref: string | undefined) => string | null;

export type CatalogImageUrlOf = (relativePath: string) => string | null;

/** 레슨 문항 매핑의 포트입니다. `CatalogItemPort`(최종 테스트 모델과 공유)는 그대로입니다. */
export type CatalogLessonItemPort = CatalogItemPort & {
  readonly glossOf: CatalogGlossOf;
  readonly imageUrlOf: CatalogImageUrlOf;
};

export type CatalogLessonPlan = {
  readonly episodeId: string;
  readonly unitKey: CatalogUnitKey;
  readonly activities: readonly CatalogActivity[];
  /** 채점 문항 수입니다 — 통과 기준 · 측정 · 결과 route의 분모. 단어 카드는 세지 않습니다. */
  readonly questionCount: number;
  /** 표시 문항 수입니다(채점 문항 + 단어 카드) — 셸 카운터와 진행 막대의 분모. */
  readonly shownItemCount: number;
  readonly skippedItemCount: number;
};
