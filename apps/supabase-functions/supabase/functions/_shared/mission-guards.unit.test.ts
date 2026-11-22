import { describe, expect, test } from "vitest";

import { emptyFeedback } from "./companion-llm-prompts.ts";
import {
  farewellRisk,
  farewellsOf,
  guardMissionFeedback,
  newForeignLetters,
  stripFarewells,
} from "./mission-guards.ts";
import { settleFarewell } from "./mission-turn-parts.ts";
import type { MissionTurnContext } from "./mission-turn-row.ts";
import { cafeMission, waterMission } from "./mission-test-data.ts";

const speech = (text: string) => ({ kind: "speech" as const, text });

describe("작별 인사 거르기", () => {
  test("MG1. 인사 문장만 빼고 나머지 말 · 행동은 남긴다", () => {
    const out = stripFarewells(
      [
        { kind: "action", text: "영수증을 건넨다" },
        speech("네, 알겠습니다. 감사합니다. 안녕히 가세요."),
      ],
      farewellsOf(waterMission),
    );
    expect(out).toEqual({
      segments: [
        { kind: "action", text: "영수증을 건넨다" },
        speech("네, 알겠습니다. 감사합니다."),
      ],
      stripped: true,
      speechLeft: true,
    });
    expect(stripFarewells([speech("안녕히 가세요.")], farewellsOf(waterMission))).toMatchObject({
      segments: [],
      speechLeft: false,
    });
  });

  test("MG2. 학습자가 꺼낼 목표가 남고 상대역이 꺼낼 목표가 하나 이하일 때만 위험", () => {
    expect(farewellRisk(waterMission, [])).toBe(false);
    expect(farewellRisk(waterMission, ["bag", "pay"])).toBe(true);
    expect(farewellRisk(waterMission, ["bag", "pay", "receipt", "ask"])).toBe(false);
    expect(farewellRisk(cafeMission, ["order", "pay", "stay"])).toBe(true);
  });

  const context = {
    mission: waterMission,
    progress: { goalsDone: ["bag", "pay"], learnerTurns: 2, hintsUsed: 0 },
  } as unknown as MissionTurnContext;
  const reply = (text: string, closing = false) => ({
    segments: [speech(text)],
    stateText: JSON.stringify({ goals_done: [], off_task: false, closing }),
    firstDeltaMs: 1,
    totalMs: 2,
  });

  test("MG3. 닫는 답이거나 판정으로 판이 끝나면 그대로, 말이 안 남으면 한 번 다시 만든다", async () => {
    const never = async () => null;
    expect(
      (await settleFarewell(context, reply("안녕히 가세요.", true), null, never)).outcome,
    ).toBe("unchanged");
    const allDone = { goals: ["receipt", "ask"], offTask: false };
    expect((await settleFarewell(context, reply("안녕히 가세요."), allDone, never)).outcome).toBe(
      "unchanged",
    );
    const stripped = await settleFarewell(context, reply("네. 안녕히 가세요."), null, never);
    expect(stripped.outcome).toBe("stripped");
    expect(stripped.result.segments).toEqual([speech("네.")]);
    const retried = await settleFarewell(context, reply("안녕히 가세요."), null, async () =>
      reply("영수증 여기 있어요."),
    );
    expect(retried).toMatchObject({
      outcome: "retried",
      result: { segments: [speech("영수증 여기 있어요.")] },
    });
    const kept = await settleFarewell(context, reply("안녕히 가세요."), null, async () =>
      reply("또 오세요."),
    );
    expect(kept).toMatchObject({
      outcome: "kept",
      result: { segments: [speech("안녕히 가세요.")] },
    });
  });
});

describe("교정의 비한글 문자", () => {
  test("MG4. 원문에 없는 한자 · 가나는 걸리고, 라틴 · 숫자 · 문장 부호 · 원문에 있던 글자는 괜찮다", () => {
    expect(newForeignLetters("마实 할게요", "마실게요")).toEqual(["实"]);
    expect(newForeignLetters("ラテ 주세요", "라떼 주세요")).toEqual(["ラ", "テ"]);
    expect(newForeignLetters("Latte 2잔 주세요!", "latte 2잔 줘요")).toEqual([]);
    expect(newForeignLetters("学生이에요", "学生이에요")).toEqual([]);
  });

  test("MG5. 그런 교정은 버려 교정 없음(none)으로, 멀쩡한 교정은 그대로", () => {
    const bad = {
      ...emptyFeedback("none", "마실게요"),
      status: "ok" as const,
      kind: "correction" as const,
      corrected: "마实 할게요",
      items: [{ original: "마실게요", corrected: "마实 할게요", reason: "x" }],
    };
    expect(guardMissionFeedback(bad, "마실게요")).toEqual({
      feedback: emptyFeedback("none", "마실게요"),
      dropped: ["实"],
    });
    const good = { ...bad, corrected: "마실게요.", items: [] };
    expect(guardMissionFeedback(good, "마실게요").dropped).toEqual([]);
  });
});
