import { describe, expect, test } from "vitest";

import { missionStartFixture } from "./mission-fixture";
import {
  canFinishMission,
  canSendMission,
  initialMissionSession,
  missionProgressOf,
  missionSessionReducer,
} from "./mission-session";
import type { MissionSessionAction, MissionSessionState } from "./roleplay-mission.contract";

// `unit` 계층(MC-U1 ~): 계속하기 / 끝내기 · 성공 뒤 그만두기 · 채점 대기 판(파이프라인 문서 §10.4, ADR-0193) — 상태 기계만.

const U1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";
const P1 = "33333333-3333-4333-8333-333333333333";

const run = (actions: readonly MissionSessionAction[], from?: MissionSessionState) =>
  actions.reduce(missionSessionReducer, from ?? initialMissionSession("u06-cafe"));
const ev = (event: string, data: unknown): MissionSessionAction => ({
  type: "turn-event",
  event,
  data: JSON.stringify(data),
});
const started: MissionSessionAction[] = [
  { type: "start-requested" },
  { type: "started", value: missionStartFixture },
];
const turn = (mission: unknown): MissionSessionAction[] => [
  { type: "send", text: "카드로 할게요", inputMode: "text" },
  ev("start", { userMessageId: U1, assistantMessageId: A1 }),
  ev("delta", { segment: 0, kind: "speech", text: "네." }),
  ev("mission", mission),
  ev("done", { assistantMessageId: A1, creditsSpent: 0, balance: 42 }),
];
const required = (ended: string | null, requiredDone = true) => ({
  goals: [
    { id: "order", done: true },
    { id: "pay", done: true },
  ],
  turnsLeft: 7,
  ended,
  requiredDone,
});

describe("계속하기 / 끝내기", () => {
  test("MC-U1 필수를 이루고 판이 열려 있으면 성공 카드가 한 번 서고, 대화는 이어진다", () => {
    const state = run([...started, ...turn(required(null))]);
    expect(state.phase).toBe("talking");
    expect(state.requiredDone).toBe(true);
    expect(state.successPrompt).toBe("shown");
    expect(canSendMission(state)).toBe(true);
    expect(canFinishMission(state)).toBe(true);
    const kept = run([{ type: "continue" }], state);
    expect(kept.successPrompt).toBe("dismissed");
    const again = run(turn({ ...required(null), turnsLeft: 6 }), kept);
    expect(again.successPrompt).toBe("dismissed");
    expect(again.requiredDone).toBe(true);
  });

  test("MC-U2 끝내기는 끝 이유 finish로 닫는다 — 결선이 채점을 부른다", () => {
    const state = run([...started, ...turn(required(null)), { type: "finish-requested" }]);
    expect(state).toMatchObject({
      phase: "ended",
      endReason: "finish",
      successPrompt: "dismissed",
    });
    expect(run([{ type: "grading-requested" }], state).phase).toBe("grading");
  });

  test("MC-U3 필수 전 · 이미 끝난 판의 끝내기는 무시한다", () => {
    const talking = run(started);
    expect(run([{ type: "finish-requested" }], talking)).toBe(talking);
    const ended = run([...started, ...turn(required("goals"))]);
    expect(ended.successPrompt).toBe("none");
    expect(run([{ type: "finish-requested" }], ended)).toBe(ended);
  });

  test("MC-U4 답을 기다리는 중에도 성공 뒤 그만두기(끝내기)는 판을 닫는다 — 받는 중인 턴은 버린다", () => {
    const awaiting = run([
      ...started,
      ...turn(required(null)),
      { type: "send", text: "포장이요", inputMode: "text" },
    ]);
    expect(awaiting.phase).toBe("awaiting");
    expect(canFinishMission(awaiting)).toBe(false);
    const finished = run([{ type: "finish-requested" }], awaiting);
    expect(finished).toMatchObject({ phase: "ended", endReason: "finish", turn: null });
  });

  test("MC-U5 옛 이벤트(requiredDone 없음)는 필수 달성으로 보지 않는다 · 끝 이유 finish를 읽는다", () => {
    expect(
      missionProgressOf(JSON.stringify({ goals: [], turnsLeft: 1, ended: "finish" })),
    ).toMatchObject({ ended: "finish", requiredDone: false });
    const state = run([...started, ...turn(required(null, false))]);
    expect(state.successPrompt).toBe("none");
  });
});

describe("채점 대기 판", () => {
  test("MC-U6 미리보기에서 채점 대기 판을 열면 곧장 채점 중 — 리포트 · 채점 실패로 간다", () => {
    const grading = run([{ type: "pending-opened", conversationId: P1 }]);
    expect(grading).toMatchObject({ phase: "grading", conversationId: P1, lines: [] });
    const failed = run(
      [
        {
          type: "finished",
          value: { status: "grading_failed", conversationId: P1, retryable: true, refunded: false },
        },
      ],
      grading,
    );
    expect(failed.phase).toBe("grading-failed");
    expect(run([{ type: "grading-requested" }], failed).phase).toBe("grading");
    const talking = run(started);
    expect(run([{ type: "pending-opened", conversationId: P1 }], talking)).toBe(talking);
  });
});
