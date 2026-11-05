import { describe, expect, test } from "vitest";

import { activityGuideKindFor, learningItemGuideKinds } from "./learning-item-guide";
import type { ActivityGuideSubject } from "./learning-item-guide.contract";
import { uiCopyFor } from "./ui-copy";

// `unit` 계층: 카탈로그 레슨 활동 안내의 판정(ADR-0104 D1 · D2)과 다섯 언어 문구의 빈칸.
// 판정 입력은 학습형 · 문항 수 · 첫 문항 조각 수뿐이라, 튜토리얼 본문이 바뀌어도 같은 화면 종류면 같은 답입니다.

const subject = (
  form: string,
  questionCount = 3,
  firstChipCount: number | null = null,
): ActivityGuideSubject => ({ form, questionCount, firstChipCount });

describe("activityGuideKindFor", () => {
  test("AG1: 여섯 학습형은 각자의 활동 안내다", () => {
    expect(activityGuideKindFor(subject("vocab-card"))).toBe("activity-vocab-card");
    expect(activityGuideKindFor(subject("word-choice"))).toBe("activity-word-choice");
    expect(activityGuideKindFor(subject("listening"))).toBe("activity-listening");
    expect(activityGuideKindFor(subject("syllable-build"))).toBe("activity-syllable-build");
    expect(activityGuideKindFor(subject("culture-card"))).toBe("activity-culture-card");
    expect(activityGuideKindFor(subject("sentence-order", 2, 3))).toBe("activity-sentence-order");
  });

  test("AG2: 안내가 없는 학습형 · 모르는 학습형은 null이다", () => {
    for (const form of ["typing", "pair-match", "read-aloud", "speak-word", "hangul-write", ""]) {
      expect(activityGuideKindFor(subject(form)), form).toBeNull();
    }
  });

  test("AG3: 문항이 없는 활동은 null이다", () => {
    expect(activityGuideKindFor(subject("listening", 0))).toBeNull();
    expect(activityGuideKindFor(subject("sentence-order", 0, null))).toBeNull();
  });

  test("AG4: 첫 문항 조각이 하나인 문장 만들기는 미룬다(조각 하나 안내가 화면 안에서 뜸) · 둘이면 활동 안내", () => {
    expect(activityGuideKindFor(subject("sentence-order", 2, 1))).toBeNull();
    expect(activityGuideKindFor(subject("sentence-order", 2, 2))).toBe("activity-sentence-order");
  });

  test("AG5: 조각 수를 모르는 문장 만들기는 null이다", () => {
    expect(activityGuideKindFor(subject("sentence-order", 2, null))).toBeNull();
  });
});

describe("활동 안내 문구", () => {
  test("AG6: 다섯 언어 모두 모든 종류의 제목 · 설명이 비어 있지 않다", () => {
    for (const language of ["en", "vi", "id", "es", "ja"] as const) {
      const copy = uiCopyFor(language).learningItemGuide;
      for (const kind of learningItemGuideKinds) {
        expect(copy[kind].title.trim(), `${language} ${kind} title`).not.toBe("");
        expect(copy[kind].description.trim(), `${language} ${kind} description`).not.toBe("");
      }
    }
  });

  test("AG7: 영어 밖 네 언어의 활동 안내는 영어와 다른 번역이다", () => {
    const en = uiCopyFor("en").learningItemGuide;
    for (const language of ["vi", "id", "es", "ja"] as const) {
      const copy = uiCopyFor(language).learningItemGuide;
      for (const kind of learningItemGuideKinds.filter((k) => k.startsWith("activity-"))) {
        expect(copy[kind].description, `${language} ${kind}`).not.toBe(en[kind].description);
      }
    }
  });
});
