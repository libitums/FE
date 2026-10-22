import { describe, expect, test } from "vitest";

import { bundledContentImageUrl } from "./bundled-content-images";
import { decodeEpisode } from "./episode-content";
import { episodeAssetPaths } from "./episode-assets";
import { bundledCatalogInput } from "./episode-bundled";

// `unit` 계층: 상대 아바타 경로가 디코더와 자산 목록을 지나는 입출력만 봅니다.

const u00 = bundledCatalogInput.episodes["u00-tutorial"] as Record<string, unknown>;
const u01 = bundledCatalogInput.episodes["u01-water"] as Record<string, unknown>;

function withAvatar(value: unknown): Record<string, unknown> {
  return { ...u00, counterpart_avatar: value };
}

describe("디코더의 counterpart_avatar", () => {
  test("AV4. 어긋나지 않은 경로는 에피소드에 실리고 경고가 없다", () => {
    const result = decodeEpisode(withAvatar("images/avatars/u00.webp"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.episode.counterpartAvatar).toBe("images/avatars/u00.webp");
    expect(result.warnings.filter((warning) => warning.code === "invalid-asset-path")).toEqual([]);
  });

  test("AV5. 어긋난 값은 키를 버리고 경고 하나를 남기며 디코드는 실패하지 않는다", () => {
    const result = decodeEpisode(withAvatar("../escape.gif"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.episode).not.toHaveProperty("counterpartAvatar");
    const found = result.warnings.filter((warning) => warning.code === "invalid-asset-path");
    expect(found).toHaveLength(1);
    expect(found[0]?.path).toBe("counterpart_avatar");
  });

  test("AV5. null은 키도 경고도 없다", () => {
    const result = decodeEpisode(withAvatar(null));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.episode).not.toHaveProperty("counterpartAvatar");
    expect(result.warnings.filter((warning) => warning.code === "invalid-asset-path")).toEqual([]);
  });

  test("AV6. 가드 — 키가 없는 내장 u00 · u01은 counterpartAvatar가 없다", () => {
    for (const wire of [u00, u01]) {
      const result = decodeEpisode(wire);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.episode).not.toHaveProperty("counterpartAvatar");
    }
  });
});

describe("자산 목록의 counterpart_avatar", () => {
  test("AV7. 아바타 경로가 content/를 뗀 모양으로 한 번 들어가고 다른 목록은 그대로다", () => {
    const base = episodeAssetPaths(u00);
    const withPath = episodeAssetPaths(withAvatar("content/images/avatars/u00.webp"));

    expect(withPath.filter((path) => path === "images/avatars/u00.webp")).toHaveLength(1);
    expect(withPath.filter((path) => path !== "images/avatars/u00.webp")).toEqual(base);
  });

  test("AV7. 어긋난 값이나 없음은 목록에 들어가지 않는다", () => {
    const base = episodeAssetPaths(u00);

    expect(episodeAssetPaths(withAvatar("images/a.gif"))).toEqual(base);
    expect(episodeAssetPaths(withAvatar("/abs.webp"))).toEqual(base);
    expect(episodeAssetPaths(withAvatar(null))).toEqual(base);
    expect(episodeAssetPaths(withAvatar(""))).toEqual(base);
  });
});

describe("내장 그림 표 가드", () => {
  test("AV-BI3. 내장 u00 본문의 모든 그림 경로(아바타 포함)가 내장 표에서 풀린다", () => {
    const images = episodeAssetPaths(u00).filter((path) => path.startsWith("images/"));

    expect(images.length).toBeGreaterThan(0);
    for (const path of images) {
      expect(bundledContentImageUrl(path), path).not.toBeNull();
    }
  });
});
