// 문항의 음성 주소를 풀어 문항 음성 값으로 바꿉니다(순수). 듣기 여섯 유형은 `ListenAudio`,
// 나머지 여섯 유형은 `AnswerEchoAudio`입니다.

import type { LearningItem } from "../lib/episode-content.model";
import type {
  AnswerEchoAudio,
  AnswerEchoItemType,
  ListenAudio,
  ListenItemType,
} from "../lib/question-audio";
import type { CatalogLessonItemPort } from "./catalog-lesson-types";

type ItemOf<T extends LearningItem["type"]> = Extract<LearningItem, { type: T }>;

export function catalogListenAudioOf(
  _item: ItemOf<ListenItemType>,
  _port: CatalogLessonItemPort,
): ListenAudio | null {
  return null;
}

export function catalogAnswerEchoOf(
  _item: ItemOf<AnswerEchoItemType>,
  _port: CatalogLessonItemPort,
): AnswerEchoAudio | null {
  return null;
}
