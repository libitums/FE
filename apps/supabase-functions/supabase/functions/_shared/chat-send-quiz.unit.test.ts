import { expect, test } from "vitest";

import { quizCorrect, quizForms } from "./chat-send-quiz.ts";

// 덕수쌤 퀴즈의 판정(ADR-0191 D14) — 답에 그 단어 · 활용형이 들어 있는가. 모델을 부르지 않는다.
test("QZ1. 꼴 — 단어 그대로 · 하다 용언은 어근 · 다 용언은 어간, 띄어쓰기 · 문장부호 무시", () => {
  expect(quizForms("도착하다")).toEqual(["도착하다", "도착"]);
  expect(quizForms("먹다")).toEqual(["먹다", "먹"]);
  expect(quizForms("창가 자리")).toEqual(["창가자리"]);
  expect(quizForms("야근")).toEqual(["야근"]);
  expect(quizForms("  ")).toEqual([]);
});

test("QZ2. 판정 — 활용형 · 띄어쓰기는 맞힘, 다른 말은 틀림. 한 글자 어간은 그 글자로 시작하는 어절만", () => {
  expect(quizCorrect("서울에 도착했어요!", "도착하다")).toBe(true);
  expect(quizCorrect("야근!", "야근")).toBe(true);
  expect(quizCorrect("창가자리요", "창가 자리")).toBe(true);
  expect(quizCorrect("모르겠어요", "도착하다")).toBe(false);
  expect(quizCorrect("출발", "도착하다")).toBe(false);
  expect(quizCorrect("밥 먹었어요", "먹다")).toBe(true);
  expect(quizCorrect("어제 학교에서 공부했어요", "먹다")).toBe(false);
  expect(quizCorrect("가요", "가다")).toBe(true);
  expect(quizCorrect("학교에서 공부했어요", "가다")).toBe(false);
});
