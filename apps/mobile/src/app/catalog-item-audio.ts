// 문항의 음성 주소를 풀어 문항 음성 값으로 바꿉니다(순수). 듣기 여섯 유형은 `ListenAudio`,
// 나머지 여섯 유형은 `AnswerEchoAudio`입니다.

import { contentAudioSourceOf } from "../lib/content-audio";
import type { LearningItem } from "../lib/episode-content.model";
import type {
  AnswerEchoAudio,
  AnswerEchoItemType,
  ListenAudio,
  ListenItemType,
  QuestionAudio,
} from "../lib/question-audio";
import type { CatalogLessonItemPort } from "./catalog-lesson-types";

type ItemOf<T extends LearningItem["type"]> = Extract<LearningItem, { type: T }>;

/** 소리가 읽는 원문입니다 — 치환 **전** 값이라 자리표시자가 남아 있는지 가릴 수 있습니다. 없으면 `""`. */
function spokenKoOf(item: ItemOf<ListenItemType | AnswerEchoItemType>): string {
  switch (item.type) {
    case "LISTEN_SELECT":
    case "MIN_PAIR_AB":
    case "REPLY_SELECT":
    case "LISTEN_BUILD":
    case "DICTATION":
      return item.stimulus.audio?.ko ?? "";
    case "SHADOW":
      return item.stimulus.audio?.ko ?? item.stimulus.text?.ko ?? "";
    case "TRANSLATE_TO_EN":
      return item.stimulus.text?.ko ?? "";
    case "TRANSLATE_TO_KO":
    case "WORD_ORDER":
    case "SYLLABLE_BUILD":
    case "SPEAK_WORD":
      return item.answers[0]?.ko ?? "";
    case "IMG_MATCH":
      return item.options.find((option) => option.correct)?.ko ?? "";
  }
}

function sourceOf(
  item: ItemOf<ListenItemType | AnswerEchoItemType>,
  port: CatalogLessonItemPort,
): string | null {
  return contentAudioSourceOf(item.stimulus?.audioUrl, spokenKoOf(item), port.audioUrlOf);
}

export function catalogListenAudioOf(
  item: ItemOf<ListenItemType>,
  port: CatalogLessonItemPort,
): ListenAudio | null {
  const source = sourceOf(item, port);
  if (source === null) return null;
  return { kind: "listen", source, ref: { itemId: item.id, itemType: item.type } };
}

export function catalogAnswerEchoOf(
  item: ItemOf<AnswerEchoItemType>,
  port: CatalogLessonItemPort,
): AnswerEchoAudio | null {
  const source = sourceOf(item, port);
  return source === null ? null : { kind: "answer-echo", source };
}

/** 소리가 있을 때만 `audio` 키를 싣는 조각입니다. */
export function audioField<Audio extends QuestionAudio>(
  audio: Audio | null,
): { readonly audio?: Audio } {
  return audio === null ? {} : { audio };
}
