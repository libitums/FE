import { describe, expect, test } from "vitest";

import { getPageIndicatorModel, PAGE_INDICATOR_MAX_PAGE_COUNT } from "./index";

describe("getPageIndicatorModel", () => {
  test.each([
    [{ pageCount: 0, currentPage: 0 }, 0, 0, null],
    [{ pageCount: 1, currentPage: 1 }, 1, 1, "Scene 1 of 1"],
    [{ pageCount: 4, currentPage: 1 }, 4, 1, "Scene 1 of 4"],
    [{ pageCount: 4, currentPage: 2 }, 4, 2, "Scene 2 of 4"],
    [{ pageCount: 4, currentPage: 4 }, 4, 4, "Scene 4 of 4"],
    [{ pageCount: 5, currentPage: 3 }, 5, 3, "Scene 3 of 5"],
    [{ pageCount: 6, currentPage: 6 }, 6, 6, "Scene 6 of 6"],
  ] as const)("normalizes representative page states", (input, pageCount, currentPage, label) => {
    const model = getPageIndicatorModel(input);
    expect(model.pageCount).toBe(pageCount);
    expect(model.currentPage).toBe(currentPage);
    expect(model.accessibilityLabel).toBe(label);
    expect(model.shouldRender).toBe(pageCount > 0);
  });

  test.each([
    [{ pageCount: -2, currentPage: 1 }, 0, 0],
    [{ pageCount: 3.9, currentPage: 1.9 }, 3, 1],
    [{ pageCount: 3, currentPage: -4 }, 3, 1],
    [{ pageCount: 3, currentPage: 99 }, 3, 3],
    [{ pageCount: 3, currentPage: Number.NaN }, 3, 1],
    [{ pageCount: 10_000, currentPage: 5_000 }, PAGE_INDICATOR_MAX_PAGE_COUNT, 100],
    [{ pageCount: Number.POSITIVE_INFINITY, currentPage: 2 }, 0, 0],
    [{ pageCount: Number.NEGATIVE_INFINITY, currentPage: Number.NaN }, 0, 0],
  ] as const)(
    "truncates, clamps, and handles non-finite inputs",
    (input, pageCount, currentPage) => {
      const model = getPageIndicatorModel(input);
      expect(model.pageCount).toBe(pageCount);
      expect(model.currentPage).toBe(currentPage);
    },
  );

  test.each([1, 2, 5, 6, 10])(
    "derives one item per canonical page and exactly one current item (%i)",
    (pageCount) => {
      const model = getPageIndicatorModel({ pageCount, currentPage: Math.ceil(pageCount / 2) });
      expect(model.items).toHaveLength(pageCount);
      expect(model.items.map((item) => item.page)).toEqual(
        Array.from({ length: pageCount }, (_, index) => index + 1),
      );
      expect(model.items.filter((item) => item.isCurrent)).toHaveLength(1);
      expect(model.items.find((item) => item.isCurrent)?.page).toBe(model.currentPage);
    },
  );

  test("uses the canonical item position and count for the spoken label", () => {
    const model = getPageIndicatorModel({ pageCount: 4.8, currentPage: 20 });
    expect(model.accessibilityLabel).toBe(`Scene ${model.currentPage} of ${model.pageCount}`);
  });

  test("caps an excessive page count before deriving render items", () => {
    const model = getPageIndicatorModel({ pageCount: 10_000, currentPage: 10_000 });

    expect(model.pageCount).toBe(PAGE_INDICATOR_MAX_PAGE_COUNT);
    expect(model.currentPage).toBe(PAGE_INDICATOR_MAX_PAGE_COUNT);
    expect(model.items).toHaveLength(PAGE_INDICATOR_MAX_PAGE_COUNT);
    expect(model.accessibilityLabel).toBe("Scene 100 of 100");
  });
});
