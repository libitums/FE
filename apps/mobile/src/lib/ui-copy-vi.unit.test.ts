import { expect, test } from "vitest";

import { uiCopyFor } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";
import {
  messengerChatKeyPaths,
  messengerChatProblems,
} from "./ui-copy-messenger-chat.test-support";
import { uiCopyVi } from "./ui-copy-vi";

// `unit` 계층: 베트남어 문구표(ADR-0091 D3) — 영어와 같은 모양의 완전한 표. 모양 자체는 `UiCopy` 타입이 잡고,
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

test("VI1. uiCopyFor('vi')는 베트남어 표다", () => {
  expect(uiCopyFor("vi")).toBe(uiCopyVi);
});

test("VI2. 모든 잎이 영어와 같은 종류이고, 문자열은 비지 않았다", () => {
  for (const { path, value } of leavesOf(uiCopyVi)) {
    const english = valueAt(uiCopyEn, path);
    expect(typeof value, path).toBe(typeof english);
    if (typeof value === "string" && english !== "")
      expect(value.trim().length, path).toBeGreaterThan(0);
  }
});

test("VI3. 영어와 같은 문자열은 고유 명사 · 기호 정도만 — 번역이 실제로 들었다", () => {
  const strings = leavesOf(uiCopyVi).filter(
    (leaf): leaf is { path: string; value: string } =>
      typeof leaf.value === "string" && leaf.value.trim() !== "",
  );
  const same = strings.filter(({ path, value }) => valueAt(uiCopyEn, path) === value);
  expect(same.length / strings.length).toBeLessThan(0.1);
});

test("MC-U28. vi messengerChat 의 키 집합이 영어와 같고 함수 키가 빈 문자열을 내지 않으며 한글이 없다", () => {
  expect(messengerChatKeyPaths(uiCopyEn).length).toBeGreaterThan(0);
  expect(messengerChatKeyPaths(uiCopyVi)).toEqual(messengerChatKeyPaths(uiCopyEn));
  expect(messengerChatProblems(uiCopyVi, uiCopyEn)).toEqual([]);
});

test("MC-U28. vi 탭 이름에 메신저가 있고 비지 않았다", () => {
  const label = uiCopyVi.shell.tabs as unknown as Record<string, string>;
  expect(typeof label.messenger).toBe("string");
  expect((label.messenger ?? "").trim().length).toBeGreaterThan(0);
  expect(label.messenger).not.toBe(label.journey);
});
