import { describe, expect, test } from "vitest";

import {
  branchingConfig,
  chooseBranch,
  nextTopicState,
  topicStateFrom,
} from "./companion-branching.ts";
import { createSegmentSplitter } from "./companion-segments.ts";

const persona = { name: "미나", topics: ["서울 맛집", "여행 계획표"] };
const expressions = [
  { id: "voca:water", kind: "voca", surface: "물", roman: null, gloss: "water" },
];
const always = () => 0;
const never = () => 0.99;

describe("대화 분기", () => {
  // BR1 — 임계값만 넘으면 늘 바꾸는 게 아니라, 후보를 열고 확률로 고릅니다(PRD §3.8 원칙).
  test("BR1. 짧은 답이 이어지면 화제 전환 후보가 열리고, 확률이 넘으면 화제 뱅크 씨앗을 지시한다", () => {
    const state = {
      ...topicStateFrom(null),
      shortStreak: branchingConfig.shortStreakForSwitch - 1,
      topic: "서울 맛집",
    };
    const switched = chooseBranch(state, { userText: "네", persona, expressions, random: always });
    expect(switched.action).toEqual({ kind: "switch", seed: "여행 계획표" });
    expect(switched.directive).toContain("여행 계획표");
    expect(
      chooseBranch(state, { userText: "네", persona, expressions, random: never }).action,
    ).toBeNull();
    expect(
      chooseBranch(state, {
        userText: "어제 경복궁에 다녀왔어요",
        persona,
        expressions,
        random: always,
      }).action,
    ).toMatchObject({
      kind: "insert",
    });
  });

  test("BR2. 학습 표현 삽입은 쿨다운이 지나야 한다", () => {
    const state = { ...topicStateFrom(null), turn: 5, lastInsertTurn: 4 };
    expect(
      chooseBranch(state, { userText: "오늘 날씨가 좋네요", persona, expressions, random: always })
        .action,
    ).toBeNull();
    const later = { ...state, turn: 4 + branchingConfig.insertCooldown };
    expect(
      chooseBranch(later, { userText: "오늘 날씨가 좋네요", persona, expressions, random: always })
        .action,
    ).toEqual({
      kind: "insert",
      expressionId: "voca:water",
    });
  });

  test("BR3. 다음 화제 상태 — 같은 화제는 이어 세고, 전환하면 1부터, 유저의 전환 신호를 기억한다", () => {
    const start = topicStateFrom({ turn: 3, topic: "음식", topicTurns: 2 });
    expect(
      nextTopicState(start, {
        userText: "떡볶이요",
        turnState: { intimacyDelta: 1, topic: "음식", userWantsSwitch: true },
        action: null,
      }),
    ).toMatchObject({
      turn: 4,
      topicTurns: 3,
      wantsSwitch: true,
    });
    expect(
      nextTopicState(start, {
        userText: "네",
        turnState: null,
        action: { kind: "switch", seed: "여행" },
      }),
    ).toMatchObject({
      topicTurns: 1,
      lastSwitchTurn: 4,
      shortStreak: 1,
    });
  });
});

test("SG5. @state 줄은 조각으로 나가지 않고 상태로 읽힌다 · 깨진 상태는 null", () => {
  const splitter = createSegmentSplitter();
  const deltas = [
    ...splitter.push("@speech 안녕!\n@sta"),
    ...splitter.push('te {"intimacy_delta": 2.6, "topic": "인사", "user_wants_switch": true}'),
    ...splitter.end(),
  ];
  expect(deltas.map((delta) => delta.text).join("")).toBe("안녕!");
  expect(splitter.state()).toEqual({ intimacyDelta: 3, topic: "인사", userWantsSwitch: true });
  const broken = createSegmentSplitter();
  broken.push("@speech 네\n@state {깨짐");
  broken.end();
  expect(broken.state()).toBeNull();
});
