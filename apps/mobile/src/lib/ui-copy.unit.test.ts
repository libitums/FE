import { expect, test } from "vitest";

import type { UiCopyOverrides } from "./ui-copy.contract";
import { uiCopyCatalog, uiCopyFor, uiCopyWithOverrides } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";

const languages = ["en", "vi", "es", "ja"] as const;
const sampleArgs: readonly unknown[] = [0, 1, 5, "x", true];

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

function at(node: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((current, key) => (current as Record<string, unknown>)[key], node);
}

function callWith(fn: unknown, arg: unknown): unknown {
  return (fn as (...args: unknown[]) => unknown)(arg, arg, arg, arg);
}

// 문자열 잎만 모은 사본 — 함수는 비교 · 복제할 수 없어 따로 봅니다.
function stringLeaves(node: unknown): Record<string, string> {
  return Object.fromEntries(
    leavesOf(node)
      .filter((leaf) => typeof leaf.value === "string")
      .map((leaf) => [leaf.path, leaf.value as string]),
  );
}

test("UC1. uiCopyFor('en')은 uiCopyEn과 참조가 같다", () => {
  expect(uiCopyFor("en")).toBe(uiCopyEn);
});

test("UC1. uiCopyFor는 언어마다 두 번 불러도 같은 객체를 낸다", () => {
  for (const language of languages) {
    expect(() => uiCopyFor(language)).not.toThrow();
    expect(uiCopyFor(language)).toBe(uiCopyFor(language));
  }
});

test("UC2. 덮어쓰기가 비어 있는 vi · es · ja는 문자열 잎이 전부 영어와 같다", () => {
  const english = stringLeaves(uiCopyEn);
  expect(Object.keys(english).length).toBeGreaterThan(0);
  for (const language of ["vi", "es", "ja"] as const) {
    expect(stringLeaves(uiCopyFor(language))).toEqual(english);
  }
});

test("UC2. 덮어쓰기가 비어 있는 vi · es · ja는 함수 잎이 같은 인자에 영어와 같은 결과를 낸다", () => {
  const functions = leavesOf(uiCopyEn).filter((leaf) => typeof leaf.value === "function");
  expect(functions.length).toBeGreaterThan(0);
  for (const language of ["vi", "es", "ja"] as const) {
    const table = uiCopyFor(language);
    for (const leaf of functions) {
      const other = at(table, leaf.path);
      expect(typeof other, `${language}:${leaf.path}`).toBe("function");
      for (const arg of sampleArgs) {
        expect(callWith(other, arg), `${language}:${leaf.path}(${String(arg)})`).toEqual(
          callWith(leaf.value, arg),
        );
      }
    }
  }
});

test("UC3. 문자열 덮어쓰기는 그 키만 바꾸고 나머지는 영어다", () => {
  const result = uiCopyWithOverrides(uiCopyEn, { common: { next: "N" } });
  expect(result.common.next).toBe("N");
  expect(result.common.close).toBe(uiCopyEn.common.close);
  expect(result.shell.tabs.journey).toBe(uiCopyEn.shell.tabs.journey);
  const rest = stringLeaves(result);
  const english = stringLeaves(uiCopyEn);
  delete rest["common.next"];
  delete english["common.next"];
  expect(rest).toEqual(english);
});

test("UC3. 함수 덮어쓰기는 그 함수만 바꾼다", () => {
  const overrides: UiCopyOverrides = { common: { count: { gems: (n) => `g${n}` } } };
  const result = uiCopyWithOverrides(uiCopyEn, overrides);
  expect(result.common.count.gems(2)).toBe("g2");
  expect(result.common.count.trophies).toBe(uiCopyEn.common.count.trophies);
});

test("UC3. 값이 undefined인 키는 영어로 남는다", () => {
  const result = uiCopyWithOverrides(uiCopyEn, { common: { next: undefined } });
  expect(result.common.next).toBe(uiCopyEn.common.next);
});

test("UC3. 덮어쓰기 {}는 영어와 문자열 잎이 전부 같다", () => {
  expect(stringLeaves(uiCopyWithOverrides(uiCopyEn, {}))).toEqual(stringLeaves(uiCopyEn));
});

test("UC3. 입력 둘을 바꾸지 않고 던지지 않는다", () => {
  const gems = (n: number) => `g${n}`;
  const overrides: UiCopyOverrides = { common: { next: "N", count: { gems } } };
  const baseStrings = stringLeaves(uiCopyEn);
  const baseGems = uiCopyEn.common.count.gems;
  const overrideStrings = stringLeaves(overrides);

  expect(() => uiCopyWithOverrides(uiCopyEn, overrides)).not.toThrow();

  expect(stringLeaves(uiCopyEn)).toEqual(baseStrings);
  expect(uiCopyEn.common.count.gems).toBe(baseGems);
  expect(stringLeaves(overrides)).toEqual(overrideStrings);
  expect(overrides.common?.count?.gems).toBe(gems);
});

test("UC4. uiCopyCatalog의 키 집합이 정확히 en · es · ja · vi이고 en이 uiCopyEn이다", () => {
  expect(Object.keys(uiCopyCatalog).sort()).toEqual(["en", "es", "ja", "vi"]);
  expect(uiCopyCatalog.en).toBe(uiCopyEn);
});
