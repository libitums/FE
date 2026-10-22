import { describe, expect, test } from "vitest";

import {
  decodeEpisode,
  KNOWN_ITEM_TYPES,
  type DecodeIssue,
  type DecodeResult,
  type Episode,
} from "./index";
import { item, minimalEpisode, options, step, type Wire } from "./episode-wire.test-support";

// `unit` 계층: 패키지 디코더 `decodeEpisode`의 입출력만 봅니다. 앱 디코더 테스트(U1 · U3 · U5 · U15 · U21)의
// 축약이고, 앱 쪽 전체 테스트는 재수출 모듈을 거쳐 같은 코드를 잽니다.

function passed(result: DecodeResult): { episode: Episode; warnings: DecodeIssue[] } {
  if (!result.ok) {
    throw new Error(`성공이어야 하는데 실패했습니다: ${JSON.stringify(result.errors)}`);
  }
  return result;
}

function failed(result: DecodeResult): DecodeIssue[] {
  if (result.ok) {
    throw new Error("실패여야 하는데 ok === true 입니다");
  }
  return result.errors;
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)]);
  }
  return [];
}

function firstUnitItem(episode: Episode) {
  const found = episode.units[0]?.items[0];
  if (found === undefined) throw new Error("units[0].items[0] 가 없습니다");
  return found;
}

const withItem = (it: Wire): Wire => minimalEpisode({}, [it]);

describe("decodeEpisode (패키지)", () => {
  test("EC1. 최소 에피소드는 성공하고 id · 유닛 · 최종 테스트가 맞으며 경고가 없다", () => {
    const { episode, warnings } = passed(decodeEpisode(minimalEpisode()));
    expect(episode.id).toBe("u99-unit");
    expect(episode.schema).toBe("delivery-2");
    expect(episode.units.map((unit) => unit.id)).toEqual(["S1"]);
    expect(episode.finalTest.id).toBe("RP");
    expect(episode.counterpart).toBe("미나");
    expect(warnings).toEqual([]);
  });

  test.each(
    KNOWN_ITEM_TYPES.filter((type) => type !== "ROLEPLAY_TURN").map((type) => [type] as const),
  )("EC1. %s 최소 문항이 디코드되고 키가 camelCase · 경고 0", (type) => {
    const { episode, warnings } = passed(decodeEpisode(withItem(item(type, "S1-01"))));
    const found = firstUnitItem(episode);
    expect(found.type).toBe(type);
    expect(collectKeys(found).filter((key) => key.includes("_"))).toEqual([]);
    expect(warnings).toEqual([]);
  });

  test("EC1. ROLEPLAY_TURN 최종 테스트가 도메인 모양으로 디코드된다", () => {
    const { episode } = passed(decodeEpisode(minimalEpisode()));
    const turn = episode.finalTest.items[0];
    expect(turn).toMatchObject({
      id: "RP-01",
      type: "ROLEPLAY_TURN",
      answers: [{ ko: "내 대사", roman: "nae daesa", en: "My line" }],
      roleplay: { lineId: "D1", tilesGloss: [{ tile: "내" }, { tile: "대사", en: "line" }] },
    });
    expect(collectKeys(turn).filter((key) => key.includes("_"))).toEqual([]);
  });

  test("EC1. 실패 — 스키마 불일치는 schema-mismatch 하나", () => {
    const errors = failed(decodeEpisode(minimalEpisode({ schema: "delivery-1" })));
    expect(errors.map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "schema-mismatch", path: "schema" },
    ]);
  });

  test("EC1. 실패 — 정답이 둘인 보기는 option-correct-count", () => {
    const errors = failed(
      decodeEpisode(withItem(item("ROLE_LINE", "S1-01", { options: options(3, 2) }))),
    );
    expect(errors.map(({ code, path }) => ({ code, path }))).toContainEqual({
      code: "option-correct-count",
      path: "steps[0].items[0].options",
    });
  });

  test("EC1. 실패 — 최종 테스트(RP)가 없으면 final-test-missing", () => {
    const errors = failed(
      decodeEpisode(minimalEpisode({ steps: [step("S1", 1, [item("ROLE_LINE", "S1-01")])] })),
    );
    expect(errors.map((issue) => issue.code)).toContain("final-test-missing");
  });

  test("EC1. 객체가 아닌 입력은 던지지 않고 schema-mismatch", () => {
    for (const input of [42, null, "delivery-2", [], undefined]) {
      const errors = failed(decodeEpisode(input));
      expect(errors[0]?.code).toBe("schema-mismatch");
    }
  });
});

describe("decodeEpisode — VOCAB_CARD 음성 두 키", () => {
  const vocabOf = (extra: Wire) => {
    const found = firstUnitItem(
      passed(decodeEpisode(withItem(item("VOCAB_CARD", "S1-01", extra)))).episode,
    );
    if (found.type !== "VOCAB_CARD") throw new Error(`VOCAB_CARD가 아닙니다: ${found.type}`);
    return found;
  };

  test("EC2. audio_url · example_audio_url이 audioUrl · exampleAudioUrl로 실린다", () => {
    const vocab = vocabOf({ audio_url: "u/w", example_audio_url: "u/e" });
    expect(vocab.audioUrl).toBe("u/w");
    expect(vocab.exampleAudioUrl).toBe("u/e");
  });

  test("EC2. 빈 값이면 두 키가 없다", () => {
    const vocab = vocabOf({ audio_url: "", example_audio_url: "" });
    expect("audioUrl" in vocab).toBe(false);
    expect("exampleAudioUrl" in vocab).toBe(false);
  });

  test("EC2. 와이어에 없으면 두 키가 없다", () => {
    const vocab = vocabOf({});
    expect("audioUrl" in vocab).toBe(false);
    expect("exampleAudioUrl" in vocab).toBe(false);
  });

  test("EC2. 다른 키는 그대로다", () => {
    const vocab = vocabOf({ audio_url: "u/w", example_audio_url: "u/e" });
    expect(vocab).toMatchObject({
      id: "S1-01",
      type: "VOCAB_CARD",
      event: "E",
      context: { ko: "문맥", roman: "r-문맥" },
      example: { ko: "예문", roman: "r-예문" },
      cardKind: "단어",
    });
    expect(Object.keys(vocab).sort()).toEqual(
      [
        "audioUrl",
        "cardKind",
        "context",
        "event",
        "example",
        "exampleAudioUrl",
        "id",
        "type",
      ].sort(),
    );
  });
});
