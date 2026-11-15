import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { startTestDatabase } from "./postgres.test-support";

// 스냅샷 · 음성 상한(20261202, ADR-0146 리뷰 반영): 유료 엔진까지 간 시도 상한 · 연속 실패 가드 · 음성 비상 스위치 ·
// 사진 · 음성 예약은 구독 하루 메시지 상한에 들어가지 않는다 · pending 만료 하한.
const tester = "00000000-0000-4000-8000-0000000000c1";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
const nextMidnight = (() => {
  const day = new Date(now);
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1))
    .toISOString()
    .replace(".000Z", "Z");
})();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

type Begun = {
  result: string;
  cached?: boolean;
  media?: { id: string; status: string };
  detail?: Record<string, unknown>;
};

let clock = 0;
/** 지난 시도들의 순서(1ms씩, 실제 요청보다 앞). */
let pastSeq = 0;
/** 통과한 캐릭터 메시지 하나(대화도 만든다). */
async function message(): Promise<string> {
  const conversation = await db.admin.query(
    `insert into companion.conversations (user_id, character_id) values ($1, 'duksu')
     on conflict (user_id, character_id) where kind = 'companion' do update set character_id = excluded.character_id
     returning id`,
    [tester],
  );
  const result = await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, segments, created_at)
     values ($1, $2, 'assistant', 'turn', 'complete', '[{"kind":"speech","text":"오늘은 궁 마당에서 수업해요!"}]'::jsonb,
       now() - interval '1 hour' + make_interval(secs => $3)) returning id`,
    [conversation.rows[0].id, tester, ++clock],
  );
  return result.rows[0].id as string;
}
async function begin(messageId: string, kind = "snapshot", again = false) {
  const result = await server.query(
    "select public.companion_media_begin($1, $2, $3, $4, $5) as b",
    [tester, messageId, kind, again, now],
  );
  return result.rows[0].b as Begun;
}
async function finish(mediaId: string, status: string, failure = "check_failed") {
  const result =
    status === "complete"
      ? { path: `${tester}/${mediaId}.png`, mime: "image/png", bytes: 10 }
      : { failure };
  await server.query("select public.companion_media_finish($1, $2, $3::jsonb, $4)", [
    mediaId,
    status,
    JSON.stringify(result),
    now,
  ]);
}
/** 지난 시도 n개를 바로 적는다(상태 · 실패 코드 · 몇 시간 전). 예약 없이 행만. */
async function past(
  n: number,
  kind: "snapshot" | "voice",
  status: string,
  failure: string | null = status === "complete" ? null : "check_failed",
  hoursAgo = 0,
) {
  await db.admin.query(
    `insert into companion.media (user_id, character_id, message_id, kind, status, charge, cost, storage_path, failure, created_at)
     select $1, 'duksu', gen_random_uuid(), $2, $3, case when $2 = 'voice' then 'voice' else 'photo' end, 0,
       case when $3 = 'complete' then 'x/' || gen_random_uuid() end, $4,
       least(now(), $6::timestamptz) - interval '10 minutes' - make_interval(hours => $5) + make_interval(secs => ($8 + g) / 1000.0)
     from generate_series(1, $7) g`,
    [tester, kind, status, failure, hoursAgo, now, n, pastSeq],
  );
  pastSeq += n;
}
/** 상태를 돌아가며(blocked · failed · complete) — 연속 실패 가드에 걸리지 않게 시도 수만 채운다. */
async function mixed(n: number, kind: "snapshot" | "voice") {
  for (let i = 0; i < n; i += 1) {
    await past(1, kind, ["blocked", "failed", "complete"][i % 3]!);
  }
}
const counts = async () =>
  (
    await db.admin.query(
      `select (select count(*) from companion.media where user_id = $1)::int as media,
              (select count(*) from companion.credit_holds where user_id = $1)::int as holds,
              coalesce((select sub_balance + grant_balance + paid_balance from companion.credit_wallets where user_id = $1), 0)::int as balance`,
      [tester],
    )
  ).rows[0] as { media: number; holds: number; balance: number };
const limited = (kind: string, reason: string, limit: number) => ({
  result: "attempt_limit",
  detail: { kind, reason, limit, resetsAt: nextMidnight },
});

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  await server.query("set role service_role");
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  await db.admin.query("delete from storage.objects");
  await db.admin.query(
    `update companion.settings set photo_cost = 35, voice_cost = 15, photo_redraw_cost = 25, snapshot_daily_limit = null,
       snapshot_daily_attempts = 30, voice_daily_attempts = 60, media_failure_streak_limit = 5, voice_daily_limit = null,
       media_pending_minutes = 10, minor_daily_limit_seconds = null, testers_only = false`,
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'c@libitum.test', '{"duru_tester": true}')`,
    [tester],
  );
  await db.admin.query(
    "insert into storage.objects (bucket_id, name) values ('companion-refs', 'deoksu-ref.png')",
  );
  await server.query(
    "select public.companion_grant_credits($1, 'grant', 5000, 'operator', null, null)",
    [tester],
  );
});

test("ML1. 설정 기본값(30 · 60 · 5 · 음성 상한 없음) · pending 만료는 5분 이상만", async () => {
  const settings = await db.admin.query(
    `select column_name, column_default from information_schema.columns
     where table_schema = 'companion' and table_name = 'settings'
       and column_name in ('snapshot_daily_attempts', 'voice_daily_attempts', 'media_failure_streak_limit', 'voice_daily_limit')`,
  );
  expect(
    Object.fromEntries(settings.rows.map((row) => [row.column_name, row.column_default])),
  ).toEqual({
    snapshot_daily_attempts: "30",
    voice_daily_attempts: "60",
    media_failure_streak_limit: "5",
    voice_daily_limit: null,
  });
  await expect(
    db.admin.query("update companion.settings set media_pending_minutes = 4"),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    db.admin.query("update companion.settings set media_failure_streak_limit = 0"),
  ).rejects.toMatchObject({ code: "23514" });
  await db.admin.query("update companion.settings set media_pending_minutes = 5");
});

test("ML2. 스냅샷 시도 상한 — blocked · failed도 센다, 예약 · 행 없음, 저장본은 그대로 · refs_missing · 어제는 세지 않는다 · null이면 끔", async () => {
  await past(3, "snapshot", "failed", "check_failed", 30); // 어제
  await mixed(28, "snapshot");
  await past(3, "snapshot", "failed", "refs_missing");
  const done = await message();
  const first = await begin(done);
  expect(first.result).toBe("ok"); // 29번째
  await finish(first.media!.id, "complete");
  const second = await begin(await message());
  expect(second.result).toBe("ok"); // 30번째
  await finish(second.media!.id, "blocked");

  const before = await counts();
  expect(await begin(await message())).toEqual(limited("snapshot", "attempts", 30));
  // 다시 그리기도 시도다.
  expect(await begin(done, "snapshot", true)).toEqual(limited("snapshot", "attempts", 30));
  expect(await counts()).toEqual(before);
  // 저장본은 상한과 상관없이 무료로 돌려준다.
  expect(await begin(done)).toMatchObject({ result: "ok", cached: true });
  // 음성은 따로 센다.
  expect((await begin(done, "voice")).result).toBe("ok");

  await db.admin.query("update companion.settings set snapshot_daily_attempts = null");
  expect((await begin(await message())).result).toBe("ok");
});

test("ML3. 연속 실패 가드 — 그날 마지막 complete 뒤 5번 연속 blocked · failed(expired 포함)면 그날은 그만 · complete가 끼면 다시 센다", async () => {
  await past(6, "snapshot", "blocked", "check_failed", 30); // 어제 실패는 세지 않는다
  await past(3, "snapshot", "blocked");
  await past(1, "snapshot", "complete");
  await past(2, "snapshot", "failed", "expired");
  await past(1, "snapshot", "failed", "refs_missing"); // 엔진 전 실패는 세지 않는다

  // 실제 흐름으로 세 번 더 실패 → 5번째에서 막힌다.
  for (let i = 0; i < 3; i += 1) {
    const begun = await begin(await message());
    expect(begun.result).toBe("ok");
    await finish(begun.media!.id, i === 0 ? "failed" : "blocked", "engine_failed");
  }
  const before = await counts();
  expect(await begin(await message())).toEqual(limited("snapshot", "failures", 5));
  expect(await counts()).toEqual(before);
  // 음성은 스냅샷 실패와 상관없다.
  expect((await begin(await message(), "voice")).result).toBe("ok");

  await db.admin.query("update companion.settings set media_failure_streak_limit = 6");
  const sixth = await begin(await message());
  expect(sixth.result).toBe("ok");
  await finish(sixth.media!.id, "complete");
  // complete 뒤에는 다시 0부터.
  await db.admin.query("update companion.settings set media_failure_streak_limit = 5");
  expect((await begin(await message())).result).toBe("ok");
  await db.admin.query("update companion.settings set media_failure_streak_limit = null");
});

test("ML4. 음성 — 시도 상한 60 · 연속 실패 가드 · 비상 스위치 voice_daily_limit(0 = 끔, null = 상한 없음)", async () => {
  await mixed(60, "voice");
  expect(await begin(await message(), "voice")).toEqual(limited("voice", "attempts", 60));
  await db.admin.query("update companion.settings set voice_daily_attempts = null");
  expect((await begin(await message(), "voice")).result).toBe("ok");

  await db.admin.query("delete from companion.media");
  await db.admin.query("update companion.settings set voice_daily_attempts = 60");
  await past(5, "voice", "failed", "engine_failed");
  expect(await begin(await message(), "voice")).toEqual(limited("voice", "failures", 5));

  await db.admin.query("delete from companion.media");
  await db.admin.query("update companion.settings set voice_daily_limit = 0");
  const before = await counts();
  expect(await begin(await message(), "voice")).toEqual({
    result: "daily_limit",
    detail: { limit: 0 },
  });
  expect(await counts()).toEqual(before);
  // 스냅샷은 음성 스위치와 상관없다.
  expect((await begin(await message())).result).toBe("ok");

  await db.admin.query("update companion.settings set voice_daily_limit = 1");
  const one = await begin(await message(), "voice");
  expect(one.result).toBe("ok");
  expect(await begin(await message(), "voice")).toEqual({
    result: "daily_limit",
    detail: { limit: 1 },
  });
  // 실패로 닫히면(엽전 해제) 하루 상한에서는 빠진다 — 시도 상한 · 연속 실패 가드가 따로 막는다.
  await finish(one.media!.id, "failed", "engine_failed");
  expect((await begin(await message(), "voice")).result).toBe("ok");
});

test("ML5. 사진 · 음성 예약은 구독 하루 메시지 상한(공정 사용 200)을 먹지 않는다 · 메시지 예약은 먹는다", async () => {
  await db.admin.query(
    `insert into companion.plan_entitlements (user_id, entitlement, product_id, status, period_started_at, expires_at, source_event_id, last_event_at)
     values ($1, 'premium', 'duru.premium.monthly.v1', 'active', now() - interval '1 day', now() + interval '30 days', 'evt', now())`,
    [tester],
  );
  const holds = (n: number, reason: string) =>
    db.admin.query(
      `insert into companion.credit_holds (user_id, client_message_id, character_id, amount, status, plan_free, reason)
       select $1, gen_random_uuid(), 'duksu', case when $3 = 'message' then 0 else 35 end, 'settled', $3 = 'message', $3
       from generate_series(1, $2)`,
      [tester, n, reason],
    );
  const turns = async () =>
    (await db.admin.query("select * from companion.plan_turns_today($1, $2)", [tester, now]))
      .rows[0] as { free_used: number; total: number };
  const gate = async () =>
    (
      await server.query(
        "select public.companion_turn_gate($1, 'duksu', gen_random_uuid(), $2, null) as g",
        [tester, now],
      )
    ).rows[0].g as { result: string; detail?: Record<string, unknown> };

  await holds(120, "photo");
  await holds(60, "voice");
  await holds(30, "photo_redraw");
  expect(await turns()).toEqual({ free_used: 0, total: 0 });
  expect((await gate()).result).toBe("ok");
  expect((await begin(await message())).result).toBe("ok");

  await holds(199, "message");
  expect(await turns()).toEqual({ free_used: 199, total: 199 });
  expect((await gate()).result).toBe("ok");
  await holds(1, "message");
  expect(await gate()).toMatchObject({
    result: "usage_time_limit",
    detail: { limit: "fair_use" },
  });
  expect(await begin(await message(), "voice")).toMatchObject({ result: "usage_time_limit" });
});

test("ML6. 운영 조회 — 오늘 시도 수(모든 상태) · 새 설정", async () => {
  await past(2, "snapshot", "blocked");
  await past(1, "snapshot", "complete");
  await past(1, "snapshot", "failed", "refs_missing");
  await past(3, "voice", "failed", "engine_failed");
  const inspected = (
    await server.query("select public.companion_inspect_media($1, 10) as i", [tester])
  ).rows[0].i as { today: Record<string, number>; settings: Record<string, unknown> };
  expect(inspected.today).toMatchObject({
    snapshot: 1,
    voice: 0,
    snapshotAttempts: 3,
    voiceAttempts: 3,
  });
  expect(inspected.settings).toMatchObject({
    snapshotDailyAttempts: 30,
    voiceDailyAttempts: 60,
    mediaFailureStreakLimit: 5,
    voiceDailyLimit: null,
  });
});
