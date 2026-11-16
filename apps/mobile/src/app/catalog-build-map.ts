// 음절 조립(SYLLABLE_BUILD)으로의 매핑과 철자 탐색입니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import type { LearningItem } from "../lib/episode-content.model";
import type { NonEmpty } from "../lib/non-empty";
import type { SentenceOrderQuestion } from "../screens/sentence-order/sentence-order-questions";
import type { SyllableBuildQuestion } from "../screens/syllable-build/syllable-build.contract";
import { tileReadingOf } from "../components/assembled-hint/assembled-hint.contract";
import type {
  AssembledHint,
  TileReading,
} from "../components/assembled-hint/assembled-hint.contract";
import type { AnswerEchoAudio } from "../lib/question-audio";
import { audioField, catalogAnswerEchoOf, catalogListenAudioOf } from "./catalog-item-audio";
import {
  englishOf,
  instructionOf,
  koOf,
  latinOf,
  optionalField,
  skippedItem,
} from "./catalog-item-text";
import type { CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";
import { shuffledOrder } from "./catalog-shuffle";

/** 타일 로마자가 있을 때만 키를 싣습니다. */
export function readingField<K extends string>(
  key: K,
  reading: TileReading | undefined,
): { readonly [P in K]?: TileReading } {
  return (reading === undefined ? {} : { [key]: reading }) as { readonly [P in K]?: TileReading };
}

/** 힌트입니다 — 정답 소리가 있을 때만 「정답 듣기」 주소를 싣습니다(ADR-0153). */
export function assembledHintOf(
  ghost: readonly string[],
  echo: AnswerEchoAudio | null,
): AssembledHint {
  return { ghost, ...(echo === null ? {} : { listenSource: echo.source }) };
}

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

/**
 * 듣기 조립(LISTEN_BUILD)입니다 — 소리가 없으면 건너뜁니다. 정답을 공백으로 나눈 조각마다 아직 안 쓴 첫 같은
 * 글자 타일을 짝지으니 정답에 안 쓰인 타일이 오답 조각입니다.
 */
export function listenBuildItemOf(
  item: Extract<LearningItem, { type: "LISTEN_BUILD" }>,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const audio = catalogListenAudioOf(item, port);
  if (audio === null) return skippedItem(item, "audio-missing");
  const tiles = item.tiles.map((tile) => koOf(port, tile.ko));
  const answer = item.answers[0] === undefined ? "" : koOf(port, item.answers[0].ko);
  const pieces = answer.split(/\s+/).filter((piece) => piece !== "");
  if (tiles.length === 0 || tiles.includes("") || pieces.length === 0) {
    return skippedItem(item, "malformed");
  }
  const used = tiles.map(() => false);
  const picked: number[] = [];
  for (const piece of pieces) {
    const index = tiles.findIndex((tile, position) => !used[position] && tile === piece);
    if (index < 0) return skippedItem(item, "malformed");
    used[index] = true;
    picked.push(index);
  }
  const order = shuffledOrder(`${port.episodeId}/${item.id}`, tiles.length);
  const english = englishOf(port, item.stimulus.audio?.en) ?? englishOf(port, item.answers[0]?.en);
  const romanization =
    latinOf(port, item.answers[0]?.roman) ?? latinOf(port, item.stimulus.audio?.roman);
  const question: SentenceOrderQuestion = {
    prompt: english ?? koOf(port, item.prompt.ko),
    chips: order.map((index) => tiles[index] ?? ""),
    answerOrder: picked.map((tile) => order.indexOf(tile)),
    audio,
    // 정답 문장의 로마자라 확인 뒤에만 보입니다 — 답 전에 보이면 로마자 순서대로 놓으면 끝납니다(2026-11-02 문항 분석).
    ...(romanization === undefined
      ? {}
      : { reading: { romanization, shown: "after-check" as const } }),
    // 조각 로마자는 다시 풀기에서만 섭니다 — 첫 시도는 소리로 고르게 둡니다(ADR-0153).
    ...readingField(
      "chipReading",
      tileReadingOf(
        order.map((index) => latinOf(port, item.tiles[index]?.roman)),
        "review",
      ),
    ),
    ...optionalField("instruction", instructionOf(port, item.prompt)),
  };
  return { kind: "sentence-order", itemId: item.id, question };
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
  const echo = catalogAnswerEchoOf(item, port);
  const question: SyllableBuildQuestion = {
    meaning,
    tiles: order.map((index) => tiles[index] ?? ""),
    slotCount: spelling.length,
    answers,
    ...optionalField("instruction", instructionOf(port, item.prompt)),
    ...audioField(echo),
    ...readingField(
      "tileReading",
      tileReadingOf(
        order.map((index) => latinOf(port, item.tiles[index]?.roman)),
        "always",
      ),
    ),
    hint: assembledHintOf(
      spelling.map((index) => tiles[index] ?? ""),
      echo,
    ),
  };
  return { kind: "syllable-build", itemId: item.id, question };
}
