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
    .o as { available: boolean; voice: boolean };
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
const VOICE = "samples/duksu-guide-voice-01.mp3";
const GREETING = "안녕하세요! 덕수쌤이에요.";
const claimVoice = async (messageId: string) =>
  (await app.query("select public.companion_claim_sample_snapshot($1, 'voice') as c", [messageId]))
    .rows[0].c as Claim & { media?: { kind: string; mime: string; aspect: string | null } };
const addVoiceSample = () =>
  db.admin.query(
    `insert into companion.media_samples (character_id, kind, storage_path, aspect, mime, text)
     values ('duksu', 'voice', $1, null, 'audio/mpeg', $2)`,
    [VOICE, GREETING],
  );

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
  // 대화할 수 있는 계정(생년을 밝힌 성인) — 예시 받기는 메시지와 같은 판정을 거친다.
  await db.admin.query(
    "insert into companion.profiles (user_id, birth_year, age_source) values ($1, 1990, 'self')",
    [learner],
  );
  await signIn(app, learner);
});

test("MS1. 제안 — 그 인물의 예시가 켜져 있고 스냅샷을 한 번도 만든 적이 없을 때만 available", async () => {
  expect(await offer()).toMatchObject({ available: true });
  expect(await offer("mina")).toMatchObject({ available: false });
  await db.admin.query("update companion.media_samples set active = false");
  expect(await offer()).toMatchObject({ available: false });
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
  expect(await offer()).toMatchObject({ available: false });
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
  expect(await offer()).toMatchObject({ available: false });
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

test("MS7. 운영의 고아 파일 조회는 예시 파일을 내놓지 않는다(지우면 모든 예시가 빈 사진이 된다)", async () => {
  await db.admin.query("delete from storage.objects");
  await db.admin.query(
    "insert into storage.objects (bucket_id, name) values ('companion-media', $1), ('companion-media', $2)",
    [SAMPLE, `${learner}/stray.png`],
  );
  const orphans = (await server.query("select public.companion_media_orphans(10) as o")).rows[0]
    .o as string[];
  expect(orphans).toEqual([`${learner}/stray.png`]);
});

test("MS8. 대화를 쓰지 못하는 계정(14세 미만 · 일시 차단)은 예시를 받지 못하고, 엽전이 0이어도 그 밖의 계정은 받는다", async () => {
  const id = await message(learner);
  await db.admin.query(
    "update companion.profiles set birth_year = extract(year from now())::int - 12 where user_id = $1",
    [learner],
  );
  expect((await claim(id)).result).toBe("not_offered");
  await db.admin.query("update companion.profiles set birth_year = 1990 where user_id = $1", [
    learner,
  ]);
  await db.admin.query(
    `insert into companion.moderation_state (user_id, blocked_until) values ($1, now() + interval '1 hour')
     on conflict (user_id) do update set blocked_until = excluded.blocked_until`,
    [learner],
  );
  expect((await claim(id)).result).toBe("not_offered");
  await db.admin.query(
    "update companion.moderation_state set blocked_until = null where user_id = $1",
    [learner],
  );
  // 지갑이 비어 있어도(엽전 0) 받는다.
  expect((await claim(id)).result).toBe("ok");
});

// ------------------------------------------------------------------ 예시 음성(20261230) — 스냅샷 다음 단계에서 미리 만든 음성 하나

test("MS9. 음성 제안 — 그 인물의 음성 예시가 켜져 있고 음성을 한 번도 만든 적이 없을 때만 voice. 사진 제안과 따로 간다", async () => {
  expect(await offer()).toEqual({ available: true, voice: false });
  await addVoiceSample();
  expect(await offer()).toEqual({ available: true, voice: true });
  const id = await message(learner);
  await db.admin.query(
    `insert into companion.media (user_id, character_id, message_id, kind, status, charge, cost, storage_path, mime, text)
     values ($1, 'duksu', $2, 'voice', 'complete', 'voice', 15, $3, 'audio/mpeg', '안녕')`,
    [learner, id, `${learner}/v.mp3`],
  );
  expect(await offer()).toEqual({ available: true, voice: false });
});

test("MS10. 음성 받기 — 값 없이 완성된 음성 행(kind voice · charge sample · 읽은 글)이 생기고, 사진 예시와 따로 한 번씩 받는다", async () => {
  await addVoiceSample();
  const id = await message(learner);
  const voice = await claimVoice(id);
  expect(voice.result).toBe("ok");
  expect(voice.media).toMatchObject({
    kind: "voice",
    status: "complete",
    cost: 0,
    charge: "sample",
    path: VOICE,
    mime: "audio/mpeg",
    aspect: null,
  });
  const row = await db.admin.query("select text from companion.media where id = $1", [
    voice.media?.id,
  ]);
  expect(row.rows[0].text).toBe(GREETING);
  // 음성을 받아도 사진 예시는 그대로 받을 수 있다(그 반대도).
  const photo = await claim(id);
  expect(photo.result).toBe("ok");
  expect(photo.media?.id).not.toBe(voice.media?.id);
  expect((await claimVoice(id)).result).toBe("already");
  expect(await offer()).toEqual({ available: false, voice: false });
});

test("MS11. 음성 막는 경우 — 음성 예시가 없으면 no_sample, 음성을 써 본 사람은 not_offered, 모르는 종류는 거절", async () => {
  const id = await message(learner);
  expect((await claimVoice(id)).result).toBe("no_sample");
  await addVoiceSample();
  await db.admin.query(
    `insert into companion.media (user_id, character_id, message_id, kind, status, charge, cost, storage_path, mime, text)
     values ($1, 'duksu', $2, 'voice', 'complete', 'voice', 15, $3, 'audio/mpeg', '안녕')`,
    [learner, id, `${learner}/v.mp3`],
  );
  expect((await claimVoice(id)).result).toBe("not_offered");
  await expect(
    app.query("select public.companion_claim_sample_snapshot($1, 'video')", [id]),
  ).rejects.toMatchObject({ code: "22023" });
});

// ------------------------------------------------------------------ 대상은 그 대화의 첫 인사(20270113, 이슈 #648)
// 예시 사진 · 음성은 덕수쌤 첫 인사에 맞춰 미리 만든 파일이다. 배포된 앱은 가장 최근 캐릭터 메시지를 보내므로, 받기는 받은 id를 믿지 않고
// 그 메시지가 속한 대화의 첫 인사(origin greeting)로 바꿔 붙인다. 자막(`source` → `media.line`)도 첫 인사의 글이다.

const REPLY = "좋아요! 오늘은 뭘 배워 볼까요?";

/** 첫 인사 → 학습자 답 → 덕수쌤 응답(turn) → 선톡(proactive)이 있는 대화. */
async function room(user: string) {
  const greeting = await message(user);
  const conversation = (
    await db.admin.query("select conversation_id from companion.messages where id = $1", [greeting])
  ).rows[0].conversation_id as string;
  const assistant = async (origin: string, minutes: number) =>
    (
      await db.admin.query(
        `insert into companion.messages (conversation_id, user_id, role, origin, status, segments, created_at)
         values ($1, $2, 'assistant', $3, 'complete', $4::jsonb, now() - make_interval(mins => $5)) returning id`,
        [
          conversation,
          user,
          origin,
          JSON.stringify([{ kind: "speech", text: REPLY, translation: "Great!" }]),
          minutes,
        ],
      )
    ).rows[0].id as string;
  const answer = await message(user, "duksu", "user");
  const reply = await assistant("turn", 50);
  const proactive = await assistant("proactive", 10);
  return { conversation, greeting, answer, reply, proactive };
}
type Placed = Claim & { media?: { messageId: string; line: { ko: string; en: string } } };
const placed = async (messageId: string, kind: "snapshot" | "voice") =>
  (await app.query("select public.companion_claim_sample_snapshot($1, $2) as c", [messageId, kind]))
    .rows[0].c as Placed;
const sourceOf = async (mediaId: string | undefined) =>
  (await db.admin.query("select message_id, source from companion.media where id = $1", [mediaId]))
    .rows[0] as { message_id: string; source: { text: string }[] };

test("MS12. 응답(turn)의 id로 받아도 사진 · 음성 모두 첫 인사에 붙고, 자막도 첫 인사의 글이다", async () => {
  await addVoiceSample();
  const chat = await room(learner);
  for (const kind of ["snapshot", "voice"] as const) {
    const got = await placed(chat.reply, kind);
    expect(got.result).toBe("ok");
    // 응답에 실린 id가 실제로 붙은 메시지다 — 새 앱은 이것으로 자리를 맞춘다.
    expect(got.media?.messageId).toBe(chat.greeting);
    expect(got.media?.line).toEqual({ ko: GREETING, en: "Hello!" });
    const row = await sourceOf(got.media?.id);
    expect(row.message_id).toBe(chat.greeting);
    expect(row.source.map((seg) => seg.text)).toEqual([GREETING]);
  }
});

test("MS13. 선톡(proactive)의 id로 받아도 첫 인사에 붙는다", async () => {
  const chat = await room(learner);
  const got = await placed(chat.proactive, "snapshot");
  expect(got.result).toBe("ok");
  expect(got.media?.messageId).toBe(chat.greeting);
});

test("MS14. 첫 인사의 id면 그대로 그 메시지에 붙는다", async () => {
  await addVoiceSample();
  const chat = await room(learner);
  for (const kind of ["snapshot", "voice"] as const) {
    const got = await placed(chat.greeting, kind);
    expect(got.result).toBe("ok");
    expect(got.media?.messageId).toBe(chat.greeting);
  }
});

test("MS15. 대화에 첫 인사가 없으면(숨김 · 지워짐) 받지 않는다 — not_eligible, 행도 생기지 않는다", async () => {
  await addVoiceSample();
  const chat = await room(learner);
  await db.admin.query("update companion.messages set hidden = true where id = $1", [
    chat.greeting,
  ]);
  expect((await placed(chat.reply, "snapshot")).result).toBe("not_eligible");
  await db.admin.query("delete from companion.messages where id = $1", [chat.greeting]);
  expect((await placed(chat.reply, "snapshot")).result).toBe("not_eligible");
  expect((await placed(chat.reply, "voice")).result).toBe("not_eligible");
  const rows = await db.admin.query(
    "select count(*)::int as n from companion.media where user_id = $1",
    [learner],
  );
  expect(rows.rows[0].n).toBe(0);
  // 제안은 그대로 남는다 — 새 첫 인사가 오면(대화 초기화 뒤) 받을 수 있다.
  expect(await offer()).toEqual({ available: true, voice: true });
});

test("MS16. 계정당 한 번 — 응답으로 받은 뒤 첫 인사 · 다른 메시지로 다시 불러도 already로 같은 행", async () => {
  await addVoiceSample();
  const chat = await room(learner);
  for (const kind of ["snapshot", "voice"] as const) {
    const first = await placed(chat.reply, kind);
    expect(first.result).toBe("ok");
    for (const id of [chat.greeting, chat.proactive]) {
      const again = await placed(id, kind);
      expect(again.result).toBe("already");
      expect(again.media?.id).toBe(first.media?.id);
    }
  }
  const rows = await db.admin.query(
    "select count(*)::int as n from companion.media where user_id = $1 and charge = 'sample'",
    [learner],
  );
  expect(rows.rows[0].n).toBe(2);
});

test("MS17. 다른 사람 대화의 메시지 id면(첫 인사 · 응답 모두) forbidden — 남의 첫 인사에 붙지 않는다", async () => {
  await addVoiceSample();
  const theirs = await room(other);
  for (const id of [theirs.greeting, theirs.reply]) {
    expect((await placed(id, "snapshot")).result).toBe("forbidden");
    expect((await placed(id, "voice")).result).toBe("forbidden");
  }
  const rows = await db.admin.query("select count(*)::int as n from companion.media");
  expect(rows.rows[0].n).toBe(0);
});
