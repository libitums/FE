// 문화 확인(CULTURE_CHECK)의 짝 문화 카드 · 장면 · 해설 매핑입니다(순수).
//
// 문화 확인은 같은 에피소드의 문화 카드와 짝입니다 — 같은 단계에서 k번째 확인은 그 앞 카드 목록의
// k번째(없으면 마지막)이고, 앞선 카드가 없으면 바로 앞 단계의 카드 목록에서 같은 규칙으로 고릅니다.
// 카드 제목이 따옴표로 감싼 대사이면 그 대사가 상대 말풍선이 되는 「장면」, 아니면 질문 카드입니다.

import type { LearningItem, LearningUnit, Option, Text } from "../lib/episode-content.model";
import type {
  CultureExplanation,
  CultureScene,
  WordChoiceCulture,
} from "../screens/word-choice/word-choice-questions";
import { wordChoiceEn } from "../lib/ui-copy-en-learning";
import { wordChoiceItem } from "./catalog-choice-map";
import { englishOf, koOf, latinOf } from "./catalog-item-text";
import type {
  CatalogItemPort,
  CatalogLessonItemPort,
  CatalogMappedItem,
  CultureCardItem,
} from "./catalog-lesson-types";

type CultureCheckItem = Extract<LearningItem, { type: "CULTURE_CHECK" }>;

const isCard = (item: LearningItem): item is CultureCardItem => item.type === "CULTURE_CARD";

function pickPaired(cards: readonly CultureCardItem[], k: number): CultureCardItem | null {
  return cards[Math.min(k, cards.length - 1)] ?? null;
}

/** 이 문화 확인에 짝지어진 문화 카드입니다(같은 단계 k번째, 없으면 바로 앞 단계). 없으면 `null`. */
export function catalogCultureCardFor(
  units: readonly LearningUnit[],
  unitKey: string,
  itemId: string,
): CultureCardItem | null {
  const unitIndex = units.findIndex((unit) => unit.id === unitKey);
  const unit = units[unitIndex];
  if (unit === undefined) return null;
  const at = unit.items.findIndex((item) => item.id === itemId);
  if (at < 0) return null;
  const before = unit.items.slice(0, at);
  const k = before.filter((item) => item.type === "CULTURE_CHECK").length;
  const sameUnit = before.filter(isCard);
  if (sameUnit.length > 0) return pickPaired(sameUnit, k);
  return pickPaired(units[unitIndex - 1]?.items.filter(isCard) ?? [], k);
}

const OPEN_CORNER = "「";
const CLOSE_CORNER = "」";
const QUOTE_PAIRS: readonly (readonly [string, string])[] = [
  ['"', '"'],
  ["“", "”"],
];

function unwrap(text: string, open: string, close: string): string | null {
  const value = text.trim();
  if (value.length < open.length + close.length) return null;
  if (!value.startsWith(open) || !value.endsWith(close)) return null;
  const inner = value.slice(open.length, value.length - close.length);
  return inner.includes(open) || inner.includes(close) ? null : inner.trim();
}

function unwrapEnglish(text: string): string {
  for (const [open, close] of QUOTE_PAIRS) {
    const inner = unwrap(text, open, close);
    if (inner !== null && inner !== "") return inner;
  }
  return text.trim();
}

/** 카드 제목이 따옴표로 감싼 대사일 때 그 대사입니다. 아니면 `null`(주제 제목). */
export function quotedLineOf(text: Text): Text | null {
  const ko = unwrap(text.ko, OPEN_CORNER, CLOSE_CORNER);
  if (ko === null || ko === "") return null;
  const roman = text.roman === undefined ? undefined : text.roman.trim();
  const en = text.en === undefined ? undefined : text.en.trim();
  return {
    ko,
    ...(roman === undefined || roman === ""
      ? {}
      : { roman: unwrap(roman, OPEN_CORNER, CLOSE_CORNER) ?? roman }),
    ...(en === undefined || en === "" ? {} : { en: unwrapEnglish(en) }),
  };
}

/** 카드가 대사를 가지면 장면(그림 + 대사)이고, 아니면 `null`입니다. */
export function catalogCultureSceneOf(
  card: CultureCardItem | null,
  port: CatalogLessonItemPort,
): CultureScene | null {
  if (card === null) return null;
  const line = quotedLineOf(card.context);
  if (line === null) return null;
  const path = card.stimulus.imageUrl;
  const romanization = latinOf(port, line.roman);
  const meaning = englishOf(port, line.en);
  return {
    imageUrl: path === undefined || path === "" ? null : port.imageUrlOf(path),
    line: {
      ko: koOf(port, line.ko),
      ...(romanization === undefined ? {} : { romanization }),
      ...(meaning === undefined ? {} : { meaning }),
    },
  };
}

/** 보기 번역입니다 — 모든 보기에 영어가 있을 때만 싣습니다. */
function choiceTranslationsOf(
  port: CatalogItemPort,
  options: readonly Option[],
): readonly string[] | undefined {
  const translations = options.map((option) => englishOf(port, option.en));
  return translations.every((value) => value !== undefined)
    ? translations.map((value) => value ?? "")
    : undefined;
}

function explanationOf(port: CatalogItemPort, correct: Text): CultureExplanation {
  const en = englishOf(port, correct.en);
  const ko = koOf(port, correct.ko);
  return { ...(en === undefined ? {} : { en }), ...(ko === "" ? {} : { ko }) };
}

/** 문화 확인 문항 매핑입니다 — 질문 · 보기(콘텐츠 순서) · 보기 번역(전부 있을 때만) · 장면 · 해설. */
export function cultureCheckItemOf(
  item: CultureCheckItem,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const scene = catalogCultureSceneOf(port.cultureCardOf?.(item.id) ?? null, port);
  const culture: WordChoiceCulture = {
    scene,
    explanation: explanationOf(port, item.feedback.correct),
  };
  return wordChoiceItem(item, port, item.prompt, {
    prompt: koOf(port, item.context.ko),
    romanization: latinOf(port, item.context.roman),
    translation: englishOf(port, item.context.en),
    instruction: scene === null ? undefined : wordChoiceEn.culture.sceneInstruction,
    choices: item.options.map((option) => koOf(port, option.ko)),
    answerIndex: item.options.findIndex((option) => option.correct),
    choiceTranslations: choiceTranslationsOf(port, item.options),
    culture,
  });
}
