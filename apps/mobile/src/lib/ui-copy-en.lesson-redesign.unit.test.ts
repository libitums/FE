import { expect, test } from "vitest";

import { uiCopyFor } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";

// `unit` 계층: 학습 문항 리디자인이 더한 문구 값의 입출력만 봅니다. 표본 인자는 영어로 줍니다.

const c = uiCopyEn;

test("CP1. 문화 확인 장면 지시문과 해설 판 제목", () => {
  expect(c.wordChoice.culture.sceneInstruction).toBe("What do you say?");
  expect(c.wordChoice.culture.feedbackTitle.scene.correct).toBe("Nice reply!");
  expect(c.wordChoice.culture.feedbackTitle.scene.incorrect).toBe("Not quite");
  expect(c.wordChoice.culture.feedbackTitle.question.correct).toBe("That's right!");
  expect(c.wordChoice.culture.feedbackTitle.question.incorrect).toBe("Not quite");
});

test("CP1. 대화 조각 이름과 쓴 음절 이름과 정답 상자 머리 줄", () => {
  expect(c.sentenceOrder.dialogueLine.me("hi")).toBe("Your line: hi");
  expect(c.sentenceOrder.dialogueLine.counterpart("hi")).toBe("Partner's line: hi");
  expect(c.syllableBuild.usedTile("ga")).toBe("ga, used");
  expect(c.catalogFinal.answerLabel).toBe("Answer");
});

test("CP1. 따라 읽기 배지 문구 키가 없다", () => {
  expect(Object.keys(c.readAloud)).not.toContain("badge");
  expect(Object.keys(c.readAloud).sort()).toEqual(["matched", "pronunciation"].sort());
});

test("CP1. 다른 언어도 새 문구를 영어로 채운다", () => {
  for (const language of ["vi", "es", "ja"] as const) {
    const table = uiCopyFor(language);
    expect(table.wordChoice.culture.sceneInstruction).toBe(c.wordChoice.culture.sceneInstruction);
    expect(table.sentenceOrder.dialogueLine.me("hi")).toBe("Your line: hi");
    expect(table.syllableBuild.usedTile("ga")).toBe("ga, used");
    expect(Object.keys(table.readAloud)).not.toContain("badge");
  }
});
