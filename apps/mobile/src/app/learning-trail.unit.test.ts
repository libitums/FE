import { describe, expect, test } from "vitest";

import { emptyWordbook, wordbookKeyOf, type Wordbook } from "../lib/wordbook";
import { createLearningTrail } from "./learning-trail";

// `unit` 계층: 레슨 자취 — 단어장 기록과 Letters 추천 신호(ADR-0169).

function trailWith(initial: Wordbook = emptyWordbook) {
  let book = initial;
  const trail = createLearningTrail({
    today: () => "2026-11-20",
    updateWordbook: (update) => {
      book = update(book);
    },
  });
  return { trail, book: () => book };
}

const syllable = (itemId: string, contentRef?: string) => ({
  itemId,
  itemType: "SYLLABLE_BUILD",
  ...(contentRef === undefined ? {} : { contentRef }),
});

describe("단어장", () => {
  test("LT1. 단어 카드 활동이 끝나면 voca ref를 단어장에 적는다", () => {
    const { trail, book } = trailWith();
    trail.cardsSeen("u01", ["voca:a1", undefined, "expr:x"]);
    expect(Object.keys(book().words)).toEqual([wordbookKeyOf("u01", "voca:a1")]);
  });

  test("LT2. 채점 문항의 답은 그 ref 단어에 맞힘 · 틀림으로(건너뜀은 무시)", () => {
    const { trail, book } = trailWith();
    trail.cardsSeen("u01", ["voca:a1"]);
    trail.itemAnswered("u01", syllable("i1", "voca:a1"), "correct");
    trail.itemAnswered("u01", syllable("i2", "voca:a1"), "skipped");
    expect(book().words[wordbookKeyOf("u01", "voca:a1")]?.correct).toBe(1);
  });
});

describe("어려움 신호", () => {
  test("LT3. 레슨이 끝나기 전에는 꺼낼 신호가 없다", () => {
    const { trail } = trailWith();
    trail.itemAnswered("u01", syllable("i1"), "incorrect");
    expect(trail.takeSignal()).toBeNull();
  });

  test("LT4. 한글 읽기 문항 틀림만 센다 · 끝나면 신호 한 번 · 꺼내면 비움", () => {
    const { trail } = trailWith();
    trail.itemAnswered("u01", syllable("i1"), "incorrect");
    trail.itemAnswered("u01", { itemId: "i2", itemType: "IMG_MATCH" }, "incorrect");
    trail.itemAnswered("u01", { itemId: "i3", itemType: "CLOZE" }, "incorrect");
    trail.lessonEnded("finished");
    expect(trail.takeSignal()).toEqual({ hangulWrong: 2, repeatWrong: 1, end: "finished" });
    expect(trail.takeSignal()).toBeNull();
  });

  test("LT5. 다시 풀기에서 한글 읽기 문항을 또 틀리면 연속 2", () => {
    const { trail } = trailWith();
    trail.itemAnswered("u01", syllable("i1"), "incorrect");
    trail.repeatWrong("SYLLABLE_BUILD");
    trail.repeatWrong("IMG_MATCH");
    trail.lessonEnded("finished");
    expect(trail.takeSignal()?.repeatWrong).toBe(2);
  });

  test("LT6. 다음 레슨은 새로 센다", () => {
    const { trail } = trailWith();
    trail.itemAnswered("u01", syllable("i1"), "incorrect");
    trail.lessonEnded("exited");
    trail.itemAnswered("u01", syllable("i2"), "correct");
    trail.lessonEnded("finished");
    expect(trail.takeSignal()).toEqual({ hangulWrong: 0, repeatWrong: 0, end: "finished" });
  });
});
