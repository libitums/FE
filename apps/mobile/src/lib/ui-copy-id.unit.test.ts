import { expect, test } from "vitest";

import { uiCopyFor } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";
import { uiCopyId } from "./ui-copy-id";

// `unit` 계층: 인도네시아어 문구표(ADR-0093) — 영어와 같은 모양의 완전한 표. 모양 자체는 `UiCopy` 타입이 잡고,
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

test("ID1. uiCopyFor('vi')는 인도네시아어 표다", () => {
  expect(uiCopyFor("id")).toBe(uiCopyId);
});

test("ID2. 모든 잎이 영어와 같은 종류이고, 문자열은 비지 않았다", () => {
  for (const { path, value } of leavesOf(uiCopyId)) {
    const english = valueAt(uiCopyEn, path);
    expect(typeof value, path).toBe(typeof english);
    if (typeof value === "string" && english !== "")
      expect(value.trim().length, path).toBeGreaterThan(0);
  }
});

test("ID3. 영어와 같은 문자열은 고유 명사 · 기호 정도만 — 번역이 실제로 들었다", () => {
  const strings = leavesOf(uiCopyId).filter(
    (leaf): leaf is { path: string; value: string } =>
      typeof leaf.value === "string" && leaf.value.trim() !== "",
  );
  const same = strings.filter(({ path, value }) => valueAt(uiCopyEn, path) === value);
  expect(same.length / strings.length).toBeLessThan(0.1);
});
