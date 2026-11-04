import { describe, expect, test, vi } from "vitest";

import { catalogCoverIllustrationOf, coverIllustrationSideOf } from "./catalog-cover-illustration";

// `unit` 계층: 표지 일러스트의 순수 파생 — 홀짝 → 좌우, `cover` 경로 → 주소. 던지지 않습니다.

describe("coverIllustrationSideOf", () => {
  test.each([
    [0, "left"],
    [2, "left"],
    [10, "left"],
    [1, "right"],
    [3, "right"],
    [11, "right"],
  ] as const)("CI1. Episode %d → %s (짝수 왼쪽 · 홀수 오른쪽)", (ordinal, side) => {
    expect(coverIllustrationSideOf(ordinal)).toBe(side);
  });

  test("CI1. 소수는 정수부로, 음수도 홀짝으로 본다", () => {
    expect(coverIllustrationSideOf(2.9)).toBe("left");
    expect(coverIllustrationSideOf(3.2)).toBe("right");
    expect(coverIllustrationSideOf(-1)).toBe("right");
    expect(coverIllustrationSideOf(-2)).toBe("left");
  });
});

describe("catalogCoverIllustrationOf", () => {
  const url = (path: string) => `https://x.supabase.co/storage/v1/object/public/content/${path}`;

  test("CI2. cover가 없으면 null이고 주소 함수를 부르지 않는다", () => {
    const imageUrlOf = vi.fn(url);
    expect(catalogCoverIllustrationOf({ ordinal: 1 }, imageUrlOf)).toBeNull();
    expect(imageUrlOf).not.toHaveBeenCalled();
  });

  test("CI2. 주소를 만들 수 없으면(null) null이다", () => {
    expect(catalogCoverIllustrationOf({ ordinal: 1, cover: "../bad.webp" }, () => null)).toBeNull();
  });

  test("CI3. cover가 있고 주소가 나오면 { url, side } — 경로를 그대로 넘기고 side는 홀짝", () => {
    const imageUrlOf = vi.fn(url);
    expect(
      catalogCoverIllustrationOf(
        { ordinal: 2, cover: "images/covers/u02-checkin.webp" },
        imageUrlOf,
      ),
    ).toEqual({ url: url("images/covers/u02-checkin.webp"), side: "left" });
    expect(imageUrlOf).toHaveBeenCalledWith("images/covers/u02-checkin.webp");
    expect(
      catalogCoverIllustrationOf({ ordinal: 3, cover: "images/covers/u03-mina.webp" }, imageUrlOf),
    ).toEqual({ url: url("images/covers/u03-mina.webp"), side: "right" });
  });
});
