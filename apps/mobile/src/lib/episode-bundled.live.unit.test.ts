import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

import { bundledContentImageUrl } from "./bundled-content-images";
import { bundledCatalogInput } from "./episode-bundled";
import { buildEpisodeCatalog, checkEpisodeText } from "./episode-catalog";
import { episodeAssetPaths } from "./episode-assets";
import { TUTORIAL_EPISODE_ID } from "./tutorial-episode";

// `unit` 계층: 실제 내장본(2026-10-26 버킷 최신본 u00 ~ u08)을 봅니다. 다른 테스트는 `vitest.setup.ts`가 고정본으로
// 바꾸므로, 여기서 그 대역을 되돌립니다. 내장본을 갈아 끼울 때 이 파일의 기대(편 수)만 맞춥니다.
vi.unmock("./episode-bundled");
vi.unmock("./bundled-content-images");

const BUNDLED_IDS = [
  "u00-tutorial",
  "u01-water",
  "u02-checkin",
  "u03-mina",
  "u04-directions",
  "u05-baekban",
  "u06-cafe",
  "u07-jaemin",
  "u08-umbrella",
];

const textOf = (url: string): string =>
  readFileSync(resolve(process.cwd(), "content", url), "utf8");

describe("실제 내장본", () => {
  test("BL1. 매니페스트는 u00 ~ u08 아홉 편이 order 0 ~ 8 순서이고 본문 키가 같다", () => {
    const entries = bundledCatalogInput.manifest.episodes;
    expect(entries.map((entry) => entry.id)).toEqual(BUNDLED_IDS);
    expect(entries.map((entry) => entry.order)).toEqual(BUNDLED_IDS.map((_, index) => index));
    expect(Object.keys(bundledCatalogInput.episodes).sort()).toEqual([...BUNDLED_IDS].sort());
  });

  test("BL2. 편마다 디스크 원문의 해시 · 바이트가 매니페스트와 같고 앱 해석기를 지난다", () => {
    for (const entry of bundledCatalogInput.manifest.episodes) {
      const result = checkEpisodeText(entry, textOf(entry.url));
      expect({ id: entry.id, ok: result.ok }).toEqual({ id: entry.id, ok: true });
    }
  });

  test("BL3. 내장만으로 아홉 편이 모두 ready다", () => {
    const catalog = buildEpisodeCatalog({
      bundled: bundledCatalogInput,
      cache: { manifest: null, episodes: {} },
    });
    expect(catalog.map((entry) => [entry.id, entry.status])).toEqual(
      BUNDLED_IDS.map((id) => [id, "ready"]),
    );
  });

  test("BL4. u00이 가리키는 그림은 모두 앱에 실은 그림이고 파일이 있다", () => {
    const images = episodeAssetPaths(bundledCatalogInput.episodes[TUTORIAL_EPISODE_ID]).filter(
      (path) => path.startsWith("images/"),
    );
    expect(images.length).toBeGreaterThan(0);
    for (const path of images) {
      expect({ path, bundled: bundledContentImageUrl(path) !== null }).toEqual({
        path,
        bundled: true,
      });
      expect(existsSync(resolve(process.cwd(), "src/assets/content", path))).toBe(true);
    }
  });
});
