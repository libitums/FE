import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import type { ChatSendDeps, ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import { createChatSendHandler } from "./chat-send-handler.ts";
import {
  checkTurnOrder,
  decodeTurnEvent,
  missionFinishResponseSchema,
  missionStartResponseSchema,
  parseSse,
  type TurnEvent,
} from "./companion-contract/index.ts";
import { fakeMissionLlm } from "./companion-llm-mission.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";
import { createMissionFinishHandler } from "./mission-finish-handler.ts";
import { createMissionHintHandler } from "./mission-hint-handler.ts";
import { createMissionStartHandler } from "./mission-start-handler.ts";
import { missionBlockedLine } from "./mission-turn.ts";

// 미션 함수 셋과 `chat-send`의 미션 갈래 — 가짜 fetch(RPC마다 정해 둔 반환) + 가짜 LLM. 실제 SQL에 무는 한 판은
// `mission-server.integration.test.ts`가 본다.

const cafe = JSON.parse(
  readFileSync(fileURLToPath(new URL("./missions/u06-cafe.json", import.meta.url)), "utf8"),
);
const user = "00000000-0000-4000-8000-0000000000aa";
const tester = "00000000-0000-4000-8000-0000000000bb";
const conversation = "00000000-0000-4000-8000-0000000000cc";
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-key",
  llm: { kind: "fake" },
  translation: "every",
};

const goalsState = (done: readonly string[]) =>
  cafe.goals.map((goal: { id: string; required: boolean; label: unknown }) => ({
    id: goal.id,
    required: goal.required,
    label: goal.label,
    done: done.includes(goal.id),
  }));
const state = (done: readonly string[] = [], turns = 0, hints = 0) => ({
  status: "active",
  endReason: null,
  goals: goalsState(done),
  turnsUsed: turns,
  turnLimit: 10,
  turnsLeft: 10 - turns,
  hintsUsed: hints,
  hintLimit: 3,
  hintsLeft: 3 - hints,
  offTask: 0,
  gradingFailed: false,
});
const mission = { id: "u06-cafe", version: 1, definition: cafe };
const report = {
  conversationId: conversation,
  missionId: "u06-cafe",
  missionVersion: 1,
  outcome: "success",
  endReason: "goals",
  totalScore: 73,
  taskScore: 75,
  accuracyScore: 85,
  expressionScore: 50,
  hintsUsed: 0,
  weights: { task: 0.5, accuracy: 0.3, expression: 0.2, hintPenalty: 5 },
  goals: goalsState(["order", "pay", "stay"]).map((goal: object) => ({ ...goal, evidence: null })),
  expressions: [],
  corrections: [],
  retry: [],
  summary: "",
  bestScore: 73,
  graderModel: "fake",
  createdAt: "2026-11-19T00:00:00.000Z",
  payment: "free_daily",
};

type Rpc = (args: Record<string, unknown>) => unknown;
function harness(rpcs: Record<string, Rpc>, llm: CompanionLlm = fakeMissionLlm()) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const logs: string[] = [];
  const reply = (status: number, body: unknown) => ({
    status,
    text: async () => JSON.stringify(body),
  });
  const outbound = async (request: OutboundRequest) => {
    if (request.url.endsWith("/auth/v1/user"))
      return request.headers["Authorization"] === "Bearer user-token"
        ? reply(200, { id: user })
        : reply(401, {});
    const fn = /rpc\/([a-z_]+)$/.exec(request.url)?.[1] ?? "";
    const args = JSON.parse(request.body ?? "{}") as Record<string, unknown>;
    calls.push({ fn, args });
    const handler = rpcs[fn];
    return handler === undefined ? reply(404, {}) : reply(200, handler(args));
  };
  const deps: ChatSendDeps = {
    env,
    outbound,
    llm,
    nowMs: () => Date.parse("2026-11-19T00:00:00Z"),
    randomUuid: () => "00000000-0000-4000-8000-0000000000dd",
    log: (entry) => logs.push(`${entry.event} ${entry.status} ${entry.outcome ?? ""}`),
    pingIntervalMs: 60_000,
  };
  return { deps, calls, logs };
}
const post = (fn: string, body: object, headers: Record<string, string> = {}) =>
  new Request(`https://ref.supabase.co/functions/v1/${fn}`, {
    method: "POST",
    headers: { Authorization: "Bearer user-token", ...headers },
    body: JSON.stringify({ contract_version: 1, ...body }),
  });
async function events(response: Response): Promise<TurnEvent[]> {
  return parseSse(await response.text()).map((raw) => {
    const decoded = decodeTurnEvent(raw);
    if (!decoded.ok) throw new Error(`invalid event ${raw.event}`);
    return decoded.event;
  });
}

const started = {
  result: "ok",
  conversationId: conversation,
  mission,
  state: state(),
  openingMessageId: "00000000-0000-4000-8000-0000000000ee",
  opening: cafe.opening,
  persona: null,
  payment: "coins",
  creditsReserved: 10,
  holdId: "h",
  freeRemaining: 0,
  balance: 90,
  abandoned: [],
};

describe("mission-start", () => {
  test("MH1. 정상 — 계약의 응답 · 엽전 판 · 인자", async () => {
    const { deps, calls } = harness({ companion_mission_start: () => started });
    const response = await createMissionStartHandler(deps)(
      post("mission-start", { mission_id: "u06-cafe" }),
    );
    expect(response.status).toBe(200);
    const body = missionStartResponseSchema.parse(await response.json());
    expect(body).toMatchObject({
      conversationId: conversation,
      charge: { source: "credits", credits: 10 },
      opening: { ko: cafe.opening.ko, translation: null },
    });
    expect(calls[0]).toEqual({
      fn: "companion_mission_start",
      args: { p_user_id: user, p_mission_id: "u06-cafe", p_now: "2026-11-19T00:00:00.000Z" },
    });
  });

  test("MH2. 거절 코드는 1단계 관례대로 — 402 detail · 403 · 404, 모르는 코드는 500", async () => {
    for (const [result, status] of [
      ["insufficient_credits", 402],
      ["not_available", 403],
      ["mission_not_found", 404],
      ["weird", 500],
    ] as const) {
      const { deps } = harness({
        companion_mission_start: () => ({ result, detail: { required: 10, balance: 3 } }),
      });
      const response = await createMissionStartHandler(deps)(
        post("mission-start", { mission_id: "u06-cafe" }),
      );
      expect(response.status, result).toBe(status);
      if (result === "insufficient_credits")
        expect(await response.json()).toEqual({
          error: "insufficient_credits",
          retryable: false,
          detail: { required: 10, balance: 3 },
        });
    }
  });

  test("MH3. 인증 — 토큰 없음 · 틀림 401, 플레이그라운드(서버 키 + 헤더)는 그 사용자, 본문 오류 400, GET 405", async () => {
    const { deps, calls } = harness({ companion_mission_start: () => started });
    const handler = createMissionStartHandler(deps);
    const bad = new Request("https://x/functions/v1/mission-start", { method: "POST", body: "{}" });
    expect((await handler(bad)).status).toBe(401);
    expect(
      (
        await handler(
          post("mission-start", { mission_id: "u06-cafe" }, { Authorization: "Bearer nope" }),
        )
      ).status,
    ).toBe(401);
    const playground = await handler(
      post(
        "mission-start",
        { mission_id: "u06-cafe" },
        { Authorization: "Bearer service-key", "x-companion-user-id": tester },
      ),
    );
    expect(playground.status).toBe(200);
    expect(calls.at(-1)?.args["p_user_id"]).toBe(tester);
    expect((await handler(post("mission-start", { mission_id: "U06 Cafe" }))).status).toBe(400);
    expect((await handler(new Request("https://x/functions/v1/mission-start"))).status).toBe(405);
  });
});

// ------------------------------------------------------------------ 미션 턴

const begun = (ageBand: "adult" | "minor" | "unknown", done: string[] = []) => ({
  result: "ok",
  conversationId: conversation,
  userMessageId: "00000000-0000-4000-8000-000000000011",
  mission,
  state: state(done),
  persona: null,
  profile: { ageBand, l1: "en", region: "KR", feedbackMode: "separate" },
  learning: { episodes: ["u06-cafe"], expressions: [] },
  notices: ["ai_disclosure"],
  history: [
    { role: "assistant", text: null, segments: [{ kind: "speech", text: cafe.opening.ko }] },
  ],
});
/** finish_turn은 받은 상태 줄을 합쳐 돌려준다(필수 둘이 끝나면 goals). */
const finishTurn =
  (prior: string[] = []) =>
  (args: Record<string, unknown>) => {
    const reported = ((args["p_mission"] as { goals_done?: string[] } | null)?.goals_done ??
      []) as string[];
    const done = args["p_status"] === "complete" ? [...new Set([...prior, ...reported])] : prior;
    const turns = args["p_status"] === "complete" ? 1 : 0;
    const ended = ["order", "pay"].every((id) => done.includes(id)) ? "goals" : null;
    return { result: "ok", state: state(done, turns), newlyDone: reported, ended };
  };
const turnRequest = (text: string, extra: object = {}) =>
  post("chat-send", {
    conversation_id: conversation,
    client_message_id: "00000000-0000-4000-8000-000000000022",
    text,
    input_mode: "text",
    ...extra,
  });

describe("chat-send — 미션 갈래", () => {
  test("MT1. 성인 — 받는 대로, 이벤트 순서 · mission 이벤트는 SQL 값 · creditsSpent 0 · 칩 없음 · 상태 줄을 SQL에 넘김", async () => {
    const { deps, calls } = harness({
      companion_mission_begin_turn: () => begun("adult"),
      companion_mission_finish_turn: finishTurn(),
    });
    const list = await events(
      await createChatSendHandler(deps)(turnRequest("아메리카노 주세요 [goal:order]")),
    );
    expect(checkTurnOrder(list)).toEqual({ ok: true });
    // 성인은 교정이 준비되는 대로 나가 조각 사이에 끼일 수 있다 — 순서 규칙은 checkTurnOrder가 본다.
    const names = list.map((event) => event.event);
    expect(names.filter((name) => name === "delta")).toHaveLength(3);
    expect(names.filter((name) => name === "translation")).toHaveLength(3);
    expect(names.filter((name) => name === "correction")).toHaveLength(1);
    expect(names.slice(-2)).toEqual(["mission", "done"]);
    expect(names).not.toContain("suggestions");
    expect(names).not.toContain("state");
    expect(list.find((event) => event.event === "mission")?.data).toMatchObject({
      turnsLeft: 9,
      ended: null,
    });
    expect(list.at(-1)).toMatchObject({ data: { creditsSpent: 0 } });
    const finish = calls.find((call) => call.fn === "companion_mission_finish_turn");
    expect(finish?.args).toMatchObject({
      p_status: "complete",
      p_mission: { goals_done: ["order"], off_task: false, closing: false },
    });
    expect(calls.map((call) => call.fn)).not.toContain("companion_begin_turn");
  });

  test("MT2. 상태 줄이 없으면 p_mission null — 목표는 그대로(SQL), 턴은 끝난다", async () => {
    const { deps, calls, logs } = harness({
      companion_mission_begin_turn: () => begun("adult"),
      companion_mission_finish_turn: finishTurn(),
    });
    const list = await events(await createChatSendHandler(deps)(turnRequest("음 [no-state]")));
    expect(list.at(-1)?.event).toBe("done");
    expect(
      calls.find((call) => call.fn === "companion_mission_finish_turn")?.args["p_mission"],
    ).toBeNull();
    expect(logs.some((line) => line.includes("state=missing"))).toBe(true);
  });

  test("MT3. 미성년 — 출력 검사 뒤에 한꺼번에, 걸리면 한 번 다시 만들어 통과한 답만", async () => {
    const { deps } = harness({
      companion_mission_begin_turn: () => begun("minor"),
      companion_mission_finish_turn: finishTurn(),
    });
    const list = await events(
      await createChatSendHandler(deps)(turnRequest("안녕하세요 [unsafe-reply]")),
    );
    expect(checkTurnOrder(list)).toEqual({ ok: true });
    const said = list.flatMap((event) => (event.event === "delta" ? [event.data.text] : []));
    expect(said.join(" ")).not.toContain("[unsafe]");
    expect(list.at(-1)?.event).toBe("done");
  });

  test("MT4. 위기 → crisis · done(저장 crisis), 입력 차단 → 고정 안내 · blocked 저장", async () => {
    const crisis = harness({
      companion_mission_begin_turn: () => begun("adult"),
      companion_mission_finish_turn: finishTurn(),
    });
    const crisisEvents = await events(
      await createChatSendHandler(crisis.deps)(turnRequest("죽고 싶어요")),
    );
    expect(crisisEvents.map((event) => event.event)).toEqual(["start", "notice", "crisis", "done"]);
    expect(crisis.calls.at(-1)?.args["p_status"]).toBe("crisis");
    const block = harness({
      companion_mission_begin_turn: () => begun("adult"),
      companion_mission_finish_turn: finishTurn(),
    });
    const blocked = await events(
      await createChatSendHandler(block.deps)(turnRequest("[block] 이상한 말")),
    );
    expect(checkTurnOrder(blocked)).toEqual({ ok: true });
    expect(blocked.find((event) => event.event === "delta")?.data).toMatchObject({
      text: missionBlockedLine,
    });
    expect(block.calls.at(-1)?.args).toMatchObject({ p_status: "blocked", p_mission: null });
  });

  test("MT5. 시작 거절은 스트림 전 HTTP — mission_ended 409 · 남의 판 404 · character_id 없이도 본문 통과", async () => {
    for (const [result, status] of [
      ["mission_ended", 409],
      ["mission_not_found", 404],
      ["turn_in_progress", 409],
    ] as const) {
      const { deps } = harness({ companion_mission_begin_turn: () => ({ result }) });
      const response = await createChatSendHandler(deps)(turnRequest("안녕하세요"));
      expect(response.status, result).toBe(status);
      expect(await response.json()).toMatchObject({ error: result });
    }
  });
});

// ------------------------------------------------------------------ 힌트 · 끝

describe("mission-hint", () => {
  const taken = () => ({
    result: "ok",
    goalId: "pay",
    goal: cafe.goals[1],
    state: state(["order"], 1, 1),
    mission,
    persona: null,
    l1: "en",
    history: [],
  });
  test("MN1. 정상 · 상한 409 · 만들기 실패는 503(힌트는 이미 셌다)", async () => {
    const ok = harness({ companion_mission_take_hint: taken });
    const response = await createMissionHintHandler(ok.deps)(
      post("mission-hint", { conversation_id: conversation }),
    );
    expect(await response.json()).toEqual({
      goalId: "pay",
      ko: "pay 할게요.",
      roman: "pay halgeyo.",
      meaning: "(fake) do pay",
      hintsLeft: 2,
    });
    const limit = harness({
      companion_mission_take_hint: () => ({ result: "hint_limit", detail: { limit: 3 } }),
    });
    expect(
      (
        await createMissionHintHandler(limit.deps)(
          post("mission-hint", { conversation_id: conversation }),
        )
      ).status,
    ).toBe(409);
    const failing = harness(
      { companion_mission_take_hint: taken },
      {
        ...fakeMissionLlm(),
        missionHint: async () => ({ ko: "  ", roman: "", meaning: "" }),
      },
    );
    const failed = await createMissionHintHandler(failing.deps)(
      post("mission-hint", { conversation_id: conversation }),
    );
    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({
      error: "hint_unavailable",
      retryable: true,
      detail: { hintsLeft: 2 },
    });
  });
});

describe("mission-finish", () => {
  test("MF1. 이미 채점됨 · 그만둠은 그대로, 채점 실패는 grading_failed RPC 뒤 grading_failed 응답", async () => {
    const graded = harness({ companion_mission_close: () => ({ result: "graded", report }) });
    const body = missionFinishResponseSchema.parse(
      await (
        await createMissionFinishHandler(graded.deps)(
          post("mission-finish", { conversation_id: conversation }),
        )
      ).json(),
    );
    expect(body).toMatchObject({ status: "graded", report: { totalScore: 73 } });
    expect(JSON.stringify(body)).not.toContain("payment");

    const quit = harness({
      companion_mission_close: () => ({ result: "abandoned", endReason: "user" }),
    });
    const quitBody = await (
      await createMissionFinishHandler(quit.deps)(
        post("mission-finish", { conversation_id: conversation, abandon: true }),
      )
    ).json();
    expect(quitBody).toEqual({ status: "abandoned", conversationId: conversation });
    expect(quit.calls[0]?.args["p_abandon"]).toBe(true);

    const material = {
      result: "grade",
      conversationId: conversation,
      endReason: "goals",
      mission,
      state: state(["order", "pay"], 2),
      transcript: [],
      corrections: [],
      weights: { task: 0.5, accuracy: 0.3, expression: 0.2, hintPenalty: 5 },
      profile: { l1: "en", ageBand: "adult" },
    };
    const failing = harness(
      {
        companion_mission_close: () => material,
        companion_mission_grading_failed: () => ({
          result: "released",
          refunded: 10,
          payment: "coins",
          state: state(),
        }),
      },
      { ...fakeMissionLlm(), gradeMission: async () => Promise.reject(new Error("timeout")) },
    );
    const failed = await (
      await createMissionFinishHandler(failing.deps)(
        post("mission-finish", { conversation_id: conversation }),
      )
    ).json();
    expect(failed).toEqual({
      status: "grading_failed",
      conversationId: conversation,
      retryable: true,
      refunded: true,
    });
    expect(failing.calls.map((call) => call.fn)).toEqual([
      "companion_mission_close",
      "companion_mission_grading_failed",
    ]);

    const saving = harness({
      companion_mission_close: () => material,
      companion_mission_save_result: () => ({ result: "graded", report, balance: 0 }),
    });
    await createMissionFinishHandler(saving.deps)(
      post("mission-finish", { conversation_id: conversation }),
    );
    expect(saving.calls[1]?.args["p_result"]).toMatchObject({
      goals: [
        { id: "order", achieved: true, evidence: null },
        { id: "pay", achieved: true, evidence: null },
        { id: "stay", achieved: false, evidence: null },
        { id: "price", achieved: false, evidence: null },
      ],
      accuracy: 80,
      graderModel: "fake",
    });
  });
});
