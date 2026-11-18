import { describe, expect, test } from "vitest";

import { chatSendRequestSchema } from "./chat-send";
import {
  missionDefinitionFixture,
  missionFinishFixtures,
  missionHintFixture,
  missionListFixture,
  missionReportFixture,
  missionResultsFixture,
  missionStartFixture,
} from "./fixtures-mission";
import {
  missionDefinitionSchema,
  missionHintRequestSchema,
  missionHintResponseSchema,
  missionStartRequestSchema,
  missionStartResponseSchema,
  missionTurnRequestSchema,
} from "./mission";
import {
  missionFinishRequestSchema,
  missionFinishResponseSchema,
  missionListSchema,
  missionReportSchema,
  missionResultsSchema,
} from "./mission-report";
import { turnEventSchema } from "./sse-events";

const conversationId = "6c2d8f3b-5d2e-4a8f-8b62-3e4f5a6b7c81";
const turn = {
  contract_version: 1,
  client_message_id: "0b8f6c1e-2a3d-4b5c-9d6e-7f8091a2b3c4",
  text: "아메리카노 한 잔 주세요",
  input_mode: "text",
} as const;

const issues = (raw: unknown) => {
  const result = missionDefinitionSchema.safeParse(raw);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("미션 정의", () => {
  test("MC1. fixture 정의가 통과한다", () => {
    expect(missionDefinitionSchema.parse(missionDefinitionFixture)).toEqual(
      missionDefinitionFixture,
    );
  });

  test("MC2. 목표 id 중복 · 필수 목표 없음 · 표현 id 중복은 거부한다", () => {
    const [first, second] = missionDefinitionFixture.goals;
    expect(
      issues({ ...missionDefinitionFixture, goals: [first, { ...second, id: "order" }] }),
    ).toContain("goal-ids-unique");
    expect(
      issues({
        ...missionDefinitionFixture,
        goals: missionDefinitionFixture.goals.map((goal) => ({ ...goal, required: false })),
      }),
    ).toContain("required-goal-missing");
    const [expression] = missionDefinitionFixture.targetExpressions;
    expect(
      issues({ ...missionDefinitionFixture, targetExpressions: [expression, expression] }),
    ).toContain("expression-ids-unique");
  });

  test("MC3. id 꼴 · 턴 상한 범위 · 표현 id 꼴 · label.en 필수", () => {
    expect(issues({ ...missionDefinitionFixture, id: "U06_cafe" })).not.toEqual([]);
    expect(issues({ ...missionDefinitionFixture, turnLimit: 2 })).not.toEqual([]);
    expect(issues({ ...missionDefinitionFixture, turnLimit: 21 })).not.toEqual([]);
    expect(issues({ ...missionDefinitionFixture, turnLimit: 20 })).toEqual([]);
    expect(
      issues({
        ...missionDefinitionFixture,
        targetExpressions: [{ id: "pattern-1", ko: "가", meaning: "a" }],
      }),
    ).not.toEqual([]);
    const goals = missionDefinitionFixture.goals.map((goal, index) =>
      index === 0 ? { ...goal, label: { ko: "음료 주문" } } : goal,
    );
    expect(issues({ ...missionDefinitionFixture, goals })).not.toEqual([]);
    expect(issues({ ...missionDefinitionFixture, goals: [] })).not.toEqual([]);
    expect(
      issues({
        ...missionDefinitionFixture,
        goals: missionDefinitionFixture.goals.map((goal) => ({ ...goal, id: `Bad ${goal.id}` })),
      }),
    ).not.toEqual([]);
  });
});

describe("미션 요청", () => {
  // MC4 — chat-send에 conversation_id를 더해도 기존 요청의 뜻은 그대로입니다(character_id 필수).
  test("MC4. chat-send는 conversation_id를 선택으로 받고 character_id는 여전히 필수다", () => {
    expect(
      chatSendRequestSchema.safeParse({
        ...turn,
        character_id: "doyun",
        conversation_id: conversationId,
      }).success,
    ).toBe(true);
    expect(
      chatSendRequestSchema.safeParse({ ...turn, conversation_id: conversationId }).success,
    ).toBe(false);
  });

  test("MC5. 미션 턴 요청은 conversation_id가 필수이고 character_id는 선택이다", () => {
    expect(missionTurnRequestSchema.parse({ ...turn, conversation_id: conversationId })).toEqual({
      ...turn,
      conversation_id: conversationId,
    });
    expect(missionTurnRequestSchema.safeParse({ ...turn, character_id: "doyun" }).success).toBe(
      false,
    );
    expect(
      missionTurnRequestSchema.safeParse({ ...turn, conversation_id: conversationId, text: " " })
        .success,
    ).toBe(false);
  });

  test("MC6. 시작 · 힌트 · 끝 요청의 모양", () => {
    expect(
      missionStartRequestSchema.safeParse({ contract_version: 1, mission_id: "u06-cafe" }).success,
    ).toBe(true);
    expect(
      missionStartRequestSchema.safeParse({ contract_version: 1, mission_id: "" }).success,
    ).toBe(false);
    expect(
      missionHintRequestSchema.safeParse({ contract_version: 1, conversation_id: "x" }).success,
    ).toBe(false);
    expect(
      missionFinishRequestSchema.parse({
        contract_version: 1,
        conversation_id: conversationId,
        abandon: true,
      }),
    ).toEqual({ contract_version: 1, conversation_id: conversationId, abandon: true });
  });
});

describe("미션 fixture", () => {
  test("MC7. 시작 · 힌트 · 리포트 · 목록 · 지난 리포트가 계약을 통과한다", () => {
    expect(missionStartResponseSchema.parse(missionStartFixture)).toEqual(missionStartFixture);
    expect(missionHintResponseSchema.parse(missionHintFixture)).toEqual(missionHintFixture);
    expect(missionReportSchema.parse(missionReportFixture)).toEqual(missionReportFixture);
    expect(missionListSchema.parse(missionListFixture)).toEqual(missionListFixture);
    expect(missionResultsSchema.parse(missionResultsFixture)).toEqual(missionResultsFixture);
  });

  test.each(Object.entries(missionFinishFixtures))(
    "MC8. %s는 끝 응답 계약을 통과한다",
    (_name, body) => {
      expect(missionFinishResponseSchema.parse(body)).toEqual(body);
    },
  );

  test("MC9. 부록 B의 점수: round(0.5×75 + 0.3×85 + 0.2×50) − 5×0 = 73", () => {
    const { weights, taskScore, accuracyScore, expressionScore, hintsUsed } = missionReportFixture;
    const total = Math.round(
      weights.task * taskScore +
        weights.accuracy * accuracyScore +
        weights.expression * expressionScore,
    );
    expect(Math.max(0, total - weights.hintPenalty * hintsUsed)).toBe(
      missionReportFixture.totalScore,
    );
  });

  test("MC10. mission 이벤트 — 끝 까닭은 goals · turn_limit · null만", () => {
    const event = (ended: unknown) => ({
      event: "mission",
      id: 3,
      data: { conversationId, goals: [{ id: "order", done: true }], turnsLeft: 0, ended },
    });
    expect(turnEventSchema.safeParse(event("goals")).success).toBe(true);
    expect(turnEventSchema.safeParse(event(null)).success).toBe(true);
    expect(turnEventSchema.safeParse(event("abandoned")).success).toBe(false);
  });
});
