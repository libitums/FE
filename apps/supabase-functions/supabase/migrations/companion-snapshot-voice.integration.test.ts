import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 스냅샷 · 음성(20261128, ADR-0138): 요청 → pending + 엽전 예약 → 백그라운드 결과로 확정 · 해제. 앨범은 대화 초기화에도 남는다.
const tester = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

let seq = 0;
const nextId = () => `30000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

type Media = {
  id: string;
  characterId: string;
  messageId: string;
  kind: string;
  status: string;
  charge: string;
  cost: number;
  path: string | null;
  failure: string | null;
  aiGenerated: boolean;
  engine: string | null;
  model: string | null;
};
type Begun = {
  result: string;
  cached?: boolean;
  media?: Media;
  holdId?: string;
  detail?: Record<string, unknown>;
  job?: Record<string, unknown>;
};

/** 대화와 메시지를 바로 적는다(턴 함수를 거치지 않는다). 메시지 id를 돌려준다. */
async function conversation(userId = tester, character = "duksu"): Promise<string> {
  const result = await db.admin.query(
    `insert into companion.conversations (user_id, character_id) values ($1, $2)
     on conflict (user_id, character_id) where kind = 'companion' do update set character_id = excluded.character_id
     returning id`,
    [userId, character],
  );
  return result.rows[0].id as string;
}
let clock = 0;
async function message(
  fields: {
    userId?: string;
    character?: string;
    role?: string;
    origin?: string;
    status?: string;
    hidden?: boolean;
    meta?: Record<string, unknown>;
    segments?: unknown[];
    text?: string | null;
  } = {},
): Promise<string> {
  const userId = fields.userId ?? tester;
  const conversationId = await conversation(userId, fields.character ?? "duksu");
  const id = nextId();
  await db.admin.query(
    `insert into companion.messages (id, conversation_id, user_id, role, origin, status, hidden, meta, segments, text, client_message_id, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, case when $4 = 'user' then gen_random_uuid() end,
       now() - interval '1 hour' + make_interval(secs => $11))`,
    [
      id,
      conversationId,
      userId,
      fields.role ?? "assistant",
      fields.origin ?? "turn",
      fields.status ?? "complete",
      fields.hidden ?? false,
      JSON.stringify(fields.meta ?? {}),
      JSON.stringify(
        fields.segments ?? [
          {
            kind: "speech",
            text: "오늘은 궁 마당에서 수업해요!",
            translation: "Class in the palace yard!",
          },
          { kind: "action", text: "칠판 대신 스케치북을 든다" },
        ],
      ),
      fields.text ?? null,
      ++clock,
    ],
  );
  return id;
}
async function begin(messageId: string, kind = "snapshot", again = false, userId = tester) {
  const result = await server.query(
    "select public.companion_media_begin($1, $2, $3, $4, $5) as b",
    [userId, messageId, kind, again, now],
  );
  return result.rows[0].b as Begun;
}
async function finish(mediaId: string, status: string, result: Record<string, unknown> = {}) {
  const out = await server.query(
    "select public.companion_media_finish($1, $2, $3::jsonb, $4) as f",
    [mediaId, status, JSON.stringify(result), now],
  );
  return out.rows[0].f as { result: string; media: Media; balance?: number };
}
const complete = (media: Media, ext = "png") =>
  finish(media.id, "complete", {
    path: `${tester}/${media.id}.${ext}`,
    mime: ext === "png" ? "image/png" : "audio/mpeg",
    bytes: 1234,
    aspect: ext === "png" ? "3:2" : null,
    prompt: { scene: "a scene", aspect: "3:2", safety: "allow" },
    verdict: { pass: true },
    meta: { engine: "openai-images-edit", model: "gpt-image-2.5-flare", promptHash: "abc" },
  });
const grant = (amount: number, userId = tester) =>
  server.query("select public.companion_grant_credits($1, 'grant', $2, 'operator', null, null)", [
    userId,
    amount,
  ]);
async function balance(userId = tester) {
  return (
    await db.admin.query("select (companion.wallet_balances($1)->>'balance')::int as b", [userId])
  ).rows[0].b as number;
}
async function hold(holdId: string) {
  return (
    await db.admin.query(
      "select status, reason, amount, trial from companion.credit_holds where id = $1",
      [holdId],
    )
  ).rows[0] as { status: string; reason: string; amount: number; trial: boolean };
}
/** 불변식: sub + grant + paid − earned_spent = 원장 delta의 합. */
async function ledgerMatchesWallet() {
  const result = await db.admin.query(
    `select coalesce((select sum(delta) from companion.credit_ledger where user_id = $1), 0)::int as ledger,
            coalesce((select sub_balance + grant_balance + paid_balance - earned_spent
                      from companion.credit_wallets where user_id = $1), 0)::int as wallet`,
    [tester],
  );
  expect(result.rows[0].ledger).toBe(result.rows[0].wallet);
}
const refs = (...names: string[]) =>
  db.admin.query(
    "insert into storage.objects (bucket_id, name) select 'companion-refs', unnest($1::text[])",
    [names],
  );

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
  await db.admin.query("delete from storage.objects");
  await db.admin.query(
    "update companion.settings set photo_cost = 35, voice_cost = 15, photo_redraw_cost = 25, snapshot_daily_limit = 20, media_pending_minutes = 10, minor_daily_limit_seconds = null",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 't@libitum.test', '{"duru_tester": true}'), ($2, 'o@libitum.test', '{"duru_tester": true}')`,
    [tester, other],
  );
  await refs("deoksu-expressions.png", "deoksu-ref.png", "mina-ref.png");
  await grant(200);
  await signIn(app, tester);
});

test("SV1. 설정 기본값 · 버킷 · 캐릭터 설정 · 학습자 뒷모습 기본값", async () => {
  const settings = await db.admin.query(
    `select column_name, column_default from information_schema.columns
     where table_schema = 'companion' and table_name = 'settings'
       and column_name in ('photo_cost', 'voice_cost', 'photo_redraw_cost', 'snapshot_daily_limit', 'snapshot_engine',
                           'snapshot_quality', 'snapshot_aspect', 'voice_model') order by column_name`,
  );
  expect(
    Object.fromEntries(settings.rows.map((row) => [row.column_name, row.column_default])),
  ).toEqual({
    photo_cost: "35",
    photo_redraw_cost: "25",
    snapshot_aspect: "'auto'::text",
    snapshot_daily_limit: null,
    snapshot_engine: "'gpt-image-2.5-flare'::text",
    snapshot_quality: "'medium'::text",
    voice_cost: "15",
    voice_model: "'eleven_v3'::text",
  });
  const buckets = await db.admin.query(
    "select id, public, allowed_mime_types from storage.buckets order by id",
  );
  expect(buckets.rows).toEqual([
    {
      id: "companion-media",
      public: false,
      allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "audio/mpeg"],
    },
    {
      id: "companion-refs",
      public: false,
      allowed_mime_types: ["image/png", "image/jpeg", "image/webp"],
    },
  ]);
  const characters = await db.admin.query(
    "select id, media->>'voiceId' as voice, media->'refSlugs' as slugs from companion.characters order by id",
  );
  expect(characters.rows).toEqual([
    { id: "doyun", voice: "rCm09Tf1yMYbOyCRLDyB", slugs: ["doyun"] },
    { id: "duksu", voice: "WW9FljMgKZtSNvBwgs3R", slugs: ["deoksu", "duksu", "deoksu-teacher"] },
    { id: "jaemin", voice: "hBLOHZ3ct4ofaRNnBHcs", slugs: ["jaemin"] },
    { id: "mina", voice: "xi3rF0t7dg7uN2M0WUhr", slugs: ["mina"] },
    { id: "yoonkyung", voice: "ah4r1hZOydd3XWlHOm3Y", slugs: ["yoonkyung"] },
  ]);
  await app.query("select public.companion_save_profile(null, null, 'en', null)");
  expect(
    (await app.query("select public.companion_load_profile() as p")).rows[0].p.snapshotSelf,
  ).toBe("female");
});

test("SV2. 스냅샷 요청 — pending · 35엽전 예약(체험 안 씀) · 작업 입력 · 같은 메시지는 그대로 · 다른 메시지는 동시 1", async () => {
  await message({ role: "user", text: "오늘 수업 어디서 해요?", segments: [] });
  await message({ segments: [{ kind: "speech", text: "숨긴 답" }], hidden: true });
  const target = await message();
  const begun = await begin(target);
  expect(begun).toMatchObject({ result: "ok", cached: false });
  expect(begun.media).toMatchObject({
    messageId: target,
    characterId: "duksu",
    kind: "snapshot",
    status: "pending",
    charge: "photo",
    cost: 35,
    path: null,
    aiGenerated: true,
  });
  expect(await hold(begun.holdId!)).toEqual({
    status: "open",
    reason: "photo",
    amount: 35,
    trial: false,
  });
  expect(await balance()).toBe(165);
  // 덕수쌤 체험(trial_usage)은 메시지에만 쓴다.
  expect(
    (await db.admin.query("select count(*)::int as n from companion.trial_usage")).rows[0].n,
  ).toBe(0);
  expect(begun.job).toMatchObject({
    mediaId: begun.media!.id,
    userId: tester,
    characterId: "duksu",
    characterName: "덕수쌤",
    ageBand: "unknown",
    snapshotSelf: "female",
    refs: ["deoksu-ref.png", "deoksu-expressions.png"],
    engine: "gpt-image-2.5-flare",
    quality: "medium",
    aspect: "auto",
  });
  // 앞줄은 숨긴 것을 빼고 오래된 것부터.
  expect((begun.job!.context as { role: string }[]).map((line) => line.role)).toEqual(["user"]);
  const ledger = await db.admin.query(
    "select delta, bucket, kind, reason, ref_id from companion.credit_ledger where kind = 'reserve'",
  );
  expect(ledger.rows).toEqual([
    { delta: -35, bucket: "grant", kind: "reserve", reason: "photo", ref_id: begun.media!.id },
  ]);

  const again = await begin(target);
  expect(again).toMatchObject({
    result: "ok",
    cached: true,
    media: { id: begun.media!.id, status: "pending" },
  });
  expect(await balance()).toBe(165);
  const another = await message();
  expect(await begin(another)).toEqual({
    result: "snapshot_in_progress",
    detail: { mediaId: begun.media!.id },
  });
  await ledgerMatchesWallet();
});

test("SV3. 완료 → 확정 · 저장본 재사용 · 다시 그리기 25엽전 · 앨범에 둘 다", async () => {
  const target = await message();
  const first = await begin(target);
  const done = await complete(first.media!);
  expect(done).toMatchObject({
    result: "ok",
    balance: 165,
    media: {
      status: "complete",
      cost: 35,
      path: `${tester}/${first.media!.id}.png`,
      engine: "openai-images-edit",
      model: "gpt-image-2.5-flare",
    },
  });
  expect((await hold(first.holdId!)).status).toBe("settled");

  const cached = await begin(target);
  expect(cached).toMatchObject({
    result: "ok",
    cached: true,
    media: { id: first.media!.id, status: "complete" },
  });
  expect(await balance()).toBe(165);

  const redraw = await begin(target, "snapshot", true);
  expect(redraw).toMatchObject({
    result: "ok",
    cached: false,
    media: { charge: "photo_redraw", cost: 25 },
  });
  expect(await hold(redraw.holdId!)).toMatchObject({ reason: "photo_redraw", amount: 25 });
  await complete(redraw.media!);
  expect(await balance()).toBe(140);

  const album = (
    await app.query("select public.companion_list_media('duksu', 'snapshot', null, 10) as a")
  ).rows[0].a as { items: Media[]; hasMore: boolean };
  expect(album.items.map((item) => item.id)).toEqual([redraw.media!.id, first.media!.id]);
  expect(album.hasMore).toBe(false);
  const page = (await app.query("select public.companion_list_media(null, null, null, 1) as a"))
    .rows[0].a;
  expect(page.items).toHaveLength(1);
  expect(page.hasMore).toBe(true);
  // 처음 그린 것이 실패했으면 다시 그리기도 처음 값(35)이다.
  const fresh = await message();
  const failed = await begin(fresh);
  await finish(failed.media!.id, "failed", { failure: "engine_failed" });
  expect((await begin(fresh, "snapshot", true)).media).toMatchObject({ charge: "photo", cost: 35 });
  await ledgerMatchesWallet();
});

test("SV4. 차단 · 실패 → 해제(엽전 돌아옴) · 이미 닫힌 행은 바꾸지 않는다", async () => {
  const target = await message();
  const begun = await begin(target);
  const blocked = await finish(begun.media!.id, "blocked", {
    failure: "check_failed",
    verdict: { pass: false, learner_face: true },
    error: "check node",
  });
  expect(blocked).toMatchObject({
    result: "ok",
    balance: 200,
    media: { status: "blocked", cost: 0, failure: "check_failed", path: null },
  });
  expect((await hold(begun.holdId!)).status).toBe("released");
  const twice = await complete(begun.media!);
  expect(twice).toMatchObject({ result: "closed", media: { status: "blocked" } });
  expect(await balance()).toBe(200);
  // 차단된 것은 저장본이 아니다 — 다시 누르면 새로(35).
  expect((await begin(target)).media).toMatchObject({
    status: "pending",
    cost: 35,
    charge: "photo",
  });
  await expect(finish(begun.media!.id, "pending")).rejects.toThrow(/invalid media status/);
  await expect(finish(nextId(), "failed")).rejects.toThrow(/media not found/);
  await ledgerMatchesWallet();
});

test("SV5. 대상 자격 — 남의 메시지 403 · 유저 · 숨김 · 거절 · 위기 · 미완료는 안 된다", async () => {
  expect(await begin(nextId())).toEqual({ result: "message_not_found" });
  expect(await begin(await message({ userId: other }))).toEqual({ result: "forbidden" });
  for (const fields of [
    { role: "user", text: "안녕", segments: [] },
    { hidden: true },
    { meta: { refusal: true } },
    { origin: "crisis", status: "crisis" },
    { status: "failed" },
  ]) {
    expect(await begin(await message(fields))).toEqual({ result: "not_eligible" });
  }
  // 첫 인사 · 선톡은 된다.
  expect((await begin(await message({ origin: "greeting" }), "voice")).result).toBe("ok");
  expect((await begin(await message({ origin: "proactive" }), "voice")).result).toBe("ok");
  // 판정: 일시 차단이면 못 만든다.
  await db.admin.query(
    "insert into companion.moderation_state (user_id, blocked_until) values ($1, now() + interval '1 hour')",
    [tester],
  );
  expect((await begin(await message())).result).toBe("temporarily_blocked");
  expect(await balance()).toBe(170);
});

test("SV6. 음성 — 한국어 대사만 · 저장본은 무료 · 「다시」는 15엽전 · 대사 없음 · 너무 김 · voice id 없음", async () => {
  const target = await message({
    segments: [
      { kind: "speech", text: "안녕하세요! *웃는다* 반가워요.", translation: "Hello!" },
      { kind: "action", text: "손을 흔든다" },
      { kind: "speech", text: "  오늘도   힘내요  " },
    ],
  });
  const begun = await begin(target, "voice");
  expect(begun).toMatchObject({
    result: "ok",
    cached: false,
    media: { kind: "voice", charge: "voice", cost: 15 },
  });
  expect(begun.job).toMatchObject({
    voiceId: "WW9FljMgKZtSNvBwgs3R",
    model: "eleven_v3",
    text: "안녕하세요! 반가워요. 오늘도 힘내요",
  });
  expect(await hold(begun.holdId!)).toMatchObject({ reason: "voice", amount: 15 });
  // 같은 메시지에 같이 눌러도 하나(만드는 중인 것을 돌려준다).
  expect(await begin(target, "voice")).toMatchObject({
    cached: true,
    media: { id: begun.media!.id },
  });
  await complete(begun.media!, "mp3");
  expect(await begin(target, "voice")).toMatchObject({
    cached: true,
    media: { status: "complete", cost: 15 },
  });
  expect(await balance()).toBe(185);
  const again = await begin(target, "voice", true);
  expect(again).toMatchObject({ cached: false, media: { cost: 15 } });
  expect(await balance()).toBe(170);
  // 스냅샷과 음성은 서로 독립이다 — 음성이 도는 중에도 스냅샷을 그릴 수 있다.
  expect((await begin(target)).result).toBe("ok");

  expect(
    await begin(
      await message({ segments: [{ kind: "action", text: "고개를 끄덕인다" }] }),
      "voice",
    ),
  ).toEqual({
    result: "no_speech",
  });
  expect(
    await begin(await message({ segments: [{ kind: "speech", text: "가".repeat(601) }] }), "voice"),
  ).toEqual({ result: "too_long", detail: { chars: 601, max: 600 } });
  await db.admin.query(
    "update companion.characters set media = media - 'voiceId' where id = 'duksu'",
  );
  try {
    expect(await begin(await message(), "voice")).toEqual({
      result: "not_configured",
      detail: { missing: "voice_id" },
    });
  } finally {
    await db.admin.query(
      "update companion.characters set media = media || '{\"voiceId\": \"WW9FljMgKZtSNvBwgs3R\"}' where id = 'duksu'",
    );
  }
  await ledgerMatchesWallet();
});

test("SV7. 엽전 부족 · 하루 상한 · 기준 이미지 없음 — 예약도 행도 없다", async () => {
  await db.admin.query("truncate companion.credit_ledger, companion.credit_wallets");
  await grant(20);
  const poor = await begin(await message());
  expect(poor).toEqual({ result: "insufficient_credits", detail: { required: 35, balance: 20 } });
  expect((await db.admin.query("select count(*)::int as n from companion.media")).rows[0].n).toBe(
    0,
  );
  expect((await begin(await message(), "voice")).result).toBe("ok");

  await grant(500);
  await db.admin.query("update companion.settings set snapshot_daily_limit = 2");
  for (let i = 0; i < 2; i += 1) {
    const begun = await begin(await message());
    expect(begun.result).toBe("ok");
    await complete(begun.media!);
  }
  expect(await begin(await message())).toEqual({ result: "daily_limit", detail: { limit: 2 } });
  // 차단 · 실패는 세지 않는다.
  await db.admin.query(
    "update companion.media set status = 'blocked', storage_path = null where kind = 'snapshot'",
  );
  expect((await begin(await message())).result).toBe("ok");

  await db.admin.query("delete from storage.objects");
  await db.admin.query("update companion.media set status = 'failed' where status = 'pending'");
  expect(await begin(await message())).toEqual({
    result: "not_configured",
    detail: { missing: "refs" },
  });
  // 덕수쌤은 lab 기준 slug 순서대로 찾는다 — 시트 파일 이름이 duksu여도 된다. 표정 시트는 없어도 된다.
  await refs("duksu-ref.png");
  expect((await begin(await message())).job).toMatchObject({ refs: ["duksu-ref.png"] });
});

test("SV8. 시간이 지난 pending은 실패로 닫히고 예약이 풀린다 · 정리 작업은 그리는 중인 것을 건드리지 않는다", async () => {
  const begun = await begin(await message());
  // 메시지 예약 정리 주기(예: 5분)로 불려도 사진 예약은 media_pending_minutes(10분) 전에는 그대로다.
  await db.admin.query(
    "update companion.credit_holds set created_at = now() - interval '6 minutes'",
  );
  expect(
    (await server.query("select public.companion_release_stale_holds('5 minutes') as n")).rows[0].n,
  ).toBe(0);
  await db.admin.query("update companion.media set created_at = now() - interval '11 minutes'");
  // 앱 조회에서는 바로 실패로 보인다.
  const seen = (
    await app.query("select public.companion_get_media($1, null) as m", [[begun.media!.id]])
  ).rows[0].m;
  expect(seen[0]).toMatchObject({ status: "failed", failure: "expired", cost: 0 });
  // 다음 요청이 닫고 예약을 푼다 — 동시 1에 걸리지 않는다.
  const next = await begin(await message());
  expect(next.result).toBe("ok");
  expect((await hold(begun.holdId!)).status).toBe("released");
  // 정리 작업은 10분이 지난 사진 예약을 풀고 행을 닫는다.
  await db.admin.query(
    "update companion.credit_holds set created_at = now() - interval '11 minutes' where id = $1",
    [next.holdId],
  );
  expect(
    (await server.query("select public.companion_release_stale_holds('5 minutes') as n")).rows[0].n,
  ).toBe(1);
  const row = await db.admin.query("select status, failure from companion.media where id = $1", [
    next.media!.id,
  ]);
  expect(row.rows[0]).toEqual({ status: "failed", failure: "expired" });
  expect(await balance()).toBe(200);
  await ledgerMatchesWallet();
});

test("SV9. 앱 RPC — 앨범은 내 complete만 · 상태 조회는 id · 메시지 id로 · 서버 함수는 앱이 못 부른다", async () => {
  const mine = await message();
  const begun = await begin(mine);
  await complete(begun.media!);
  const pending = await begin(mine, "voice");
  await grant(100, other);
  const theirs = await begin(await message({ userId: other }), "voice", false, other);
  await finish(theirs.media!.id, "complete", {
    path: `${other}/x.mp3`,
    mime: "audio/mpeg",
    bytes: 1,
  });

  const album = (await app.query("select public.companion_list_media(null, null, null, 50) as a"))
    .rows[0].a;
  expect(album.items.map((item: Media) => item.id)).toEqual([begun.media!.id]);
  const byMessage = (await app.query("select public.companion_get_media(null, $1) as m", [[mine]]))
    .rows[0].m;
  expect(byMessage.map((item: Media) => [item.kind, item.status])).toEqual([
    ["voice", "pending"],
    ["snapshot", "complete"],
  ]);
  const notMine = (
    await app.query("select public.companion_get_media($1, null) as m", [[theirs.media!.id]])
  ).rows[0].m;
  expect(notMine).toEqual([]);
  await expect(
    app.query("select public.companion_list_media(null, 'photo', null, 10)"),
  ).rejects.toThrow(/invalid media page/);
  void pending;

  for (const sql of [
    "select public.companion_media_begin(gen_random_uuid(), gen_random_uuid(), 'voice', false, now())",
    "select public.companion_media_finish(gen_random_uuid(), 'failed', '{}', now())",
    "select public.companion_inspect_media(null, 10)",
  ]) {
    await expect(app.query(sql)).rejects.toThrow(/permission denied/);
  }
  const inspect = (
    await server.query("select public.companion_inspect_media($1, 10) as i", [tester])
  ).rows[0].i;
  expect(inspect.today).toEqual({ snapshot: 1, voice: 1 });
  expect(inspect.settings).toMatchObject({ photoCost: 35, snapshotEngine: "gpt-image-2.5-flare" });
  expect(inspect.items[1]).toMatchObject({
    kind: "snapshot",
    holdStatus: "settled",
    prompt: { scene: "a scene" },
    meta: { aiGenerated: true, promptHash: "abc", ageBand: "unknown" },
  });
});

test("SV10. 학습자 뒷모습 설정 — 앱 · 운영 · 작업 입력", async () => {
  await app.query(
    "select public.companion_save_profile(null, null, null, null, p_snapshot_self => 'hidden')",
  );
  expect(
    (await app.query("select public.companion_load_profile() as p")).rows[0].p.snapshotSelf,
  ).toBe("hidden");
  await expect(
    app.query(
      "select public.companion_save_profile(null, null, null, null, p_snapshot_self => 'robot')",
    ),
  ).rejects.toThrow(/invalid companion profile/);
  // 다른 인수만 바꾸면 그대로.
  await app.query("select public.companion_save_profile(null, null, 'en', null)");
  expect((await begin(await message())).job).toMatchObject({ snapshotSelf: "hidden" });

  await server.query(
    "select public.companion_operator_set_profile($1, 2010, false, null, null, null, p_snapshot_self => 'male')",
    [tester],
  );
  const testers = (await server.query("select public.companion_inspect_testers() as t")).rows[0].t;
  expect(testers.find((row: { userId: string }) => row.userId === tester)).toMatchObject({
    snapshotSelf: "male",
    ageBand: "minor",
  });
  await db.admin.query("update companion.media set status = 'failed' where status = 'pending'");
  expect((await begin(await message())).job).toMatchObject({
    snapshotSelf: "male",
    ageBand: "minor",
  });
});

test("SV11. 앨범은 대화 초기화에 남고 계정 삭제에 지워진다", async () => {
  const begun = await begin(await message());
  await complete(begun.media!);
  await server.query("select public.companion_operator_reset($1, 'duksu')", [tester]);
  expect(
    (await db.admin.query("select count(*)::int as n from companion.messages")).rows[0].n,
  ).toBe(0);
  const album = (await app.query("select public.companion_list_media(null, null, null, 10) as a"))
    .rows[0].a;
  expect(album.items).toHaveLength(1);
  await db.admin.query(
    "insert into storage.objects (bucket_id, name) values ('companion-media', $1), ('companion-media', 'stray/x.png')",
    [`${tester}/${begun.media!.id}.png`],
  );
  // 행이 있는 파일은 고아가 아니다.
  expect((await server.query("select public.companion_media_orphans(10) as o")).rows[0].o).toEqual([
    "stray/x.png",
  ]);
  await db.admin.query("delete from auth.users where id = $1", [tester]);
  expect((await db.admin.query("select count(*)::int as n from companion.media")).rows[0].n).toBe(
    0,
  );
  // 계정 삭제의 Storage 지우기가 실패했으면 운영이 여기서 찾는다.
  expect((await server.query("select public.companion_media_orphans(10) as o")).rows[0].o).toEqual([
    `${tester}/${begun.media!.id}.png`,
    "stray/x.png",
  ]);
  await expect(app.query("select public.companion_media_orphans(10)")).rejects.toThrow(
    /permission denied/,
  );
});
