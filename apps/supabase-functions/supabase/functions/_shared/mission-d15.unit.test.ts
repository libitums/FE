// ADR-0193 D15(2026-11-23 사용자 결정) — 화계 상한 · 고치기/더 나은 표현 · 먼저 말하면 안 되는 것 · 순서 검사.
import { describe, expect, test } from "vitest";

import { missionFeedbackRequest } from "./mission-context.ts";
import { expectedOpen, firmDirection } from "./mission-direction.ts";
import { isFix, learnerRegisterLine, registerCap } from "./mission-grader.ts";
import { cleanReply } from "./mission-reply-clean.ts";
import { parseMissionState } from "./mission-state.ts";
import { settleReply } from "./mission-turn-parts.ts";
import type { MissionTurnContext } from "./mission-turn-row.ts";
import { cafeMission, waterMission } from "./mission-test-data.ts";

const speech = (text: string) => ({ kind: "speech" as const, text });

describe("화계", () => {
  test("D15-1. 상한 — 내내 50 · 절반 75 · 다섯 중 하나 90 · 드러난 턴이 없으면 100", () => {
    expect(registerCap(4, 4)).toBe(50);
    expect(registerCap(4, 2)).toBe(75);
    expect(registerCap(5, 1)).toBe(90);
    expect(registerCap(0, 0)).toBe(100);
  });

  test("D15-2. 미션의 기대 화계가 채점 입력과 교정 규칙에 간다(반말 장면이면 존댓말이 고치기)", () => {
    expect(learnerRegisterLine(cafeMission)).toContain("polite");
    const casual = {
      ...cafeMission,
      counterpart: { ...cafeMission.counterpart, learnerRegister: "casual" as const },
    };
    expect(learnerRegisterLine(casual)).toContain("casual");
    const request = missionFeedbackRequest(casual, {
      text: "라떼 주세요",
      l1: "en",
      history: [],
      signal: new AbortController().signal,
    });
    expect(request.speechLevel).toBe("casual");
    expect(request.extraRules).toContain("존댓말 here is a speech-level mistake");
    const polite = missionFeedbackRequest(cafeMission, {
      text: "라떼 줘",
      l1: "en",
      history: [],
      signal: new AbortController().signal,
    });
    expect(polite.character?.banmalFeedback).toBe("correction");
    expect(polite.extraRules).toContain("it is NEVER a correction");
  });
});

describe("고치기 · 더 나은 표현", () => {
  test("D15-3. 채점에는 고치기만 — kind better는 빠진다", () => {
    expect(isFix({ original: "a", corrected: "b", kind: "correction" })).toBe(true);
    expect(isFix({ original: "a", corrected: "b", kind: "l1_to_ko" })).toBe(true);
    expect(isFix({ original: "a", corrected: "b", kind: "better" })).toBe(false);
  });
});

describe("먼저 말하면 안 되는 것", () => {
  test("D15-4. 가격 목표가 안 이뤄졌으면 금액 문장을 빼고, 이번 말로 이뤘으면 그대로", () => {
    const reply = [speech("아이스 아메리카노 한 잔이요. 오천 원이에요. 결제는 어떻게 하시겠어요?")];
    expect(cleanReply(cafeMission, ["order"], reply, false, ["order"])).toEqual({
      segments: [speech("아이스 아메리카노 한 잔이요. 결제는 어떻게 하시겠어요?")],
      issues: ["withhold"],
      speechLeft: true,
    });
    expect(cleanReply(cafeMission, ["order"], reply, false, ["order", "price"]).issues).toEqual([]);
    // 편의점(가격 묻기가 목표가 아님)의 「삼천 원입니다」는 그대로
    expect(
      cleanReply(waterMission, ["bag"], [speech("삼천 원입니다. 결제는요?")], false).issues,
    ).toEqual([]);
  });
});

describe("순서 검사", () => {
  const context = {
    mission: waterMission,
    progress: { goalsDone: [], learnerTurns: 2, hintsUsed: 0, stall: 2 },
  } as unknown as MissionTurnContext;
  const reply = (text: string, opens: string | null) => ({
    segments: [speech(text)],
    stateText: JSON.stringify({ goals_done: ["bag"], off_task: false, closing: false, opens }),
    firstDeltaMs: 1,
    totalMs: 2,
  });

  test("D15-5. 이번 말 뒤 꺼내야 할 목표 — 봉투를 이뤘으면 결제(필수)", () => {
    const after = { goalsDone: ["bag"], learnerTurns: 3, hintsUsed: 0, stall: 0 };
    expect(expectedOpen(waterMission, after)?.id).toBe("pay");
    expect(firmDirection(waterMission.goals[1]!)).toContain("open goal pay");
    expect(parseMissionState('{"goals_done":[],"opens":"pay"}')?.opens).toBe("pay");
    expect(parseMissionState('{"goals_done":[]}')?.opens).toBeUndefined();
  });

  test("D15-6. 어긋나면 확정 지시로 한 번 다시, 맞으면 그대로(추가 호출 없음)", async () => {
    const judged = { goals: ["bag"], offTask: false };
    const calls: (string | null)[] = [];
    const fixed = await settleReply(
      context,
      reply("영수증 드릴까요?", "receipt"),
      judged,
      async (d) => {
        calls.push(d);
        return reply("결제는 어떻게 하시겠어요?", "pay");
      },
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("open goal pay");
    expect(fixed.result.segments).toEqual([speech("결제는 어떻게 하시겠어요?")]);
    expect(fixed.outcome).toBe("order:receipt->pay");
    const ok = await settleReply(context, reply("결제는요?", "pay"), judged, async (d) => {
      calls.push(d);
      return null;
    });
    expect(ok.outcome).toBe("unchanged");
    expect(calls).toHaveLength(1);
  });
});
