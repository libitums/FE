import { describe, expect, test } from "vitest";

import { createSegmentSplitter } from "./companion-segments.ts";
import { outputFixtures, transitionFixtures } from "./mission-fixtures.ts";
import {
  advanceMission,
  initialMissionProgress,
  mergeGoalsDone,
  missionEndReason,
  missionEventData,
  parseMissionReply,
  parseMissionState,
  progressFromJson,
  progressToJson,
  type MissionTurnState,
} from "./mission-state.ts";
import { cafeMission, waterMission } from "./mission-test-data.ts";

const snake = (state: MissionTurnState | null) =>
  state === null
    ? null
    : { goals_done: [...state.goalsDone], off_task: state.offTask, closing: state.closing };

describe("상태 줄 해석", () => {
  test.each(outputFixtures.map((fixture) => [fixture.name, fixture] as const))(
    "MS1. %s",
    (_name, fixture) => {
      const parsed = parseMissionReply(fixture.raw);
      expect(parsed.segments).toEqual(fixture.expected.segments);
      expect(snake(parsed.state)).toEqual(fixture.expected.state);
    },
  );

  test("MS2. JSON이지만 객체가 아니면 null", () => {
    expect(parseMissionState("[]")).toBeNull();
    expect(parseMissionState("null")).toBeNull();
    expect(parseMissionState('"order"')).toBeNull();
    expect(parseMissionState("{}")).toEqual({ goalsDone: [], offTask: false, closing: false });
  });

  test("MS3. 스트리밍 — 글자가 쪼개져 와도 같은 조각 · 상태, 컴패니언 state()는 그대로", () => {
    const raw =
      '@speech 네, 아이스 라떼요.\n@state {"goals_done":["order"],"off_task":false,"closing":false}';
    const splitter = createSegmentSplitter();
    for (const chunk of raw.match(/.{1,3}/gsu) ?? []) splitter.push(chunk);
    splitter.end();
    expect(parseMissionState(splitter.stateText() ?? "")).toEqual({
      goalsDone: ["order"],
      offTask: false,
      closing: false,
    });
    // 컴패니언 모양으로 읽으면 칸이 없어 기본값이다 — 기존 동작은 바뀌지 않았다.
    expect(splitter.state()).toEqual({ intimacyDelta: 0, topic: null, userWantsSwitch: false });
    const empty = createSegmentSplitter();
    empty.push("@speech 네.");
    empty.end();
    expect(empty.stateText()).toBeNull();
  });
});

describe("판의 상태 전이", () => {
  test.each(transitionFixtures.map((fixture) => [fixture.name, fixture] as const))(
    "MS4. %s",
    (_name, fixture) => {
      expect(fixture.mission).toBe(cafeMission.id);
      const before = progressFromJson(cafeMission, fixture.before);
      const state =
        fixture.state === null
          ? null
          : {
              goalsDone: fixture.state.goals_done,
              offTask: fixture.state.off_task,
              closing: fixture.state.closing,
            };
      const outcome = advanceMission(cafeMission, before, state);
      expect(outcome.progress.goalsDone).toEqual(fixture.expected.goals_done);
      expect(outcome.progress.learnerTurns).toBe(fixture.expected.learner_turns);
      expect(outcome.progress.hintsUsed).toBe(fixture.before.hints_used);
      expect(outcome.ended).toBe(fixture.expected.ended);
    },
  );

  test("MS5. 새로 이룬 목표와 주제 이탈 표시", () => {
    const outcome = advanceMission(
      waterMission,
      { goalsDone: ["bag"], learnerTurns: 1, hintsUsed: 0 },
      { goalsDone: ["bag", "receipt"], offTask: true, closing: false },
    );
    expect(outcome.newlyDone).toEqual(["receipt"]);
    expect(outcome.offTask).toBe(true);
    expect(advanceMission(waterMission, initialMissionProgress, null).offTask).toBe(false);
  });

  test("MS6. mergeGoalsDone · missionEndReason", () => {
    expect(mergeGoalsDone(waterMission, ["ask"], ["pay", "nope", "ask"])).toEqual(["pay", "ask"]);
    expect(
      missionEndReason(waterMission, { goalsDone: ["bag"], learnerTurns: 7, hintsUsed: 0 }),
    ).toBeNull();
    expect(
      missionEndReason(waterMission, { goalsDone: ["bag"], learnerTurns: 8, hintsUsed: 0 }),
    ).toBe("turn_limit");
    expect(
      missionEndReason(waterMission, { goalsDone: ["pay", "bag"], learnerTurns: 2, hintsUsed: 0 }),
    ).toBe("goals");
  });

  test("MS7. SSE mission 이벤트 값 — 파일 순서의 목표 · 남은 턴 · 끝", () => {
    const id = "6c2d8f3b-5d2e-4a8f-8b62-3e4f5a6b7c81";
    expect(
      missionEventData(id, cafeMission, { goalsDone: ["order"], learnerTurns: 1, hintsUsed: 0 }),
    ).toEqual({
      conversationId: id,
      goals: [
        { id: "order", done: true },
        { id: "pay", done: false },
        { id: "stay", done: false },
        { id: "price", done: false },
      ],
      turnsLeft: 9,
      ended: null,
    });
    expect(
      missionEventData(id, cafeMission, {
        goalsDone: ["order", "pay"],
        learnerTurns: 3,
        hintsUsed: 0,
      }).ended,
    ).toBe("goals");
  });

  test("MS8. mission_state jsonb 왕복 — 모르는 모양은 처음 상태, 모르는 목표는 버림", () => {
    const progress = { goalsDone: ["order", "stay"], learnerTurns: 4, hintsUsed: 2 };
    expect(progressFromJson(cafeMission, progressToJson(progress))).toEqual(progress);
    expect(progressFromJson(cafeMission, null)).toEqual(initialMissionProgress);
    expect(
      progressFromJson(cafeMission, {
        goals_done: ["dance", 1, "pay"],
        learner_turns: -1,
        hints_used: 1.5,
      }),
    ).toEqual({ goalsDone: ["pay"], learnerTurns: 0, hintsUsed: 0 });
  });
});
