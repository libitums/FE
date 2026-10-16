// 음절 조립(SYLLABLE_BUILD)으로의 매핑과 철자 탐색입니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import type { LearningItem } from "../lib/episode-content.model";
import type { NonEmpty } from "../lib/non-empty";
import type { SyllableBuildQuestion } from "../screens/syllable-build/syllable-build.contract";
import { englishOf, instructionOf, koOf, optionalField, skippedItem } from "./catalog-item-text";
import type { CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";
import { shuffledOrder } from "./catalog-shuffle";

/**
 * 타일을 한 번씩만 써서 이으면 `word`가 되는 타일 인덱스 열입니다 — 깊이 우선 · 작은 인덱스 먼저 · 접두
 * 비교입니다(여러 글자 타일도 됩니다). 없으면, 또는 `word`가 비면 `null`입니다.
 */
export function catalogSpellingOf(
  tiles: readonly string[],
  word: string,
): readonly number[] | null {
  if (word === "") return null;
  const used = tiles.map(() => false);
  const path: number[] = [];
  const walk = (position: number): boolean => {
    if (position === word.length) return true;
    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index] ?? "";
      if (used[index] || tile === "" || !word.startsWith(tile, position)) continue;
      used[index] = true;
      path.push(index);
      if (walk(position + tile.length)) return true;
      path.pop();
      used[index] = false;
    }
    return false;
  };
  return walk(0) ? path : null;
}

const withoutSpaces = (text: string): string => text.replace(/\s+/g, "");
const isNonEmpty = (values: readonly string[]): values is NonEmpty<string> => values.length > 0;

/**
 * 음절 조립입니다 — 판정 순서: 타일 · 정답 · 철자는 malformed, 뜻은 no-gloss. 타일은 정답 순서로 실려
 * 오므로 섞어 싣고, 정답은 공백을 걷은 낱말로 받습니다.
 */
export function syllableBuildItemOf(
  item: Extract<LearningItem, { type: "SYLLABLE_BUILD" }>,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const tiles = item.tiles.map((tile) => koOf(port, tile.ko));
  if (tiles.length === 0 || tiles.includes("")) return skippedItem(item, "malformed");
  // 한국어가 빈 정답은 걷습니다. 뜻도 걷고 남은 첫 정답에서 읽어야 정답과 뜻이 같은 묶음입니다.
  const kept = item.answers.filter((answer) => withoutSpaces(koOf(port, answer.ko)) !== "");
  const answers = kept.map((answer) => withoutSpaces(koOf(port, answer.ko)));
  if (!isNonEmpty(answers)) return skippedItem(item, "malformed");
  const spelling = catalogSpellingOf(tiles, answers[0]);
  if (spelling === null) return skippedItem(item, "malformed");
  const meaning =
    englishOf(port, item.stimulus.en) ?? englishOf(port, kept[0]?.en) ?? port.glossOf(item.ref);
  if (meaning === undefined || meaning === null) return skippedItem(item, "no-gloss");
  const order = shuffledOrder(`${port.episodeId}/${item.id}`, tiles.length);
  const question: SyllableBuildQuestion = {
    meaning,
    tiles: order.map((index) => tiles[index] ?? ""),
    slotCount: spelling.length,
    answers,
    ...optionalField("instruction", instructionOf(port, item.prompt)),
  };
  return { kind: "syllable-build", itemId: item.id, question };
}
