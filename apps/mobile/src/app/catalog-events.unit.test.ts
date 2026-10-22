import { describe, expect, test } from "vitest";

import { airbridgeEventFrom } from "../lib/airbridge-events";
import { analyticsCaptureFrom } from "../lib/analytics-events";
import type { ListenItemReport } from "../lib/question-audio";
import {
  finalPassedEventOf,
  lessonFinishedEventOf,
  lessonStartedEventOf,
  listenItemAnsweredEventOf,
} from "./catalog-events";
import type { CatalogLessonPlan } from "./catalog-lesson-types";

// `unit` 계층: 카탈로그 학습 측정 이벤트 만들기의 입출력만 봅니다.

describe("이벤트 만들기", () => {
  test("EV1. 시작 이벤트는 필드가 정확하고 수는 10진 문자열이다", () => {
    expect(
      lessonStartedEventOf(
        {
          episodeId: "u01-water",
          unitKey: "S3",
          questionCount: 10,
          shownItemCount: 10,
          skippedItemCount: 0,
        },
        "lesson",
      ),
    ).toEqual({
      name: "episode_lesson_started",
      episodeId: "u01-water",
      unitKey: "S3",
      unitRole: "lesson",
      questionCount: "10",
      shownItemCount: "10",
      skippedItemCount: "0",
    });
  });

  test("EV1. 시작 이벤트는 최종 테스트 역할도 낸다", () => {
    expect(
      lessonStartedEventOf(
        {
          episodeId: "u01-water",
          unitKey: "RP",
          questionCount: 3,
          shownItemCount: 3,
          skippedItemCount: 2,
        },
        "final",
      ),
    ).toEqual({
      name: "episode_lesson_started",
      episodeId: "u01-water",
      unitKey: "RP",
      unitRole: "final",
      questionCount: "3",
      shownItemCount: "3",
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
        0,
      ),
    ).toEqual({
      name: "episode_lesson_finished",
      episodeId: "u01-water",
      unitKey: "S3",
      unitRole: "lesson",
      verdict: "passed",
      correctCount: "3",
      questionCount: "10",
      skippedCount: "0",
    });
    expect(lessonFinishedEventOf("u01-water", "S1", "lesson", [], 0, "passed", 0)).toMatchObject({
      correctCount: "0",
      questionCount: "0",
    });
  });

  test("EV1. 끝 이벤트는 넘긴 건너뜀 수를 10진 문자열로 싣는다", () => {
    expect(
      lessonFinishedEventOf("u01-water", "S5", "lesson", ["correct", "correct"], 2, "passed", 3),
    ).toMatchObject({ skippedCount: "3", correctCount: "2", questionCount: "2" });
    expect(
      lessonFinishedEventOf("u01-water", "S5", "lesson", ["correct"], 1, "passed", 0),
    ).toMatchObject({ skippedCount: "0" });
    expect(lessonFinishedEventOf("u01-water", "S6", "lesson", [], 12, "failed", 12)).toMatchObject({
      skippedCount: "12",
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

describe("시작 이벤트의 표시 문항 수", () => {
  test("EV-S1. 채점 · 표시 · 건너뜀 수가 각자의 10진 문자열로 간다", () => {
    expect(
      lessonStartedEventOf(
        {
          episodeId: "u01-water",
          unitKey: "S1",
          questionCount: 3,
          shownItemCount: 6,
          skippedItemCount: 2,
        },
        "lesson",
      ),
    ).toEqual({
      name: "episode_lesson_started",
      episodeId: "u01-water",
      unitKey: "S1",
      unitRole: "lesson",
      questionCount: "3",
      shownItemCount: "6",
      skippedItemCount: "2",
    });
  });

  test("EV-S2. 수업 계획 객체를 그대로 넘길 수 있다", () => {
    const plan: CatalogLessonPlan = {
      episodeId: "u01-water",
      unitKey: "S1",
      activities: [],
      questionCount: 3,
      shownItemCount: 6,
      skippedItemCount: 2,
      counterpartName: "편의점 점원",
    };

    expect(lessonStartedEventOf(plan, "lesson")).toEqual({
      name: "episode_lesson_started",
      episodeId: "u01-water",
      unitKey: "S1",
      unitRole: "lesson",
      questionCount: "3",
      shownItemCount: "6",
      skippedItemCount: "2",
    });
  });

  test("EV-S3. 끝 이벤트와 최종 통과 이벤트는 표시 문항 수를 싣지 않는다", () => {
    expect(
      Object.keys(
        lessonFinishedEventOf("u01-water", "S3", "lesson", ["correct"], 10, "passed", 0),
      ).sort(),
    ).toEqual(
      [
        "correctCount",
        "episodeId",
        "name",
        "questionCount",
        "skippedCount",
        "unitKey",
        "unitRole",
        "verdict",
      ].sort(),
    );
    expect(Object.keys(finalPassedEventOf("u01-water", ["correct"], 3)).sort()).toEqual(
      ["correctCount", "episodeId", "name", "turnCount"].sort(),
    );
  });
});

describe("capture 매핑", () => {
  test("EV2. 이름은 event가 되고 나머지 필드는 properties로 그대로 간다", () => {
    const started = lessonStartedEventOf(
      {
        episodeId: "u01-water",
        unitKey: "S3",
        questionCount: 10,
        shownItemCount: 10,
        skippedItemCount: 0,
      },
      "lesson",
    );
    const finished = lessonFinishedEventOf(
      "u01-water",
      "S3",
      "lesson",
      ["correct"],
      10,
      "failed",
      0,
    );
    const passed = finalPassedEventOf("u01-water", ["correct"], 3);

    expect(analyticsCaptureFrom(started)).toEqual({
      event: "episode_lesson_started",
      properties: {
        episodeId: "u01-water",
        unitKey: "S3",
        unitRole: "lesson",
        questionCount: "10",
        shownItemCount: "10",
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
        skippedCount: "0",
      },
    });
    expect(analyticsCaptureFrom(passed)).toEqual({
      event: "episode_final_passed",
      properties: { episodeId: "u01-water", correctCount: "1", turnCount: "3" },
    });
  });
});

describe("듣기 문항 이벤트", () => {
  const report: ListenItemReport = {
    ref: { itemId: "S2-01", itemType: "LISTEN_SELECT" },
    result: "correct",
    pace: "slow",
    slowTurnedOn: true,
    replayCount: 2,
    slowReplayCount: 0,
  };

  test("EV1. 듣기 문항 이벤트는 키 집합이 정확하고 수는 10진 문자열이다", () => {
    const event = listenItemAnsweredEventOf("u01-water", "S2", report);

    expect(event).toEqual({
      name: "episode_listen_item_answered",
      episodeId: "u01-water",
      unitKey: "S2",
      itemId: "S2-01",
      itemType: "LISTEN_SELECT",
      result: "correct",
      pace: "slow",
      slowTurnedOn: true,
      replayCount: "2",
      slowReplayCount: "0",
    });
    expect(Object.keys(event).sort()).toEqual([
      "episodeId",
      "itemId",
      "itemType",
      "name",
      "pace",
      "replayCount",
      "result",
      "slowReplayCount",
      "slowTurnedOn",
      "unitKey",
    ]);
  });

  test("EV1. 셈이 두 자리여도 10진 문자열이다", () => {
    const event = listenItemAnsweredEventOf("u01-water", "S2", {
      ...report,
      replayCount: 12,
      slowReplayCount: 30,
    });

    expect(event.replayCount).toBe("12");
    expect(event.slowReplayCount).toBe("30");
  });

  test("EV2. capture는 name을 event로 두고 나머지를 properties로 그대로 보내며 Airbridge는 보내지 않는다", () => {
    const event = listenItemAnsweredEventOf("u01-water", "S2", report);
    const { name, ...rest } = event;
    // 새 이벤트가 이벤트 유니온에 들어가기 전에도 컴파일되도록 입력 타입을 맞춥니다.
    const asAnalytics = event as unknown as Parameters<typeof analyticsCaptureFrom>[0];
    const asAirbridge = event as unknown as Parameters<typeof airbridgeEventFrom>[0];

    expect(analyticsCaptureFrom(asAnalytics)).toEqual({ event: name, properties: rest });
    expect(airbridgeEventFrom(asAirbridge)).toBeNull();
  });
});
