import { expect, test } from "vitest";

import { activityGuideSubjectOf } from "./catalog-activity-guide-subject";
import type { CatalogActivity } from "./catalog-lesson-types";

// `unit` 계층: 활동에서 안내 판정 입력을 뽑는다 — 문항이 비어 들어와도(타입 밖의 본문) 던지지 않는다.

test("GS1: 문장 만들기는 첫 문항 조각 수, 다른 학습형은 null", () => {
  const order = {
    form: "sentence-order",
    questions: [{ chips: ["만나서", "반갑습니다"] }],
  } as unknown as CatalogActivity;
  const listening = { form: "listening", questions: [{}] } as unknown as CatalogActivity;
  expect(activityGuideSubjectOf(order)).toEqual({
    form: "sentence-order",
    questionCount: 1,
    firstChipCount: 2,
  });
  expect(activityGuideSubjectOf(listening)).toEqual({
    form: "listening",
    questionCount: 1,
    firstChipCount: null,
  });
});

test("GS2: 문항이 빈 문장 만들기가 들어와도 던지지 않고 조각 수는 null이다", () => {
  const empty = { form: "sentence-order", questions: [] } as unknown as CatalogActivity;
  expect(() => activityGuideSubjectOf(empty)).not.toThrow();
  expect(activityGuideSubjectOf(empty)).toEqual({
    form: "sentence-order",
    questionCount: 0,
    firstChipCount: null,
  });
});
