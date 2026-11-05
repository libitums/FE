import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import { decodeEpisode } from "./episode-content";
import type { Episode } from "./episode-content";
import { decodeTranslationFile, withTranslationFiles } from "./episode-translation-files";

// `unit` 계층: 언어별 번역 파일(`translation-1`)의 디코드와 에피소드 표 덧씌우기(ADR-0102 D1 · D3).

const file = (extra: Record<string, unknown> = {}): string =>
  JSON.stringify({
    schema: "translation-1",
    episode: "u01-water",
    language: "vi",
    entries: { water: "nước", "Fill in the blank.": "Điền vào chỗ trống." },
    ...extra,
  });
const target = { episodeId: "u01-water", language: "vi" } as const;

describe("decodeTranslationFile", () => {
  test("TF1. 맞는 파일은 그 표다", () => {
    expect(decodeTranslationFile(file(), target)).toEqual({
      water: "nước",
      "Fill in the blank.": "Điền vào chỗ trống.",
    });
  });

  test("TF2. 형식 · 에피소드 · 언어가 다르면 null이다", () => {
    expect(decodeTranslationFile(file({ schema: "translation-2" }), target)).toBeNull();
    expect(decodeTranslationFile(file({ episode: "u02-checkin" }), target)).toBeNull();
    expect(decodeTranslationFile(file({ language: "id" }), target)).toBeNull();
  });

  test("TF3. JSON이 아니거나 entries가 객체가 아니면 던지지 않고 null이다", () => {
    expect(decodeTranslationFile("{oops", target)).toBeNull();
    expect(decodeTranslationFile(file({ entries: ["x"] }), target)).toBeNull();
    expect(decodeTranslationFile("null", target)).toBeNull();
  });

  test("TF4. 문자열이 아니거나 빈 값은 버리고, 남는 것이 없으면 null이다", () => {
    expect(decodeTranslationFile(file({ entries: { a: "가", b: 3, c: " " } }), target)).toEqual({
      a: "가",
    });
    expect(decodeTranslationFile(file({ entries: { b: 3 } }), target)).toBeNull();
  });
});

describe("withTranslationFiles", () => {
  const decoded = decodeEpisode(bundledCatalogInput.episodes["u01-water"]);
  if (!decoded.ok) throw new Error("내장 u01을 디코드하지 못했습니다");
  const episode: Episode = decoded.episode;

  test("TF5. 파일이 있는 언어는 본문 표를 통째로 바꾸고, 다른 언어 표는 그대로다", () => {
    const next = withTranslationFiles(episode, { vi: { water: "NƯỚC" } });
    expect(next.translations?.vi).toEqual({ water: "NƯỚC" });
    expect(next.translations?.id).toBe(episode.translations?.id);
    expect(episode.translations?.vi).not.toEqual({ water: "NƯỚC" });
  });

  test("TF6. 덧씌울 표가 없으면 같은 객체다", () => {
    expect(withTranslationFiles(episode, {})).toBe(episode);
  });

  test("TF7. 본문에 표가 없는 에피소드에도 파일 표가 붙는다", () => {
    const { translations: _drop, ...bare } = episode;
    expect(withTranslationFiles(bare as Episode, { ja: { water: "水" } }).translations).toEqual({
      ja: { water: "水" },
    });
  });
});
