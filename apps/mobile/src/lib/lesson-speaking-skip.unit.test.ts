import { afterEach, expect, test } from "vitest";

import {
  clearLessonSpeakingSkip,
  lessonSpeakingKey,
  lessonSpeakingSkipOf,
  skipLessonSpeaking,
} from "./lesson-speaking-skip";

// `unit` 계층: 「이 레슨의 말하기를 건너뜀」 기억(ADR-0206 D4).

afterEach(() => {
  clearLessonSpeakingSkip();
});

test("LS-U1. 레슨 열쇠는 에피소드 · 유닛이다", () => {
  expect(lessonSpeakingKey("ep-01", "L2")).toBe("ep-01:L2");
});

test("LS-U2. 건너뛰기로 한 레슨만 까닭을 돌려주고 다른 레슨은 null이다", () => {
  expect(lessonSpeakingSkipOf("ep-01:L2")).toBeNull();
  skipLessonSpeaking("ep-01:L2", "mic:not-now");
  expect(lessonSpeakingSkipOf("ep-01:L2")).toBe("mic:not-now");
  expect(lessonSpeakingSkipOf("ep-01:L3")).toBeNull();
});

test("LS-U3. 다른 레슨에서 건너뛰면 앞 레슨 기억은 덮이고, 비우면 모두 null이다", () => {
  skipLessonSpeaking("ep-01:L2", "mic:not-now");
  skipLessonSpeaking("ep-02:L1", "unavailable:blocked");
  expect(lessonSpeakingSkipOf("ep-01:L2")).toBeNull();
  expect(lessonSpeakingSkipOf("ep-02:L1")).toBe("unavailable:blocked");
  clearLessonSpeakingSkip();
  expect(lessonSpeakingSkipOf("ep-02:L1")).toBeNull();
});
