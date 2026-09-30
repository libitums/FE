// 테스트 지원 — 모든 잎을 `⟦경로⟧`로 바꾼 문구표입니다. 제품 코드는 import하지 않습니다.
// 화면이 영어를 하드코딩하면 이 표를 넣었을 때 화면에 영어가 남아 잡힙니다.

import type { UiCopy } from "./ui-copy.contract";
import { uiCopyEn } from "./ui-copy-en";

function mark(node: unknown, path: string): unknown {
  if (typeof node === "string") {
    return `⟦${path}⟧`;
  }
  if (typeof node === "function") {
    return (...args: unknown[]) => `⟦${path}⟧(${args.map(String).join(", ")})`;
  }
  if (node === null || typeof node !== "object") {
    return node;
  }
  return Object.fromEntries(
    Object.entries(node).map(([key, child]) => [
      key,
      mark(child, path === "" ? key : `${path}.${key}`),
    ]),
  );
}

export function markUiCopy(copy: UiCopy): UiCopy {
  return mark(copy, "") as UiCopy;
}

export const markedUiCopy: UiCopy = markUiCopy(uiCopyEn);
