import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 롤플레이 미션 DB(20261225, PRD docs/specs/ai-companion-mission.md · ADR-0176): 판 시작 · 턴 · 힌트 · 닫기 · 결과 저장 · 채점 실패 ·
// 방치 정리, 하루 무료 횟수 → 엽전 정액, 열림 · 계정 단위 판정, 남의 판 거절, 계정 삭제, 권한, 그리고 컴패니언 대화와의 격리.
// 모든 테스트 끝에 「지갑 버킷 잔액의 합 = 원장 delta의 합」을 사용자마다 단언한다.
const learner = "00000000-0000-4000-8000-0000000000d1";
const other = "00000000-0000-4000-8000-0000000000d2";
const plain = "00000000-0000-4000-8000-0000000000d3";

const cafe = {
  id: "u06-cafe",
  episodeId: "u06-cafe",
  version: 1,
  title: { ko: "커피 주문하기", en: "Order a coffee" },
  scene: "아침, 익선동 카페 끌림.",
  counterpart: {
    characterId: "doyun",
    label: "카페 직원",
    role: "카페 끌림의 아르바이트 직원.",
    relation: "손님과 직원 사이다.",
    register: "서비스 존댓말.",
    samples: ["뭐 드릴까요?"],
  },
  opening: {
    ko: "반가워요. 뭐 드릴까요?",
    roman: "bangawoyo. mwo deurilkkayo?",
    en: "Good to see you. What can I get you?",
  },
  goals: [
    {
      id: "order",
      required: true,
      label: { en: "Order a drink" },
      criteria: "음료 하나를 주문했다.",
    },
    {
      id: "pay",
      required: true,
      label: { en: "Say how you'll pay" },
      criteria: "결제 수단을 말했다.",
    },
    {
      id: "stay",
      required: false,
      label: { en: "For here or to go" },
      criteria: "매장 · 포장을 밝혔다.",
    },
    { id: "price", required: false, label: { en: "Ask the price" }, criteria: "가격을 물었다." },
  ],
  targetExpressions: ["patt:83586289", "patt:fbe5e354"],
  turnLimit: 10,
};
const water = {
  id: "u01-water",
  episodeId: "u01-water",
  version: 1,
  title: { ko: "편의점에서 계산하기", en: "Pay at the convenience store" },
  scene: "편의점 계산대.",
  counterpart: {
    label: "편의점 점원",
    role: "점원.",
    relation: "처음 보는 손님.",
    register: "짧은 존댓말.",
  },
  opening: { ko: "봉투 드릴까요?", roman: "bongtu deurilkkayo?", en: "Would you like a bag?" },
  goals: [
    {
      id: "bag",
      required: true,
      label: { en: "Answer about the bag" },
      criteria: "봉투에 답했다.",
    },
    {
      id: "pay",
      required: true,
      label: { en: "Say how you'll pay" },
      criteria: "결제 수단을 말했다.",
    },
    { id: "receipt", required: false, label: { en: "Receipt" }, criteria: "영수증에 답했다." },
  ],
  targetExpressions: ["patt:b3d9256a"],
  turnLimit: 3,
};

type Json = Record<string, any>;
let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let now: string;

const at = (minutesAgo: number) => new Date(Date.parse(now) - minutesAgo * 60_000).toISOString();
async function call(sql: string, params: unknown[]): Promise<Json> {
  return (await server.query(`select ${sql} as r`, params)).rows[0].r as Json;
}
const start = (user: string, mission: string, when = now) =>
  call("public.companion_mission_start($1, $2, $3)", [user, mission, when]);
const begin = (user: string, conversation: string, text = "아메리카노 한 잔 주세요", when = now) =>
  call("public.companion_mission_begin_turn($1, $2, $3, $4, 'text', $5)", [
    user,
    conversation,
    randomUUID(),
    text,
    when,
  ]);
async function finish(
  user: string,
  messageId: string,
  status: string,
  goals: string[],
  options: { feedback?: object; offTask?: boolean; moderation?: object[]; when?: string } = {},
) {
  return call(
    "public.companion_mission_finish_turn($1, $2, $3, $4::jsonb, $5::jsonb, $6::text[], $7::jsonb, $8::jsonb, $9)",
    [
      user,
      messageId,
      status,
      JSON.stringify({
        id: randomUUID(),
        segments: [{ kind: "speech", text: "네, 알겠습니다." }],
        meta: {},
      }),
      JSON.stringify(options.moderation ?? []),
      [],
      options.feedback ? JSON.stringify(options.feedback) : null,
      JSON.stringify({ goals_done: goals, off_task: options.offTask ?? false, closing: false }),
      options.when ?? now,
    ],
  );
}
async function turn(user: string, conversation: string, goals: string[], status = "complete") {
  const started = await begin(user, conversation);
  expect(started["result"]).toBe("ok");
  return finish(user, started["userMessageId"] as string, status, goals);
}
const close = (user: string, conversation: string, abandon = false) =>
  call("public.companion_mission_close($1, $2, $3, $4)", [user, conversation, abandon, now]);
const save = (user: string, conversation: string, result: object) =>
  call("public.companion_mission_save_result($1, $2, $3::jsonb, $4)", [
    user,
    conversation,
    JSON.stringify(result),
    now,
  ]);
const gradingFailed = (user: string, conversation: string) =>
  call("public.companion_mission_grading_failed($1, $2, $3)", [user, conversation, now]);
const hint = (user: string, conversation: string) =>
  call("public.companion_mission_take_hint($1, $2)", [user, conversation]);
const grant = (user: string, amount: number) =>
  db.admin.query(
    "select public.companion_grant_credits($1, 'paid', $2, 'purchase', gen_random_uuid()::text, null)",
    [user, amount],
  );
const balance = async (user: string) =>
  Number(
    (
      await db.admin.query(
        "select coalesce((select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = $1), 0) b",
        [user],
      )
    ).rows[0].b,
  );
const row = async (conversation: string) =>
  (await db.admin.query("select * from companion.conversations where id = $1", [conversation]))
    .rows[0] as Json;
const holds = async (conversation: string) =>
  (
    await db.admin.query(
      "select status, amount, plan_free from companion.credit_holds where conversation_id = $1 order by created_at",
      [conversation],
    )
  ).rows as Json[];
async function listMissions(user: string) {
  await signIn(app, user);
  return (await app.query("select public.companion_list_missions() as r")).rows[0].r as Json;
}
async function assertLedgerInvariant() {
  const rows = (
    await db.admin.query(`
      select u.id,
        coalesce((select sub_balance + grant_balance + paid_balance from companion.credit_wallets w where w.user_id = u.id), 0) as wallet,
        coalesce((select sum(delta) from companion.credit_ledger l where l.user_id = u.id), 0) as ledger
      from auth.users u`)
  ).rows as { wallet: string; ledger: string }[];
  for (const r of rows) expect(Number(r.wallet)).toBe(Number(r.ledger));
}
const grader = {
  goals: [
    { id: "order", achieved: true, evidence: "아메리카노 한 잔 주세요" },
    { id: "stay", achieved: true, evidence: "여기서 마실게요" },
    { id: "price", achieved: false },
  ],
  accuracy: 85,
  expressions: [
    { id: "patt:83586289", used: true },
    { id: "patt:fbe5e354", used: false },
  ],
  retry: ["아메리카노 얼마예요?"],
  summary: "주문을 잘했어요.",
  graderModel: "test-grader",
};
async function endedGame(user: string, mission = "u06-cafe") {
  const game = await start(user, mission);
  expect(game["result"]).toBe("ok");
  const id = game["conversationId"] as string;
  if (mission === "u06-cafe") await turn(user, id, ["order", "pay"]);
  else for (let i = 0; i < 3; i += 1) await turn(user, id, []);
  expect((await row(id))["end_reason"]).not.toBeNull();
  return id;
}

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
  now = new Date().toISOString();
  await app.query("reset role");
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 'a@libitum.test', '{"duru_tester":"true"}'), ($2, 'b@libitum.test', '{"duru_tester":"true"}'), ($3, 'c@libitum.test', '{}')`,
    [learner, other, plain],
  );
  const progress = JSON.stringify({
    catalogProgress: { "u06-cafe": ["S1", "RP"], "u01-water": ["RP"] },
  });
  await db.admin.query(
    "insert into public.learning_progress (user_id, progress) values ($1, $3), ($2, $3)",
    [learner, other, progress],
  );
  await db.admin.query(
    `update companion.settings set missions_enabled = true, missions_testers_only = true, mission_cost = 10,
       mission_hint_limit = 3, mission_hint_penalty = 5, mission_stale_after = interval '30 minutes'`,
  );
  await db.admin.query("update companion.missions set enabled = true");
});
afterEach(async () => {
  await assertLedgerInvariant();
});

test("MS1. 한 판의 정상 흐름 — 무료 판 시작 → 턴 둘 → 닫기 → 결과 저장(점수 SQL 계산) → 확정 · 몇 번 불러도 같은 결과", async () => {
  const game = await start(learner, "u06-cafe");
  expect(game).toMatchObject({
    result: "ok",
    payment: "free_daily",
    creditsReserved: 0,
    freeRemaining: 0,
    opening: cafe.opening,
    abandoned: [],
  });
  expect(game["mission"]).toMatchObject({ id: "u06-cafe", version: 1 });
  expect((game["persona"] as Json)["name"]).toBeTruthy();
  expect(game["state"]).toMatchObject({
    turnsLeft: 10,
    hintsLeft: 3,
    status: "active",
    endReason: null,
  });
  const id = game["conversationId"] as string;
  expect(await row(id)).toMatchObject({ kind: "mission", character_id: "doyun", status: "active" });

  const first = await begin(learner, id);
  expect(first).toMatchObject({ result: "ok", profile: { feedbackMode: "separate" } });
  expect((first["history"] as Json[]).map((m) => m["role"])).toEqual(["assistant"]);
  expect(first["learning"]).toHaveProperty("expressions");
  const feedback = {
    status: "ok",
    kind: "correction",
    original: "아메리카노 한 잔 주세요",
    corrected: "아메리카노 한 잔 주세요.",
  };
  const done1 = await finish(
    learner,
    first["userMessageId"] as string,
    "complete",
    ["order", "bogus"],
    {
      feedback,
      offTask: true,
    },
  );
  expect(done1).toMatchObject({ result: "ok", newlyDone: ["order"], ended: null });
  expect(done1["state"]).toMatchObject({ turnsUsed: 1, turnsLeft: 9, offTask: 1 });

  const done2 = await turn(learner, id, ["pay"]);
  expect(done2).toMatchObject({ newlyDone: ["pay"], ended: "goals" });
  expect(await begin(learner, id)).toMatchObject({ result: "mission_ended" });

  const material = await close(learner, id);
  expect(material).toMatchObject({ result: "grade", endReason: "goals" });
  expect((material["transcript"] as Json[]).map((m) => m["role"])).toEqual([
    "assistant",
    "user",
    "assistant",
    "user",
    "assistant",
  ]);
  expect(material["corrections"]).toHaveLength(1);
  expect(material["weights"]).toEqual({
    task: 0.5,
    accuracy: 0.3,
    expression: 0.2,
    hintPenalty: 5,
  });

  const saved = await save(learner, id, grader);
  expect(saved["result"]).toBe("graded");
  const report = saved["report"] as Json;
  // 과업 3/4 = 75 · 정확도 85 · 목표 표현 1/2 = 50 · 힌트 0 → round(37.5 + 25.5 + 10) = 73(부록 B).
  expect(report).toMatchObject({
    outcome: "success",
    taskScore: 75,
    accuracyScore: 85,
    expressionScore: 50,
    pronunciationScore: null,
    totalScore: 73,
    best: 73,
    payment: "free_daily",
    creditsSpent: 0,
    // 다시 해 볼 표현은 { ko, meaning }으로 남긴다(글자만 오면 뜻은 빈 글) — 계약 칸 retry · summary · bestScore도 함께.
    feedback: { retry: [{ ko: "아메리카노 얼마예요?", meaning: "" }], summary: "주문을 잘했어요." },
    retry: [{ ko: "아메리카노 얼마예요?", meaning: "" }],
    summary: "주문을 잘했어요.",
    bestScore: 73,
  });
  expect((report["goals"] as Json[]).map((g) => [g["id"], g["achieved"], g["byTurn"]])).toEqual([
    ["order", true, true],
    ["pay", true, true],
    ["stay", true, false],
    ["price", false, false],
  ]);
  expect(await row(id)).toMatchObject({ status: "finished" });
  expect(await holds(id)).toEqual([{ status: "settled", amount: 0, plan_free: true }]);

  expect(await close(learner, id)).toEqual({ result: "graded", report });
  expect((await save(learner, id, { ...grader, accuracy: 10 }))["report"]).toEqual(report);
  expect(
    Number((await db.admin.query("select count(*) n from companion.mission_results")).rows[0].n),
  ).toBe(1);

  await signIn(app, learner);
  const history = (await app.query("select public.companion_list_mission_results('u06-cafe') as r"))
    .rows[0].r as Json;
  expect(history["best"]).toEqual({ "u06-cafe": 73 });
  expect(history["results"]).toEqual([report]);
  const listed = await listMissions(learner);
  const card = (listed["missions"] as Json[]).find((m) => m["id"] === "u06-cafe") as Json;
  expect(card).toMatchObject({
    available: true,
    plays: 1,
    best: { totalScore: 73, outcome: "success" },
  });
  expect(JSON.stringify(card)).not.toContain("criteria");
});

test("MS2. 과금 — 무료 횟수 다음 엽전 정액 · 잔액 부족 거절 · 요금제의 무료 횟수", async () => {
  expect((await listMissions(learner))["price"]).toMatchObject({
    payment: "free_daily",
    freeDaily: 1,
    freeRemaining: 1,
    cost: 10,
    balance: 0,
  });
  const free = await start(learner, "u06-cafe");
  expect(free["payment"]).toBe("free_daily");
  await close(learner, free["conversationId"] as string, true);

  expect(await start(learner, "u06-cafe")).toEqual({
    result: "insufficient_credits",
    detail: { required: 10, balance: 0 },
  });
  await grant(learner, 15);
  const paid = await start(learner, "u01-water");
  expect(paid).toMatchObject({ result: "ok", payment: "coins", creditsReserved: 10, balance: 5 });
  expect(await holds(paid["conversationId"] as string)).toEqual([
    { status: "open", amount: 10, plan_free: false },
  ]);
  const ledger = (
    await db.admin.query(
      "select delta, kind, reason, ref_id from companion.credit_ledger where user_id = $1 and kind = 'reserve'",
      [learner],
    )
  ).rows;
  expect(ledger).toEqual([
    { delta: -10, kind: "reserve", reason: "mission", ref_id: paid["conversationId"] },
  ]);
  await assertLedgerInvariant();

  await db.admin.query(
    "insert into companion.entitlements (user_id, tier, source) values ($1, 'chat_plus', 'test')",
    [other],
  );
  expect((await listMissions(other))["price"]).toMatchObject({ freeDaily: 3, freeRemaining: 3 });
});

test("MS3. 열림 · 계정 단위 판정 — 스위치 · 시험 계정 · 에피소드 · 꺼진 미션 · 연령 · 일시 차단", async () => {
  expect(await start(plain, "u06-cafe")).toEqual({
    result: "not_available",
    detail: { reason: "testers_only" },
  });
  // 스위치에 걸려도 값(price)은 낸다 — 계약 `missionListSchema`.
  expect(await listMissions(plain)).toMatchObject({
    enabled: false,
    missions: [],
    price: { freeLeft: 1 },
  });
  await db.admin.query("update companion.settings set missions_testers_only = false");
  expect(await start(plain, "u06-cafe")).toEqual({
    result: "not_available",
    detail: { reason: "episode_locked" },
  });
  const cards = (await listMissions(plain))["missions"] as Json[];
  expect(cards.map((m) => [m["id"], m["available"], m["unavailableReason"]])).toEqual([
    ["u01-water", false, "episode_locked"],
    ["u06-cafe", false, "episode_locked"],
  ]);
  expect(await start(learner, "nope")).toEqual({ result: "mission_not_found" });
  await db.admin.query("update companion.missions set enabled = false where id = 'u06-cafe'");
  expect(await start(learner, "u06-cafe")).toEqual({
    result: "not_available",
    detail: { reason: "mission_disabled" },
  });
  await db.admin.query("update companion.settings set missions_enabled = false");
  expect(await start(learner, "u01-water")).toEqual({
    result: "not_available",
    detail: { reason: "disabled" },
  });
  await db.admin.query("update companion.settings set missions_enabled = true");

  await db.admin.query(
    "insert into companion.moderation_state (user_id, blocked_until) values ($1, $2)",
    [learner, at(-30)],
  );
  expect((await start(learner, "u01-water"))["result"]).toBe("temporarily_blocked");
  await db.admin.query("delete from companion.moderation_state");
  await db.admin.query(
    "insert into companion.profiles (user_id, birth_year, age_source) values ($1, $2, 'self')",
    [learner, new Date(now).getUTCFullYear() - 10],
  );
  expect(await start(learner, "u01-water")).toMatchObject({ result: "age_restricted" });
  // 하한은 컴패니언과 같은 만 14세(20261217) — 13세도 막힌다.
  await db.admin.query("update companion.profiles set birth_year = $2 where user_id = $1", [
    learner,
    new Date(now).getUTCFullYear() - 13,
  ]);
  expect(await start(learner, "u01-water")).toMatchObject({ result: "age_restricted" });
});

test("MS4. 턴 상한 — 실패 · 차단 턴은 세지 않고, 상한에 닿으면 끝(turn_limit) · 실패 결과", async () => {
  const id = (await start(learner, "u01-water"))["conversationId"] as string;
  const blocked = await begin(learner, id);
  expect(
    await finish(learner, blocked["userMessageId"] as string, "blocked", ["bag"], {
      moderation: [{ layer: "input", category: "harassment", action: "block" }],
    }),
  ).toMatchObject({ newlyDone: [], ended: null, state: { turnsUsed: 0 } });
  const failed = await begin(learner, id);
  expect(await finish(learner, failed["userMessageId"] as string, "failed", ["bag"])).toMatchObject(
    {
      state: { turnsUsed: 0 },
    },
  );
  expect(
    Number(
      (
        await db.admin.query("select strikes from companion.moderation_state where user_id = $1", [
          learner,
        ])
      ).rows[0].strikes,
    ),
  ).toBe(1);

  expect(await turn(learner, id, ["bag"])).toMatchObject({ ended: null, state: { turnsUsed: 1 } });
  expect(await turn(learner, id, [])).toMatchObject({ ended: null, state: { turnsLeft: 1 } });
  expect(await turn(learner, id, [])).toMatchObject({
    ended: "turn_limit",
    state: { turnsLeft: 0 },
  });
  expect(await close(learner, id)).toMatchObject({ result: "grade", endReason: "turn_limit" });
  const report = (await save(learner, id, { goals: [], accuracy: 50, expressions: [] }))[
    "report"
  ] as Json;
  // 과업 1/3 = 33 · 정확도 50 · 목표 표현 0 → round(16.5 + 15) = 32(반올림은 0에서 멀어지는 쪽).
  expect(report).toMatchObject({
    outcome: "fail",
    endReason: "turn_limit",
    taskScore: 33,
    totalScore: 32,
  });
});

test("MS5. 힌트 — 필수 먼저 · 파일 순서, 판당 3번, 1회 −5점, 끝난 판 · 남은 목표 없음", async () => {
  const id = (await start(learner, "u06-cafe"))["conversationId"] as string;
  expect(await hint(learner, id)).toMatchObject({
    result: "ok",
    goalId: "order",
    state: { hintsLeft: 2 },
  });
  await turn(learner, id, ["order", "stay"]);
  expect(await hint(learner, id)).toMatchObject({ goalId: "pay" });
  const third = await hint(learner, id);
  expect(third).toMatchObject({ goalId: "pay", state: { hintsUsed: 3, hintsLeft: 0 } });
  expect((third["history"] as Json[]).length).toBe(3);
  expect(await hint(learner, id)).toEqual({ result: "hint_limit", detail: { limit: 3 } });
  expect((await row(id))["mission_state"]["hintGoals"]).toEqual(["order", "pay", "pay"]);

  await turn(learner, id, ["pay", "price"]);
  expect(await hint(learner, id)).toMatchObject({ result: "mission_ended" });
  const report = (
    await save(learner, id, {
      goals: [],
      accuracy: 100,
      expressions: [
        { id: "patt:83586289", used: true },
        { id: "patt:fbe5e354", used: true },
      ],
    })
  )["report"] as Json;
  expect(report).toMatchObject({
    taskScore: 100,
    totalScore: 85,
    hintsUsed: 3,
    outcome: "success",
  });
});

test("MS6. 그만둠 — 리포트 없이 abandoned · 예약 확정(환불 없음) · 무료 횟수도 돌려주지 않음", async () => {
  await grant(learner, 10);
  const freeGame = (await start(learner, "u06-cafe"))["conversationId"] as string;
  expect(await close(learner, freeGame, true)).toMatchObject({
    result: "abandoned",
    endReason: "user",
  });
  expect((await listMissions(learner))["price"]).toMatchObject({ freeRemaining: 0 });

  const paid = (await start(learner, "u06-cafe"))["conversationId"] as string;
  expect(await balance(learner)).toBe(0);
  await turn(learner, paid, ["order"]);
  expect(await close(learner, paid, true)).toMatchObject({ result: "abandoned", balance: 0 });
  expect(await holds(paid)).toEqual([{ status: "settled", amount: 10, plan_free: false }]);
  expect(await row(paid)).toMatchObject({ status: "abandoned", end_reason: "user" });
  expect(await close(learner, paid)).toMatchObject({ result: "abandoned" });
  expect(await begin(learner, paid)).toMatchObject({ result: "mission_closed" });
  expect(await save(learner, paid, grader)).toMatchObject({ result: "abandoned" });
  expect(await gradingFailed(learner, paid)).toMatchObject({ result: "abandoned" });
  expect(
    Number((await db.admin.query("select count(*) n from companion.mission_results")).rows[0].n),
  ).toBe(0);
});

test("MS7. 채점 실패 — 값을 돌려주고 다시 시도 · 성공하면 다시 받는다 · 그 사이 잔액이 모자라면 리포트만", async () => {
  const freeGame = await endedGame(learner);
  expect(await close(learner, freeGame)).toMatchObject({ result: "grade" });
  expect(await gradingFailed(learner, freeGame)).toMatchObject({
    result: "released",
    refunded: 0,
    payment: "free_daily",
    state: { gradingFailed: true, status: "active" },
  });
  expect((await listMissions(learner))["price"]).toMatchObject({ freeRemaining: 1 });
  expect(await gradingFailed(learner, freeGame)).toMatchObject({
    result: "released",
    refunded: 0,
    payment: null,
  });
  expect(await close(learner, freeGame)).toMatchObject({
    result: "grade",
    state: { gradingFailed: true },
  });
  expect((await save(learner, freeGame, grader))["report"]).toMatchObject({
    payment: "free_daily",
  });
  expect((await listMissions(learner))["price"]).toMatchObject({ freeRemaining: 0 });
  expect(await holds(freeGame)).toEqual([
    { status: "released", amount: 0, plan_free: true },
    { status: "settled", amount: 0, plan_free: true },
  ]);

  await grant(learner, 10);
  const paid = await endedGame(learner);
  expect(await balance(learner)).toBe(0);
  expect(await gradingFailed(learner, paid)).toMatchObject({
    result: "released",
    refunded: 10,
    balance: 10,
  });
  await assertLedgerInvariant();
  // 그 사이 잔액이 빠졌다(팩 환불 회수).
  await db.admin.query("select companion.revoke_coins($1, 10, 'test')", [learner]);
  const retried = await save(learner, paid, grader);
  expect(retried["report"]).toMatchObject({ payment: "none", creditsSpent: 0, totalScore: 73 });
  expect(await row(paid)).toMatchObject({ status: "finished" });

  await grant(learner, 10);
  const charged = await endedGame(learner);
  await gradingFailed(learner, charged);
  expect((await save(learner, charged, grader))["report"]).toMatchObject({
    payment: "coins",
    creditsSpent: 10,
  });
  expect(await balance(learner)).toBe(0);
});

test("MS8. 방치 판 정리 — 30분 지난 진행 중 판만 stale(확정) · 채점 실패 판과 새 판은 그대로 · 10분 예약 정리는 판 예약을 건드리지 않음", async () => {
  await grant(learner, 10);
  const stale = (await start(learner, "u06-cafe", at(60)))["conversationId"] as string;
  await db.admin.query("update companion.credit_holds set created_at = now() - interval '1 hour'");
  expect(
    Number(await call("public.companion_release_stale_holds(interval '10 minutes')", [])).valueOf(),
  ).toBe(0);
  expect(await holds(stale)).toEqual([{ status: "open", amount: 0, plan_free: true }]);

  const failedGame = await endedGame(other);
  await gradingFailed(other, failedGame);
  await db.admin.query("update companion.conversations set last_message_at = $2 where id = $1", [
    failedGame,
    at(90),
  ]);

  expect(await call("public.companion_close_stale_missions($1)", [now])).toBe(1);
  expect(await row(stale)).toMatchObject({ status: "abandoned", end_reason: "stale" });
  expect(await holds(stale)).toEqual([{ status: "settled", amount: 0, plan_free: true }]);
  expect(await row(failedGame)).toMatchObject({ status: "active", end_reason: "goals" });

  const fresh = (await start(learner, "u06-cafe"))["conversationId"] as string;
  expect(await call("public.companion_close_stale_missions($1)", [now])).toBe(0);
  expect(await row(fresh)).toMatchObject({ status: "active" });
});

test("MS9. 진행 중인 판이 있을 때 새 판 — 앞 판은 그만둠(user) · 예약 확정, 진행 중인 판은 하나", async () => {
  await grant(learner, 20);
  const first = (await start(learner, "u06-cafe"))["conversationId"] as string;
  const second = await start(learner, "u01-water");
  expect(second).toMatchObject({ result: "ok", payment: "coins", abandoned: [first] });
  expect(await row(first)).toMatchObject({ status: "abandoned", end_reason: "user" });
  expect(await holds(first)).toEqual([{ status: "settled", amount: 0, plan_free: true }]);
  const active = await db.admin.query(
    "select count(*) n from companion.conversations where user_id = $1 and kind = 'mission' and status = 'active'",
    [learner],
  );
  expect(Number(active.rows[0].n)).toBe(1);
  await expect(
    db.admin.query(
      `insert into companion.conversations (user_id, kind, mission_id, mission_version, status, mission_state)
       values ($1, 'mission', 'u06-cafe', 1, 'active', '{}')`,
      [learner],
    ),
  ).rejects.toMatchObject({ code: "23505" });
});

test("MS10. 남의 판 — 시작 · 턴 · 힌트 · 닫기 · 저장 · 채점 실패 모두 mission_not_found, 남의 메시지로 턴 끝은 P0002", async () => {
  const game = await start(learner, "u06-cafe");
  const id = game["conversationId"] as string;
  const mine = await begin(learner, id);
  expect(await begin(other, id)).toEqual({ result: "mission_not_found" });
  expect(await hint(other, id)).toEqual({ result: "mission_not_found" });
  expect(await close(other, id)).toEqual({ result: "mission_not_found" });
  expect(await close(other, id, true)).toEqual({ result: "mission_not_found" });
  expect(await save(other, id, grader)).toEqual({ result: "mission_not_found" });
  expect(await gradingFailed(other, id)).toEqual({ result: "mission_not_found" });
  await expect(
    finish(other, mine["userMessageId"] as string, "complete", ["order"]),
  ).rejects.toMatchObject({
    code: "P0002",
  });
  expect(await row(id)).toMatchObject({ status: "active" });
  // 진행 중 턴 · 중복
  expect(await begin(learner, id)).toEqual({ result: "turn_in_progress" });
  await finish(learner, mine["userMessageId"] as string, "complete", []);
  const clientId = randomUUID();
  const again = (text: string) =>
    call("public.companion_mission_begin_turn($1, $2, $3, $4, 'text', $5)", [
      learner,
      id,
      clientId,
      text,
      now,
    ]);
  const sent = await again("하나");
  await finish(learner, sent["userMessageId"] as string, "complete", []);
  expect(await again("하나")).toMatchObject({ result: "duplicate_message" });
});

test("MS11. 계정 삭제 — 판 · 메시지 · 결과 · 예약 · 무료 횟수가 CASCADE로 지워진다", async () => {
  const id = await endedGame(learner);
  await save(learner, id, grader);
  await db.admin.query("delete from auth.users where id = $1", [learner]);
  for (const table of [
    "companion.conversations",
    "companion.messages",
    "companion.mission_results",
    "companion.credit_holds",
    "companion.mission_usage",
  ]) {
    const result = await db.admin.query(`select count(*) n from ${table} where user_id = $1`, [
      learner,
    ]);
    expect(Number(result.rows[0].n)).toBe(0);
  }
});

test("MS12. 권한 — 서버 함수는 service_role만, 앱 조회는 authenticated만, 표는 닿지 않는다", async () => {
  const serverOnly = [
    "public.companion_mission_start($1, 'u06-cafe', now())",
    "public.companion_mission_begin_turn($1, gen_random_uuid(), gen_random_uuid(), 'a', 'text', now())",
    "public.companion_mission_take_hint($1, gen_random_uuid())",
    "public.companion_mission_close($1, gen_random_uuid(), false, now())",
    "public.companion_mission_save_result($1, gen_random_uuid(), '{}'::jsonb, now())",
    "public.companion_mission_grading_failed($1, gen_random_uuid(), now())",
    "public.companion_inspect_missions($1)",
  ];
  for (const role of ["authenticated", "anon"]) {
    await signIn(app, learner);
    await app.query(`set role ${role}`);
    for (const sql of serverOnly)
      await expect(app.query(`select ${sql}`, [learner])).rejects.toMatchObject({ code: "42501" });
    for (const sql of [
      "select public.companion_upsert_mission('{}'::jsonb)",
      "select public.companion_close_stale_missions(now())",
      "select public.companion_inspect_mission(gen_random_uuid())",
      "select * from companion.missions",
    ])
      await expect(app.query(sql)).rejects.toMatchObject({ code: "42501" });
  }
  await app.query("set role anon");
  await expect(app.query("select public.companion_list_missions()")).rejects.toMatchObject({
    code: "42501",
  });
  await signIn(app, learner);
  expect((await app.query("select public.companion_list_missions() as r")).rows[0].r).toMatchObject(
    { enabled: true },
  );
  await app.query("reset role");
});

test("MS13. 미션 정의 올리기 — 판을 올리지 않은 변경 · 낮은 판 · 모양이 틀린 정의는 거절, 진행 중 판은 시작한 판의 정의를 쓴다", async () => {
  expect(await call("public.companion_upsert_mission($1::jsonb)", [JSON.stringify(cafe)])).toEqual({
    id: "u06-cafe",
    version: 1,
    changed: false,
  });
  const reject = (definition: object) =>
    expect(
      call("public.companion_upsert_mission($1::jsonb)", [JSON.stringify(definition)]),
    ).rejects.toMatchObject({
      code: "22023",
    });
  await reject({ ...cafe, turnLimit: 12 });
  await reject({ ...cafe, version: 2, goals: [{ ...cafe.goals[0], required: false }] });
  await reject({ ...cafe, version: 2, goals: [] });
  await reject({ ...cafe, version: 2, turnLimit: "10" });
  await reject({
    ...cafe,
    version: 2,
    counterpart: { ...cafe.counterpart, characterId: "nobody" },
  });

  const id = (await start(learner, "u06-cafe"))["conversationId"] as string;
  expect(
    await call("public.companion_upsert_mission($1::jsonb)", [
      JSON.stringify({ ...cafe, version: 2, turnLimit: 4 }),
    ]),
  ).toMatchObject({ changed: true });
  await reject(cafe);
  expect((await begin(learner, id))["state"]).toMatchObject({ turnLimit: 10 });
  await db.admin.query("delete from companion.mission_versions where version = 2");
  await db.admin.query(
    "update companion.missions set version = 1, definition = $1::jsonb where id = 'u06-cafe'",
    [JSON.stringify(cafe)],
  );
});

test("MS14. 격리 — 미션 행이 있어도 기록 · 목록 · 선톡 후보 · 기억 마저 뽑기 · 대화 비우기 · 첫 인사 · 추천 답변 맥락 · 캐릭터당 고유 색인 · 컴패니언 턴이 그대로", async () => {
  await db.admin.query("update companion.characters set active = true where id = 'doyun'");
  // 선톡은 성인만 — 두 계정 모두 성인으로.
  await db.admin.query(
    "insert into companion.profiles (user_id, birth_year, age_source) values ($1, 1990, 'self'), ($2, 1990, 'self')",
    [learner, other],
  );
  const companion = (
    await db.admin.query(
      "insert into companion.conversations (user_id, character_id, last_message_at) values ($1, 'doyun', $2) returning id",
      [learner, at(60 * 30)],
    )
  ).rows[0].id as string;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, status, client_message_id, text, created_at)
     values ($1, $2, 'user', 'complete', gen_random_uuid(), '컴패니언 글', $3)`,
    [companion, learner, at(60 * 30)],
  );
  const finished = await endedGame(learner);
  await save(learner, finished, grader);
  const active = (await start(other, "u06-cafe"))["conversationId"] as string;
  await turn(other, active, ["order"]);
  const missionIds = [finished, active];

  await signIn(app, learner);
  const listed = (await app.query("select public.companion_list_messages('doyun', null, 50) as r"))
    .rows[0].r as Json;
  expect((listed["messages"] as Json[]).map((m) => m["text"])).toEqual(["컴패니언 글"]);
  const characters = (await app.query("select public.companion_list_characters() as r")).rows[0]
    .r as Json[];
  expect(Date.parse((characters.find((c) => c["id"] === "doyun") as Json)["lastMessageAt"])).toBe(
    Date.parse(at(60 * 30)),
  );

  const proactive = (await call("public.companion_proactive_candidates($1, 50)", [
    now,
  ])) as unknown as Json[];
  expect(proactive.map((c) => c["conversationId"])).toEqual([companion]);
  const flush = (await call("public.companion_memory_flush_candidates($1, 50)", [
    now,
  ])) as unknown as Json[];
  for (const candidate of flush) expect(missionIds).not.toContain(candidate["conversationId"]);

  // 첫 인사: 미션 행만 있는 인물은 「메시지 없음」 그대로(무료 등급은 엽전이 한 턴 값 이상이어야 판정을 지난다).
  await grant(other, 30);
  const greet = await call("public.companion_greet_context($1, 'doyun', $2)", [other, now]);
  expect(greet).toMatchObject({ result: "ok", hasMessages: false });
  const greeted = await call(
    "public.companion_save_greeting($1, 'doyun', gen_random_uuid(), $2::jsonb, null, null, $3)",
    [other, JSON.stringify([{ kind: "speech", text: "안녕하세요!" }]), now],
  );
  expect(greeted).toMatchObject({ saved: true });
  // 추천 답변 맥락(20261216에서 다시 정의) — 지난 대화 · 마지막 답이 미션 행에서 오지 않는다.
  const suggest = await call("public.companion_suggest_context($1, 'doyun', 20, $2)", [other, now]);
  expect(suggest["result"]).toBe("ok");
  expect(JSON.stringify(suggest["history"])).not.toContain("알겠습니다");
  expect((suggest["latest"] as Json)["origin"]).toBe("greeting");
  expect(
    Number(
      (
        await db.admin.query(
          "select count(*) n from companion.conversations where user_id = $1 and character_id = 'doyun' and kind = 'companion'",
          [other],
        )
      ).rows[0].n,
    ),
  ).toBe(1);

  // 컴패니언 턴은 컴패니언 대화를 쓰고 지난 대화에 미션 글이 없다.
  const companionTurn = await call(
    "public.companion_begin_turn($1, 'doyun', gen_random_uuid(), '안녕', 'text', 20, null, $2)",
    [other, now],
  );
  expect(companionTurn["result"]).toBe("ok");
  expect(missionIds).not.toContain(companionTurn["conversationId"]);
  expect(JSON.stringify(companionTurn["history"])).not.toContain("알겠습니다");

  // 대화 비우기: 컴패니언 대화만 지우고 미션 판 · 결과는 남는다.
  expect((await app.query("select public.companion_clear_chat('doyun') as r")).rows[0].r).toEqual({
    status: "cleared",
  });
  expect(await row(finished)).toMatchObject({ status: "finished" });
  expect(
    Number((await db.admin.query("select count(*) n from companion.mission_results")).rows[0].n),
  ).toBe(1);
  expect(
    Number(
      (
        await db.admin.query("select count(*) n from companion.conversations where id = $1", [
          companion,
        ])
      ).rows[0].n,
    ),
  ).toBe(0);
  await app.query("reset role");

  // 미션 행에는 컴패니언 모양(캐릭터 필수 · 미션 칸 없음)을 쓸 수 없다.
  await expect(
    db.admin.query("insert into companion.conversations (user_id, kind) values ($1, 'companion')", [
      learner,
    ]),
  ).rejects.toMatchObject({ code: "23514" });
  // 미션의 상대역 메시지는 origin 'mission' — 컴패니언의 평가 · 미디어 대상(turn · greeting · proactive)이 아니다.
  const origins = await db.admin.query(
    "select distinct origin from companion.messages where conversation_id = any($1::uuid[]) and role = 'assistant'",
    [missionIds],
  );
  expect(origins.rows).toEqual([{ origin: "mission" }]);
});

test("MS15. 운영 조회 — 한 사용자의 판 · 예약 · 결과, 한 판의 전문", async () => {
  const id = await endedGame(learner);
  await save(learner, id, grader);
  const inspected = await call("public.companion_inspect_missions($1)", [learner]);
  expect(inspected["games"]).toHaveLength(1);
  expect((inspected["games"] as Json[])[0]).toMatchObject({
    conversationId: id,
    status: "finished",
    result: { totalScore: 73 },
    holds: [{ status: "settled", amount: 0, free: true }],
  });
  const one = await call("public.companion_inspect_mission($1)", [id]);
  expect((one["messages"] as Json[]).length).toBe(3);
  expect(one["result"]).toMatchObject({ totalScore: 73 });
  expect(one["definition"]).toMatchObject({ id: "u06-cafe" });
});
