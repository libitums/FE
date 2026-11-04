import { describe, expect, test, vi } from "vitest";

import { bundledContentImageUrl, bundledContentImages } from "./bundled-content-images";

// 실제 표를 봅니다 — `vitest.setup.ts`의 고정본 대역을 되돌립니다.
vi.unmock("./bundled-content-images");

// `unit` 계층: 앱에 실은 콘텐츠 그림 표(버킷 상대 경로 → 번들 주소)의 입출력만 봅니다.

// 내장 u00 본문이 가리키는 그림 15장(상대 아바타 포함 — 2026-11-03 staging본, level-3/ 경로)입니다 — 데이터와 표가 같이 움직이는지 보는 기준입니다.
const U00_IMAGE_PATHS = [
  "level-3/images/u00-tutorial/pre-1.webp",
  "level-3/images/u00-tutorial/pre-2.webp",
  "level-3/images/u00-tutorial/pre-3.webp",
  "level-3/images/u00-tutorial/pre-4.webp",
  "level-3/images/u00-tutorial/pre-5.webp",
  "level-3/images/u00-tutorial/pre-6.webp",
  "level-3/images/u00-tutorial/pre-7.webp",
  "level-3/images/u00-tutorial/post-1.webp",
  "level-3/images/u00-tutorial/post-2.webp",
  "level-3/images/u00-tutorial/post-3.webp",
  "level-3/images/u00-tutorial/post-4.webp",
  "level-3/images/u00-tutorial/cult-u00-jalhasineyo.webp",
  "level-3/images/u00-tutorial/rp-end.webp",
  "level-3/images/u00-tutorial/avatar.webp",
  "level-3/images/items/hello.webp",
];

// 표지 일러스트 — 내장 매니페스트 `cover`가 가리키는 경로(수준과 무관하게 `images/covers/`)입니다.
const COVER_PATHS = [
  "images/covers/u01-water.webp",
  "images/covers/u02-checkin.webp",
  "images/covers/u03-mina.webp",
  "images/covers/u04-directions.webp",
  "images/covers/u05-baekban.webp",
  "images/covers/u06-cafe.webp",
];

describe("bundledContentImages", () => {
  test("BI1. 표의 키는 u00 그림 15장 + 표지 6장과 같고 값은 비어 있지 않고 서로 다르다", () => {
    expect(new Set(Object.keys(bundledContentImages))).toEqual(
      new Set([...U00_IMAGE_PATHS, ...COVER_PATHS]),
    );
    const values = Object.values(bundledContentImages);
    expect(values).toHaveLength(21);
    for (const value of values) expect(value).not.toBe("");
    expect(new Set(values).size).toBe(21);
  });

  test("BI3. 표지 여섯은 표에 있고 webp 주소다", () => {
    for (const path of COVER_PATHS) {
      const value = bundledContentImageUrl(path);
      expect(typeof value).toBe("string");
      expect(value).toMatch(/\.webp$/);
    }
  });

  test("BI2. 표에 있는 경로는 표의 값을, 선두 content/ · 모르는 경로 · 빈 문자열은 null을 낸다", () => {
    const value = bundledContentImages["level-3/images/u00-tutorial/pre-1.webp"];
    expect(typeof value).toBe("string");
    expect(value).not.toBe("");
    expect(bundledContentImageUrl("level-3/images/u00-tutorial/pre-1.webp")).toBe(value);
    expect(bundledContentImageUrl("content/level-3/images/u00-tutorial/pre-1.webp")).toBeNull();
    expect(bundledContentImageUrl("images/u01-water/pre-1.jpg")).toBeNull();
    expect(bundledContentImageUrl("")).toBeNull();
    expect(bundledContentImageUrl("toString")).toBeNull();
  });
});
