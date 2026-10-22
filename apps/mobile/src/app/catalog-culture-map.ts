// 문화 확인(CULTURE_CHECK)의 짝 문화 카드 · 장면 · 해설 매핑입니다(순수). 껍데기만 있는 단계입니다.

import type { LearningItem, LearningUnit, Text } from "../lib/episode-content.model";
import type { CultureScene } from "../screens/word-choice/word-choice-questions";
import { cultureCheckItemOf as currentCultureCheckItemOf } from "./catalog-choice-map";
import type {
  CatalogLessonItemPort,
  CatalogMappedItem,
  CultureCardItem,
} from "./catalog-lesson-types";

/** 이 문화 확인에 짝지어진 문화 카드입니다(같은 단계 k번째, 없으면 바로 앞 단계). 없으면 `null`. */
export function catalogCultureCardFor(
  _units: readonly LearningUnit[],
  _unitKey: string,
  _itemId: string,
): CultureCardItem | null {
  return null;
}

/** 카드 제목이 따옴표로 감싼 대사일 때 그 대사입니다. 아니면 `null`(주제 제목). */
export function quotedLineOf(_text: Text): Text | null {
  return null;
}

/** 카드가 대사를 가지면 장면(그림 + 대사)이고, 아니면 `null`입니다. */
export function catalogCultureSceneOf(
  _card: CultureCardItem | null,
  _port: CatalogLessonItemPort,
): CultureScene | null {
  return null;
}

/** 문화 확인 문항 매핑입니다(지금은 이전 매핑을 그대로 돌려줍니다). */
export function cultureCheckItemOf(
  item: Extract<LearningItem, { type: "CULTURE_CHECK" }>,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  return currentCultureCheckItemOf(item, port);
}
