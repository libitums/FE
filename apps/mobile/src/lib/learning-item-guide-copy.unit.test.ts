import { describe, expect, test } from "vitest";

import { learningItemGuideKinds } from "./learning-item-guide";
import type { LearningItemGuideKind } from "./learning-item-guide.contract";
import { uiCopyEn } from "./ui-copy-en";
import { uiCopyFor } from "./ui-copy";

// `unit` 계층: 안내 문구 여섯 쌍의 값(CP7만 리터럴)과 길이 · 금지 표현 제약.

const copy = uiCopyEn.learningItemGuide;

const confirmedCopy: Record<LearningItemGuideKind, { title: string; description: string }> = {
  "sentence-order": {
    title: "Just one piece this time",
    description:
      "Usually you put several pieces in order. Here there's only one, so tap it, then tap Check.",
  },
  messenger: {
    title: "Just one reply this time",
    description:
      "Usually you choose a reply or type your own. Here there's only one, so tap it and send.",
  },
  "phone-call": {
    title: "Reply with a tap",
    description:
      "Tap Accept and listen. You don't need to speak, so just tap your reply when it's your turn.",
  },
  "visual-novel": {
    title: "Your lines are ready",
    description:
      "Tap Next to read each line. Your replies are already written, so there's nothing to choose.",
  },
  speaking: {
    title: "Try it, or skip it",
    description: "Tap Speak and read the sentence out loud, or tap Skip if you're not ready.",
  },
  writing: {
    title: "Trace it, or skip it",
    description: "Follow the pale letter with your finger and tap Check, or tap Skip to move on.",
  },
};

describe("학습 문항 안내 문구", () => {
  test("CP1: 여섯 종류 모두 제목 · 설명이 공백만이 아니다", () => {
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

  test("CP4: 전화 · 비주얼 노벨은 「this time」 · 「for now」를 약속하지 않는다", () => {
    for (const kind of ["phone-call", "visual-novel"] as const) {
      const text = `${copy[kind].title} ${copy[kind].description}`;
      expect(text, kind).not.toMatch(/\bthis time\b|\bfor now\b/i);
    }
  });

  test("CP5: 말하기 · 쓰기는 「only practice」 · 「usually」를 말하지 않는다", () => {
    for (const kind of ["speaking", "writing"] as const) {
      const text = `${copy[kind].title} ${copy[kind].description}`;
      expect(text, kind).not.toMatch(/only practice|usually/i);
    }
  });

  test("CP6: 영어 밖 언어도 영어 표의 값을 그대로 쓴다", () => {
    for (const language of ["vi", "es", "ja"] as const) {
      expect(uiCopyFor(language).learningItemGuide, language).toEqual(copy);
    }
  });

  test("CP7: 여섯 쌍이 확정 문구와 문자열로 같다", () => {
    for (const kind of learningItemGuideKinds) {
      expect(copy[kind], kind).toEqual(confirmedCopy[kind]);
    }
  });
});
