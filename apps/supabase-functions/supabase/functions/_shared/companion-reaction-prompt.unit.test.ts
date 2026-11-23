import { expect, test } from "vitest";

import {
  includesWord,
  reactionDirective,
  reactionTextOf,
  reactionUserText,
  wordStemOf,
} from "./companion-reaction-prompt.ts";

// 내 스토리 반응 지시(ADR-0179) — 붙인 단어를 꼭 넣고, 짧게 한두 줄, 묻는 것은 하나까지. 단어가 들어갔는지는 어간으로 본다(활용형 허용).
const card = {
  kind: "card" as const,
  ko: "도착하다",
  roman: "dochakada",
  meaning: "to arrive",
  exampleKo: "서울에 도착했어!",
};

test("RP1. 지시 — 단어 · 뜻 · 예문을 싣고, 그 단어를 꼭 넣으라고 한다", () => {
  const directive = reactionDirective(card);
  expect(directive).toContain('"도착하다"');
  expect(directive).toContain("to arrive");
  expect(directive).toContain('"서울에 도착했어!"');
  expect(directive).toMatch(/must use the word "도착하다"/i);
  expect(directive).toMatch(/1 or 2 short lines/);
  const word = reactionDirective({ ...card, kind: "word", ko: "야근", exampleKo: null });
  expect(word).not.toContain("example sentence");
  expect(word).toContain("word card");
  expect(reactionUserText(card)).toContain("도착하다");
});

test("RP2. 어간 — '-하다' · '-다'를 떼고, 이름씨는 그대로", () => {
  expect(wordStemOf("도착하다")).toBe("도착");
  expect(wordStemOf("먹다")).toBe("먹");
  expect(wordStemOf("야근")).toBe("야근");
  expect(wordStemOf(" 창가 자리 ")).toBe("창가 자리");
  expect(wordStemOf("다")).toBe("다");
});

test("RP3. 단어가 들어갔는가 — 활용형 · 띄어쓰기 차이 허용, 없으면 거짓", () => {
  expect(includesWord("드디어 도착했구나! 축하해", "도착하다")).toBe(true);
  expect(includesWord("야근 끝나면 라면 먹어!", "야근")).toBe(true);
  expect(includesWord("창가자리 좋지", "창가 자리")).toBe(true);
  expect(includesWord("수고했어!", "야근")).toBe(false);
});

test("RP3b. 줄어든 · 불규칙 활용형도 받는다(앞 음절은 초성 · 모음, 끝 음절은 초성), 한 음절 어간은 모음이 맞고 뒤에 글자가 붙어야 한다", () => {
  expect(includesWord("어제 학교에 갔어?", "가다")).toBe(true);
  expect(includesWord("나도 그 영화 봤어", "보다")).toBe(true);
  expect(includesWord("한국어 같이 배워 보자", "배우다")).toBe(true);
  expect(includesWord("커피 마셔!", "마시다")).toBe(true);
  expect(includesWord("조금만 기다려 줘", "기다리다")).toBe(true);
  expect(includesWord("진짜 예뻐!", "예쁘다")).toBe(true);
  expect(includesWord("오늘 너무 추워", "춥다")).toBe(true);
  expect(includesWord("이 노래 들어 봐", "듣다")).toBe(true);
  expect(includesWord("나도 잘 몰라", "모르다")).toBe(true);
  // 한 음절 어간이 조사 · 다른 낱말 한 글자에 걸리지 않는다.
  expect(includesWord("친구가 왔어", "가다")).toBe(false);
  expect(includesWord("고마워!", "가다")).toBe(false);
  expect(includesWord("그거 보고 싶다", "가다")).toBe(false);
  // 이름씨는 그대로(띄어쓰기만 무시).
  expect(includesWord("야간 근무 끝!", "야근")).toBe(false);
});

test("RP4. 반응 글 — 말(speech)만 이어 붙이고, 행동 · 상태는 뺀다", () => {
  expect(
    reactionTextOf([
      { kind: "action", text: "웃는다" },
      { kind: "speech", text: "야근 끝나면" },
      { kind: "speech", text: "라면 먹어!" },
    ]),
  ).toBe("야근 끝나면 라면 먹어!");
  expect(reactionTextOf([{ kind: "action", text: "웃는다" }])).toBe("");
});

test("RP3c. 「-하다」는 띄어 써도 이름씨 부분이 있으면 받는다(재리뷰 m-a)", () => {
  expect(includesWord("드디어 도착 했어!", "도착하다")).toBe(true);
  expect(includesWord("공부 열심히 했어?", "공부하다")).toBe(true);
  expect(includesWord("열심히 했어?", "공부하다")).toBe(false);
});
