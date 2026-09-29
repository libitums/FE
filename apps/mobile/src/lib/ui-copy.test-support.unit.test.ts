import { expect, test } from "vitest";

import { uiCopyEn } from "./ui-copy-en";
import { markedUiCopy, markUiCopy } from "./ui-copy.test-support";

type Leaf = { readonly path: string; readonly value: string | ((...args: never[]) => unknown) };

function leavesOf(node: unknown, path = ""): Leaf[] {
  if (typeof node === "string" || typeof node === "function") {
    return [{ path, value: node as Leaf["value"] }];
  }
  if (node === null || typeof node !== "object") {
    return [];
  }
  return Object.entries(node).flatMap(([key, child]) =>
    leavesOf(child, path === "" ? key : `${path}.${key}`),
  );
}

test("UM1. markUiCopy의 문자열 잎이 전부 ⟦경로⟧ 모양이다", () => {
  const marked = markUiCopy(uiCopyEn);
  const strings = leavesOf(marked).filter((leaf) => typeof leaf.value === "string");
  expect(strings.length).toBeGreaterThan(0);
  for (const leaf of strings) {
    expect(leaf.value, leaf.path).toBe(`⟦${leaf.path}⟧`);
  }
  expect(marked.common.next).toBe("⟦common.next⟧");
});

test("UM1. markUiCopy의 함수 잎이 ⟦경로⟧(인자)를 낸다", () => {
  const marked = markUiCopy(uiCopyEn);
  expect(marked.common.count.gems(5)).toBe("⟦common.count.gems⟧(5)");
  expect(marked.journeyMap.activityCount(1, 4)).toMatch(/^⟦journeyMap\.activityCount⟧\(1,\s?4\)$/);
});

test("UM1. 문자열 잎 개수가 영어 표와 같고 영어 문구가 한 줄도 남지 않는다", () => {
  const marked = markUiCopy(uiCopyEn);
  const englishStrings = leavesOf(uiCopyEn).filter((leaf) => typeof leaf.value === "string");
  const markedStrings = leavesOf(marked).filter((leaf) => typeof leaf.value === "string");
  expect(markedStrings.length).toBe(englishStrings.length);
  expect(leavesOf(marked).length).toBe(leavesOf(uiCopyEn).length);

  const nonEmptyEnglish = new Set(
    englishStrings.map((leaf) => leaf.value as string).filter((text) => text !== ""),
  );
  for (const leaf of markedStrings) {
    expect(nonEmptyEnglish.has(leaf.value as string), leaf.path).toBe(false);
  }
});

test("UM1. markedUiCopy는 영어 표와 다른 표시 표다", () => {
  expect(markedUiCopy).not.toBe(uiCopyEn);
  expect(markedUiCopy.common.next).toBe("⟦common.next⟧");
});
