// 문항 매핑이 함께 쓰는 문자열 도구입니다(순수). 치환 뒤 앞뒤 공백을 걷고, 빈 값은 「없음」으로 봅니다.

import type { LearningItem, Text } from "../lib/episode-content.model";
import type { CatalogItemPort, CatalogMappedItem, CatalogSkipReason } from "./catalog-lesson-types";

/** 한글 자리 문자열입니다(빈 값이면 `""`). */
export const koOf = (port: CatalogItemPort, text: string): string => port.fill(text, "ko").trim();

/** 로마자 · 영어 자리 문자열입니다 — 없거나 비면 `undefined`. */
export function latinOf(port: CatalogItemPort, text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  const filled = port.fill(text, "roman").trim();
  return filled === "" ? undefined : filled;
}

/** 영어 자리 문자열입니다 — 없거나 비면 `undefined`. 나라는 영어 이름으로 섭니다. */
export function englishOf(port: CatalogItemPort, text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  const filled = port.fill(text, "en").trim();
  return filled === "" ? undefined : filled;
}

export const skippedItem = (item: LearningItem, reason: CatalogSkipReason): CatalogMappedItem => ({
  kind: "skipped",
  itemId: item.id,
  type: item.type,
  reason,
});

/** 있을 때만 키를 싣는 조각입니다. */
export function optionalField<K extends string>(
  key: K,
  value: string | undefined,
): { [P in K]?: string } {
  return value === undefined ? {} : ({ [key]: value } as { [P in K]?: string });
}

/** 문항 지시문(`prompt.en`)입니다. */
export const instructionOf = (port: CatalogItemPort, prompt: Text): string | undefined =>
  englishOf(port, prompt.en);
