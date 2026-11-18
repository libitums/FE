import { describe, expect, test } from "vitest";

import { missionStartFixture } from "./mission-fixture";
import {
  canAskHint,
  canSendMission,
  initialMissionSession,
  mergeGoals,
  missionProgressOf,
  missionSessionReducer,
  requiredGoalsDone,
} from "./mission-session";
import type { MissionSessionAction, MissionSessionState } from "./roleplay-mission.contract";

// `unit` 계층(MS-U1 ~): 미션 한 판의 상태 기계(PRD §3.3 ~ §3.6). SSE 접기는 메신저 턴 리듀서를 그대로 쓰고 `mission`만 여기서 읽는다.

const U1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";

const run = (actions: readonly MissionSessionAction[], from?: MissionSessionState) =>
  actions.reduce(missionSessionReducer, from ?? initialMissionSession("u06-cafe"));

const ev = (event: string, data: unknown): MissionSessionAction => ({
  type: "turn-event",
  event,
  data: JSON.stringify(data),
});
const goalsDone = (...ids: string[]) =>
  missionStartFixture.goals.map((goal) => ({ id: goal.id, done: ids.includes(goal.id) }));
const turn = (text: string, mission: unknown, reply = "네.") => [
  { type: "send", text, inputMode: "text" } as const,
  ev("start", { userMessageId: U1, assistantMessageId: A1 }),
  ev("delta", { segment: 0, kind: "speech", text: reply }),
  ev("translation", { segment: 0, text: "Okay." }),
  ev("correction", { userMessageId: U1, status: "none" }),
  ev("mission", mission),
  ev("done", { assistantMessageId: A1, creditsSpent: 0, balance: 42 }),
];
const started: MissionSessionAction[] = [
  { type: "start-requested" },
  { type: "started", value: missionStartFixture },
];

describe("미션 판의 상태 기계", () => {
  test("MS-U1 시작 전 → 시작 중 → 대화: 진입 대사가 첫 줄, 목표 · 남은 턴 · 힌트가 선다", () => {
    const state = run(started);
    expect(state.phase).toBe("talking");
    expect(state.lines).toEqual([
      expect.objectContaining({ kind: "them", ko: "반가워요. 뭐 드릴까요?" }),
    ]);
    expect(state.lines[0]).toMatchObject({ translation: "Good to see you. What can I get you?" });
    expect(state.goals.map((goal) => goal.done)).toEqual([false, false, false, false]);
    expect([state.turnsLeft, state.hintsLeft, state.turnLimit]).toEqual([10, 3, 10]);
  });

  test("MS-U2 시작 거절이면 시작 전으로 돌아오고 까닭이 남는다 — 다시 누르면 지운다", () => {
    const rejected = run([
      { type: "start-requested" },
      { type: "start-rejected", code: "insufficient_credits" },
    ]);
    expect(rejected).toMatchObject({ phase: "preview", startError: "insufficient_credits" });
    expect(run([{ type: "start-requested" }], rejected)).toMatchObject({
      phase: "starting",
      startError: null,
    });
  });

  test("MS-U3 보내기 → 답 기다림 → 이벤트 접기 → 내 차례: 목표가 체크되고 남은 턴이 준다", () => {
    const sending = run([
      ...started,
      { type: "send", text: " 아메리카노 한 잔 주세요 ", inputMode: "voice" },
    ]);
    expect(sending.phase).toBe("awaiting");
    expect(sending.lines[1]).toMatchObject({
      kind: "me",
      ko: "아메리카노 한 잔 주세요",
      inputMode: "voice",
    });
    const state = run(
      turn("아메리카노 한 잔 주세요", { goals: goalsDone("order"), turnsLeft: 9, ended: null }),
      run(started),
    );
    expect(state.phase).toBe("talking");
    expect(state.goals.find((goal) => goal.id === "order")?.done).toBe(true);
    expect(state.turnsLeft).toBe(9);
    expect(state.lines.at(-1)).toMatchObject({ kind: "them", ko: "네.", translation: "Okay." });
    expect(state.lines[1]).toMatchObject({
      kind: "me",
      serverId: U1,
      failed: false,
      correction: null,
    });
  });

  test("MS-U4 목표는 되돌리지 않는다 — 다음 턴이 done: false를 보내도 체크가 남는다", () => {
    const once = run(
      turn("주세요", { goals: goalsDone("order"), turnsLeft: 9, ended: null }),
      run(started),
    );
    const twice = run(turn("음", { goals: goalsDone(), turnsLeft: 8, ended: null }), once);
    expect(twice.goals.find((goal) => goal.id === "order")?.done).toBe(true);
    expect(twice.turnsLeft).toBe(8);
  });

  test("MS-U5 `ended: goals`면 마지막 턴 뒤 끝남 — 보낼 수 없고 채점을 부를 수 있다", () => {
    const state = run(
      turn("카드로 할게요", { goals: goalsDone("order", "pay"), turnsLeft: 8, ended: "goals" }),
      run(started),
    );
    expect(state.phase).toBe("ended");
    expect(state.endReason).toBe("goals");
    expect(requiredGoalsDone(state.goals)).toBe(true);
    expect(canSendMission(state)).toBe(false);
    expect(run([{ type: "send", text: "또", inputMode: "text" }], state)).toBe(state);
    expect(run([{ type: "grading-requested" }], state).phase).toBe("grading");
  });

  test("MS-U6 `ended: turn_limit`도 끝남 — 필수 목표를 못 이뤘다", () => {
    const state = run(
      turn("음", { goals: goalsDone("order"), turnsLeft: 0, ended: "turn_limit" }),
      run(started),
    );
    expect(state).toMatchObject({ phase: "ended", endReason: "turn_limit", turnsLeft: 0 });
    expect(requiredGoalsDone(state.goals)).toBe(false);
  });

  test("MS-U7 스트림 오류 · 끊김이면 내 줄이 실패로 남고 내 차례로 돌아온다", () => {
    const errored = run(
      [
        { type: "send", text: "안녕", inputMode: "text" },
        ev("start", { userMessageId: U1, assistantMessageId: A1 }),
        ev("error", { code: "upstream_unavailable", retryable: true }),
      ],
      run(started),
    );
    expect(errored.phase).toBe("talking");
    expect(errored.lines.at(-1)).toMatchObject({ kind: "me", failed: true });
    const cut = run(
      [{ type: "send", text: "안녕", inputMode: "text" }, { type: "turn-closed" }],
      run(started),
    );
    expect(cut.lines.at(-1)).toMatchObject({ kind: "me", failed: true });
    expect(cut.turn).toBeNull();
  });

  test("MS-U8 교정 카드는 그 턴의 내 줄에 붙는다", () => {
    const state = run(
      [
        { type: "send", text: "가지고 가요", inputMode: "text" },
        ev("start", { userMessageId: U1, assistantMessageId: A1 }),
        ev("delta", { segment: 0, kind: "speech", text: "네." }),
        ev("correction", {
          userMessageId: U1,
          status: "ok",
          kind: "better",
          original: "가지고 가요",
          corrected: "포장이요",
          items: [],
          better: null,
          meaning: "To go, please.",
        }),
        ev("done", { assistantMessageId: A1, creditsSpent: 0, balance: null }),
      ],
      run(started),
    );
    expect(state.lines[1]).toMatchObject({
      kind: "me",
      correction: { kind: "better", corrected: "포장이요" },
    });
  });

  test("MS-U9 힌트: 요청 → 받음(남은 수 · 쓴 수) → 닫기, 다 쓰면 누를 수 없다", () => {
    const asked = run([...started, { type: "hint-requested" }]);
    expect(asked.hintLoading).toBe(true);
    expect(run([{ type: "hint-requested" }], asked)).toBe(asked);
    const got = run(
      [
        {
          type: "hint-received",
          value: {
            goalId: "pay",
            ko: "카드로 할게요.",
            roman: "kadeuro halgeyo.",
            meaning: "I'll pay by card.",
            hintsLeft: 0,
          },
        },
      ],
      asked,
    );
    expect(got).toMatchObject({
      hintLoading: false,
      hintsLeft: 0,
      hintsUsed: 1,
      hint: { goalId: "pay" },
    });
    expect(canAskHint(got)).toBe(false);
    expect(run([{ type: "hint-dismissed" }], got).hint).toBeNull();
    expect(run([{ type: "hint-unavailable" }], asked)).toMatchObject({
      hintLoading: false,
      hintsLeft: 0,
    });
  });

  test("MS-U10 보내면 펼친 힌트가 접힌다", () => {
    const got = run([
      ...started,
      { type: "hint-requested" },
      {
        type: "hint-received",
        value: { goalId: "pay", ko: "카드로 할게요.", roman: "", meaning: "", hintsLeft: 2 },
      },
    ]);
    expect(run([{ type: "send", text: "카드로 할게요.", inputMode: "text" }], got).hint).toBeNull();
  });

  test("MS-U11 채점: 리포트 · 실패(값 돌려줌) · 실패 뒤 다시 시도 · 연결 실패", () => {
    const ended = run(
      turn("카드", { goals: goalsDone("order", "pay"), turnsLeft: 8, ended: "goals" }),
      run(started),
    );
    const grading = run([{ type: "grading-requested" }], ended);
    const failed = run(
      [
        {
          type: "finished",
          value: { status: "grading_failed", conversationId: U1, retryable: true, refunded: true },
        },
      ],
      grading,
    );
    expect(failed).toMatchObject({
      phase: "grading-failed",
      gradingFailure: { refunded: true, retryable: true },
    });
    const retry = run([{ type: "grading-requested" }], failed);
    expect(retry).toMatchObject({ phase: "grading", gradingFailure: null });
    expect(run([{ type: "finish-failed" }], retry)).toMatchObject({
      phase: "grading-failed",
      gradingFailure: { refunded: false },
    });
  });

  test("MS-U12 그만두기는 대화 중에만, 그 뒤 reset은 시작 전으로", () => {
    const quit = run([...started, { type: "abandoned" }]);
    expect(quit.phase).toBe("abandoned");
    expect(run([{ type: "reset" }], quit)).toEqual(initialMissionSession("u06-cafe"));
    const preview = initialMissionSession("u06-cafe");
    expect(run([{ type: "abandoned" }], preview)).toBe(preview);
  });

  test("MS-U13 늦게 온 이벤트 · 국면 밖 동작은 같은 참조를 돌려준다", () => {
    const talking = run(started);
    expect(run([ev("delta", { segment: 0, kind: "speech", text: "x" })], talking)).toBe(talking);
    expect(run([{ type: "turn-closed" }], talking)).toBe(talking);
    expect(run([{ type: "started", value: missionStartFixture }], talking)).toBe(talking);
    expect(
      run([{ type: "finished", value: { status: "abandoned", conversationId: U1 } }], talking),
    ).toBe(talking);
  });
});

describe("mission 이벤트 읽기", () => {
  test("MS-U14 모양이 틀리면 버린다", () => {
    expect(missionProgressOf("not json")).toBeNull();
    expect(missionProgressOf(JSON.stringify({ goals: [], turnsLeft: -1, ended: null }))).toBeNull();
    expect(
      missionProgressOf(JSON.stringify({ goals: [], turnsLeft: 3, ended: "later" })),
    ).toBeNull();
    expect(
      missionProgressOf(
        JSON.stringify({
          goals: [{ id: 1 }, { id: "pay", done: true }],
          turnsLeft: 3,
          ended: null,
        }),
      ),
    ).toEqual({
      goals: [{ id: "pay", done: true }],
      turnsLeft: 3,
      ended: null,
    });
  });

  test("MS-U15 정의에 없는 목표 id는 무시하고, 바뀐 것이 없으면 같은 배열", () => {
    const goals = missionStartFixture.goals;
    expect(
      mergeGoals(goals, { goals: [{ id: "dance", done: true }], turnsLeft: 1, ended: null }),
    ).toBe(goals);
  });
});
