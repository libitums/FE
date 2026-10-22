import { describe, expect, test } from "vitest";

import { learningItemGuideKinds } from "./learning-item-guide";
import type { LearningItemGuideKind } from "./learning-item-guide.contract";
import { uiCopyEn } from "./ui-copy-en";
import { uiCopyFor } from "./ui-copy";

// `unit` 계층: 안내 문구의 값(CP7만 리터럴)과 길이 · 금지 표현 제약.

const copy = uiCopyEn.learningItemGuide;

const confirmedCopy: Record<LearningItemGuideKind, { title: string; description: string }> = {
  "sentence-order": {
    title: "Just one piece this time",
    description:
      "Usually you put several pieces in order. Here there's only one, so tap it, then tap Check.",
  },
};

describe("학습 문항 안내 문구", () => {
  test("CP1: 모든 종류 제목 · 설명이 공백만이 아니다", () => {
    for (const kind of learningItemGuideKinds) {
      expect(copy[kind].title.trim(), `${kind} title`).not.toBe("");
      expect(copy[kind].description.trim(), `${kind} description`).not.toBe("");
    }
  });

  test("CP2: 제목 32자 이하, 설명 110자 이하, 설명은 두 문장 이내", () => {
    for (const kind of learningItemGuideKinds) {
      expect(copy[kind].title.length, `${kind} title`).toBeLessThanOrEqual(32);
      expect(copy[kind].description.length, `${kind} description`).toBeLessThanOrEqual(110);
      const sentences = copy[kind].description.match(/[^.!?]+[.!?]/g) ?? [];
      expect(sentences.length, `${kind} sentences`).toBeLessThanOrEqual(2);
    }
  });

  test("CP3: 한글과 인물 이름(Minseo)이 없다", () => {
    for (const kind of learningItemGuideKinds) {
      const text = `${copy[kind].title} ${copy[kind].description}`;
      expect(text, kind).not.toMatch(/[가-힣]/);
      expect(text, kind).not.toMatch(/Minseo/);
    }
  });

  test("CP6: 영어 밖 언어도 영어 표의 값을 그대로 쓴다", () => {
    for (const language of ["vi", "es", "ja"] as const) {
      expect(uiCopyFor(language).learningItemGuide, language).toEqual(copy);
    }
  });

  test("CP7: 문구 쌍이 확정 문구와 문자열로 같다", () => {
    for (const kind of learningItemGuideKinds) {
      expect(copy[kind], kind).toEqual(confirmedCopy[kind]);
    }
  });
});
