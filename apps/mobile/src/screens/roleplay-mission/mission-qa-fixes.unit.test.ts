import { describe, expect, test } from "vitest";

import { devMissionList } from "../../app/roleplay-mission-dev-fakes";
import { createFakeMissionSource } from "./mission-fake-source";
import { missionStartFixture } from "./mission-fixture";
import { initialMissionSession, missionSessionReducer } from "./mission-session";
import type { MissionSessionAction, MissionSource } from "./roleplay-mission.contract";

// `unit` 계층(MQ-U1 ~): 화면 QA 2차에서 고친 상태 규칙 — 보내지 못한 줄 다시 보내기(QA 3), 목록의 최고 기록 갱신(QA 4).

const run = (actions: readonly MissionSessionAction[]) =>
  actions.reduce(missionSessionReducer, initialMissionSession("u06-cafe"));
const started: MissionSessionAction[] = [
  { type: "start-requested" },
  { type: "started", value: missionStartFixture },
];

describe("다시 보내기(QA 3)", () => {
  test("MQ-U1 보내지 못한 줄을 다시 보내면 그 줄을 치우고 새 줄 하나만 남는다 — 실패 줄이 남아 또 보내지지 않는다", () => {
    const failed = run([
      ...started,
      { type: "send", text: "안녕", inputMode: "text" },
      { type: "turn-closed" },
    ]);
    const mine = failed.lines.filter((line) => line.kind === "me");
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ id: "me-1", failed: true });
    const resent = missionSessionReducer(failed, {
      type: "send",
      text: "안녕",
      inputMode: "text",
      retryOf: "me-1",
    });
    const after = resent.lines.filter((line) => line.kind === "me");
    expect(after.map((line) => [line.id, line.kind === "me" && line.failed])).toEqual([
      ["me-2", false],
    ]);
    expect(resent.phase).toBe("awaiting");
    // 답을 기다리는 동안 또 누르면(같은 줄 id) 아무 일도 없습니다.
    expect(
      missionSessionReducer(resent, {
        type: "send",
        text: "안녕",
        inputMode: "text",
        retryOf: "me-1",
      }),
    ).toBe(resent);
  });
});

async function playToReport(source: MissionSource, missionId: string, lines: readonly string[]) {
  const started = await source.start(missionId);
  if (started.kind !== "started") throw new Error("not started");
  const id = started.value.conversationId;
  for (const text of lines) {
    await new Promise<void>((resolve) =>
      source.sendTurn(
        { conversationId: id, text, inputMode: "text" },
        { onEvent: () => undefined, onEnd: resolve },
      ),
    );
  }
  return source.finish(id, false);
}

describe("최고 기록(QA 4)", () => {
  test("MQ-U2 더 높은 점수로 끝나면 목록의 best가 바뀌고, 낮으면 그대로다", async () => {
    const source = createFakeMissionSource({ schedule: (task) => task(), list: devMissionList() });
    const before = await source.list();
    expect(before.missions.find((item) => item.id === "u06-cafe")?.best?.totalScore).toBe(73);
    const high = await playToReport(source, "u06-cafe", [
      "아이스 아메리카노 한 잔 주세요",
      "포장이요",
      "아메리카노 얼마예요?",
      "카드로 할게요",
    ]);
    if (high.status !== "graded") throw new Error("not graded");
    expect(high.report.totalScore).toBeGreaterThan(73);
    const after = await source.list();
    expect(after.missions.find((item) => item.id === "u06-cafe")?.best?.totalScore).toBe(
      high.report.totalScore,
    );
    const low = await playToReport(source, "u06-cafe", ["커피 주세요", "카드로 할게요"]);
    if (low.status !== "graded") throw new Error("not graded");
    const again = await source.list();
    expect(again.missions.find((item) => item.id === "u06-cafe")?.best?.totalScore).toBe(
      high.report.totalScore,
    );
  });
});
