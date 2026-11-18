import {
  checkTurnOrder,
  missionFinishResponseSchema,
  missionHintResponseSchema,
  missionListSchema,
  missionStartResponseSchema,
  turnEventSchema,
  type TurnEvent,
} from "@libitums/companion-contract";
import {
  missionHintFixture,
  missionListFixture as contractList,
  missionReportFixture as contractReport,
  missionStartFixture as contractStart,
} from "@libitums/companion-contract/fixtures";
import { describe, expect, test } from "vitest";

import { createFakeMissionSource } from "./mission-fake-source";
import { fakeTotalScore } from "./mission-fake-rules";
import {
  missionHintExamples,
  missionListFixture,
  missionReportFixture,
  missionStartFixture,
} from "./mission-fixture";
import type { MissionSource } from "./roleplay-mission.contract";

// `unit` 계층(MF-U1 ~): 가짜 출처 — 계약 fixture와 같은 값인가, 내는 값 · 이벤트가 계약 스키마 · 순서를 지키는가, 한 판이 결정적으로 끝까지 도는가.

const now = (task: () => void) => task();

async function turnEvents(source: MissionSource, conversationId: string, text: string) {
  const events: TurnEvent[] = [];
  await new Promise<void>((resolve) => {
    source.sendTurn(
      { conversationId, text, inputMode: "text" },
      {
        onEvent: (event, data) =>
          events.push({ event, id: events.length, data: JSON.parse(data) } as TurnEvent),
        onEnd: resolve,
      },
    );
  });
  return events;
}

async function startedPlay(options: Parameters<typeof createFakeMissionSource>[0] = {}) {
  const source = createFakeMissionSource({ schedule: now, ...options });
  const started = await source.start("u06-cafe");
  if (started.kind !== "started") throw new Error("not started");
  return { source, id: started.value.conversationId, start: started.value };
}

describe("가짜 출처의 값은 계약 fixture와 같다", () => {
  test("MF-U1 목록 · 시작 · 리포트는 계약 fixture 그대로, 힌트 예시 첫째는 계약 힌트", () => {
    expect(missionListFixture).toEqual(contractList);
    expect(missionStartFixture).toEqual(contractStart);
    expect(missionReportFixture).toEqual(contractReport);
    const { goalId, hintsLeft: _left, ...example } = missionHintFixture;
    expect(missionHintExamples[goalId]).toEqual(example);
  });

  test("MF-U2 점수식은 PRD 부록 B를 다시 낸다(75 · 85 · 50 · 힌트 0 → 73)", () => {
    expect(fakeTotalScore(75, 85, 50, 0)).toBe(73);
    expect(fakeTotalScore(0, 0, 0, 3)).toBe(0);
  });
});

describe("가짜 출처의 한 판", () => {
  test("MF-U3 시작 응답은 계약 스키마를 지난다 — 무료가 없으면 엽전 정액", async () => {
    const { start } = await startedPlay();
    expect(missionStartResponseSchema.safeParse(start).success).toBe(true);
    expect(start.charge).toEqual({ source: "credits", credits: 5 });
    expect(
      missionListSchema.safeParse(await createFakeMissionSource({ schedule: now }).list()).success,
    ).toBe(true);
  });

  test("MF-U4 턴 이벤트는 계약 스키마 · 순서를 지키고, `mission`이 목표 진척을 싣는다", async () => {
    const { source, id } = await startedPlay();
    const events = await turnEvents(source, id, "아이스 아메리카노 한 잔 주세요.");
    for (const event of events)
      expect(turnEventSchema.safeParse(event).success, event.event).toBe(true);
    expect(checkTurnOrder(events)).toEqual({ ok: true });
    const mission = events.find((event) => event.event === "mission");
    expect(mission?.data).toMatchObject({
      turnsLeft: 9,
      ended: null,
      goals: [
        { id: "order", done: true },
        { id: "pay", done: false },
        { id: "stay", done: false },
        { id: "price", done: false },
      ],
    });
  });

  test("MF-U5 부록 B의 대화(주문 · 포장 · 카드)는 성공으로 끝나고 리포트가 73점이다", async () => {
    const { source, id } = await startedPlay();
    await turnEvents(source, id, "아이스 아메리카노 한 잔 주세요.");
    const stay = await turnEvents(source, id, "가지고 가요.");
    expect(stay.find((event) => event.event === "correction")?.data).toMatchObject({
      status: "ok",
      kind: "better",
    });
    const last = await turnEvents(source, id, "카드로 할게요.");
    expect(last.find((event) => event.event === "mission")?.data).toMatchObject({ ended: "goals" });
    const finished = await source.finish(id, false);
    expect(missionFinishResponseSchema.safeParse(finished).success).toBe(true);
    expect(finished).toMatchObject({
      status: "graded",
      report: {
        outcome: "success",
        totalScore: 73,
        taskScore: 75,
        expressionScore: 50,
        bestScore: 73,
      },
    });
  });

  test("MF-U6 턴 상한에 닿으면 `turn_limit`로 끝나고 리포트는 실패다", async () => {
    const { source, id } = await startedPlay();
    let last: TurnEvent[] = [];
    for (let i = 0; i < 10; i += 1) last = await turnEvents(source, id, "음...");
    expect(last.find((event) => event.event === "mission")?.data).toMatchObject({
      turnsLeft: 0,
      ended: "turn_limit",
    });
    expect(await source.finish(id, false)).toMatchObject({
      status: "graded",
      report: { outcome: "fail" },
    });
    const after = await turnEvents(source, id, "또");
    expect(after.map((event) => event.event)).toEqual(["error"]);
  });

  test("MF-U7 힌트는 못 이룬 필수 목표부터, 세 번까지", async () => {
    const { source, id } = await startedPlay();
    await turnEvents(source, id, "아메리카노 주세요");
    const first = await source.hint(id);
    expect(first).toMatchObject({ kind: "hint", value: { goalId: "pay", hintsLeft: 2 } });
    if (first.kind === "hint")
      expect(missionHintResponseSchema.safeParse(first.value).success).toBe(true);
    await source.hint(id);
    await source.hint(id);
    expect(await source.hint(id)).toEqual({ kind: "unavailable" });
  });

  test("MF-U8 가지 고르기 — 시작 거절 · 잠긴 미션 · 채점 실패 한 번 · 턴 오류 · 그만둠", async () => {
    expect(
      await createFakeMissionSource({ schedule: now, start: "insufficient_credits" }).start(
        "u06-cafe",
      ),
    ).toEqual({ kind: "rejected", code: "insufficient_credits" });
    expect(await createFakeMissionSource({ schedule: now }).start("u01-water")).toEqual({
      kind: "rejected",
      code: "not_available",
    });
    const once = await startedPlay({ grading: "fail-once" });
    expect(await once.source.finish(once.id, false)).toMatchObject({
      status: "grading_failed",
      refunded: true,
      retryable: true,
    });
    expect(await once.source.finish(once.id, false)).toMatchObject({ status: "graded" });
    const broken = await startedPlay({ failTurnOn: "고장" });
    expect(
      (await turnEvents(broken.source, broken.id, "고장")).map((event) => event.event),
    ).toEqual(["error"]);
    const quit = await startedPlay();
    expect(await quit.source.finish(quit.id, true)).toEqual({
      status: "abandoned",
      conversationId: quit.id,
    });
  });

  test("MF-U9 끊으면 더 이벤트를 보내지 않는다", () => {
    const tasks: (() => void)[] = [];
    const source = createFakeMissionSource({ schedule: (task) => tasks.push(task) });
    const seen: string[] = [];
    const cancel = source.sendTurn(
      { conversationId: "x", text: "a", inputMode: "text" },
      { onEvent: (event) => seen.push(event), onEnd: () => seen.push("end") },
    );
    cancel();
    while (tasks.length > 0) tasks.shift()?.();
    expect(seen).toEqual([]);
  });
});
