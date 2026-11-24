import { expect, test } from "vitest";

import { uiCopyFor } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";
import {
  messengerChatKeyPaths,
  messengerChatProblems,
} from "./ui-copy-messenger-chat.test-support";
import { scriptLeaves } from "./ui-copy-script.test-support";
import { uiCopyZhTw } from "./ui-copy-zh-tw";
import {
  fullWidthProblems,
  kanaIn,
  mainlandTermsIn,
  simplifiedOnlyIn,
} from "./ui-copy-zh-tw.test-support";

// `unit` 계층(ZT-U0 ~ U9): 대만 중국어(번체) 문구표(ADR-0185) — 영어와 같은 모양의 완전한 표. 모양 자체는 `UiCopy` 타입이 잡고,
// 여기서는 값이 비지 않았는지 · 번역이 실제로 들었는지 · 번체 · 대만 용어 · 전각 문장부호 · 엽전 묶음 기호를 본다.

const HAN = /[一-鿿]/u;
const { strings, english, sameAsEnglish } = scriptLeaves(uiCopyZhTw, uiCopyEn);

test("ZT-U0. 점검 도우미 자체가 간체 · 가나 · 대륙 용어 · 반각 문장부호를 잡고 바른 대만 번체는 통과시킨다", () => {
  expect(simplifiedOnlyIn("软件设置")).toEqual(["软", "设"]);
  expect(simplifiedOnlyIn("軟體設定，最划算的方案限制")).toEqual([]);
  expect(kanaIn("設定する")).toEqual(["す", "る"]);
  expect(mainlandTermsIn("請先登錄再看視頻")).toEqual(["視頻", "登錄"]);
  expect(fullWidthProblems("登入失敗.請再試一次!")).toEqual(["敗.", "次!"]);
  expect(fullWidthProblems("登入失敗。剩下3.5天")).toEqual([]);
});

test("ZT-U1.uiCopyFor('zh-TW')는 대만 중국어 표이고 영어 표가 아니다", () => {
  expect(uiCopyFor("zh-TW")).toBe(uiCopyZhTw);
  expect(uiCopyFor("zh-TW")).not.toBe(uiCopyEn);
});

test("ZT-U2. 모든 잎이 영어와 같은 종류이고, 문자열은 비지 않았다", () => {
  for (const { path, value } of strings) {
    expect(typeof value, path).toBe(typeof english(path));
    if (english(path) !== "") expect(value.trim().length, path).toBeGreaterThan(0);
  }
});

test("ZT-U3. 영어와 같은 문자열은 고유 명사 · 기호 정도만이고, 대부분의 문자열에 한자가 있다", () => {
  expect(sameAsEnglish.length / strings.length).toBeLessThan(0.1);
  const han = strings.filter(({ value }) => HAN.test(value));
  expect(han.length / strings.length).toBeGreaterThan(0.85);
});

test("ZT-U4. 간체 전용 글자 · 일본 가나 · 대륙 용어가 없다", () => {
  const found = strings.flatMap(({ path, value }) => [
    ...simplifiedOnlyIn(value).map((ch) => `${path}: 간체 ${ch}`),
    ...kanaIn(value).map((ch) => `${path}: 가나 ${ch}`),
    ...mainlandTermsIn(value).map((term) => `${path}: 대륙 용어 ${term}`),
  ]);
  expect(found).toEqual([]);
});

test("ZT-U5. 한자 바로 뒤 문장부호는 전각이다(，。！？：；)", () => {
  const found = strings.flatMap(({ path, value }) =>
    fullWidthProblems(value).map((bit) => `${path}: ${bit}`),
  );
  expect(found).toEqual([]);
});

test("ZT-U6. 엽전 수의 세 자리 묶음 기호는 쉼표이고 학습자 프로필 언어는 zh-TW다", () => {
  expect(uiCopyZhTw.coinShop.digitSeparator).toBe(",");
  expect(uiCopyZhTw.learnerProfile.language).toBe("zh-TW");
});

// 접근성 점검 2026-11-24(Major): 중국어 TTS는 「2/3」를 분수(三分之二)나 날짜(2月3日)로 읽는다. 낭독되는 글은 「第N…，共M…」로 풀어 쓴다.
// 낭독 라벨이 따로 있거나 낭독에서 빠진 보이는 숫자만 뺀다 — activityCount(→ activityProgressLabel) · pairMatch.progress(→ progressLabel) ·
// cultureCard.counter(accessibility-element={false}).
const SLASH_FRACTION_ALLOWED = new Set([
  "journeyMap.activityCount()",
  "pairMatch.progress()",
  "cultureCard.counter()",
]);

test("ZT-U8. 낭독되는 글에 「N/M」 꼴 숫자가 없다 — 분수 · 날짜로 읽힌다", () => {
  const found = strings
    .filter(({ path }) => !SLASH_FRACTION_ALLOWED.has(path))
    .filter(({ value }) => /\d+\s*\/\s*\d+/u.test(value))
    .map(({ path, value }) => `${path}: ${value}`);
  expect(found).toEqual([]);
});

test("ZT-U9. 채팅 목록 줄 낭독은 전각 쉼표로 잇는다", () => {
  expect(uiCopyZhTw.messengerChat.list.rowLabel("Mina", "嗨", "10:00", "")).not.toContain(", ");
});

test("ZT-U7.zh-TW messengerChat 의 키 집합이 영어와 같고 함수 키가 빈 문자열을 내지 않으며 한글이 없다", () => {
  expect(messengerChatKeyPaths(uiCopyZhTw)).toEqual(messengerChatKeyPaths(uiCopyEn));
  expect(messengerChatProblems(uiCopyZhTw, uiCopyEn)).toEqual([]);
});
