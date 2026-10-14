// 단어 카드로의 매핑과 낱말 뜻 조회입니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import type { LearningItem, Word } from "../lib/episode-content.model";
import { englishOf, koOf, latinOf, skippedItem } from "./catalog-item-text";
import type {
  CatalogFill,
  CatalogGlossOf,
  CatalogLessonItemPort,
  CatalogMappedItem,
} from "./catalog-lesson-types";

/**
 * 낱말 `ref`의 영어 뜻을 찾는 함수입니다. 같은 id가 둘이면 첫 항목이고, 치환 → trim 뒤 빈 값이면
 * 없는 것으로 봅니다. 패턴 ref는 보지 않습니다.
 */
export function catalogGlossOf(words: readonly Word[], fill: CatalogFill): CatalogGlossOf {
  return (ref) => {
    if (ref === undefined) return null;
    const found = words.find((candidate) => candidate.id === ref);
    if (found === undefined) return null;
    const gloss = fill(found.glossEn, "en").trim();
    return gloss === "" ? null : gloss;
  };
}

export function vocabCardItemOf(
  item: Extract<LearningItem, { type: "VOCAB_CARD" }>,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const word = koOf(port, item.context.ko);
  if (word === "") return skippedItem(item, "malformed");
  const meaning = port.glossOf(item.ref) ?? englishOf(port, item.context.en);
  if (meaning === undefined || meaning === null) return skippedItem(item, "no-gloss");
  const exampleText = koOf(port, item.example.ko);
  const example =
    exampleText === "" || exampleText === word
      ? null
      : {
          text: exampleText,
          romanization: latinOf(port, item.example.roman) ?? null,
          translation: englishOf(port, item.example.en) ?? null,
        };
  return {
    kind: "vocab-card",
    itemId: item.id,
    question: { word, romanization: latinOf(port, item.context.roman) ?? null, meaning, example },
  };
}
