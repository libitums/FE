import { expect, test } from "vitest";

import { uiCopyFor } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";
import { uiCopyJa } from "./ui-copy-ja";

// `unit` 계층: 일본어 문구표(ADR-0098) — 영어와 같은 모양의 완전한 표. 모양 자체는 `UiCopy` 타입이 잡고,
// 여기서는 값이 비지 않았는지와 번역이 실제로 들었는지를 본다.

type Leaf = { path: string; value: unknown };

function leavesOf(node: unknown, path = ""): Leaf[] {
  if (node !== null && typeof node === "object" && !Array.isArray(node)) {
    return Object.entries(node as Record<string, unknown>).flatMap(([key, child]) =>
      leavesOf(child, path === "" ? key : `${path}.${key}`),
    );
  }
  if (Array.isArray(node)) return node.flatMap((child, i) => leavesOf(child, `${path}[${i}]`));
  return [{ path, value: node }];
}

const valueAt = (root: unknown, path: string): unknown =>
  path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], root);

test("JA1. uiCopyFor('ja')는 일본어 표다", () => {
  expect(uiCopyFor("ja")).toBe(uiCopyJa);
});

test("JA2. 모든 잎이 영어와 같은 종류이고, 문자열은 비지 않았다", () => {
  for (const { path, value } of leavesOf(uiCopyJa)) {
    const english = valueAt(uiCopyEn, path);
    expect(typeof value, path).toBe(typeof english);
    if (typeof value === "string" && english !== "")
      expect(value.trim().length, path).toBeGreaterThan(0);
  }
});

test("JA3. 영어와 같은 문자열은 고유 명사 · 기호 정도만 — 번역이 실제로 들었다", () => {
  const strings = leavesOf(uiCopyJa).filter(
    (leaf): leaf is { path: string; value: string } =>
      typeof leaf.value === "string" && leaf.value.trim() !== "",
  );
  const same = strings.filter(({ path, value }) => valueAt(uiCopyEn, path) === value);
  expect(same.length / strings.length).toBeLessThan(0.1);
});

test("JA4. 스텝 말풍선 제목은 일본어에서 줄을 바꿔 제목을 둘째 줄에 두고, 영어는 지금처럼 콜론 · 따옴표다", () => {
  expect(uiCopyJa.catalogMap.sheetHeading("レッスン1", "チュートリアル")).toBe(
    "レッスン1\nチュートリアル",
  );
  expect(uiCopyEn.catalogMap.sheetHeading("Lesson 1", "Tutorial")).toBe("Lesson 1: “Tutorial”");
});
