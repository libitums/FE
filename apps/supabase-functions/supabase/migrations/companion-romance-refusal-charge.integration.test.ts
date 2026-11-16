import { readFile } from "node:fs/promises";

import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20261204(ADR-0152): 일시 차단 없이 반복 위반을 세고 상한 뒤 거절 턴은 차감 · 페르소나 로맨스 태도 · 해금 선톡 줄.
const tester = "00000000-0000-4000-8000-000000000001";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
const migration = new URL("./20261204120000_companion_romance_refusal_charge.sql", import.meta.url);
const unlocksJson = new URL("../../../../docs/content/companion-unlocks.json", import.meta.url);

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

const inputBlock = [{ layer: "input", category: "sexual", action: "block" }];
const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);

let seq = 0;
const nextId = () => `20000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

async function begin(at = now) {
  const result = await server.query(
    "select public.companion_begin_turn($1, 'duksu', $2, '나쁜 말', 'text', 20, null, $3) as t",
    [tester, nextId(), at],
  );
  return result.rows[0].t as { result: string; userMessageId: string; holdId: string | null };
}

/** 턴 판정(`chat-send`가 시작 전에 부른다) — 일시 차단은 여기서 걸린다. */
async function gate() {
  const result = await server.query(
    "select public.companion_turn_gate($1, 'duksu', $2, $3, null) as g",
    [tester, nextId(), now],
  );
  return (result.rows[0].g as { result: string }).result;
}

type Finish = { creditsSpent: number; balance: number | null };

/** 입력 차단 턴 하나 — `reply`가 참이면 캐릭터의 거절 답이 간 턴이다. */
async function blockedTurn(options: { reply?: boolean; at?: string; moderation?: unknown } = {}) {
  const at = options.at ?? now;
  const turn = await begin(at);
  expect(turn.result).toBe("ok");
  const assistantId = crypto.randomUUID();
  const finished = await server.query(
    "select public.companion_finish_turn($1, 'blocked', $2::jsonb, $3::jsonb, '{}', $4, null, 0, null, $5) as f",
    [
      turn.userMessageId,
      options.reply === false
        ? null
        : JSON.stringify({
            id: assistantId,
            origin: "turn",
            segments: [{ kind: "speech", text: "그런 말은 안 돼요." }],
            meta: { refusal: true },
          }),
      JSON.stringify(options.moderation ?? inputBlock),
      at,
      turn.holdId,
    ],
  );
  return { ...(finished.rows[0].f as Finish), assistantId, holdId: turn.holdId };
}

const strikes = async () =>
  (await db.admin.query("select strikes, blocked_until from companion.moderation_state")).rows[0];
const grant = (amount: number) =>
  server.query("select public.companion_grant_credits($1, 'grant', $2, 'operator', null, null)", [
    tester,
    amount,
  ]);

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
  server = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await settings(
    "strike_limit = 3, strike_window = interval '24 hours', trial_limit = 0, message_cost = 3",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 't@libitum.test', '{"duru_tester": true}')`,
    [tester],
  );
  await signIn(app, tester);
});

test("RC1. 상한(3)까지 거절 턴은 무료, 그 뒤 거절 턴은 매번 메시지 요금을 차감한다 — 일시 차단은 없다", async () => {
  await grant(30);
  const results: Finish[] = [];
  for (let index = 0; index < 6; index += 1) results.push(await blockedTurn());
  expect(results.map((result) => [result.creditsSpent, result.balance])).toEqual([
    [0, 30],
    [0, 30],
    [0, 30],
    [3, 27],
    [3, 24],
    [3, 21],
  ]);
  expect(await strikes()).toEqual({ strikes: 6, blocked_until: null });
  // 여섯 번을 넘어도 다음 턴을 받는다.
  expect(await gate()).toBe("ok");
});

test("RC2. 차감한 거절 답에는 쓴 엽전이 남고 예약이 확정된다 · 무료 거절은 예약을 푼다", async () => {
  await grant(30);
  const free = await blockedTurn();
  await blockedTurn();
  await blockedTurn();
  const charged = await blockedTurn();
  const spent = await db.admin.query(
    "select id, credits_spent from companion.messages where id = any($1::uuid[])",
    [[free.assistantId, charged.assistantId]],
  );
  expect(
    Object.fromEntries(spent.rows.map((row) => [row.id as string, row.credits_spent as number])),
  ).toEqual({ [free.assistantId]: 0, [charged.assistantId]: 3 });
  const holds = await db.admin.query(
    "select id, status from companion.credit_holds where id = any($1::uuid[])",
    [[free.holdId, charged.holdId]],
  );
  expect(Object.fromEntries(holds.rows.map((row) => [row.id as string, row.status]))).toEqual({
    [free.holdId as string]: "released",
    [charged.holdId as string]: "settled",
  });
});

test("RC3. 상한을 넘어도 거절 답이 못 간 턴은 차감하지 않는다 — 수는 센다", async () => {
  await grant(30);
  for (let index = 0; index < 3; index += 1) await blockedTurn();
  expect(await blockedTurn({ reply: false })).toMatchObject({ creditsSpent: 0, balance: 30 });
  expect(await strikes()).toMatchObject({ strikes: 4 });
  expect(await blockedTurn()).toMatchObject({ creditsSpent: 3, balance: 27 });
});

test("RC4. 체험 턴은 엽전 차감이 없고, 상한 뒤 거절 턴은 보통 메시지처럼 체험 횟수를 쓴다", async () => {
  await settings("trial_limit = 20");
  const used = async () =>
    (await db.admin.query("select used from companion.trial_usage where user_id = $1", [tester]))
      .rows[0]?.used ?? 0;
  for (let index = 0; index < 3; index += 1) {
    expect(await blockedTurn()).toMatchObject({ creditsSpent: 0 });
  }
  expect(await used()).toBe(0);
  for (let index = 0; index < 2; index += 1) {
    expect(await blockedTurn()).toMatchObject({ creditsSpent: 0 });
  }
  expect(await used()).toBe(2);
});

test("RC5. 출력 차단은 세지 않고 차감하지 않는다 · 창이 지나면 다시 1부터", async () => {
  await grant(30);
  const outputBlock = [
    { layer: "input", category: "safe", action: "allow" },
    { layer: "output_sync", category: "sexual", action: "block" },
  ];
  for (let index = 0; index < 5; index += 1) {
    expect(await blockedTurn({ reply: false, moderation: outputBlock })).toMatchObject({
      creditsSpent: 0,
    });
  }
  expect((await db.admin.query("select count(*) from companion.moderation_state")).rows[0]).toEqual(
    { count: "0" },
  );

  for (let index = 0; index < 4; index += 1) await blockedTurn();
  expect(await strikes()).toMatchObject({ strikes: 4 });
  const later = new Date(Date.parse(now) + 25 * 3_600_000).toISOString();
  expect(await blockedTurn({ at: later })).toMatchObject({ creditsSpent: 0 });
  expect(await strikes()).toMatchObject({ strikes: 1 });
});

test("RC6. 다시 적용 — 걸려 있던 일시 차단이 풀리고 같은 결과다", async () => {
  await grant(30);
  await db.admin.query(
    "insert into companion.moderation_state (user_id, blocked_until) values ($1, now() + interval '20 minutes')",
    [tester],
  );
  expect(await gate()).toBe("temporarily_blocked");
  await db.admin.query(await readFile(migration, "utf8"));
  expect(await gate()).toBe("ok");
});

test("RC7. 페르소나 — 다섯 모두 로맨스 태도, 다섯 모두 해금 JSON과 같은 선톡 줄", async () => {
  const rows = await db.admin.query(
    "select id, persona->>'romance' as romance, persona->'unlockLines' as lines from companion.characters order by sort_order",
  );
  for (const row of rows.rows) expect((row.romance as string).length, row.id).toBeGreaterThan(40);
  const unlocks = JSON.parse(await readFile(unlocksJson, "utf8")) as {
    characters: { id: string; firstMessage?: { ko: string[]; en: string[] } }[];
  };
  const expected = Object.fromEntries(
    unlocks.characters.map((character) => [character.id, character.firstMessage?.ko ?? null]),
  );
  expect(Object.fromEntries(rows.rows.map((row) => [row.id as string, row.lines]))).toEqual(
    expected,
  );
  for (const character of unlocks.characters) {
    expect(character.firstMessage?.ko.length, character.id).toBeGreaterThan(0);
    if (character.firstMessage === undefined) continue;
    expect(character.firstMessage.en).toHaveLength(character.firstMessage.ko.length);
  }
});
