import {
  checkTurnOrder,
  missionFinishResponseSchema,
  missionListSchema,
  missionStartResponseSchema,
  turnEventSchema,
  type TurnEvent,
} from "@libitums/companion-contract";
import { describe, expect, test } from "vitest";

import {
  DEV_MISSION_FAIL_GRADING,
  DEV_MISSION_FAIL_TURN,
  devMissionList,
  devMissionSource,
} from "../../app/roleplay-mission-dev-fakes";
import { createFakeMissionSource } from "./mission-fake-source";
import { FAKE_STORE } from "./mission-fake-scripts";
import { missionListFixture } from "./mission-fixture";
import type { MissionSource } from "./roleplay-mission.contract";

// `unit` 계층(MF-S1 ~): 가짜 출처의 1화 편의점 판(QA가 두 미션을 다 돌도록) — 봉투 · 결제 · 영수증 · 다른 물건 규칙, 계약 스키마,
// 개발 미리보기 목록(편의점 · 카페 열림 + 잠긴 예시 하나), QA용 실패 낱말(보내기 한 번 실패 · 첫 채점 실패).

const now = (task: () => void) => task();

async function turn(source: MissionSource, conversationId: string, text: string) {
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

const missionOf = (events: readonly TurnEvent[]) => {
  const found = events.find((event) => event.event === "mission");
  return found?.event === "mission" ? found.data : null;
};
const replyOf = (events: readonly TurnEvent[]) =>
  events
    .filter((event) => event.event === "delta")
    .map((event) => (event.event === "delta" ? event.data.text : ""))
    .join("");

async function storePlay(options: Parameters<typeof createFakeMissionSource>[0] = {}) {
  const source = createFakeMissionSource({ schedule: now, list: devMissionList(), ...options });
  const started = await source.start("u01-water");
  if (started.kind !== "started") throw new Error("not started");
  return { source, id: started.value.conversationId, start: started.value };
}

describe("편의점 판", () => {
  test("MF-S1 시작 응답은 계약 스키마 — 진입 대사 「봉투 드릴까요?」, 목표 넷(필수 봉투 · 결제), 턴 8", async () => {
    const { start } = await storePlay();
    expect(missionStartResponseSchema.safeParse(start).success).toBe(true);
    expect(start.missionId).toBe("u01-water");
    expect(start.opening.ko).toBe("봉투 드릴까요?");
    expect(start.goals.map((goal) => [goal.id, goal.required])).toEqual([
      ["bag", true],
      ["pay", true],
      ["receipt", false],
      ["ask", false],
    ]);
    expect(start.turnLimit).toBe(8);
  });

  test("MF-S2 봉투 → 결제(고치기) → 다른 물건 → 영수증이면 모든 목표로 닫히고, 이벤트는 계약 순서", async () => {
    const { source, id } = await storePlay();
    const bag = await turn(source, id, "봉투 안 필요해요.");
    expect(checkTurnOrder(bag)).toEqual({ ok: true });
    for (const event of bag) expect(turnEventSchema.safeParse(event).success).toBe(true);
    expect(replyOf(bag)).toContain("결제는 어떻게");
    expect(bag.find((event) => event.event === "correction")?.data).toMatchObject({
      kind: "better",
      corrected: "봉투는 괜찮아요.",
    });
    const pay = await turn(source, id, "카드으로 할게요.");
    expect(pay.find((event) => event.event === "correction")?.data).toMatchObject({
      kind: "correction",
    });
    expect(missionOf(pay)).toMatchObject({ requiredDone: true, ended: null });
    const ask = await turn(source, id, "따뜻한 물 있어요?");
    expect(replyOf(ask)).toContain("보리차");
    const receipt = await turn(source, id, "영수증 주세요.");
    expect(missionOf(receipt)).toMatchObject({ ended: "goals" });
    const finished = await source.finish(id, false);
    expect(missionFinishResponseSchema.safeParse(finished).success).toBe(true);
    if (finished.status !== "graded") throw new Error("not graded");
    expect(finished.report.missionId).toBe("u01-water");
    expect(finished.report.outcome).toBe("success");
    expect(finished.report.goals.every((goal) => goal.done)).toBe(true);
    expect(finished.report.focus?.[0]?.examples[0]?.corrected).toBe("카드로 할게요.");
  });

  test("MF-S3 아무 목표도 못 이루면 되묻고, 턴 상한이면 마무리 대사로 닫혀 실패 리포트(못 이룬 목표의 tip)", async () => {
    const { source, id } = await storePlay();
    const first = await turn(source, id, "음...");
    expect(replyOf(first)).toBe("봉투 필요하세요?");
    let last = first;
    for (let index = 1; index < 8; index += 1) last = await turn(source, id, "음...");
    expect(missionOf(last)).toMatchObject({ ended: "turn_limit", turnsLeft: 0 });
    expect(replyOf(last)).toContain("손님이 계셔서요");
    const finished = await source.finish(id, false);
    if (finished.status !== "graded") throw new Error("not graded");
    expect(finished.report.outcome).toBe("fail");
    expect(finished.report.goals.find((goal) => goal.id === "pay")?.tip?.ko).toBe("카드로 할게요.");
  });

  test("MF-S4 힌트는 그 판의 대본 — 필수부터(봉투), 받아 적기는 편의점 차례(성공 · 확인 · 실패 갈래)", async () => {
    const { source, id } = await storePlay();
    const hint = await source.hint(id);
    expect(hint).toMatchObject({ kind: "hint", value: { goalId: "bag", ko: "봉투는 괜찮아요." } });
    const clip = { uri: "fake://clip.wav", seconds: 1.2 };
    const heard = [];
    for (let index = 0; index < FAKE_STORE.heard.length; index += 1)
      heard.push(await source.transcribe(id, clip));
    expect(heard.map((entry) => (entry.kind === "heard" ? entry.reason : entry.error))).toEqual([
      "ok",
      "low_confidence",
      "speech_empty",
      "not_korean",
      "speech_busy",
      "speech_unavailable",
      "ok",
    ]);
  });
});

describe("개발 미리보기 출처", () => {
  test("MF-S5 목록은 편의점 · 카페가 열리고 잠긴 예시(2화) 하나 — 계약 fixture는 그대로(편의점 잠김)", async () => {
    const list = devMissionList();
    expect(missionListSchema.safeParse(list).success).toBe(true);
    expect(list.missions.map((item) => [item.id, item.unlocked])).toEqual([
      ["u01-water", true],
      ["u06-cafe", true],
      ["u02-checkin", false],
    ]);
    expect(missionListFixture.missions[0]?.unlocked).toBe(false);
    const source = createFakeMissionSource({ schedule: now, list });
    expect(await source.start("u02-checkin")).toEqual({ kind: "rejected", code: "not_available" });
  });

  test("MF-S6 QA 낱말 — 「#fail」 턴은 같은 글마다 처음 한 번만 실패, 「#gradefail」을 말한 판은 첫 채점만 실패", async () => {
    const { source, id } = await storePlay({
      failTurnOn: DEV_MISSION_FAIL_TURN,
      failTurnOnce: true,
      gradingFailOn: DEV_MISSION_FAIL_GRADING,
    });
    const failed = await turn(source, id, `봉투 괜찮아요 ${DEV_MISSION_FAIL_TURN}`);
    expect(failed.map((event) => event.event)).toEqual(["error"]);
    const again = await turn(source, id, `봉투 괜찮아요 ${DEV_MISSION_FAIL_TURN}`);
    expect(missionOf(again)?.goals.find((goal) => goal.id === "bag")?.done).toBe(true);
    await turn(source, id, `카드로 할게요 ${DEV_MISSION_FAIL_GRADING}`);
    expect(await source.finish(id, false)).toMatchObject({ status: "grading_failed" });
    expect(await source.finish(id, false)).toMatchObject({ status: "graded" });
    expect(devMissionSource()).toBeDefined();
  });
});
