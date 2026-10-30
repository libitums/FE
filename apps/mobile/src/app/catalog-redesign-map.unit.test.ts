import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { decodeEpisode } from "../lib/episode-content";
import type { LearningItem, TurnTile } from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { catalogItemOf } from "./catalog-item-map";
import type { CatalogFill, CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";
import type { SentenceOrderQuestion } from "../screens/sentence-order/sentence-order-questions";
import type { WordChoiceQuestion } from "../screens/word-choice/word-choice-questions";

// `unit` 계층: 학습 문항 리디자인이 매핑에 더한 필드(읽기 줄 · 대화 조각 화자와 뜻 · 빈칸 로마자)만 봅니다.
// 실데이터는 내장 u00 · u03입니다.

const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);

function portFor(episodeId: string): CatalogLessonItemPort {
  return {
    fill,
    episodeId,
    glossOf: () => null,
    imageUrlOf: (path) => `https://cdn/${path}`,
    audioUrlOf: (path) => `https://cdn/audio/${path}`,
  };
}

function itemOf(episodeId: string, unitId: string, itemId: string): LearningItem {
  const result = decodeEpisode(
    bundledCatalogInput.episodes[episodeId as keyof typeof bundledCatalogInput.episodes],
  );
  if (!result.ok) throw new Error(`bundled episode failed to decode: ${episodeId}`);
  const found = result.episode.units
    .find((unit) => unit.id === unitId)
    ?.items.find((item) => item.id === itemId);
  if (found === undefined) throw new Error(`missing item ${unitId}/${itemId}`);
  return found;
}

function sentenceOrderOf(mapped: CatalogMappedItem): SentenceOrderQuestion {
  if (mapped.kind !== "sentence-order") throw new Error(`not sentence-order: ${mapped.kind}`);
  return mapped.question;
}

function wordChoiceOf(mapped: CatalogMappedItem): WordChoiceQuestion {
  if (mapped.kind !== "word-choice") throw new Error(`not word-choice: ${mapped.kind}`);
  return mapped.question;
}

describe("WORD_ORDER 읽기 줄 (MP3)", () => {
  const item = itemOf("u03-mina", "S7", "S7-07");

  test("정답 로마자가 Check 뒤에 보이는 읽기 줄로 실린다", () => {
    if (item.type !== "WORD_ORDER") throw new Error("모양 불일치");

    const question = sentenceOrderOf(catalogItemOf(item, portFor("u03-mina")));

    expect(question.reading).toEqual({
      romanization: item.answers[0]?.roman,
      shown: "after-check",
    });
    expect(question.reading?.romanization).toBeTruthy();
  });

  test("정답 로마자가 없으면 읽기 줄 키가 없다", () => {
    if (item.type !== "WORD_ORDER") throw new Error("모양 불일치");
    const [answer] = item.answers;
    if (answer === undefined) throw new Error("answers 없음");
    const { roman: _roman, ...withoutRoman } = answer;
    const bare: LearningItem = { ...item, answers: [withoutRoman] };

    const question = sentenceOrderOf(catalogItemOf(bare, portFor("u03-mina")));

    expect(question).not.toHaveProperty("reading");
  });
});

describe("LISTEN_BUILD 읽기 줄 (MP4)", () => {
  test("u00 S7은 늘 보이는 읽기 줄을 정답 로마자로 싣는다", () => {
    const question = sentenceOrderOf(
      catalogItemOf(itemOf("u00-tutorial", "S7", "S7-01"), portFor("u00-tutorial")),
    );

    expect(question.reading).toEqual({
      romanization: "annyeonghaseyo! hangugeun cheoeumiseyo?",
      shown: "always",
    });
  });
});

describe("TURN_ORDER 대화 조각 (MP5)", () => {
  const item = itemOf("u00-tutorial", "S11", "S11-01");

  function tilesOf(source: LearningItem): readonly TurnTile[] {
    if (source.type !== "TURN_ORDER") throw new Error("모양 불일치");
    return source.tiles;
  }

  function mapped(source: LearningItem): SentenceOrderQuestion {
    return sentenceOrderOf(catalogItemOf(source, portFor("u00-tutorial")));
  }

  test("정답 첫 턴은 고정된 첫 줄(opening)로 빠지고 창고 조각에 들지 않는다", () => {
    if (item.type !== "TURN_ORDER") throw new Error("모양 불일치");
    const question = mapped(item);
    const first = item.tiles[item.answer[0] ?? -1];

    expect(question.dialogue?.opening).toEqual({
      speaker: first?.speaker === "player" ? "me" : "counterpart",
      text: first?.ko,
    });
    expect(question.chips).not.toContain(first?.ko);
    expect(question.chips).toHaveLength(item.tiles.length - 1);
    expect(question.answerOrder.map((index) => question.chips[index])).toEqual(
      item.answer.slice(1).map((index) => item.tiles[index]?.ko),
    );
  });

  test("섞인 조각마다 원래 타일의 화자(player는 me)와 영어 뜻을 싣는다", () => {
    const question = mapped(item);
    const tiles = tilesOf(item);

    expect(question.dialogue?.chipSpeakers).toHaveLength(question.chips.length);
    expect(question.chipMeanings).toHaveLength(question.chips.length);
    question.chips.forEach((chip, index) => {
      const tile = tiles.find((candidate) => candidate.ko === chip);
      expect(tile, chip).toBeDefined();
      expect(question.dialogue?.chipSpeakers?.[index]).toBe(
        tile?.speaker === "player" ? "me" : "counterpart",
      );
      expect(question.chipMeanings?.[index]).toBe(tile?.en);
    });
  });

  test("타일 영어 뜻이 하나라도 없으면 chipMeanings 키가 없다", () => {
    if (item.type !== "TURN_ORDER") throw new Error("모양 불일치");
    const [first, ...rest] = item.tiles;
    if (first === undefined) throw new Error("tiles 없음");
    const { en: _en, ...withoutEn } = first;

    const question = mapped({ ...item, tiles: [withoutEn, ...rest] });

    expect(question).not.toHaveProperty("chipMeanings");
    expect(question.dialogue?.chipSpeakers).toHaveLength(question.chips.length);
  });

  test("화자가 전부 없으면 조각의 정답 자리(고정된 첫 줄 다음부터)가 짝수면 상대, 홀수면 나다", () => {
    if (item.type !== "TURN_ORDER") throw new Error("모양 불일치");
    const unspoken = item.tiles.map((tile) => {
      const { speaker: _speaker, ...rest } = tile;
      return rest;
    });

    const question = mapped({ ...item, tiles: unspoken });

    expect(question.dialogue?.opening.speaker).toBe("counterpart");
    question.chips.forEach((_, chipIndex) => {
      const position = question.answerOrder.indexOf(chipIndex) + 1;
      expect(question.dialogue?.chipSpeakers?.[chipIndex]).toBe(
        position % 2 === 0 ? "counterpart" : "me",
      );
    });
  });

  test("칸 화자는 그대로 정답 순서 기준이고 첫 턴은 고정된 첫 줄의 화자다", () => {
    const question = mapped(item);

    expect(question.dialogue?.opening.speaker).toBe("counterpart");
    expect(question.dialogue?.speakers).toEqual(["me", "counterpart", "me"]);
  });
});

describe("MP6. 가드 — 기존 매핑 결과", () => {
  test("TURN_ORDER의 보기 · 정답 순서 · 화자는 그대로다", () => {
    const item = itemOf("u00-tutorial", "S11", "S11-01");
    if (item.type !== "TURN_ORDER") throw new Error("모양 불일치");

    const question = sentenceOrderOf(catalogItemOf(item, portFor("u00-tutorial")));

    expect([
      question.dialogue?.opening.text,
      ...question.answerOrder.map((index) => question.chips[index]),
    ]).toEqual(item.answer.map((index) => item.tiles[index]?.ko));
    expect(question.dialogue?.speakers).toHaveLength(item.tiles.length - 1);
  });
});

describe("CLOZE 로마자 (MP7)", () => {
  test("u00 S6은 빈칸을 정답 로마자로 채운 문장과 강조 범위를 싣는다", () => {
    const question = wordChoiceOf(
      catalogItemOf(itemOf("u00-tutorial", "S6", "S6-01"), portFor("u00-tutorial")),
    );

    expect(question.romanization).toBe("annyeonghaseyo! hangugeun cheoeumiseyo?");
    expect(question.romanizationEmphasis).toEqual({ start: 0, length: 15 });
  });

  test("빈칸이 없는 문맥은 강조가 없다", () => {
    const item = itemOf("u00-tutorial", "S6", "S6-01");
    if (item.type !== "CLOZE") throw new Error("모양 불일치");
    const plain: LearningItem = {
      ...item,
      context: { ko: "안녕하세요!", roman: "annyeonghaseyo!", en: "Hello!" },
    };

    const question = wordChoiceOf(catalogItemOf(plain, portFor("u00-tutorial")));

    expect(question.romanization).toBe("annyeonghaseyo!");
    expect(question).not.toHaveProperty("romanizationEmphasis");
  });
});
