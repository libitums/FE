import { expect, test } from "vitest";

import { uiCopyFor } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";
import {
  messengerChatKeyPaths,
  messengerChatProblems,
} from "./ui-copy-messenger-chat.test-support";
import { uiCopyMy } from "./ui-copy-my";
import { scriptLeaves } from "./ui-copy-script.test-support";

// `unit` 계층(TM-U6 ~ U11): 미얀마어 문구표(ADR-0158 개정 2026-11-20) — 영어와 같은 모양의 완전한 표. 유니코드 미얀마 문자만 쓰고
// Zawgyi 꼴(모음 ေ · 받침 ြ를 자음 앞에 저장, 미얀마 확장 블록의 겹자 글리프)을 쓰지 않는다.

const MYANMAR = /[က-၏]/u;
// Zawgyi 판별 — 단어 첫머리의 ေ(U+1031) · ြ(U+103C), Zawgyi가 겹자 글리프로 쓰던 U+1060 ~ U+1097(버마어 본문에는 나오지 않음).
const ZAWGYI = /(^|[\s(«“"'·,.!?:;\-—–၊။])[ေြ]|[ၠ-႗]/u;
const { strings, english, sameAsEnglish } = scriptLeaves(uiCopyMy, uiCopyEn);

test("TM-U6. uiCopyFor('my')는 미얀마어 표이고 영어 표가 아니다", () => {
  expect(uiCopyFor("my")).toBe(uiCopyMy);
  expect(uiCopyFor("my")).not.toBe(uiCopyEn);
});

test("TM-U7. 모든 잎이 영어와 같은 종류이고, 문자열은 비지 않았다", () => {
  for (const { path, value } of strings) {
    expect(typeof value, path).toBe(typeof english(path));
    if (english(path) !== "") expect(value.trim().length, path).toBeGreaterThan(0);
  }
});

test("TM-U8. 영어와 같은 문자열은 고유 명사 · 기호 정도만이고, 대부분의 문자열에 미얀마 문자가 있다", () => {
  expect(sameAsEnglish.length / strings.length).toBeLessThan(0.1);
  const burmese = strings.filter(({ value }) => MYANMAR.test(value));
  expect(burmese.length / strings.length).toBeGreaterThan(0.85);
});

test("TM-U9. Zawgyi 꼴이 없다(유니코드 미얀마 문자만)", () => {
  const zawgyi = strings.filter(({ value }) => ZAWGYI.test(value)).map(({ path }) => path);
  expect(zawgyi).toEqual([]);
});

test("TM-U10. 엽전 수의 세 자리 묶음 기호는 쉼표다", () => {
  expect(uiCopyMy.coinShop.digitSeparator).toBe(",");
  expect(uiCopyMy.learnerProfile.language).toBe("my");
});

test("TM-U12. 맵 머리 이름은 에피소드 이름 끝의 ။를 떼고 이어 붙인다 — 마침표 · 쉼표가 겹치지 않는다(접근성 점검 2026-11-20)", () => {
  const label = uiCopyMy.journeyMap.episodeUnitLabel(uiCopyMy.catalogMap.episodeLabel(3), 1);
  expect(label).toBe("အပိုင်း 3၊ အပိုင်းခွဲ 01");
});

test("TM-U13. 티켓 칸 낭독은 분수(2/3) 대신 「3장 중 2장」 꼴이다(th · my)", () => {
  expect(uiCopyMy.tickets.modal.slotsLabel(2, 3, null)).not.toContain("/");
  expect(uiCopyFor("th").tickets.modal.slotsLabel(2, 3, "12:00")).not.toContain("/");
});

test("TM-U11. my messengerChat 의 키 집합이 영어와 같고 함수 키가 빈 문자열을 내지 않으며 한글이 없다", () => {
  expect(messengerChatKeyPaths(uiCopyMy)).toEqual(messengerChatKeyPaths(uiCopyEn));
  expect(messengerChatProblems(uiCopyMy, uiCopyEn)).toEqual([]);
});
