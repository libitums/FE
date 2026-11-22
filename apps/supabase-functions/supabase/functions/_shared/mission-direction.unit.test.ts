import { describe, expect, test } from "vitest";

import { missionDirection } from "./mission-direction.ts";
import { judgedGoals, judgeUser } from "./mission-judge.ts";
import { missionTurnPayload } from "./mission-turn-parts.ts";
import { cafeMission, waterMission } from "./mission-test-data.ts";

const at = (goalsDone: string[], learnerTurns = goalsDone.length, stall = 0) => ({
  goalsDone,
  learnerTurns,
  hintsUsed: 0,
  stall,
});

describe("연출 지시 — missionDirection", () => {
  test("MD1. 상대역이 꺼내는 남은 목표를 필수 먼저 묻게 하고, cue를 예시로 준다", () => {
    const direction = missionDirection({ mission: waterMission, progress: at(["bag"]) });
    expect(direction).toMatchObject({ beat: "advance", goalId: "pay" });
    expect(direction?.text).toContain("「삼천 원입니다. 결제는 어떻게 하시겠어요?」");
    // 이번 말이 이미 이뤘으면 다음 목표(receipt)로
    expect(direction?.text).toContain("open receipt instead");
  });

  test("MD2. 학습자가 꺼내야 하는 목표는 어느 비트든 「묻지 말라」가 붙고, 그것만 남으면 room", () => {
    const first = missionDirection({ mission: cafeMission, progress: at([]) });
    expect(first?.text).toContain("Goals the learner must raise themselves: price");
    const room = missionDirection({ mission: cafeMission, progress: at(["order", "pay", "stay"]) });
    expect(room).toMatchObject({ beat: "room", goalId: null });
    expect(room?.text).toContain("Do not close the scene");
  });

  test("MD4. 어느 비트든 「이미 이뤘으면 다음」은 상대역이 꺼낼 필수 목표가 선택보다 먼저(조율자 QA: stuck 뒤 결제를 건너뜀)", () => {
    const stuck = missionDirection({ mission: waterMission, progress: at([], 2, 2) });
    expect(stuck).toMatchObject({ beat: "stuck", goalId: "bag" });
    expect(stuck?.text).toContain("open pay instead");
    const hurry = missionDirection({ mission: cafeMission, progress: at(["order"], 8, 0) });
    expect(hurry).toMatchObject({ beat: "hurry", goalId: "pay" });
    expect(hurry?.text).toContain("open stay instead");
  });

  test("MD3. 새 목표 없이 두 턴 → stuck, 남은 턴이 둘 이하이고 필수가 남으면 hurry, 다 이뤘으면 null", () => {
    expect(missionDirection({ mission: waterMission, progress: at(["bag"], 3, 2) })).toMatchObject({
      beat: "stuck",
      goalId: "pay",
    });
    expect(missionDirection({ mission: waterMission, progress: at(["bag"], 6, 1) })).toMatchObject({
      beat: "hurry",
      goalId: "pay",
    });
    const all = waterMission.goals.map((goal) => goal.id);
    expect(missionDirection({ mission: waterMission, progress: at(all) })).toBeNull();
  });
});

describe("목표 판정 — mission-judge", () => {
  test("MJ1. 판정 글에는 남은 목표만 · 최근 대화 · 이번 말이 들어간다", () => {
    const user = judgeUser({
      mission: waterMission,
      brief: "brief",
      goalsDone: ["bag"],
      history: [{ role: "counterpart", text: "봉투 드릴까요?" }],
      text: "카드요",
    });
    expect(user).toContain('"id":"pay"');
    expect(user).not.toContain('"id":"bag"');
    expect(user).toContain("편의점 점원: 봉투 드릴까요?");
    expect(user).toContain("# Learner's latest message\n카드요");
  });

  test("MJ2. 인용이 빈 것 · 이미 이룬 것 · 모르는 id는 버리고 파일 순서로", () => {
    const draft = {
      goals: [
        { id: "receipt", quote: "영수증 주세요" },
        { id: "bag", quote: "봉투" },
        { id: "pay", quote: " " },
        { id: "nope", quote: "x" },
      ],
      off_task: false,
    };
    expect(judgedGoals(waterMission, ["bag"], draft)).toEqual(["receipt"]);
  });

  test("MJ3. 저장할 상태 줄 — 판정이 있으면 목표는 판정, 없으면 답의 보고, 둘 다 없으면 null", () => {
    const state = { goalsDone: ["bag", "pay"], offTask: false, closing: true };
    expect(missionTurnPayload(["bag"], state, { goals: [], offTask: true })).toEqual({
      goals_done: ["bag"],
      off_task: false,
      closing: true,
    });
    expect(missionTurnPayload([], state, null)).toEqual({
      goals_done: ["bag", "pay"],
      off_task: false,
      closing: true,
    });
    expect(missionTurnPayload([], null, { goals: ["bag"], offTask: false })).toEqual({
      goals_done: ["bag"],
      off_task: false,
      closing: false,
    });
    expect(missionTurnPayload([], null, null)).toBeNull();
  });
});
