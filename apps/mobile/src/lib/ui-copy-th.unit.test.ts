import { expect, test } from "vitest";

import { uiCopyFor } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";
import {
  messengerChatKeyPaths,
  messengerChatProblems,
} from "./ui-copy-messenger-chat.test-support";
import { uiCopyTh } from "./ui-copy-th";
import { scriptLeaves } from "./ui-copy-script.test-support";

// `unit` 계층(TM-U1 ~ U5): 태국어 문구표(ADR-0158 개정 2026-11-20) — 영어와 같은 모양의 완전한 표. 모양 자체는 `UiCopy` 타입이
// 잡고, 여기서는 값이 비지 않았는지 · 번역이 실제로 들었는지 · 타이 문자인지 · 엽전 묶음 기호를 본다.

const THAI = /[฀-๿]/u;
const { strings, english, sameAsEnglish } = scriptLeaves(uiCopyTh, uiCopyEn);

test("TM-U1. uiCopyFor('th')는 태국어 표이고 영어 표가 아니다", () => {
  expect(uiCopyFor("th")).toBe(uiCopyTh);
  expect(uiCopyFor("th")).not.toBe(uiCopyEn);
});

test("TM-U2. 모든 잎이 영어와 같은 종류이고, 문자열은 비지 않았다", () => {
  for (const { path, value } of strings) {
    expect(typeof value, path).toBe(typeof english(path));
    if (english(path) !== "") expect(value.trim().length, path).toBeGreaterThan(0);
  }
});

test("TM-U3. 영어와 같은 문자열은 고유 명사 · 기호 정도만이고, 대부분의 문자열에 타이 문자가 있다", () => {
  expect(sameAsEnglish.length / strings.length).toBeLessThan(0.1);
  const thai = strings.filter(({ value }) => THAI.test(value));
  expect(thai.length / strings.length).toBeGreaterThan(0.85);
});

test("TM-U4. 엽전 수의 세 자리 묶음 기호는 쉼표다", () => {
  expect(uiCopyTh.coinShop.digitSeparator).toBe(",");
  expect(uiCopyTh.learnerProfile.language).toBe("th");
});

test("TM-U5. th messengerChat 의 키 집합이 영어와 같고 함수 키가 빈 문자열을 내지 않으며 한글이 없다", () => {
  expect(messengerChatKeyPaths(uiCopyTh)).toEqual(messengerChatKeyPaths(uiCopyEn));
  expect(messengerChatProblems(uiCopyTh, uiCopyEn)).toEqual([]);
});
