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

test("UC2. 빈 덮어쓰기는(다섯 언어 모두 완전한 표, ADR-0098 D3) 문자열 잎이 전부 영어와 같다", () => {
  const english = stringLeaves(uiCopyEn);
  expect(Object.keys(english).length).toBeGreaterThan(0);
  {
    expect(stringLeaves(uiCopyWithOverrides(uiCopyEn, {}))).toEqual(english);
  }
});

test("UC2. 빈 덮어쓰기는(다섯 언어 모두 완전한 표, ADR-0098 D3) 함수 잎이 같은 인자에 영어와 같은 결과를 낸다", () => {
  const functions = leavesOf(uiCopyEn).filter((leaf) => typeof leaf.value === "function");
  expect(functions.length).toBeGreaterThan(0);
  {
    const table = uiCopyWithOverrides(uiCopyEn, {});
    for (const leaf of functions) {
      const other = at(table, leaf.path);
      expect(typeof other, leaf.path).toBe("function");
      for (const arg of sampleArgs) {
        expect(callWith(other, arg), `${leaf.path}(${String(arg)})`).toEqual(
          callWith(leaf.value, arg),
        );
      }
    }
  }
});

test("UC2. 말하기 두 구획의 다섯 키는 빈 덮어쓰기에서 영어로 채워진다", () => {
  {
    const table = uiCopyWithOverrides(uiCopyEn, {});
    expect(table.readAloud).not.toHaveProperty("badge");
    expect(table.readAloud.matched(2, 5)).toBe("You said the first 2 of 5 words.");
    expect(table.readAloud.pronunciation("kadeu")).toBe("Pronunciation: kadeu");
    expect(table.speakWord.instruction).toBe(uiCopyEn.speakWord.instruction);
    expect(table.speakWord.recognitionUnavailable).toBe(uiCopyEn.speakWord.recognitionUnavailable);
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
  const overrides: UiCopyOverrides = { common: { count: { coins: (n) => `g${n}` } } };
  const result = uiCopyWithOverrides(uiCopyEn, overrides);
  expect(result.common.count.coins(2)).toBe("g2");
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
  const coins = (n: number) => `g${n}`;
  const overrides: UiCopyOverrides = { common: { next: "N", count: { coins } } };
  const baseStrings = stringLeaves(uiCopyEn);
  const baseCoins = uiCopyEn.common.count.coins;
  const overrideStrings = stringLeaves(overrides);

  expect(() => uiCopyWithOverrides(uiCopyEn, overrides)).not.toThrow();

  expect(stringLeaves(uiCopyEn)).toEqual(baseStrings);
  expect(uiCopyEn.common.count.coins).toBe(baseCoins);
  expect(stringLeaves(overrides)).toEqual(overrideStrings);
  expect(overrides.common?.count?.coins).toBe(coins);
});

test("UC4. uiCopyCatalog의 키 집합이 정확히 en · es · id · ja · vi이고 en이 uiCopyEn이다", () => {
  expect(Object.keys(uiCopyCatalog).sort()).toEqual(["en", "es", "id", "ja", "vi"]);
  expect(uiCopyCatalog.en).toBe(uiCopyEn);
});

test("JS4. specialUnitMap은 빈 덮어쓰기에서 영어로 채워진다", () => {
  {
    const table = uiCopyWithOverrides(uiCopyEn, {});
    expect(table.specialUnitMap.accessibilityLabel("x")).toBe("special, x");
  }
});
