import { expect, test } from "vitest";

import { uiCopyEn } from "./ui-copy-en";

// `unit` 계층: 진행 불러오기 줄의 문구 키 셋입니다. 값의 최종본은 디자인이 정하므로 비지 않은
// 문자열인지만 봅니다.

test("CO1. progressLoad 키 셋이 비지 않은 문자열이다", () => {
  const copy: Readonly<Record<string, unknown>> = uiCopyEn.progressLoad;

  expect(Object.keys(copy).sort()).toEqual(["failed", "loading", "loadingAnnouncement", "retry"]);
  for (const value of Object.values(copy)) {
    expect(typeof value).toBe("string");
    expect((value as string).trim().length).toBeGreaterThan(0);
  }
});

test("CO1. 낭독용 로딩 문구는 화면 문구에서 말줄임표만 뺀 것이다", () => {
  const { loading, loadingAnnouncement } = uiCopyEn.progressLoad;

  expect(loadingAnnouncement).not.toContain("…");
  expect(loading.replace(/…$/, "")).toBe(loadingAnnouncement);
});
