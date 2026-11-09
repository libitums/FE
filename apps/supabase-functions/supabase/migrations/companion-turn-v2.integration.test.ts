import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// M2 ~ M4: 피드백 저장 · 친밀도와 말투 · 반복 위반 제재 · 체험과 크레딧 · 미국 미성년자 규칙 · 기억 · 선톡 · 요약.
const tester = "00000000-0000-4000-8000-000000000001";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

let seq = 0;
const nextId = () => `10000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

type Begun = {
  result: string;
  detail?: Record<string, unknown>;
  userMessageId: string;
  holdId: string;
  creditsReserved: number;
  trial: boolean;
  memories: { kind: string; content: string; shared: boolean }[];
};

async function gate(character = "duksu", region: string | null = null) {
  const result = await server.query("select public.companion_turn_gate($1, $2, $3, $4, $5) as g", [
    tester,
    character,
    nextId(),
    now,
    region,
  ]);
  return result.rows[0].g as Record<string, unknown>;
}
async function begin(character = "duksu", clientMessageId = nextId(), text = "안녕하세요") {
  const result = await server.query(
    "select public.companion_begin_turn($1, $2, $3, $4, 'text', 20, null, $5) as t",
    [tester, character, clientMessageId, text, now],
  );
  return result.rows[0].t as Begun;
}
async function finish(
  turn: Begun,
  status: string,
  options: { feedback?: unknown; delta?: number; moderation?: unknown[]; assistant?: boolean } = {},
) {
  const result = await server.query(
    "select public.companion_finish_turn($1, $2, $3::jsonb, $4::jsonb, '{}', $5, $6::jsonb, $7, null, $8) as f",
    [
      turn.userMessageId,
      status,
      options.assistant === false || status !== "complete"
        ? null
        : JSON.stringify({ id: crypto.randomUUID(), segments: [{ kind: "speech", text: "네!" }] }),
      JSON.stringify(options.moderation ?? []),
      now,
      options.feedback === undefined ? null : JSON.stringify(options.feedback),
      options.delta ?? 0,
      turn.holdId,
    ],
  );
  return result.rows[0].f as {
    speechLevel: string;
    speechLevelChanged: boolean;
    creditsSpent: number;
    balance: number | null;
  };
}
async function turn(
  character = "duksu",
  options: Parameters<typeof finish>[2] = {},
  status = "complete",
) {
  const begun = await begin(character);
  expect(begun.result).toBe("ok");
  return finish(begun, status, options);
}
const grant = (amount: number, ref: string | null = null, bucket = "grant") =>
  server.query("select public.companion_grant_credits($1, $2, $3, 'operator', $4, null) as ok", [
    tester,
    bucket,
    amount,
    ref,
  ]);
const premium = () =>
  server.query("select public.companion_set_entitlement($1, 'premium', null, 'test')", [tester]);
async function ledgerMatchesWallet() {
  const result = await db.admin.query(
    `select coalesce((select sum(delta) from companion.credit_ledger where user_id = $1), 0)::int as ledger,
            coalesce((select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = $1), 0)::int as wallet`,
    [tester],
  );
  expect(result.rows[0].ledger).toBe(result.rows[0].wallet);
}

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  await server.query("set role service_role");
}, 30_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query(
    "update companion.settings set trial_limit = 20, message_cost = 1, minor_daily_limit_seconds = null",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 't@libitum.test', '{"duru_tester": true}')`,
    [tester],
  );
  await signIn(app, tester);
});

test("TV1. 피드백 카드 — 정상 턴에만 저장되고 메시지 목록의 유저 메시지에 그대로 붙는다", async () => {
  const feedback = {
    status: "ok",
    kind: "correction",
    original: "안녕하세요",
    corrected: "안녕하세요!",
    items: [{ original: "마리아 이에요", corrected: "마리아예요", reason: "noun + 예요" }],
    better: { text: "반가워요!", explanation: "casual" },
    meaning: null,
  };
  await turn("duksu", { feedback });
  const blocked = await begin();
  await finish(blocked, "blocked", { feedback });

  const page = await app.query("select public.companion_list_messages('duksu', null, 20) as p");
  const users = (
    page.rows[0].p.messages as { role: string; status: string; feedback: unknown }[]
  ).filter((m) => m.role === "user");
  expect(users.map((m) => [m.status, m.feedback])).toEqual([
    ["blocked", null],
    ["complete", { userMessageId: expect.any(String), ...feedback }],
  ]);
});

// TV13 — 카드 이전(20261116 전)에 저장된 행도 메시지 목록에서 같은 카드 모양으로 읽힌다.
test("TV13. 피드백 카드 — 옛 행(kind마다 다른 모양)은 읽을 때 카드로 바뀐다", async () => {
  const one = await begin("duksu", nextId(), "I'm hungry");
  await finish(one, "complete");
  const two = await begin("duksu", nextId(), "저는 마리아 이에요");
  await finish(two, "complete");
  await db.admin.query(
    `insert into companion.corrections (message_id, status, kind, items, better, l1_to_ko) values
       ($1, 'ok', 'l1_to_ko', null, null, '{"text": "배고파요.", "meaning": "I am hungry."}'),
       ($2, 'ok', 'correction', '[{"original": "마리아 이에요", "corrected": "마리아예요", "reason": "r"}]',
        '{"text": "마리아라고 해요.", "meaning": "I am called Maria.", "explanation": "e"}', null)`,
    [one.userMessageId, two.userMessageId],
  );
  const page = await app.query("select public.companion_list_messages('duksu', null, 20) as p");
  const byText = Object.fromEntries(
    (page.rows[0].p.messages as { role: string; text: string; feedback: unknown }[])
      .filter((m) => m.role === "user")
      .map((m) => [m.text, m.feedback]),
  );
  expect(byText["I'm hungry"]).toEqual({
    userMessageId: one.userMessageId,
    status: "ok",
    kind: "l1_to_ko",
    original: "I'm hungry",
    corrected: "배고파요.",
    items: [],
    better: null,
    meaning: "I am hungry.",
  });
  expect(byText["저는 마리아 이에요"]).toEqual({
    userMessageId: two.userMessageId,
    status: "ok",
    kind: "correction",
    original: "저는 마리아 이에요",
    corrected: null,
    items: [{ original: "마리아 이에요", corrected: "마리아예요", reason: "r" }],
    better: { text: "마리아라고 해요.", explanation: "e" },
    meaning: "I am called Maria.",
  });
});

test("TV2. 친밀도 — 범위로 잘리고, 문턱에서 말투가 한 번 바뀌고, 페르소나 상한을 넘지 않는다", async () => {
  await premium();
  await grant(100);
  const results = [];
  for (let i = 0; i < 7; i += 1) results.push(await turn("mina", { delta: 100 }));
  // 한 턴 최대 +3 → 7턴에 21, casual 문턱(20)은 7번째 턴에서 넘는다.
  expect(results.map((r) => r.speechLevelChanged)).toEqual([
    false,
    false,
    false,
    false,
    false,
    false,
    true,
  ]);
  expect(results.at(-1)?.speechLevel).toBe("casual");

  // 윤경은 끝까지 존댓말(maxSpeechLevel polite).
  for (let i = 0; i < 20; i += 1) await turn("yoonkyung", { delta: 3 });
  const yoonkyung = await db.admin.query(
    "select intimacy, speech_level from companion.relationships where character_id = 'yoonkyung'",
  );
  expect(yoonkyung.rows[0]).toEqual({ intimacy: 60, speech_level: "polite" });
  // 내려가지 않는다.
  const down = await turn("mina", { delta: -2 });
  expect(down).toMatchObject({ speechLevel: "casual", speechLevelChanged: false });
});

test("TV3. 반복 위반 — 입력 차단 세 번이면 일시 차단, 출력 차단은 세지 않는다", async () => {
  const inputBlock = [{ layer: "input", category: "sexual", action: "block" }];
  const outputBlock = [
    { layer: "input", category: "safe", action: "allow" },
    { layer: "output_sync", category: "sexual", action: "block" },
  ];
  await turn("duksu", { moderation: outputBlock }, "blocked");
  await turn("duksu", { moderation: outputBlock }, "blocked");
  expect(await gate()).toMatchObject({ result: "ok" });
  await turn("duksu", { moderation: inputBlock }, "blocked");
  await turn("duksu", { moderation: inputBlock }, "blocked");
  expect(await gate()).toMatchObject({ result: "ok" });
  await turn("duksu", { moderation: inputBlock }, "blocked");
  expect(await gate()).toMatchObject({
    result: "temporarily_blocked",
    detail: { until: expect.any(String) },
  });
});

// TV4 — 체험은 무료 티어의 덕수쌤에만, 다 쓰면 크레딧이 있을 때만 이어진다(PRD §3.1 · §3.10).
test("TV4. 체험 — 한도까지 무료, 다 쓰면 trial_exhausted, 크레딧이 있으면 차감", async () => {
  await db.admin.query("update companion.settings set trial_limit = 2");
  expect(await turn()).toMatchObject({ creditsSpent: 0 });
  expect(await turn()).toMatchObject({ creditsSpent: 0 });
  expect(await begin()).toEqual({ result: "trial_exhausted", detail: { characterId: "duksu" } });
  // 막힌 시도는 아무것도 쓰지 않는다.
  const pending = await db.admin.query(
    "select count(*)::int as n from companion.messages where status = 'pending'",
  );
  expect(pending.rows[0].n).toBe(0);

  await grant(3);
  expect(await turn()).toMatchObject({ creditsSpent: 1, balance: 2 });
  // 무료 티어는 다른 캐릭터에 닿지 못한다.
  expect(await gate("mina")).toEqual({ result: "not_available" });
  await ledgerMatchesWallet();
});

test("TV5. 크레딧 — 부족하면 insufficient_credits, 확정 · 해제, 같은 메시지는 한 번만 예약", async () => {
  await premium();
  expect(await begin("mina")).toEqual({
    result: "insufficient_credits",
    detail: { required: 1, balance: 0 },
  });
  await grant(5);

  expect(await turn("mina")).toMatchObject({ creditsSpent: 1, balance: 4 });
  // 답이 가지 않은 턴은 해제 — 잔액이 돌아온다.
  for (const status of ["blocked", "crisis", "failed"]) {
    expect(await turn("mina", {}, status)).toMatchObject({ creditsSpent: 0, balance: 4 });
  }
  // 실패한 같은 메시지를 다시 보내면 새로 예약한다. 처리 중인 같은 메시지는 같은 예약을 쓴다.
  const id = nextId();
  const first = await begin("mina", id);
  const again = await begin("mina", id);
  expect(again.holdId).toBe(first.holdId);
  const wallet = await server.query("select public.companion_inspect_wallet($1, 50) as w", [
    tester,
  ]);
  expect(wallet.rows[0].w).toMatchObject({
    tier: "premium",
    grant: 3,
    balance: 3,
    openHolds: [{ amount: 1 }],
  });
  await finish(first, "complete");
  await ledgerMatchesWallet();
});

test("TV6. 지급은 영수증마다 한 번 · 구독분 소멸 · 정리 작업이 열린 예약을 해제한다", async () => {
  expect((await grant(5, "receipt-1", "paid")).rows[0].ok).toBe(true);
  expect((await grant(5, "receipt-1", "paid")).rows[0].ok).toBe(false);
  await server.query(
    "select public.companion_grant_credits($1, 'sub', 10, 'subscription', 'sub-1', now() - interval '1 minute')",
    [tester],
  );
  expect(
    (await server.query("select public.companion_expire_sub_credits(now()) as n")).rows[0].n,
  ).toBe(1);

  await premium();
  const stuck = await begin("mina");
  await db.admin.query(
    "update companion.credit_holds set created_at = now() - interval '1 hour' where id = $1",
    [stuck.holdId],
  );
  expect(
    (await server.query("select public.companion_release_stale_holds(interval '10 minutes') as n"))
      .rows[0].n,
  ).toBe(1);
  const status = await db.admin.query("select status from companion.messages where id = $1", [
    stuck.userMessageId,
  ]);
  expect(status.rows[0].status).toBe("failed");
  const wallet = await app.query("select public.companion_get_wallet() as w");
  expect(wallet.rows[0].w).toMatchObject({ sub: 0, paid: 5, grant: 0, tier: "premium" });
  await ledgerMatchesWallet();
});

test("TV7. 미국 미성년자 — 12 ~ 15세 · 나이 모름은 장기 메모리를 끄고, 하루 2시간 상한", async () => {
  const year = new Date(now).getUTCFullYear();
  // 지역을 모르면 끄지 않는다 — SQL null이 「꺼짐」으로 새지 않게 값으로 확인한다.
  expect((await gate("duksu", null))["memoryEnabled"]).toBe(true);
  expect(await gate("duksu", "US")).toMatchObject({
    result: "ok",
    memoryEnabled: false,
    ageBand: "unknown",
  });
  expect(await gate("duksu", "KR")).toMatchObject({ memoryEnabled: true });
  await db.admin.query(
    "insert into companion.profiles (user_id, birth_year, age_source) values ($1, $2, 'self')",
    [tester, year - 15],
  );
  expect(await gate("duksu", "US")).toMatchObject({ memoryEnabled: false, ageBand: "minor" });
  await db.admin.query("update companion.profiles set birth_year = $2 where user_id = $1", [
    tester,
    year - 17,
  ]);
  expect(await gate("duksu", "US")).toMatchObject({ memoryEnabled: true });

  await db.admin.query(
    "insert into companion.usage_daily (user_id, day, active_seconds, last_activity_at, continuous_started_at) values ($1, (now() at time zone 'utc')::date, 7200, now() - interval '1 hour', now() - interval '2 hours')",
    [tester],
  );
  expect(await gate("duksu", "US")).toMatchObject({
    result: "usage_time_limit",
    detail: { limit: "daily" },
  });
  expect(await gate("duksu", "KR")).toMatchObject({ result: "ok" });
});

test("TV8. 기억 — 같은 원본은 한 번, 앱이 보고 · 고치고 · 지우고, 지운 것은 다음 턴에 없다", async () => {
  const first = await begin();
  await finish(first, "complete");
  const items = JSON.stringify([
    { kind: "fact", content: "고양이를 키운다", shared: true },
    { kind: "event", content: "어제 경복궁에 갔다", shared: false },
  ]);
  const add = (source: string) =>
    server.query("select public.companion_add_memories($1, 'duksu', $2, $3::jsonb) as n", [
      tester,
      source,
      items,
    ]);
  expect((await add(first.userMessageId)).rows[0].n).toBe(2);
  expect((await add(first.userMessageId)).rows[0].n).toBe(0);
  // 다른 턴에서 같은 기억이 다시 나와도 하나만 남는다.
  const second = await begin();
  await finish(second, "complete");
  expect((await add(second.userMessageId)).rows[0].n).toBe(0);

  const shared = await app.query("select public.companion_list_memories(null) as m");
  expect(shared.rows[0].m).toMatchObject([{ content: "고양이를 키운다", characterId: null }]);
  const own = await app.query("select public.companion_list_memories('duksu') as m");
  const eventId = own.rows[0].m[0].id as string;
  await app.query("select public.companion_update_memory($1, '어제 덕수궁에 갔다')", [eventId]);
  expect((await begin()).memories.map((m) => m.content).sort()).toEqual([
    "고양이를 키운다",
    "어제 덕수궁에 갔다",
  ]);
  await app.query("select public.companion_delete_memory($1)", [eventId]);
  expect((await begin()).memories.map((m) => m.content)).toEqual(["고양이를 키운다"]);
  await expect(
    app.query("select public.companion_delete_memory($1)", [eventId]),
  ).rejects.toMatchObject({ code: "P0002" });
});

test("TV9. 선톡 — 공백이 길고 성인인 대화만 후보, 저장은 차감 없이", async () => {
  await turn();
  await db.admin.query(
    "update companion.conversations set last_message_at = now() - interval '2 days'",
  );
  const empty = await server.query("select public.companion_proactive_candidates(now(), 10) as c");
  expect(empty.rows[0].c).toEqual([]);

  await db.admin.query(
    "insert into companion.profiles (user_id, birth_year, age_source) values ($1, 1990, 'self')",
    [tester],
  );
  const candidates = await server.query(
    "select public.companion_proactive_candidates(now(), 10) as c",
  );
  expect(candidates.rows[0].c).toMatchObject([{ userId: tester, characterId: "duksu" }]);
  await server.query(
    "select public.companion_save_proactive($1, 'duksu', $2, $3::jsonb, '{}', now())",
    [
      tester,
      crypto.randomUUID(),
      JSON.stringify([{ kind: "speech", text: "오늘 퀴즈 하나 어때요?" }]),
    ],
  );
  const after = await server.query("select public.companion_proactive_candidates(now(), 10) as c");
  expect(after.rows[0].c).toEqual([]);
});

test("TV10. 요약 원문 — 기록 창 밖 메시지가 기준 수만큼 모이면 돌려주고, 저장 뒤에는 다시 오지 않는다", async () => {
  await db.admin.query("update companion.settings set summary_after = 4");
  await turn();
  await turn();
  const id = (await db.admin.query("select id from companion.conversations")).rows[0].id as string;
  const read = (keep: number) =>
    server
      .query("select public.companion_summary_source($1, $2) as s", [id, keep])
      .then((r) => r.rows[0].s);
  expect(await read(2)).toBeNull();
  await turn();
  const ready = await read(2);
  expect(ready.messages).toHaveLength(4);
  await server.query("select public.companion_save_summary($1, '요약', $2)", [id, ready.until]);
  expect(await read(2)).toBeNull();
});

test("TV11. 운영자 — 프로필 바꾸기 · 지역 지우기 · 초기화(공유 기억 · 체험 사용량까지, 크레딧은 그대로)", async () => {
  const set = (birthYear: number | null, region: string | null, mode: string | null) =>
    server.query("select public.companion_operator_set_profile($1, $2, false, 'tl', $3, $4)", [
      tester,
      birthYear,
      mode,
      region,
    ]);
  await set(1990, "PH", "prefix");
  const testers = await server.query("select public.companion_inspect_testers() as t");
  expect(testers.rows[0].t[0]).toMatchObject({
    birthYear: 1990,
    region: "PH",
    feedbackMode: "prefix",
    l1: "tl",
    ageBand: "adult",
  });
  await set(null, "", null);
  const cleared = await server.query("select public.companion_inspect_testers() as t");
  expect(cleared.rows[0].t[0]).toMatchObject({
    birthYear: 1990,
    region: null,
    feedbackMode: "prefix",
  });

  await db.admin.query("update companion.settings set trial_limit = 1");
  const first = await begin();
  await finish(first, "complete");
  await server.query("select public.companion_add_memories($1, 'duksu', $2, $3::jsonb)", [
    tester,
    first.userMessageId,
    JSON.stringify([{ kind: "fact", content: "공유 기억", shared: true }]),
  ]);
  await grant(5);
  await server.query("select public.companion_operator_reset($1, 'duksu')", [tester]);
  const left = await db.admin.query(
    `select (select count(*) from companion.memories)::int as memories,
            (select count(*) from companion.trial_usage)::int as trials,
            (select count(*) from companion.conversations)::int as conversations,
            (select grant_balance from companion.credit_wallets) as credits`,
  );
  expect(left.rows[0]).toEqual({ memories: 0, trials: 0, conversations: 0, credits: 5 });
  expect(await turn()).toMatchObject({ creditsSpent: 0 });
});

// TV12 — 표 하나라도 RLS를 빠뜨리면 노출 설정이 바뀌는 날 그 표가 열린다. 스키마의 모든 표를 확인한다.
test("TV12. companion 스키마의 모든 표는 RLS가 켜져 있다", async () => {
  const result = await db.admin.query(
    "select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'companion' and c.relkind = 'r' and not c.relrowsecurity",
  );
  expect(result.rows).toEqual([]);
});
