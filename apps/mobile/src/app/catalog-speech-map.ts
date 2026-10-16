// 말하기 문항(SHADOW · SPEAK_WORD)의 매핑입니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import type { LearningItem, Text } from "../lib/episode-content.model";
import {
  englishOf,
  instructionOf,
  koOf,
  latinOf,
  optionalField,
  skippedItem,
} from "./catalog-item-text";
import type {
  CatalogItemPort,
  CatalogLessonItemPort,
  CatalogMappedItem,
} from "./catalog-lesson-types";

type ItemOf<T extends LearningItem["type"]> = Extract<LearningItem, { type: T }>;

/** 한 Text 묶음의 세 줄입니다 — 한국어가 비면 `null`(묶음을 쓰지 않습니다). */
function readAloudBundleOf(port: CatalogItemPort, text: Text | undefined) {
  if (text === undefined) return null;
  const sentence = koOf(port, text.ko);
  if (sentence === "") return null;
  return {
    sentence,
    romanization: latinOf(port, text.roman) ?? null,
    translation: englishOf(port, text.en) ?? null,
  };
}

/** SHADOW — 출처 묶음 `answers[0]` → `stimulus.text`(한국어가 빈 쪽은 건너뜀). 둘 다 비면 malformed. */
export function readAloudItemOf(item: ItemOf<"SHADOW">, port: CatalogItemPort): CatalogMappedItem {
  const question =
    readAloudBundleOf(port, item.answers[0]) ?? readAloudBundleOf(port, item.stimulus.text);
  if (question === null) return skippedItem(item, "malformed");
  return { kind: "read-aloud", itemId: item.id, question };
}

/** SPEAK_WORD — malformed(정답 0) → image-missing(주소 없음 · 못 풂) → no-gloss(뜻 없음) 순서. */
export function speakWordItemOf(
  item: ItemOf<"SPEAK_WORD">,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const [first, ...rest] = item.answers
    .map((answer) => koOf(port, answer.ko))
    .filter((ko) => ko !== "");
  if (first === undefined) return skippedItem(item, "malformed");
  const path = item.stimulus.imageUrl;
  const pictureUrl = path === undefined ? null : port.imageUrlOf(path);
  if (pictureUrl === null) return skippedItem(item, "image-missing");
  const head = item.answers[0];
  const meaning = englishOf(port, head?.en) ?? port.glossOf(item.ref);
  if (meaning === undefined || meaning === null) return skippedItem(item, "no-gloss");
  return {
    kind: "speak-word",
    itemId: item.id,
    question: {
      pictureUrl,
      meaning,
      answers: [first, ...rest],
      romanization: latinOf(port, head?.roman) ?? null,
      ...optionalField("instruction", instructionOf(port, item.prompt)),
    },
  };
}
