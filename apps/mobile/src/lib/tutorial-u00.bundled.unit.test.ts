import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import { episodeAssetPaths } from "./episode-assets";
import { bundledCatalogInput } from "./episode-bundled";
import { buildEpisodeCatalog } from "./episode-catalog";
import { decodeEpisode } from "./episode-content";
import { sha256Hex, utf8Bytes } from "./sha256";
import { TUTORIAL_EPISODE_ID } from "./tutorial-episode";

// `unit` 계층: 내장 u00 튜토리얼 데이터 모듈의 값만 봅니다(디스크 원문 · 디코드 · 카탈로그 · 자산 경로).

/** 내장 u00 본문이 가리키는 그림 14장(버킷 상대 경로)입니다. */
const U00_IMAGE_PATHS: readonly string[] = [
  "images/u00-tutorial/pre-1.webp",
  "images/u00-tutorial/pre-2.webp",
  "images/u00-tutorial/pre-3.webp",
  "images/u00-tutorial/pre-4.webp",
  "images/u00-tutorial/pre-5.webp",
  "images/u00-tutorial/pre-6.webp",
  "images/u00-tutorial/post-1.webp",
  "images/u00-tutorial/post-2.webp",
  "images/u00-tutorial/post-3.webp",
  "images/u00-tutorial/post-4.webp",
  "images/u00-tutorial/cult-u00-jalhasineyo.webp",
  "images/u00-tutorial/rp-end.webp",
  "images/items/hello.webp",
  "images/items/thanks.webp",
];

/** 내장 u00 본문이 가리키는 음성 12개(`audio/<id>.m4a`)입니다 — 파일은 앱에 넣지 않고 버킷에서 받습니다. */
const U00_AUDIO_PATHS: readonly string[] = [
  "audio/u00-tutorial/d-01.m4a",
  "audio/u00-tutorial/d-02.m4a",
  "audio/u00-tutorial/d-03.m4a",
  "audio/u00-tutorial/d-04.m4a",
  "audio/u00-tutorial/d-05.m4a",
  "audio/u00-tutorial/d-06.m4a",
  "audio/u00-tutorial/post-1.m4a",
  "audio/u00-tutorial/post-2.m4a",
  "audio/u00-tutorial/pre-5-dream.m4a",
  "audio/u00-tutorial/rp-01-reask.m4a",
  "audio/u00-tutorial/s1-01-word.m4a",
  "audio/u00-tutorial/s4-01-answer.m4a",
];

const u00Wire = (): unknown => bundledCatalogInput.episodes[TUTORIAL_EPISODE_ID];
const lessonKeys = Array.from({ length: 13 }, (_, i) => `S${i + 1}`);

describe("내장 u00-tutorial", () => {
  test("BD1. 내장 매니페스트 항목은 넷이고 첫째가 u00(order 0)이며 해시 · 바이트가 디스크 원문과 같다", () => {
    const { manifest, episodes } = bundledCatalogInput;
    expect(manifest.episodes.map((e) => e.id)).toEqual([
      TUTORIAL_EPISODE_ID,
      "u01-water",
      "u02-checkin",
      "u03-mina",
    ]);
    const first = manifest.episodes[0];
    expect(first?.order).toBe(0);
    expect(first?.version).toBe("2026-10-21.3");
    expect(first?.bytes).toBe(37777);
    const text = readFileSync(
      resolve(process.cwd(), `content/episodes/${TUTORIAL_EPISODE_ID}.json`),
      "utf8",
    );
    expect(first?.bytes).toBe(utf8Bytes(text).length);
    expect(first?.sha256).toBe(sha256Hex(utf8Bytes(text)));
    expect(Object.keys(episodes)).toContain(TUTORIAL_EPISODE_ID);
  });

  test("BD2. u00 본문은 경고 없이 디코드되고 단원 S1~S13 · 최종 RP · 완료 키 14다", () => {
    const decoded = decodeEpisode(u00Wire());
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.warnings).toEqual([]);
    expect(decoded.episode.titleEn).toBe("Tutorial");
    expect(decoded.episode.units.map((unit) => unit.id)).toEqual(lessonKeys);
    expect(decoded.episode.finalTest.id).toBe("RP");
    expect(decoded.episode.completion?.requires).toHaveLength(14);
  });

  test("BD3. 내장만으로 낸 맵 구획은 u00 · u01 · u02 · u03 순이고 번호는 order(0 ~ 3)다", () => {
    const catalog = buildEpisodeCatalog({
      bundled: bundledCatalogInput,
      cache: { manifest: null, episodes: {} },
    });
    const sections = catalogMapSectionsOf(catalog);
    expect(sections).toHaveLength(4);
    expect(sections[0]).toMatchObject({
      kind: "catalog-ready",
      episodeId: TUTORIAL_EPISODE_ID,
      ordinal: 0,
      lessonKeys,
      cultureKeys: ["S12", "S13"],
      finalKey: "RP",
      titleEn: "Tutorial",
    });
    expect(sections.map((section) => section.ordinal)).toEqual([0, 1, 2, 3]);
    expect(sections.map((section) => section.episodeId).slice(1)).toEqual([
      "u01-water",
      "u02-checkin",
      "u03-mina",
    ]);
  });

  test("BD4. u00 본문의 자산 경로는 그림 14장과 음성 12개다", () => {
    const paths = episodeAssetPaths(u00Wire());
    expect(new Set(paths.filter((path) => path.startsWith("images/")))).toEqual(
      new Set(U00_IMAGE_PATHS),
    );
    expect(new Set(paths.filter((path) => path.startsWith("audio/")))).toEqual(
      new Set(U00_AUDIO_PATHS),
    );
    expect(paths).toHaveLength(26);
  });
});
