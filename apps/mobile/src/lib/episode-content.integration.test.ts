import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeAll, describe, expect, test } from "vitest";

import { decodeEpisode } from "./episode-content";
import type { DecodeResult, Episode } from "./episode-content";
import { KNOWN_ITEM_TYPES } from "./episode-content.schema";

// `integration` 계층: 디스크의 실제 에피소드 JSON 바이트 → `JSON.parse` → `decodeEpisode`를
// 이어서 봅니다 (ADR-0006 D4). 외부 IO 대체 없음 — 픽스처는 콘텐츠의 바이트 사본입니다.
// 케이스 단위 합성 입력은 같은 모듈의 unit 테스트가 맡고, 여기서는 실제 파일 경계에서만
// 드러나는 것(13종 타입 합집합 · 전수 순회 · 미해결 ref 23개)을 봅니다.

type Fixture = {
  file: string;
  bytes: number;
  prologue: number;
  epilogue: number;
  dialogue: number;
  words: number;
  items: number;
};

const FIXTURES: readonly Fixture[] = [
  { file: "u01-water", bytes: 79_485, prologue: 6, epilogue: 3, dialogue: 8, words: 10, items: 78 },
  {
    file: "u02-checkin",
    bytes: 121_744,
    prologue: 5,
    epilogue: 4,
    dialogue: 13,
    words: 13,
    items: 123,
  },
  { file: "u03-mina", bytes: 98_347, prologue: 4, epilogue: 3, dialogue: 13, words: 15, items: 87 },
];

const raws = new Map<string, string>();
const decoded = new Map<string, DecodeResult>();

function pathOf(file: string): string {
  return resolve(process.cwd(), "content/episodes", `${file}.json`);
}

function episodeOf(file: string): Episode {
  const result = decoded.get(file);
  if (result === undefined || !result.ok) {
    throw new Error(`${file} 디코드 실패`);
  }
  return result.episode;
}

function warningsOf(file: string) {
  const result = decoded.get(file);
  if (result === undefined || !result.ok) {
    throw new Error(`${file} 디코드 실패`);
  }
  return result.warnings;
}

function allItems(episode: Episode) {
  return [...episode.units.flatMap((unit) => unit.items), ...episode.finalTest.items];
}

/** 결과를 재귀로 훑으며 (키, 값) 쌍을 모읍니다. ROLEPLAY_TURN의 `raw` 아래는 제외합니다. */
function walk(value: unknown, visit: (key: string, child: unknown) => void): void {
  if (Array.isArray(value)) {
    for (const child of value) {
      walk(child, visit);
    }
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      visit(key, child);
      if (key !== "raw") {
        walk(child, visit);
      }
    }
  }
}

beforeAll(() => {
  for (const { file } of FIXTURES) {
    const text = readFileSync(pathOf(file), "utf8");
    raws.set(file, text);
    decoded.set(file, decodeEpisode(JSON.parse(text)));
  }
});

describe.each(FIXTURES)("에피소드 픽스처 $file", (fixture) => {
  const { file } = fixture;

  test("I1. 디코드에 성공한다", () => {
    expect(decoded.get(file)?.ok).toBe(true);
  });

  test("I2. 유닛 8개 · 최종 테스트 RP(order 9)", () => {
    const episode = episodeOf(file);
    expect(episode.units).toHaveLength(8);
    expect(episode.units.map((unit) => unit.id)).toEqual([
      "S1",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
    ]);
    expect(episode.finalTest.id).toBe("RP");
    expect(episode.finalTest.order).toBe(9);
  });

  test("I3. 프롤로그 · 에필로그 · 대화 · 단어 개수", () => {
    const episode = episodeOf(file);
    expect(episode.prologue).toHaveLength(fixture.prologue);
    expect(episode.epilogue).toHaveLength(fixture.epilogue);
    expect(episode.dialogue).toHaveLength(fixture.dialogue);
    expect(episode.words).toHaveLength(fixture.words);
  });

  test("I4. 문항 총수", () => {
    expect(allItems(episodeOf(file))).toHaveLength(fixture.items);
  });

  test("I5. 결과에 빈 문자열 Url · ref, 와이어 키, tiles_gloss_en이 없다", () => {
    const emptyUrlOrRef: string[] = [];
    const underscoreKeys: string[] = [];
    const glossKeys: string[] = [];
    walk(episodeOf(file), (key, child) => {
      if (child === "" && (/Url$/.test(key) || key === "ref")) {
        emptyUrlOrRef.push(key);
      }
      if (key.includes("_")) {
        underscoreKeys.push(key);
      }
      if (key === "tiles_gloss_en") {
        glossKeys.push(key);
      }
    });
    expect(emptyUrlOrRef).toEqual([]);
    expect(underscoreKeys).toEqual([]);
    expect(glossKeys).toEqual([]);
  });

  test("I8. 같은 파일을 두 번 디코드하면 결과가 같다", () => {
    const again = decodeEpisode(JSON.parse(raws.get(file) ?? ""));
    expect(again).toEqual(decoded.get(file));
  });

  test("I9. 픽스처 바이트 수", () => {
    expect(Buffer.byteLength(raws.get(file) ?? "", "utf8")).toBe(fixture.bytes);
  });
});

describe("에피소드 픽스처 합집합", () => {
  test("I4. 세 파일의 문항 type 합집합이 닫힌 13종과 같다", () => {
    const types = new Set<string>();
    for (const { file } of FIXTURES) {
      for (const item of allItems(episodeOf(file))) {
        types.add(item.type);
      }
    }
    expect(types).toEqual(new Set<string>(KNOWN_ITEM_TYPES));
    expect(types.size).toBe(13);
  });
});

describe("미해결 ref 경고", () => {
  test("I6. u03은 unresolved-ref 23개이고 id는 셋뿐이다", () => {
    const warnings = warningsOf("u03-mina");
    expect(warnings).toHaveLength(23);
    for (const warning of warnings) {
      expect(warning.code).toBe("unresolved-ref");
      expect(warning.path).toMatch(/^steps\[\d+\]\.items\[\d+\]\.ref$/);
    }
    const ids = new Set(
      warnings.map((warning) => /voca:[0-9a-f]{8}/.exec(warning.message)?.[0] ?? warning.message),
    );
    expect(ids).toEqual(new Set(["voca:ec5d9a98", "voca:e3c30bfa", "voca:9710a021"]));
  });

  test.each(["u01-water", "u02-checkin"])("I6. %s는 경고가 없다", (file) => {
    expect(warningsOf(file)).toEqual([]);
  });
});

describe("정규화된 문자열 정답", () => {
  test("I7. u02 S3-02(TURN_ORDER) answer는 tiles 인덱스 순열이다", () => {
    const unit = episodeOf("u02-checkin").units.find((u) => u.id === "S3");
    const found = unit?.items.find((i) => i.id === "S3-02");
    expect(found?.type).toBe("TURN_ORDER");
    if (found?.type !== "TURN_ORDER") {
      return;
    }
    expect(found.answer).toHaveLength(4);
    expect([...found.answer].sort()).toEqual([0, 1, 2, 3]);
    expect(found.tiles).toHaveLength(4);
  });

  test("I7. u03 S9-04(PAIR_MATCH) pairs는 4개이고 첫 쌍이 이름=name이다", () => {
    const unit = episodeOf("u03-mina").units.find((u) => u.id === "S9");
    const found = unit?.items.find((i) => i.id === "S9-04");
    expect(found?.type).toBe("PAIR_MATCH");
    if (found?.type !== "PAIR_MATCH") {
      return;
    }
    expect(found.pairs).toHaveLength(4);
    expect(found.pairs[0]?.left.ko).toBe("이름");
    expect(found.pairs[0]?.right).toBe("name");
  });
});
