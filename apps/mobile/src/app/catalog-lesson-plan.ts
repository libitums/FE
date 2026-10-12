// 카탈로그 유닛의 수업 계획입니다 — 콘텐츠 문항을 학습 화면이 그릴 수 있는 문항으로 바꾸거나 사유와
// 함께 건너뛰고, 같은 학습형이 이어지는 구간을 한 활동으로 묶습니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다(값을 가져오면 메인 스레드 빌드가
// 깨집니다).

import type { CatalogUnitKey } from "../lib/catalog-progress";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem } from "../lib/episode-content";
import type { NonEmpty } from "../lib/non-empty";
import type { LearnerProfile } from "../lib/placeholder-fill";
import type { AssessmentPassCriterion } from "../screens/assessment/assessment";
import type { ListeningQuestion } from "../screens/listening/listening-questions";
import type { SentenceOrderQuestion } from "../screens/sentence-order/sentence-order-questions";
import type { TypingQuestion } from "../screens/typing/typing.contract";
import type { WordChoiceQuestion } from "../screens/word-choice/word-choice-questions";
import type { EpisodeContent } from "./episode-content";

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

/** 결정적 타일 순서입니다. `order[p]` = 자리 `p`에 보일 원래 인덱스. */
export function shuffledOrder(_seed: string, _length: number): readonly number[] {
  return [];
}

export function catalogItemOf(item: LearningItem, _port: CatalogItemPort): CatalogMappedItem {
  return { kind: "skipped", itemId: item.id, type: item.type, reason: "screen-pending" };
}

export function catalogActivitiesOf(
  _items: readonly CatalogMappedItem[],
): readonly CatalogActivity[] {
  return [];
}

/** 그 키의 유닛이 없으면 `null`입니다. */
export function catalogLessonPlanOf(
  _entry: Extract<CatalogEntry, { status: "ready" }>,
  _unitKey: CatalogUnitKey,
  _fill: CatalogFill,
): CatalogLessonPlan | null {
  return null;
}

export function catalogPassCriterion(_questionCount: number): AssessmentPassCriterion {
  return { minCorrectCount: 1 };
}

export function catalogFillOf(_content: EpisodeContent, _profile: LearnerProfile): CatalogFill {
  return (text) => text;
}

/** 같은 ready 항목 참조 + 같은 키면 같은 계획 참조를 돌려줍니다(메모). */
export function catalogLessonPlanFor(
  _content: EpisodeContent,
  _episodeId: string,
  _unitKey: CatalogUnitKey,
): CatalogLessonPlan | null {
  return null;
}
