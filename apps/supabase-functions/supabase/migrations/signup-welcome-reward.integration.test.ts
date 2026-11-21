import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 가입 보상(20261222, ADR-0174): 도입 뒤 만든 계정만 한 번 100 엽전 — 서버가 주고 서버가 중복을 막는다.
// 탈퇴 뒤 같은 신원(로그인 제공자 id · 이메일 · 전화)으로 다시 가입해도 다시 받지 못한다.
const user = "00000000-0000-4000-8000-0000000000f1";
const other = "00000000-0000-4000-8000-0000000000f2";
const again = "00000000-0000-4000-8000-0000000000f3";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;

type Claim = {
  granted: number;
  reason: string;
  wallet: { balance: number; grant: number };
};
const claim = async (client = app) =>
  (await client.query("select public.companion_claim_signup_reward() as c")).rows[0].c as Claim;

async function addUser(
  id: string,
  options: {
    email?: string | null;
    phone?: string | null;
    createdAt?: string;
    anonymous?: boolean;
    identities?: readonly [provider: string, providerId: string][];
  } = {},
) {
  await db.admin.query(
    `insert into auth.users (id, email, phone, is_anonymous, created_at)
     values ($1, $2, $3, $4, coalesce($5::timestamptz, now()))`,
    [
      id,
      options.email ?? null,
      options.phone ?? null,
      options.anonymous ?? false,
      options.createdAt ?? null,
    ],
  );
  for (const [provider, providerId] of options.identities ?? [])
    await db.admin.query(
      "insert into auth.identities (user_id, provider, provider_id) values ($1, $2, $3)",
      [id, provider, providerId],
    );
}

beforeAll(async () => {
  db = await startTestDatabase();
  app = await db.connect();
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("truncate companion.signup_reward_keys");
  await db.admin.query("update companion.settings set signup_reward = 100");
  await addUser(user, { email: "Mina@Example.test", identities: [["google", "g-111"]] });
  await signIn(app, user);
});

test("SW-S1. 도입 뒤 만든 계정은 100을 한 번 받는다 — grant 버킷 · 원장 signup 한 행", async () => {
  expect(await claim()).toMatchObject({
    granted: 100,
    reason: "granted",
    wallet: { balance: 100, grant: 100 },
  });
  const ledger = await db.admin.query(
    "select delta, reason, ref_id from companion.credit_ledger where user_id = $1",
    [user],
  );
  expect(ledger.rows).toEqual([{ delta: 100, reason: "signup", ref_id: user }]);
});

test("SW-S2. 다시 부르면 0 · already_claimed, 잔액 그대로", async () => {
  await claim();
  expect(await claim()).toMatchObject({
    granted: 0,
    reason: "already_claimed",
    wallet: { balance: 100 },
  });
});

test("SW-S3. 도입 전에 만든 계정(기존 회원)은 받지 않는다", async () => {
  await addUser(other, { email: "old@example.test", createdAt: "2026-01-01T00:00:00Z" });
  const b = await db.connect();
  await signIn(b, other);
  expect(await claim(b)).toMatchObject({
    granted: 0,
    reason: "existing_account",
    wallet: { balance: 0 },
  });
});

test("SW-S4. 탈퇴 뒤 같은 Google 신원 · 같은 이메일(대소문자 무관) · 같은 전화로 다시 가입하면 identity_used", async () => {
  await claim();
  await db.admin.query("delete from auth.users where id = $1", [user]);
  const b = await db.connect();

  await addUser(again, { email: "fresh@example.test", identities: [["google", "g-111"]] });
  await signIn(b, again);
  expect(await claim(b)).toMatchObject({ granted: 0, reason: "identity_used" });
  await db.admin.query("delete from auth.users where id = $1", [again]);

  await addUser(again, { email: "mina@example.test", identities: [["apple", "a-999"]] });
  expect(await claim(b)).toMatchObject({ granted: 0, reason: "identity_used" });
  await db.admin.query("delete from auth.users where id = $1", [again]);

  await addUser(other, { phone: "821012345678", identities: [["phone", other]] });
  const c = await db.connect();
  await signIn(c, other);
  expect((await claim(c)).reason).toBe("granted");
  await db.admin.query("delete from auth.users where id = $1", [other]);
  await addUser(again, { phone: "821012345678", identities: [["phone", again]] });
  expect(await claim(b)).toMatchObject({ granted: 0, reason: "identity_used" });
});

test("SW-S5. 다른 사람(다른 제공자 id · 이메일)은 막지 않는다", async () => {
  await claim();
  await addUser(other, { email: "yoon@example.test", identities: [["google", "g-222"]] });
  const b = await db.connect();
  await signIn(b, other);
  expect(await claim(b)).toMatchObject({ granted: 100, reason: "granted" });
});

test("SW-S6. 설정 0이면 disabled, 익명 사용자는 anonymous — 둘 다 지급 없음", async () => {
  await db.admin.query("update companion.settings set signup_reward = 0");
  expect(await claim()).toMatchObject({ granted: 0, reason: "disabled" });
  await db.admin.query("update companion.settings set signup_reward = 100");
  await addUser(other, { anonymous: true });
  const b = await db.connect();
  await signIn(b, other);
  expect(await claim(b)).toMatchObject({ granted: 0, reason: "anonymous" });
});

test("SW-S7. 로그인 없으면 거절 · anon은 실행 불가 · 앱 역할은 키 표를 못 읽는다", async () => {
  const none = await db.connect();
  await none.query("set role authenticated");
  await expect(none.query("select public.companion_claim_signup_reward()")).rejects.toMatchObject({
    code: "28000",
  });
  const anon = await db.connect();
  await anon.query("set role anon");
  await expect(anon.query("select public.companion_claim_signup_reward()")).rejects.toBeTruthy();
  await expect(app.query("select * from companion.signup_reward_keys")).rejects.toBeTruthy();
  await expect(app.query("select salt from companion.signup_reward_salt")).rejects.toBeTruthy();
});

test("SW-S8. 키 표에는 원문이 없다 — 64자 16진 해시만, 신원마다 하나", async () => {
  await claim();
  const keys = await db.admin.query("select key_hash from companion.signup_reward_keys");
  expect(keys.rows).toHaveLength(2);
  for (const row of keys.rows as { key_hash: string }[]) {
    expect(row.key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.key_hash).not.toContain("mina");
  }
});

test("SW-S9. 출시 지급(companion_claim_coins)과 따로 — 둘 다 받으면 잔액은 합", async () => {
  await claim();
  const coins = (await app.query("select public.companion_claim_coins() as c")).rows[0].c as {
    bonus: number;
    wallet: { balance: number };
  };
  expect(coins).toMatchObject({ bonus: 100, wallet: { balance: 200 } });
});
