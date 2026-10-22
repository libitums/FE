import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import { decodeEpisode } from "./episode-content";
import type { Episode } from "./episode-content";
import { KNOWN_ITEM_TYPES } from "./episode-content";
import { legacyCatalogInput } from "./episode-legacy.test-support";
import { utf8Bytes } from "./sha256";

// `unit` 계층: 새 내장본(2026-10-15.1)과 옛 내장본 픽스처(2026-10-14)의 모양 표입니다. 디스크 원문의 바이트 수와
// 디코드 결과의 개수만 보고, 화면 흐름은 보지 않습니다.

type EpisodeId = "u01-water" | "u02-checkin" | "u03-mina";

const EPISODE_IDS: readonly EpisodeId[] = ["u01-water", "u02-checkin", "u03-mina"];

type Shape = {
  readonly id: EpisodeId;
  readonly bytes: number;
  readonly prologue: number;
  readonly epilogue: number;
  readonly dialogue: number;
  readonly words: number;
  readonly items: number;
};

const BUNDLED_SHAPES: readonly Shape[] = [
  { id: "u01-water", bytes: 126_449, prologue: 6, epilogue: 3, dialogue: 9, words: 13, items: 104 },
  {
    id: "u02-checkin",
    bytes: 160_563,
    prologue: 5,
    epilogue: 4,
    dialogue: 13,
    words: 14,
    items: 133,
  },
  { id: "u03-mina", bytes: 155_429, prologue: 4, epilogue: 3, dialogue: 13, words: 15, items: 118 },
];

const LEGACY_SHAPES: readonly Shape[] = [
  { id: "u01-water", bytes: 79_485, prologue: 6, epilogue: 3, dialogue: 8, words: 10, items: 78 },
  {
    id: "u02-checkin",
    bytes: 121_908,
    prologue: 5,
    epilogue: 4,
    dialogue: 13,
    words: 13,
    items: 123,
  },
  { id: "u03-mina", bytes: 98_497, prologue: 4, epilogue: 3, dialogue: 13, words: 15, items: 87 },
];

function episodeOf(source: Record<string, unknown>, id: EpisodeId): Episode {
  const result = decodeEpisode(source[id]);
  if (!result.ok) throw new Error(`${id} 디코드 실패`);
  return result.episode;
}

const itemsOf = (episode: Episode) => [
  ...episode.units.flatMap((unit) => unit.items),
  ...episode.finalTest.items,
];

const bundled = (id: EpisodeId) => episodeOf(bundledCatalogInput.episodes, id);
const legacy = (id: EpisodeId) => episodeOf(legacyCatalogInput.episodes, id);

function typesOf(read: (id: EpisodeId) => Episode): Set<string> {
  return new Set(EPISODE_IDS.flatMap((id) => itemsOf(read(id)).map((item) => item.type)));
}

describe("새 내장본의 모양 (IF1)", () => {
  test.each(BUNDLED_SHAPES)("IF1. $id의 바이트 · 컷 · 대화 · 단어 · 문항 수", (shape) => {
    const text = readFileSync(resolve(process.cwd(), `content/episodes/${shape.id}.json`), "utf8");
    const episode = bundled(shape.id);

    expect(utf8Bytes(text).length).toBe(shape.bytes);
    expect(episode.prologue).toHaveLength(shape.prologue);
    expect(episode.epilogue).toHaveLength(shape.epilogue);
    expect(episode.dialogue).toHaveLength(shape.dialogue);
    expect(episode.words).toHaveLength(shape.words);
    expect(itemsOf(episode)).toHaveLength(shape.items);
  });

  test.each(EPISODE_IDS)("IF1. %s는 단계 S1 ~ S8 · CULT 아홉과 최종 RP(order 10)이다", (id) => {
    const episode = bundled(id);
    expect(episode.units.map((unit) => unit.id)).toEqual([
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "CULT",
    ]);
    expect(episode.finalTest.id).toBe("RP");
    expect(episode.finalTest.order).toBe(10);
  });

  test.each(EPISODE_IDS)("IF1. %s의 완료 조건은 단계 열 개 전부다", (id) => {
    expect(bundled(id).completion).toEqual({
      requires: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"],
    });
  });
});

describe("옛 내장본 픽스처의 모양 (IF2)", () => {
  test.each(LEGACY_SHAPES)(
    "IF2. $id의 컷 · 대화 · 단어 · 문항 수는 지금 숫자 그대로다",
    (shape) => {
      const episode = legacy(shape.id);
      expect(episode.prologue).toHaveLength(shape.prologue);
      expect(episode.epilogue).toHaveLength(shape.epilogue);
      expect(episode.dialogue).toHaveLength(shape.dialogue);
      expect(episode.words).toHaveLength(shape.words);
      expect(itemsOf(episode)).toHaveLength(shape.items);
    },
  );
});

describe("문항 유형 합집합 (IF3)", () => {
  test("IF3. 새 내장 셋은 24종에서 PAIR_MATCH · SENT_BUILD를 뺀 22종이다", () => {
    const expected = KNOWN_ITEM_TYPES.filter(
      (type) => type !== "PAIR_MATCH" && type !== "SENT_BUILD",
    );
    expect(typesOf(bundled)).toEqual(new Set<string>(expected));
    expect(typesOf(bundled).size).toBe(22);
  });

  test("IF3. 옛 픽스처 셋은 앞 13종이고 둘의 합이 KNOWN_ITEM_TYPES 24종이다", () => {
    expect(typesOf(legacy)).toEqual(new Set<string>(KNOWN_ITEM_TYPES.slice(0, 13)));
    expect(typesOf(legacy).size).toBe(13);
    expect(new Set([...typesOf(bundled), ...typesOf(legacy)])).toEqual(
      new Set<string>(KNOWN_ITEM_TYPES),
    );
    expect(KNOWN_ITEM_TYPES).toHaveLength(24);
  });
});

describe("옛 픽스처 격리 (GF1)", () => {
  test("GF1. 테스트가 아닌 src 파일은 test-fixtures와 episode-legacy.test-support를 가져오지 않는다", () => {
    const srcRoot = resolve(process.cwd(), "src");
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
      });
    const isTestFile = (file: string) => /\.test(-support)?\.(ts|tsx)$/.test(file);
    const offenders = walk(srcRoot)
      .filter((file) => !isTestFile(file))
      .filter((file) =>
        /test-fixtures|episode-legacy\.test-support/.test(readFileSync(file, "utf8")),
      )
      .map((file) => relative(process.cwd(), file).split(sep).join("/"));
    expect(offenders).toEqual([]);
  });
});
