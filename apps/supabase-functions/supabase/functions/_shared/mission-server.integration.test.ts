import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { signIn, startTestDatabase } from "../../migrations/postgres.test-support";
import type { ChatSendDeps, ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import { createChatSendHandler } from "./chat-send-handler.ts";
import {
  checkTurnOrder,
  decodeTurnEvent,
  missionFinishResponseSchema,
  missionHintResponseSchema,
  missionListSchema,
  missionResultsSchema,
  missionStartResponseSchema,
  parseSse,
  type TurnEvent,
} from "./companion-contract/index.ts";
import { fakeMissionLlm } from "./companion-llm-mission.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";
import { createMissionFinishHandler } from "./mission-finish-handler.ts";
import { createMissionHintHandler } from "./mission-hint-handler.ts";
import { scoringFixtures } from "./mission-fixtures.ts";
import { defaultMissionScoring, scoreMission } from "./mission-score.ts";
import { createMissionStartHandler } from "./mission-start-handler.ts";

// 미션 핸들러를 실제 SQL(일회용 PostgreSQL + 모든 마이그레이션)에 물려 한 판을 처음부터 끝까지 돌립니다. 1단계에는 핸들러를 실제 DB에
// 무는 선례가 없어서, PostgREST 모양의 RPC 호출(`POST {url}/rest/v1/rpc/<fn>`)을 pg 질의로 옮기는 가짜 fetch를 둡니다(서버 키 역할 =
// service_role). LLM은 가짜(`fakeMissionLlm`) — 학습자 말의 낱말(`[goal:order]` 등)로 상태 줄을 낸다.
// 또 점수의 한 벌(SQL `save_result` ↔ 코어 `scoreMission`)과, 코어 미션 파일 둘이 `companion_upsert_mission`을 지나는지를 봅니다.

const at = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const cafe = JSON.parse(readFileSync(at("./missions/u06-cafe.json"), "utf8"));
const water = JSON.parse(readFileSync(at("./missions/u01-water.json"), "utf8"));

const learner = "00000000-0000-4000-8000-0000000000e1";
const userToken = "user-token";
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-key",
  llm: { kind: "fake" },
  translation: "every",
};

type Json = Record<string, any>;
let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;
let app: Awaited<ReturnType<typeof db.connect>>;
const rpcCalls: string[] = [];

/** PostgREST의 `rpc/<fn>` → `select public.<fn>(p_a => $1, …)`. 객체 · 배열 아닌 jsonb 값은 JSON 글로, 글 배열은 그대로. */
async function outbound(request: OutboundRequest) {
  const reply = (status: number, body: unknown) => ({
    status,
    text: async () => (body === null ? "" : JSON.stringify(body)),
  });
  if (request.url.endsWith("/auth/v1/user"))
    return request.headers["Authorization"] === `Bearer ${userToken}`
      ? reply(200, { id: learner })
      : reply(401, { error: "bad token" });
  const match = /\/rest\/v1\/rpc\/([a-z_]+)$/.exec(request.url);
  if (match === null) return reply(404, null);
  const fn = match[1] as string;
  rpcCalls.push(fn);
  const args = JSON.parse(request.body ?? "{}") as Record<string, unknown>;
  const names = Object.keys(args);
  const values = names.map((name) => {
    const value = args[name];
    if (name === "p_notices") return value;
    return value !== null && typeof value === "object" ? JSON.stringify(value) : value;
  });
  const sql = `select public.${fn}(${names.map((name, index) => `${name} => $${index + 1}`).join(", ")}) as r`;
  try {
    const result = await server.query(sql, values);
    return reply(200, result.rows[0].r);
  } catch (error) {
    return reply(400, { message: String(error) });
  }
}

const logs: string[] = [];
function deps(llm: CompanionLlm = fakeMissionLlm()): ChatSendDeps {
  return {
    env,
    outbound,
    llm,
    nowMs: () => Date.now(),
    randomUuid: () => randomUUID(),
    log: (entry) => logs.push(`${entry.event} ${entry.status} ${entry.outcome ?? ""}`),
    pingIntervalMs: 60_000,
  };
}
const post = (fn: string, body: unknown) =>
  new Request(`https://ref.supabase.co/functions/v1/${fn}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ contract_version: 1, ...(body as object) }),
  });
async function events(response: Response): Promise<TurnEvent[]> {
  return parseSse(await response.text()).map((raw) => {
    const decoded = decodeTurnEvent(raw);
    if (!decoded.ok) throw new Error(`invalid event ${raw.event}: ${raw.data}`);
    return decoded.event;
  });
}
const turn = async (conversationId: string, text: string) =>
  createChatSendHandler(deps())(
    post("chat-send", {
      conversation_id: conversationId,
      client_message_id: randomUUID(),
      text,
      input_mode: "text",
    }),
  );

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  await server.query("set role service_role");
  app = await db.connect();
  for (const definition of [cafe, water])
    await server.query("select public.companion_upsert_mission($1::jsonb)", [
      JSON.stringify(definition),
    ]);
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await app.query("reset role");
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'm@libitum.test', '{"duru_tester":"true"}')`,
    [learner],
  );
  await db.admin.query("insert into public.learning_progress (user_id, progress) values ($1, $2)", [
    learner,
    JSON.stringify({
      catalogProgress: Object.fromEntries(
        ["u06-cafe", "u01-water", "score-e0", "score-e1", "score-e2", "score-g3"].map((id) => [
          id,
          ["RP"],
        ]),
      ),
    }),
  ]);
  await db.admin.query(
    "update companion.settings set missions_enabled = true, missions_testers_only = true, mission_hint_limit = 3",
  );
});

describe("미션 파일 → 표", () => {
  test("MI1. 코어의 미션 파일 둘(목표 표현이 { id, ko, meaning } 객체)이 companion_upsert_mission을 지난다 · 같은 판은 changed false", async () => {
    // 처음 올리기는 beforeAll이 했다(여기까지 왔으면 검사를 지난 것).
    for (const definition of [cafe, water]) {
      const again = await server.query("select public.companion_upsert_mission($1::jsonb) as r", [
        JSON.stringify(definition),
      ]);
      expect(again.rows[0].r).toMatchObject({ changed: false });
    }
  });
});

describe("한 판 — 핸들러 + 실제 SQL", () => {
  test("MI2. start → 턴(목표 · 힌트 · 필수 달성) → 계속 한 턴 → finish(끝내기 · 채점 · 리포트) → 닫힌 판의 턴은 409 → 다시 finish는 같은 리포트 → 목록 · 지난 리포트", async () => {
    const started = await createMissionStartHandler(deps())(
      post("mission-start", { mission_id: "u06-cafe" }),
    );
    expect(started.status).toBe(200);
    const game = missionStartResponseSchema.parse(await started.json());
    expect(game).toMatchObject({
      missionId: "u06-cafe",
      counterpart: { label: "카페 직원", characterId: "doyun" },
      turnLimit: 10,
      turnsLeft: 10,
      hintsLeft: 3,
      charge: { source: "free", credits: 0 },
    });
    expect(game.goals.map((goal) => goal.done)).toEqual([false, false, false, false]);

    // 턴 1 — 나이 모름(프로필 없음)이라 출력 검사 뒤에 한꺼번에. 주문을 이루고 목표 표현을 쓴다.
    const first = await events(
      await turn(game.conversationId, "아메리카노 한 잔 주세요 [goal:order] [expr:patt:83586289]"),
    );
    expect(checkTurnOrder(first)).toEqual({ ok: true });
    expect(first.map((event) => event.event)).not.toContain("suggestions");
    expect(first.find((event) => event.event === "mission")?.data).toEqual({
      conversationId: game.conversationId,
      goals: [
        { id: "order", done: true },
        { id: "pay", done: false },
        { id: "stay", done: false },
        { id: "price", done: false },
      ],
      turnsLeft: 9,
      ended: null,
      requiredDone: false,
    });
    expect(first.at(-1)).toMatchObject({ event: "done", data: { creditsSpent: 0 } });

    // 힌트 — 못 이룬 필수 목표(pay).
    const hinted = await createMissionHintHandler(deps())(
      post("mission-hint", { conversation_id: game.conversationId }),
    );
    expect(hinted.status).toBe(200);
    expect(missionHintResponseSchema.parse(await hinted.json())).toMatchObject({
      goalId: "pay",
      hintsLeft: 2,
    });

    // 턴 2 — 상태 줄이 깨져도 턴은 끝나고 목표는 그대로, 턴은 센다.
    const broken = await events(await turn(game.conversationId, "음… [bad-state]"));
    expect(checkTurnOrder(broken)).toEqual({ ok: true });
    expect(broken.find((event) => event.event === "mission")?.data).toMatchObject({
      turnsLeft: 8,
      ended: null,
    });

    // 턴 3 — 결제로 필수 목표가 모두 끝났다. 선택(stay · price)이 남아 판은 이어진다(성공 확정 · 계속 가능).
    const last = await events(await turn(game.conversationId, "카드로 할게요 [goal:pay]"));
    expect(last.find((event) => event.event === "mission")?.data).toMatchObject({
      turnsLeft: 7,
      ended: null,
      requiredDone: true,
    });
    // 턴 4 — 계속하기. 목표 없이 한 턴 더.
    const more = await events(await turn(game.conversationId, "하나 더요"));
    expect(more.find((event) => event.event === "mission")?.data).toMatchObject({
      turnsLeft: 6,
      ended: null,
      requiredDone: true,
    });

    const finish = () =>
      createMissionFinishHandler(deps())(
        post("mission-finish", { conversation_id: game.conversationId }),
      );
    const graded = missionFinishResponseSchema.parse(await (await finish()).json());
    if (graded.status !== "graded") throw new Error(`not graded: ${graded.status}`);
    // 과업 2/4 = 50 · 정확도 80(가짜) · 표현 1/2 = 50 · 힌트 1 → round(25 + 24 + 10) − 5 = 54.
    expect(graded.report).toMatchObject({
      outcome: "success",
      endReason: "finish",
      taskScore: 50,
      accuracyScore: 80,
      expressionScore: 50,
      hintsUsed: 1,
      totalScore: 54,
      bestScore: 54,
      graderModel: "fake",
    });
    expect(graded.report.expressions).toEqual([
      {
        id: "patt:83586289",
        ko: "{음료} 한 잔 주세요.",
        meaning: "Please give me one {drink}.",
        used: true,
      },
      {
        id: "patt:fbe5e354",
        ko: "{명사} 얼마예요?",
        meaning: "How much is/are the {N}?",
        used: false,
      },
    ]);
    expect(graded.report.retry).toEqual([
      { ko: "아메리카노 얼마예요?", meaning: "How much is an americano?" },
    ]);
    expect(graded.report.corrections.length).toBeGreaterThanOrEqual(0);
    expect(logs.some((line) => line.includes("score_mismatch"))).toBe(false);
    expect(logs.some((line) => line.includes("mission_state_mismatch"))).toBe(false);
    const after = await turn(game.conversationId, "안녕히 계세요");
    expect(after.status).toBe(409);
    expect(await after.json()).toMatchObject({ error: "mission_closed" });
    // 몇 번 불러도 같은 결과.
    const again = missionFinishResponseSchema.parse(await (await finish()).json());
    expect(again).toEqual(graded);

    await signIn(app, learner);
    const list = missionListSchema.parse(
      (await app.query("select public.companion_list_missions() as r")).rows[0].r,
    );
    expect(list.missions.find((mission) => mission.id === "u06-cafe")).toMatchObject({
      unlocked: true,
      counterpartLabel: "카페 직원",
      best: { totalScore: 54, outcome: "success" },
    });
    const results = missionResultsSchema.parse(
      (await app.query("select public.companion_list_mission_results('u06-cafe') as r")).rows[0].r,
    );
    expect(results).toMatchObject({ missionId: "u06-cafe", bestScore: 54 });
    expect(results.results[0]).toEqual(graded.report);
  });

  test("MI3. 채점 실패 → grading_failed(값을 돌려줌) → 다시 부르면 채점만 다시 돌아 graded", async () => {
    const game = missionStartResponseSchema.parse(
      await (
        await createMissionStartHandler(deps())(post("mission-start", { mission_id: "u01-water" }))
      ).json(),
    );
    await events(await turn(game.conversationId, "아니요, 괜찮아요 [goal:bag]"));
    await events(await turn(game.conversationId, "카드로 할게요 [goal:pay]"));
    const failing: CompanionLlm = {
      ...fakeMissionLlm(),
      gradeMission: async () => {
        throw new Error("timeout");
      },
    };
    const call = (llm?: CompanionLlm) =>
      createMissionFinishHandler(deps(llm))(
        post("mission-finish", { conversation_id: game.conversationId }),
      );
    const failed = missionFinishResponseSchema.parse(await (await call(failing)).json());
    expect(failed).toEqual({
      status: "grading_failed",
      conversationId: game.conversationId,
      retryable: true,
      refunded: true,
    });
    // 깨진 출력도 실패로 — 이미 돌려줬으니 refunded false.
    const brokenLlm: CompanionLlm = {
      ...fakeMissionLlm(),
      gradeMission: async () => ({ goals: "x" }) as never,
    };
    expect(missionFinishResponseSchema.parse(await (await call(brokenLlm)).json())).toMatchObject({
      status: "grading_failed",
      refunded: false,
    });
    const graded = missionFinishResponseSchema.parse(await (await call()).json());
    expect(graded).toMatchObject({ status: "graded", report: { outcome: "success" } });
  });

  test("MI8. 성공 확정 판 — 그만두기는 끝내기처럼 채점, 방치 · 새 판 시작은 채점 대기(pending)로 닫혔다가 다음 finish에서 채점(ADR-0178 D15)", async () => {
    const start = async (id: string) =>
      missionStartResponseSchema.parse(
        await (
          await createMissionStartHandler(deps())(post("mission-start", { mission_id: id }))
        ).json(),
      );
    const finish = async (body: object) =>
      missionFinishResponseSchema.parse(
        await (await createMissionFinishHandler(deps())(post("mission-finish", body))).json(),
      );
    // 판을 여러 번 시작한다 — 하루 무료 횟수 뒤에는 엽전이 든다
    await db.admin.query(
      "select public.companion_grant_credits($1, 'paid', 500, 'purchase', gen_random_uuid()::text, null)",
      [learner],
    );
    const succeed = async (id: string) => {
      const game = await start(id);
      await events(await turn(game.conversationId, "아니요, 괜찮아요 [goal:bag]"));
      await events(await turn(game.conversationId, "카드로 할게요 [goal:pay]"));
      return game;
    };
    // ① 그만두기(abandon)여도 필수를 이뤘으면 채점 · 리포트
    const quit = await succeed("u01-water");
    expect(await finish({ conversation_id: quit.conversationId, abandon: true })).toMatchObject({
      status: "graded",
      report: { outcome: "success", endReason: "finish" },
    });
    // ② 방치 → pending → 다음 finish에서 채점
    const stale = await succeed("u01-water");
    await server.query("select public.companion_close_stale_missions(now() + interval '2 hours')");
    const pending = await db.admin.query(
      "select status, end_reason, mission_state->>'closedBy' as by from companion.conversations where id = $1",
      [stale.conversationId],
    );
    expect(pending.rows[0]).toEqual({ status: "pending", end_reason: "finish", by: "stale" });
    expect(await finish({ conversation_id: stale.conversationId })).toMatchObject({
      status: "graded",
      report: { outcome: "success" },
    });
    // ③ 성공 확정 판이 열린 채 새 판을 시작하면 그 판은 그만둠이 아니라 채점 대기
    const left = await succeed("u01-water");
    await start("u06-cafe");
    const leftRow = await db.admin.query(
      "select status, mission_state->>'closedBy' as by from companion.conversations where id = $1",
      [left.conversationId],
    );
    expect(leftRow.rows[0]).toEqual({ status: "pending", by: "new_mission" });
    expect(await finish({ conversation_id: left.conversationId })).toMatchObject({
      status: "graded",
    });
  });

  test("MI4. 그만둠 · 거절 코드 — abandon은 abandoned, 남의 판 · 없는 판은 404, 끝나지 않은 판의 채점은 409", async () => {
    const game = missionStartResponseSchema.parse(
      await (
        await createMissionStartHandler(deps())(post("mission-start", { mission_id: "u06-cafe" }))
      ).json(),
    );
    const finish = (body: object) =>
      createMissionFinishHandler(deps())(post("mission-finish", body));
    const notEnded = await finish({ conversation_id: game.conversationId });
    expect(notEnded.status).toBe(409);
    expect(await notEnded.json()).toMatchObject({ error: "mission_not_ended" });
    const missing = await finish({ conversation_id: randomUUID() });
    expect(missing.status).toBe(404);
    const quit = await finish({ conversation_id: game.conversationId, abandon: true });
    expect(await quit.json()).toEqual({ status: "abandoned", conversationId: game.conversationId });
    const closedTurn = await turn(game.conversationId, "안녕하세요");
    expect(closedTurn.status).toBe(409);
    expect(await closedTurn.json()).toMatchObject({ error: "mission_closed" });
    const unknown = await createMissionStartHandler(deps())(
      post("mission-start", { mission_id: "u99-none" }),
    );
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toMatchObject({ error: "mission_not_found" });
  });
});

// ------------------------------------------------------------------ 점수의 한 벌

const goalsOf = (count: number) => cafe.goals.slice(0, count);
const scoreMission4 = (id: string, targets: number) => ({
  ...cafe,
  id,
  episodeId: id,
  counterpart: { ...cafe.counterpart, characterId: undefined },
  targetExpressions: [
    ...cafe.targetExpressions,
    { id: "patt:00000001", ko: "가", meaning: "a" },
  ].slice(0, targets),
});

/** 판을 시작해 SQL로 바로 끝난 상태를 만들고(턴 생략) 채점 결과를 저장한다. */
async function saveScore(
  missionId: string,
  input: {
    goals: readonly { id: string; done: boolean }[];
    accuracy: number;
    used: number;
    targets: readonly string[];
    hints: number;
  },
) {
  const started = (
    await server.query("select public.companion_mission_start($1, $2, now()) as r", [
      learner,
      missionId,
    ])
  ).rows[0].r as Json;
  expect(started["result"]).toBe("ok");
  const id = started["conversationId"] as string;
  await db.admin.query(
    `update companion.conversations set end_reason = 'turn_limit', ended_at = now(),
       mission_state = mission_state || jsonb_build_object('hints', $2::integer) where id = $1`,
    [id, input.hints],
  );
  const saved = (
    await server.query(
      "select public.companion_mission_save_result($1, $2, $3::jsonb, now()) as r",
      [
        learner,
        id,
        JSON.stringify({
          goals: input.goals.map((goal) => ({ id: goal.id, achieved: goal.done })),
          accuracy: input.accuracy,
          expressions: input.targets.map((target, index) => ({
            id: target,
            used: index < input.used,
          })),
          retry: [],
          summary: "",
          graderModel: "test",
        }),
      ],
    )
  ).rows[0].r as Json;
  expect(saved["result"]).toBe("graded");
  return saved["report"] as Json;
}

describe("진입 대사 · 목표 글의 학습자 언어 — 번역 캐시", () => {
  test("MI7. 시작 두 번에 번역 호출은 한 번 · 목록도 같은 번역 · 미션 판이 오르면 다시 · 다른 언어는 따로", async () => {
    await db.admin.query("insert into companion.profiles (user_id, l1) values ($1, 'vi')", [
      learner,
    ]);
    await db.admin.query(
      "select public.companion_grant_credits($1, 'paid', 100, 'purchase', gen_random_uuid()::text, null)",
      [learner],
    );
    const translated: string[] = [];
    const base = fakeMissionLlm();
    const llm: CompanionLlm = {
      ...base,
      translate: async (request) => {
        translated.push(request.l1);
        return base.translate(request);
      },
    };
    const start = async () =>
      missionStartResponseSchema.parse(
        await (
          await createMissionStartHandler(deps(llm))(
            post("mission-start", { mission_id: "u01-water" }),
          )
        ).json(),
      );
    const first = await start();
    expect(first.l1).toBe("vi");
    expect(first.opening.translation).toBe(`[vi] ${water.opening.ko}`);
    expect(first.goals[0]?.label).toMatchObject({
      en: water.goals[0].label.en,
      vi: expect.stringMatching(/^\[vi\] /),
    });
    const second = await start();
    expect(second.opening.translation).toBe(first.opening.translation);
    expect(translated).toEqual(["vi"]);

    await signIn(app, learner);
    const list = missionListSchema.parse(
      (await app.query("select public.companion_list_missions() as r")).rows[0].r,
    );
    expect(list.l1).toBe("vi");
    expect(list.missions.find((mission) => mission.id === "u01-water")?.goals[0]?.label).toEqual(
      first.goals[0]?.label,
    );
    await app.query("reset role");

    await server.query("select public.companion_upsert_mission($1::jsonb)", [
      JSON.stringify({ ...water, version: water.version + 1 }),
    ]);
    await start();
    expect(translated).toEqual(["vi", "vi"]);
    await db.admin.query("update companion.profiles set l1 = 'ja' where user_id = $1", [learner]);
    expect((await start()).opening.translation).toBe(`[ja] ${water.opening.ko}`);
    expect(translated).toEqual(["vi", "vi", "ja"]);
    const rows = await db.admin.query(
      "select mission_version, language from companion.mission_translations where mission_id = 'u01-water' order by 1, 2",
    );
    expect(rows.rows).toEqual([
      { mission_version: water.version, language: "vi" },
      { mission_version: water.version + 1, language: "ja" },
      { mission_version: water.version + 1, language: "vi" },
    ]);
  });
});

describe("점수 — SQL save_result와 코어 scoreMission이 같은 값", () => {
  beforeAll(async () => {
    const missions = [
      scoreMission4("score-e0", 0),
      scoreMission4("score-e1", 1),
      scoreMission4("score-e2", 2),
      { ...scoreMission4("score-g3", 0), goals: goalsOf(3) },
    ];
    for (const definition of missions)
      await server.query("select public.companion_upsert_mission($1::jsonb) as r", [
        JSON.stringify(JSON.parse(JSON.stringify(definition))),
      ]);
  });

  test.each(scoringFixtures.map((fixture) => [fixture.name, fixture] as const))(
    "MI5. %s",
    async (_name, fixture) => {
      const mission = `score-e${fixture.expressionsTotal}`;
      const targets = scoreMission4(mission, fixture.expressionsTotal).targetExpressions.map(
        (entry: { id: string }) => entry.id,
      );
      const report = await saveScore(mission, {
        goals: fixture.goals,
        accuracy: fixture.accuracy,
        used: fixture.expressionsUsed,
        targets,
        hints: fixture.hintsUsed,
      });
      const core = scoreMission(fixture, defaultMissionScoring);
      expect({ total: report["totalScore"], outcome: report["outcome"] }).toEqual({
        total: core.total,
        outcome: core.outcome,
      });
      expect(report["totalScore"]).toBe(fixture.expected.total);
    },
  );

  // 세부 점수가 정수가 아닐 때(목표 셋 중 둘 = 66.67): 세부 점수를 먼저 반올림하면 77.5 → 78, PRD 식 그대로면 77.33 → 77.
  test("MI6. 과업이 소수일 때도 같다 — 목표 셋 중 둘 · 정확도 80 · 표현 없음 → 77", async () => {
    const goals = goalsOf(3).map((goal: { id: string; required: boolean }, index: number) => ({
      id: goal.id,
      required: goal.required,
      done: index < 2,
    }));
    const report = await saveScore("score-g3", {
      goals,
      accuracy: 80,
      used: 0,
      targets: [],
      hints: 0,
    });
    const core = scoreMission({
      goals,
      accuracy: 80,
      expressionsUsed: 0,
      expressionsTotal: 0,
      hintsUsed: 0,
    });
    expect(core.total).toBe(77);
    expect(report["totalScore"]).toBe(core.total);
    expect(report["taskScore"]).toBe(67);
  });
});
