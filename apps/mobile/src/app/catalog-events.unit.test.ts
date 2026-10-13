import { describe, expect, test } from "vitest";

import { analyticsCaptureFrom } from "../lib/analytics-events";
import { finalPassedEventOf, lessonFinishedEventOf, lessonStartedEventOf } from "./catalog-events";

// `unit` 계층: 카탈로그 학습 측정 이벤트 만들기의 입출력만 봅니다.

describe("이벤트 만들기", () => {
  test("EV1. 시작 이벤트는 필드가 정확하고 수는 10진 문자열이다", () => {
    expect(
      lessonStartedEventOf(
        { episodeId: "u01-water", unitKey: "S3", questionCount: 10, skippedItemCount: 0 },
        "lesson",
      ),
    ).toEqual({
      name: "episode_lesson_started",
      episodeId: "u01-water",
      unitKey: "S3",
      unitRole: "lesson",
      questionCount: "10",
      skippedItemCount: "0",
    });
  });

  test("EV1. 시작 이벤트는 최종 테스트 역할도 낸다", () => {
    expect(
      lessonStartedEventOf(
        { episodeId: "u01-water", unitKey: "RP", questionCount: 3, skippedItemCount: 2 },
        "final",
      ),
    ).toEqual({
      name: "episode_lesson_started",
      episodeId: "u01-water",
      unitKey: "RP",
      unitRole: "final",
      questionCount: "3",
      skippedItemCount: "2",
    });
  });

  test("EV1. 끝 이벤트는 맞은 수를 결과에서 세고 판정을 그대로 싣는다", () => {
    expect(
      lessonFinishedEventOf(
        "u01-water",
        "S3",
        "lesson",
        ["correct", "incorrect", "correct", "correct"],
        10,
        "passed",
      ),
    ).toEqual({
      name: "episode_lesson_finished",
      episodeId: "u01-water",
      unitKey: "S3",
      unitRole: "lesson",
      verdict: "passed",
      correctCount: "3",
      questionCount: "10",
    });
    expect(lessonFinishedEventOf("u01-water", "S1", "lesson", [], 0, "passed")).toMatchObject({
      correctCount: "0",
      questionCount: "0",
    });
  });

  test("EV1. 최종 통과 이벤트는 맞은 수와 턴 수를 싣는다", () => {
    expect(finalPassedEventOf("u01-water", ["correct", "correct", "incorrect"], 3)).toEqual({
      name: "episode_final_passed",
      episodeId: "u01-water",
      correctCount: "2",
      turnCount: "3",
    });
  });
});

describe("capture 매핑", () => {
  test("EV2. 이름은 event가 되고 나머지 필드는 properties로 그대로 간다", () => {
    const started = lessonStartedEventOf(
      { episodeId: "u01-water", unitKey: "S3", questionCount: 10, skippedItemCount: 0 },
      "lesson",
    );
    const finished = lessonFinishedEventOf("u01-water", "S3", "lesson", ["correct"], 10, "failed");
    const passed = finalPassedEventOf("u01-water", ["correct"], 3);

    expect(analyticsCaptureFrom(started)).toEqual({
      event: "episode_lesson_started",
      properties: {
        episodeId: "u01-water",
        unitKey: "S3",
        unitRole: "lesson",
        questionCount: "10",
        skippedItemCount: "0",
      },
    });
    expect(analyticsCaptureFrom(finished)).toEqual({
      event: "episode_lesson_finished",
      properties: {
        episodeId: "u01-water",
        unitKey: "S3",
        unitRole: "lesson",
        verdict: "failed",
        correctCount: "1",
        questionCount: "10",
      },
    });
    expect(analyticsCaptureFrom(passed)).toEqual({
      event: "episode_final_passed",
      properties: { episodeId: "u01-water", correctCount: "1", turnCount: "3" },
    });
  });
});
