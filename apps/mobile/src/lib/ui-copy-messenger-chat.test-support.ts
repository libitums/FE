// 테스트 지원 — 메신저 채팅 문구(`UiCopy.messengerChat`)의 공통 점검입니다(MC-U28). 제품 코드는 이 파일을
// import하지 않고, 점검 결과는 문제 목록으로만 돌려줍니다(빈 목록 = 통과).

import type { UiCopy } from "./ui-copy.contract";

type Walked = { readonly path: string; readonly value: unknown };

function walk(node: unknown, path: string): Walked[] {
  if (typeof node === "string" || typeof node === "function") return [{ path, value: node }];
  if (node === null || typeof node !== "object") return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, child]) =>
    walk(child, path === "" ? key : `${path}.${key}`),
  );
}

const messengerChatOf = (copy: UiCopy): unknown =>
  (copy as unknown as { messengerChat?: unknown }).messengerChat;

/** 함수 잎에 줄 표본 인자 두 벌입니다. 모양이 맞지 않는 인자여도 빈 문자열은 나오면 안 됩니다. */
const sampleArgSets: readonly (readonly unknown[])[] = [
  ["Mina", "0:04", "ko", "en"],
  [5, 12, 3, 1],
];

// 한글 범위(자모 + 음절). 소스에 한글을 적지 않으려고 코드 포인트로 만든다.
const hangul = new RegExp("[\\u3131-\\u318e\\uac00-\\ud7a3]");
// 큰따옴표 「」 안은 허용(lint 규칙 hangulOutsideCornerQuotes와 같은 뜻).
const outsideCornerQuotes = (text: string): string => text.replace(/「[^」]*」/g, "");

/** 이 언어 표의 messengerChat 잎 경로 집합입니다(영어 키 집합과 견주는 데 씁니다). */
export function messengerChatKeyPaths(copy: UiCopy): readonly string[] {
  return walk(messengerChatOf(copy), "")
    .map((leaf) => leaf.path)
    .sort();
}

/** 문구표 하나의 messengerChat 문제 목록입니다. */
export function messengerChatProblems(copy: UiCopy, english: UiCopy): readonly string[] {
  const problems: string[] = [];
  const leaves = walk(messengerChatOf(copy), "");
  if (leaves.length === 0) return ["messengerChat 이 없다"];

  const expected = new Set(messengerChatKeyPaths(english));
  const actual = new Set(leaves.map((leaf) => leaf.path));
  for (const path of expected) if (!actual.has(path)) problems.push(`빠진 키: ${path}`);
  for (const path of actual) if (!expected.has(path)) problems.push(`남는 키: ${path}`);

  for (const { path, value } of leaves) {
    const outputs: string[] =
      typeof value === "function"
        ? sampleArgSets.map((args) => String((value as (...a: unknown[]) => unknown)(...args)))
        : [String(value)];
    for (const output of outputs) {
      if (output === "" && typeof value === "function") problems.push(`빈 문자열 출력: ${path}`);
      if (hangul.test(outsideCornerQuotes(output))) problems.push(`한글 포함: ${path}`);
    }
  }
  return problems;
}
