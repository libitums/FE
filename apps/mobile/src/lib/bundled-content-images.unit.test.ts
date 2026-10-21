import { describe, expect, test } from "vitest";

import { bundledContentImageUrl, bundledContentImages } from "./bundled-content-images";

// `unit` 계층: 앱에 실은 콘텐츠 그림 표(버킷 상대 경로 → 번들 주소)의 입출력만 봅니다.

// 내장 u00 본문이 가리키는 그림 14장입니다 — 데이터와 표가 같이 움직이는지 보는 기준입니다.
const U00_IMAGE_PATHS = [
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

describe("bundledContentImages", () => {
  test("BI1. 표의 키는 u00 그림 14장과 같고 값은 비어 있지 않고 서로 다르다", () => {
    expect(new Set(Object.keys(bundledContentImages))).toEqual(new Set(U00_IMAGE_PATHS));
    const values = Object.values(bundledContentImages);
    expect(values).toHaveLength(14);
    for (const value of values) expect(value).not.toBe("");
    expect(new Set(values).size).toBe(14);
  });

  test("BI2. 표에 있는 경로는 표의 값을, 선두 content/ · 모르는 경로 · 빈 문자열은 null을 낸다", () => {
    const value = bundledContentImages["images/u00-tutorial/pre-1.webp"];
    expect(typeof value).toBe("string");
    expect(value).not.toBe("");
    expect(bundledContentImageUrl("images/u00-tutorial/pre-1.webp")).toBe(value);
    expect(bundledContentImageUrl("content/images/u00-tutorial/pre-1.webp")).toBeNull();
    expect(bundledContentImageUrl("images/u01-water/pre-1.jpg")).toBeNull();
    expect(bundledContentImageUrl("")).toBeNull();
    expect(bundledContentImageUrl("toString")).toBeNull();
  });
});
