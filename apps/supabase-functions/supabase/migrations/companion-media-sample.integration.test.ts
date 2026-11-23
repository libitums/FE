import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 예시 스냅샷(20261229, ADR-0146 「추가 — 안내에서 무료 예시 한 장」): 인물마다 미리 올려 둔 사진 한 장을 계정당 한 번 값 없이 준다.
// 표 `companion.media_samples`(인물 → 버킷 경로 · 비율), 앱 RPC `companion_sample_snapshot_offer` · `companion_claim_sample_snapshot`.
// 받은 사진은 보통 스냅샷과 같은 media 행(charge 'sample' · cost 0 · complete)이라 대화 · 앨범에 그대로 남는다.
const learner = "00000000-0000-4000-8000-000000000011";
const other = "00000000-0000-4000-8000-000000000012";
const SAMPLE = "samples/duksu-guide-01.png";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

async function message(user: string, character = "duksu", role = "assistant"): Promise<string> {
  const conversation = await db.admin.query(
    `insert into companion.conversations (user_id, character_id) values ($1, $2)
     on conflict (user_id, character_id) where kind = 'companion' do update set character_id = excluded.character_id
     returning id`,
    [user, character],
  );
  const result =
    role === "assistant"
      ? await db.admin.query(
          `insert into companion.messages (conversation_id, user_id, role, origin, status, segments, created_at)
           values ($1, $2, 'assistant', 'greeting', 'complete', $3::jsonb, now() - interval '1 hour') returning id`,
          [
            conversation.rows[0].id,
            user,
            JSON.stringify([
              { kind: "speech", text: "안녕하세요! 덕수쌤이에요.", translation: "Hello!" },
            ]),
          ],
        )
      : await db.admin.query(
          `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, created_at)
           values ($1, $2, 'user', 'turn', 'complete', '안녕하세요', gen_random_uuid(), now() - interval '1 hour') returning id`,
          [conversation.rows[0].id, user],
        );
  return result.rows[0].id as string;
}
const offer = async (character = "duksu") =>
  (await app.query("select public.companion_sample_snapshot_offer($1) as o", [character])).rows[0]
    .o as { available: boolean };
type Claim = {
  result: string;
  media?: {
    id: string;
    status: string;
    cost: number;
    charge: string;
    path: string;
    aspect: string;
  };
};
const claim = async (messageId: string) =>
  (await app.query("select public.companion_claim_sample_snapshot($1) as c", [messageId])).rows[0]
    .c as Claim;

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
  await db.admin.query("delete from companion.media_samples");
  await db.admin.query(
    `insert into auth.users (id, email) values ($1, 'l@libitum.test'), ($2, 'o@libitum.test')`,
    [learner, other],
  );
  await db.admin.query(
    "insert into companion.media_samples (character_id, storage_path, aspect) values ('duksu', $1, '3:2')",
    [SAMPLE],
  );
  await signIn(app, learner);
});

test("MS1. 제안 — 그 인물의 예시가 켜져 있고 스냅샷을 한 번도 만든 적이 없을 때만 available", async () => {
  expect(await offer()).toEqual({ available: true });
  expect(await offer("mina")).toEqual({ available: false });
  await db.admin.query("update companion.media_samples set active = false");
  expect(await offer()).toEqual({ available: false });
});

test("MS2. 받기 — 값 없이(cost 0 · charge sample) 완성된 스냅샷 행이 생기고, 지갑 · 원장은 그대로다", async () => {
  const id = await message(learner);
  const before = (
    await db.admin.query(
      "select count(*)::int as n from companion.credit_ledger where user_id = $1",
      [learner],
    )
  ).rows[0].n as number;
  const got = await claim(id);
  expect(got.result).toBe("ok");
  expect(got.media).toMatchObject({
    status: "complete",
    cost: 0,
    charge: "sample",
    path: SAMPLE,
    aspect: "3:2",
  });
  const after = (
    await db.admin.query(
      "select count(*)::int as n from companion.credit_ledger where user_id = $1",
      [learner],
    )
  ).rows[0].n as number;
  expect(after).toBe(before);
  // 앨범 · 기록 읽기에 보통 스냅샷처럼 나온다.
  const album = (
    await app.query("select public.companion_list_media('duksu', null, null, 10) as a")
  ).rows[0].a as { items: { id: string }[] };
  expect(album.items.map((item) => item.id)).toEqual([got.media?.id]);
});

test("MS3. 계정당 한 번 — 다시 부르면 already로 같은 행을 돌려주고, 받은 뒤에는 제안이 꺼진다", async () => {
  const id = await message(learner);
  const first = await claim(id);
  const again = await claim(await message(learner));
  expect(again.result).toBe("already");
  expect(again.media?.id).toBe(first.media?.id);
  expect(await offer()).toEqual({ available: false });
  const rows = await db.admin.query(
    "select count(*)::int as n from companion.media where user_id = $1",
    [learner],
  );
  expect(rows.rows[0].n).toBe(1);
});

test("MS4. 막는 경우 — 남의 메시지 forbidden · 없는 메시지 message_not_found · 내 글 not_eligible · 예시 없는 인물 no_sample", async () => {
  expect((await claim(await message(other))).result).toBe("forbidden");
  expect((await claim("00000000-0000-4000-8000-0000000000ff")).result).toBe("message_not_found");
  expect((await claim(await message(learner, "duksu", "user"))).result).toBe("not_eligible");
  expect((await claim(await message(learner, "mina"))).result).toBe("no_sample");
});

test("MS5. 이미 스냅샷을 써 본 사람에게는 제안하지 않는다(받기도 not_offered)", async () => {
  const id = await message(learner);
  await db.admin.query(
    `insert into companion.media (user_id, character_id, message_id, kind, status, charge, cost, storage_path, mime, aspect)
     values ($1, 'duksu', $2, 'snapshot', 'complete', 'photo', 35, $3, 'image/png', '3:2')`,
    [learner, id, `${learner}/x.png`],
  );
  expect(await offer()).toEqual({ available: false });
  expect((await claim(id)).result).toBe("not_offered");
});

test("MS6. 권한 — 비로그인은 부를 수 없고, 예시 표는 앱 역할이 읽지 못한다", async () => {
  const anon = await db.connect();
  await anon.query("set role anon");
  await expect(
    anon.query("select public.companion_sample_snapshot_offer('duksu')"),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(app.query("select * from companion.media_samples")).rejects.toMatchObject({
    code: "42501",
  });
  await anon.end();
});
