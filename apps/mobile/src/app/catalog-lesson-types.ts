// 카탈로그 수업 계획의 타입입니다(타입만).

import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { LearningItem } from "../lib/episode-content";
import type { NonEmpty } from "../lib/non-empty";
import type { ListeningQuestion } from "../screens/listening/listening-questions";
import type { SentenceOrderQuestion } from "../screens/sentence-order/sentence-order-questions";
import type { TypingQuestion } from "../screens/typing/typing.contract";
import type { WordChoiceQuestion } from "../screens/word-choice/word-choice-questions";

export type { NonEmpty };

export type CatalogActivity =
  | { readonly form: "listening"; readonly questions: NonEmpty<ListeningQuestion> }
  | { readonly form: "sentence-order"; readonly questions: NonEmpty<SentenceOrderQuestion> }
  | { readonly form: "word-choice"; readonly questions: NonEmpty<WordChoiceQuestion> }
  | { readonly form: "typing"; readonly questions: NonEmpty<TypingQuestion> };

export type CatalogActivityForm = CatalogActivity["form"];

export type CatalogSkipReason =
  | "screen-pending"
  | "no-options"
  | "no-source"
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
  | {
      readonly kind: "skipped";
      readonly itemId: string;
      readonly type: LearningItem["type"];
      readonly reason: CatalogSkipReason;
    };

/** 학습자 프로필을 묶은 치환입니다. 영어 문자열은 `"roman"` 스크립트로 치환합니다. */
export type CatalogFill = (text: string, script: "ko" | "roman") => string;

export type CatalogItemPort = { readonly fill: CatalogFill; readonly episodeId: string };

export type CatalogLessonPlan = {
  readonly episodeId: string;
  readonly unitKey: CatalogUnitKey;
  readonly activities: readonly CatalogActivity[];
  /** 활동 문항 수의 합입니다. */
  readonly questionCount: number;
  readonly skippedItemCount: number;
};
