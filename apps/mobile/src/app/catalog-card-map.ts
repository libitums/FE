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
  const sample = item.example;
  const exampleText = sample === undefined ? "" : koOf(port, sample.ko);
  const example =
    sample === undefined || exampleText === "" || exampleText === word
      ? null
      : {
          text: exampleText,
          romanization: latinOf(port, sample.roman) ?? null,
          translation: englishOf(port, sample.en) ?? null,
        };
  return {
    kind: "vocab-card",
    itemId: item.id,
    question: { word, romanization: latinOf(port, item.context.roman) ?? null, meaning, example },
  };
}

/**
 * 문화 카드(CULTURE_CARD)입니다 — 판정 순서: 제목 malformed → 본문 없음 malformed → 영어 본문 no-gloss.
 * 요령(`feedback`) · 본문 로마자 · 음원은 싣지 않습니다.
 *
 * 그림(`stimulus.image_url`)은 콘텐츠 그림 포트(`imageUrlOf`) 하나로만 풉니다 — 원격 · 기기 안 해석이 다른 화면과 같은
 * 길입니다. 경로가 없거나 풀리지 않으면 `null`이고 **건너뛰지 않습니다**: 그림 고르기와 달리 그림이 문항의 뜻을 지지
 * 않아, 화면이 브랜드 면으로 대신 섭니다.
 */
export function cultureCardItemOf(
  item: Extract<LearningItem, { type: "CULTURE_CARD" }>,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const title = koOf(port, item.context.ko);
  if (title === "") return skippedItem(item, "malformed");
  const text = item.stimulus.text;
  if (text === undefined) return skippedItem(item, "malformed");
  const body = englishOf(port, text.en);
  if (body === undefined) return skippedItem(item, "no-gloss");
  const koreanBody = koOf(port, text.ko);
  const imagePath = item.stimulus.imageUrl;
  return {
    kind: "culture-card",
    itemId: item.id,
    question: {
      title,
      titleTranslation: englishOf(port, item.context.en) ?? null,
      titleRomanization: latinOf(port, item.context.roman) ?? null,
      body,
      koreanBody: koreanBody === "" ? null : koreanBody,
      imageUrl: imagePath === undefined ? null : port.imageUrlOf(imagePath),
    },
  };
}
