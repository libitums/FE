import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20270104130000(ADR-0191 D11): 사진 스토리 — 문(스위치 · 성인 · 창 · 검수 시도) · 저장(live는 알람, checking · 위기는 없음) · 거절(격리 · 기한) ·
// 다시 보기 · 글 고치기 · 교정 횟수 · 파일 정리 대기열 · 다시 확인 요청 · 반응 · 대화 턴이 읽는 장면 설명.
const adult = "00000000-0000-4000-8000-000000000011";
const minor = "00000000-0000-4000-8000-000000000012";
const unknown = "00000000-0000-4000-8000-000000000013";

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

type Json = Record<string, unknown>;
const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);
const one = async <T>(sql: string, params: unknown[] = []) =>
  (await db.admin.query(sql, params)).rows[0] as T;
const uuid = async () => (await one<{ id: string }>("select gen_random_uuid() as id")).id;
const rpc = async (sql: string, params: unknown[] = []) =>
  (await server.query(`select ${sql} as r`, params)).rows[0].r as Json;

const gate = (user: string, client: string) =>
  rpc("public.companion_my_photo_gate($1, $2, null, now())", [user, client]);
const scene = {
  description: "A plane window over the sea.",
  hooks: ["Where are you flying?"],
  crisis: false,
};
async function save(user: string, client: string, extra: Partial<Record<string, unknown>> = {}) {
  const args = {
    path: `${user}/${client}.jpg`,
    ko: "서울에 도착했어! 너무 신나",
    status: "live",
    scene: scene as unknown,
    overlays: [{ kind: "word", ko: "창가 자리", x: 0.3, y: 0.2, scale: 1, rotation: 0 }] as unknown,
    ...extra,
  };
  return rpc(
    "public.companion_save_my_photo_story($1, $2, $3, $4, 'seoure', 'I made it to Seoul!', 'en', '서울 도착했어', $5, $6, $7, null, now())",
    [
      user,
      client,
      args.path,
      args.ko,
      JSON.stringify(args.overlays),
      args.scene === null ? null : JSON.stringify(args.scene),
      args.status,
    ],
  );
}
const reopen = (user: string) =>
  db.admin.query(
    "update companion.my_story_slots set local_day = local_day - 30 - (random() * 1000)::int where user_id = $1",
    [user],
  );
async function spoke(user: string, character: string) {
  const id = (
    await one<{ id: string }>(
      `insert into companion.conversations (user_id, character_id, last_message_at) values ($1, $2, now() - interval '2 hours')
       on conflict (user_id, character_id) where kind = 'companion' do update set last_message_at = excluded.last_message_at
       returning id`,
      [user, character],
    )
  ).id;
  await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, text, client_message_id, created_at)
     values ($1, $2, 'user', 'turn', 'complete', '안녕하세요', gen_random_uuid(), now() - interval '2 hours')`,
    [id, user],
  );
}
const alarms = async (story: string) =>
  (
    await db.admin.query(
      "select character_id, rank, angle from companion.my_story_reactions where story_id = $1 order by rank",
      [story],
    )
  ).rows as { character_id: string; rank: number; angle: string }[];
const count = async (table: string, where = "true") =>
  Number(
    (await one<{ n: string }>(`select count(*) as n from companion.${table} where ${where}`)).n,
  );
const storyId = (result: Json) => (result["story"] as { id: string }).id;

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
  await db.admin.query("truncate companion.my_story_usage_global, companion.my_story_file_purges");
  await settings(
    "testers_only = false, friends_mode = 'on', my_stories = 'on', story_reactions = 'on', my_story_photo = 'on', my_story_daily = 20, my_story_check_daily = 5, my_story_draft_daily = 30, my_story_edit_limit = 3, my_story_reject_keep_days = 30, my_story_rules = '{}'",
  );
  await db.admin.query(
    `insert into auth.users (id, email, raw_app_meta_data) values
       ($1, 'a@libitum.test', '{"duru_tester": true}'), ($2, 'n@libitum.test', '{}'), ($3, 'u@libitum.test', '{}')`,
    [adult, minor, unknown],
  );
  const year = new Date().getUTCFullYear();
  await db.admin.query(
    "insert into companion.profiles (user_id, birth_year, age_source, l1) values ($1, $2, 'self', 'es'), ($3, $4, 'self', 'en')",
    [adult, year - 30, minor, year - 15],
  );
});

test("MP1. 문 — 스위치 off 기본 · 성인만(미성년 · 나이 모름은 age) · 검수 시도를 세고 상한이면 check_limit · 쓴 창은 window_used", async () => {
  expect(
    (
      await one<{ d: string }>(
        `select column_default as d from information_schema.columns
         where table_schema = 'companion' and table_name = 'settings' and column_name = 'my_story_photo'`,
      )
    ).d,
  ).toBe("'off'::text");
  expect((await gate(minor, await uuid())).result).toBe("age");
  expect((await gate(unknown, await uuid())).result).toBe("age");
  await settings("my_story_photo = 'off'");
  expect((await gate(adult, await uuid())).result).toBe("off");
  await settings("my_story_photo = 'testers'");
  expect((await gate(adult, await uuid())).result).toBe("ok"); // 시험 계정
  await settings("my_story_photo = 'on', my_stories = 'off'");
  expect((await gate(adult, await uuid())).result).toBe("off");
  await settings("my_stories = 'on', my_story_check_daily = 3");
  expect((await gate(adult, await uuid())).result).toBe("ok");
  expect((await gate(adult, await uuid())).result).toBe("ok");
  expect(await gate(adult, await uuid())).toMatchObject({ result: "check_limit" });
  expect(await count("my_story_usage", `user_id = '${adult}' and checks = 3`)).toBe(1);

  await settings("my_story_check_daily = 50");
  const client = await uuid();
  const saved = await save(adult, client);
  expect(saved.result).toBe("ok");
  // 같은 요청이 다시 오면 그 스토리, 다른 요청은 이 창을 이미 썼다.
  expect(await gate(adult, client)).toMatchObject({
    result: "exists",
    story: { id: storyId(saved) },
  });
  expect(await gate(adult, await uuid())).toMatchObject({
    result: "window_used",
    window: { used: true },
  });
});

test("MP2. 저장 — 사진 칸 · live는 Seen · 알람(첫 인물 react), 위기 · checking은 알람이 없다, 남의 폴더 · 긴 글은 invalid", async () => {
  await db.admin.query("update companion.settings set my_story_rules = '{\"twoReplyChance\": 1}'");
  await spoke(adult, "mina");
  await spoke(adult, "yoonkyung");
  const saved = await save(adult, await uuid());
  expect(saved.story).toMatchObject({
    kind: "photo",
    status: "live",
    word: null,
    ko: "서울에 도착했어! 너무 신나",
    lineOriginal: "서울 도착했어",
    edits: 0,
    overlays: [{ kind: "word", ko: "창가 자리" }],
  });
  expect((saved.story as { imagePath: string }).imagePath).toMatch(new RegExp(`^${adult}/`));
  const picked = await alarms(storyId(saved));
  expect(picked.map((alarm) => alarm.angle)[0]).toBe("react");
  expect(picked[1]!.angle).toBe("follow");
  expect(await count("my_story_seen", `story_id = '${storyId(saved)}'`)).toBe(2);

  await reopen(adult);
  const crisis = await save(adult, await uuid(), { scene: { ...scene, crisis: true } });
  expect(crisis.result).toBe("ok");
  expect(await alarms(storyId(crisis))).toEqual([]);
  await reopen(adult);
  const checking = await save(adult, await uuid(), { status: "checking", scene: null });
  expect(checking.story).toMatchObject({ status: "checking" });
  expect(await alarms(storyId(checking))).toEqual([]);
  expect(await count("my_story_seen", `story_id = '${storyId(checking)}'`)).toBe(0);

  for (const extra of [
    { path: `${minor}/x.jpg` },
    { path: `${adult}/../x.jpg` },
    { ko: "가".repeat(121) },
    { status: "rejected" },
    { overlays: Array.from({ length: 9 }, () => ({ kind: "text", ko: "가" })) },
  ]) {
    await reopen(adult);
    expect((await save(adult, await uuid(), extra)).result).toBe("invalid");
  }
  // 미성년 계정은 서버 키로 불러도 저장되지 않는다.
  expect((await save(minor, await uuid())).result).toBe("off");
});

test("MP3. 거절 — 스토리 없이 거절 줄만(분류 · 격리 경로 · 30일 뒤 지움), 창은 쓰지 않고 같은 요청은 rejected, 다시 확인 요청은 본인만", async () => {
  const client = await uuid();
  expect((await gate(adult, client)).result).toBe("ok");
  const rejected = await rpc("public.companion_reject_my_photo($1, $2, 'nudity', $3, now())", [
    adult,
    client,
    `${adult}/${client}.jpg`,
  ]);
  expect(rejected).toMatchObject({ category: "nudity" });
  const days = (Date.parse(rejected["purgeAfter"] as string) - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(29.9);
  expect(days).toBeLessThan(30.1);
  expect(await count("my_stories")).toBe(0);
  expect(await count("my_story_slots")).toBe(0);
  expect(await gate(adult, client)).toMatchObject({
    result: "rejected",
    rejection: { id: rejected["id"], category: "nudity" },
  });
  // 모르는 분류는 other.
  expect(
    await rpc("public.companion_reject_my_photo($1, $2, 'Weird Thing', null, now())", [
      adult,
      await uuid(),
    ]),
  ).toMatchObject({ category: "other" });
  // 격리 버킷으로 옮기지 못했으면 원본을 지우도록 대기열에 넣는다 — 남의 폴더 경로는 넣지 않는다.
  expect(await count("my_story_file_purges")).toBe(0);
  await rpc("public.companion_reject_my_photo($1, $2, 'gore', null, now(), $3)", [
    adult,
    await uuid(),
    `${adult}/lost.jpg`,
  ]);
  await rpc("public.companion_reject_my_photo($1, $2, 'gore', null, now(), $3)", [
    adult,
    await uuid(),
    `${minor}/not-mine.jpg`,
  ]);
  expect(
    (await db.admin.query("select bucket, path from companion.my_story_file_purges")).rows,
  ).toEqual([{ bucket: "my-story-photos", path: `${adult}/lost.jpg` }]);

  const review = async (user: string, id: unknown) => {
    await signIn(app, user);
    return (await app.query("select public.companion_request_story_review($1) as r", [id])).rows[0]
      .r as Json;
  };
  expect(await review(minor, rejected["id"])).toEqual({ result: "not_found" });
  expect(await review(adult, rejected["id"])).toEqual({ result: "ok" });
  expect(await count("my_story_rejections", "review_requested_at is not null")).toBe(1);
});

test("MP4. 다시 보기 — 읽지 못한 사진은 게시하지 않는다(간격을 늘려 24시간 다시 읽고 끝내 못 읽으면 지움), 판정 live는 알람 · rejected는 거절 · drop은 지움", async () => {
  await spoke(adult, "mina");
  const first = storyId(await save(adult, await uuid(), { status: "checking", scene: null }));
  const due = (await server.query("select public.companion_my_story_checks_due(now(), 5) as r"))
    .rows[0].r as Json[];
  expect(due).toEqual([
    expect.objectContaining({ storyId: first, userId: adult, ko: "서울에 도착했어! 너무 신나" }),
  ]);
  expect(String(due[0]!["imagePath"])).toMatch(new RegExp(`^${adult}/`));
  expect(await count("my_stories", `id = '${first}' and check_tries = 1`)).toBe(1);

  // 그 밖(다음에 다시)은 그대로 둔다.
  expect(
    await rpc("public.companion_resolve_my_story_check($1, 'retry', null, null, null, now())", [
      first,
    ]),
  ).toEqual({ result: "retry" });
  expect(await count("my_stories", `id = '${first}' and status = 'checking'`)).toBe(1);
  expect(
    await rpc("public.companion_resolve_my_story_check($1, 'live', $2, null, null, now())", [
      first,
      JSON.stringify(scene),
    ]),
  ).toEqual({ result: "live" });
  expect(await alarms(first)).toMatchObject([{ character_id: "mina", angle: "react" }]);
  expect(
    await rpc("public.companion_resolve_my_story_check($1, 'live', null, null, null, now())", [
      first,
    ]),
  ).toEqual({ result: "gone" });

  await reopen(adult);
  const client = await uuid();
  const second = storyId(await save(adult, client, { status: "checking", scene: null }));
  expect(
    await rpc("public.companion_resolve_my_story_check($1, 'rejected', null, 'gore', $2, now())", [
      second,
      `${adult}/${client}.jpg`,
    ]),
  ).toEqual({ result: "rejected" });
  expect(await count("my_stories", `id = '${second}'`)).toBe(0);
  expect(await count("my_story_rejections", `client_id = '${client}' and category = 'gore'`)).toBe(
    1,
  );

  await reopen(adult);
  const stuck = storyId(await save(adult, await uuid(), { status: "checking", scene: null }));
  const dueIds = async (at = "now()") =>
    (
      (await server.query(`select public.companion_my_story_checks_due(${at}, 5) as r`)).rows[0]
        .r as Json[]
    ).map((row) => row["storyId"]);
  // 간격을 늘려 가며 다시 고른다 — 첫 시도 뒤에는 3분(90초 × 2^1), 시도가 쌓이면 최대 30분.
  expect(await dueIds()).toEqual([stuck]);
  expect(await dueIds()).toEqual([]);
  expect(await dueIds("now() + interval '2 minutes'")).toEqual([]);
  expect(await dueIds("now() + interval '4 minutes'")).toEqual([stuck]);
  await db.admin.query(
    "update companion.my_stories set check_tries = 9, checked_at = now() where id = $1",
    [stuck],
  );
  expect(await dueIds("now() + interval '20 minutes'")).toEqual([]);
  expect(await dueIds("now() + interval '31 minutes'")).toEqual([stuck]);
  // 읽지 못한 사진은 게시하지 않는다 — 몇 번을 실패해도 checking으로 남고 알람이 없다.
  expect(await count("my_stories", `id = '${stuck}' and status = 'checking'`)).toBe(1);
  expect(await alarms(stuck)).toEqual([]);
  // 24시간이 다 가도록 못 읽었으면 지운다(읽는 중일 수 있는 마지막 3분은 기다린다) — 사진은 정리 대기열로.
  await db.admin.query(
    "update companion.my_stories set checked_at = now() + interval '24 hours 30 seconds' where id = $1",
    [stuck],
  );
  expect(await dueIds("now() + interval '24 hours 1 minute'")).toEqual([]);
  expect(await count("my_stories", `id = '${stuck}'`)).toBe(1);
  expect(await dueIds("now() + interval '24 hours 5 minutes'")).toEqual([]);
  expect(await count("my_stories", `id = '${stuck}'`)).toBe(0);
  expect(await count("my_story_file_purges", "bucket = 'my-story-photos'")).toBeGreaterThanOrEqual(
    1,
  );
  // 사진이 사라져 읽을 수 없으면 지운다(거절은 아니다).
  await reopen(adult);
  const lost = storyId(await save(adult, await uuid(), { status: "checking", scene: null }));
  expect(
    await rpc("public.companion_resolve_my_story_check($1, 'drop', null, null, null, now())", [
      lost,
    ]),
  ).toEqual({ result: "dropped" });
  expect(await count("my_stories", `id = '${lost}'`)).toBe(0);
  expect(await count("my_story_rejections", "true")).toBe(1); // 위의 gore 하나뿐

  // 올릴 때 글에서 읽힌 위기 신호는 다시 읽은 결과(위기 아님)가 덮지 못한다 — 알람이 없다.
  await reopen(adult);
  const crisis = storyId(
    await save(adult, await uuid(), {
      status: "checking",
      scene: { description: "", hooks: [], crisis: true },
    }),
  );
  expect(
    await rpc("public.companion_resolve_my_story_check($1, 'live', $2, null, null, now())", [
      crisis,
      JSON.stringify(scene),
    ]),
  ).toEqual({ result: "live" });
  expect(await alarms(crisis)).toEqual([]);
  expect(await one("select scene from companion.my_stories where id = $1", [crisis])).toEqual({
    scene: { ...scene, crisis: true },
  });
});

test("MP5. 글 고치기 — 사진 스토리의 글만, 스토리당 상한, 남의 것 · 단어 스토리는 not_found. 교정 횟수는 하루 상한 · 연령대 · L1을 돌려준다", async () => {
  const story = storyId(await save(adult, await uuid()));
  const edit = (user: string, id: string, ko: string) =>
    rpc("public.companion_edit_my_story_line($1, $2, $3, '', 'Arrived!', now())", [user, id, ko]);
  expect(await edit(adult, story, " 서울에 도착했어! ")).toMatchObject({
    result: "ok",
    story: { ko: "서울에 도착했어!", meaning: "Arrived!", edits: 1 },
  });
  expect((await edit(minor, story, "남의 글")).result).toBe("not_found");
  expect((await edit(adult, story, " ")).result).toBe("invalid");
  await edit(adult, story, "둘");
  await edit(adult, story, "셋");
  expect(await edit(adult, story, "넷")).toMatchObject({
    result: "edit_limit",
    story: { ko: "셋", edits: 3 },
  });

  await settings("my_story_draft_daily = 2");
  const draft = (user: string) => rpc("public.companion_count_story_draft($1, now())", [user]);
  expect(await draft(adult)).toEqual({ allowed: true, l1: "es", ageBand: "adult" });
  expect(await draft(minor)).toMatchObject({ allowed: true, ageBand: "minor" });
  expect(await draft(unknown)).toEqual({ allowed: true, l1: null, ageBand: "unknown" });
  expect((await draft(adult)).allowed).toBe(true);
  expect(await draft(adult)).toEqual({ allowed: false, reason: "draft_limit" });
  await settings("my_stories = 'off'");
  expect(await draft(minor)).toEqual({ allowed: false, reason: "off" });
});

test("MP6. 파일 정리 — 스토리를 지우면 사진이, 기한이 지난 거절은 격리 파일이 대기열에 들어가고, 지운 줄은 대기열에서 빠진다", async () => {
  const client = await uuid();
  const story = storyId(await save(adult, client));
  await signIn(app, adult);
  await app.query("select public.companion_delete_my_story($1)", [story]);
  const purges = async (at = "now()") =>
    (await server.query(`select public.companion_my_story_file_purges(${at}, 50) as r`)).rows[0]
      .r as { id: number; bucket: string; path: string }[];
  expect(await purges()).toEqual([
    { id: expect.any(Number), bucket: "my-story-photos", path: `${adult}/${client}.jpg` },
  ]);

  const rejectedClient = await uuid();
  await rpc("public.companion_reject_my_photo($1, $2, 'nudity', $3, now())", [
    adult,
    rejectedClient,
    `${adult}/${rejectedClient}.jpg`,
  ]);
  expect(await purges()).toHaveLength(1); // 아직 기한 전
  const later = await purges("now() + interval '31 days'");
  expect(later.map((row) => row.bucket)).toEqual(["my-story-photos", "my-story-quarantine"]);
  expect(await count("my_story_rejections", "quarantine_path is null")).toBe(1);
  expect(
    await rpc("public.companion_done_my_story_file_purges($1)", [later.map((row) => row.id)]),
  ).toEqual({ deleted: 2 });
  expect(await purges()).toEqual([]);
  // 격리 파일이 지워진 거절은 다시 확인을 요청할 수 없다.
  const rejection = (await one<{ id: string }>("select id from companion.my_story_rejections")).id;
  await signIn(app, adult);
  expect(
    (await app.query("select public.companion_request_story_review($1) as r", [rejection])).rows[0]
      .r,
  ).toEqual({ result: "not_found" });
  // 계정을 지우면 사진 스토리의 사진도 대기열에 들어간다(cascade).
  await save(minor, await uuid()).catch(() => undefined);
  await reopen(adult);
  await save(adult, await uuid());
  // 계정 삭제는 companion 스키마 권한이 없는 auth 쪽 역할이 한다 — 사진을 대기열에 넣는 트리거가 그 역할로도 돌아야 한다.
  await db.admin.query(
    `do $$ begin
       if not exists (select 1 from pg_roles where rolname = 'story_auth_admin') then create role story_auth_admin; end if;
     end $$;
     grant usage on schema auth to story_auth_admin;
     grant select, delete on auth.users to story_auth_admin;`,
  );
  const auth = await db.connect();
  try {
    await auth.query("set role story_auth_admin");
    await auth.query("delete from auth.users where id = $1", [adult]);
  } finally {
    await auth.end();
  }
  expect(await count("my_stories")).toBe(0);
  expect(await purges()).toHaveLength(1);
});

test("MP7. 반응 · 대화 턴 — claim은 장면 설명 · 말 걸 거리를 싣고, 스토리 맥락은 live 사진의 장면 설명만 싣는다", async () => {
  await spoke(adult, "mina");
  const story = storyId(await save(adult, await uuid()));
  const claimed = (
    await server.query(
      "select public.companion_claim_story_reactions(now() + interval '2 hours', 10) as r",
    )
  ).rows[0].r as { rows: Json[] };
  expect(claimed.rows).toEqual([
    expect.objectContaining({
      storyId: story,
      kind: "photo",
      angle: "react",
      ko: "서울에 도착했어! 너무 신나",
      scene: "A plane window over the sea.",
      hooks: ["Where are you flying?"],
    }),
  ]);
  const context = async () =>
    (await rpc("public.companion_story_context($1, 'yoonkyung', now())", [adult])) as {
      mine: Json[];
    };
  expect((await context()).mine).toEqual([
    expect.objectContaining({ kind: "photo", scene: "A plane window over the sea." }),
  ]);
  await db.admin.query("update companion.my_stories set status = 'checking' where id = $1", [
    story,
  ]);
  expect((await context()).mine).toEqual([]);
  // 올린 사람은 checking도 읽는다.
  await signIn(app, adult);
  const mine = (await app.query("select public.companion_my_stories() as r")).rows[0].r as {
    stories: Json[];
  };
  expect(mine.stories).toEqual([expect.objectContaining({ id: story, status: "checking" })]);
});

test("MP8. 권한 — 앱은 서버 함수를 못 부르고, 올릴 수 있는가(저장소 정책용)는 성인 · 스위치를 본다", async () => {
  await signIn(app, adult);
  for (const sql of [
    `select public.companion_my_photo_gate('${adult}', gen_random_uuid(), null, now())`,
    `select public.companion_reject_my_photo('${adult}', gen_random_uuid(), 'nudity', null, now())`,
    "select public.companion_my_story_checks_due(now(), 1)",
    "select public.companion_my_story_file_purges(now(), 1)",
    `select public.companion_count_story_draft('${adult}', now())`,
  ])
    await expect(app.query(sql)).rejects.toMatchObject({ code: "42501" });
  const can = async (user: string) => {
    await signIn(app, user);
    return (await app.query("select public.companion_can_upload_story_photo() as r")).rows[0].r;
  };
  // 버킷 둘은 비공개 · 사진만. 사진 버킷에는 올리기 · 읽기 정책이 있고 격리 버킷에는 정책이 없다(서버 키만).
  const buckets = await db.admin.query(
    "select id, public, file_size_limit from storage.buckets where id like 'my-story-%' order by id",
  );
  expect(buckets.rows).toEqual([
    { id: "my-story-photos", public: false, file_size_limit: "5242880" },
    { id: "my-story-quarantine", public: false, file_size_limit: "5242880" },
  ]);
  const policies = await db.admin.query(
    `select policyname, cmd from pg_policies
     where schemaname = 'storage' and tablename = 'objects' and policyname like 'my_story_%' order by policyname`,
  );
  expect(policies.rows).toEqual([
    { policyname: "my_story_photos_owner_insert", cmd: "INSERT" },
    { policyname: "my_story_photos_owner_read", cmd: "SELECT" },
  ]);
  expect(await can(adult)).toBe(true);
  // 버킷에 파일이 40개 쌓이면 더 올릴 수 없다(스토리가 되지 못한 파일은 하루 뒤 정리된다).
  await db.admin.query(
    `insert into storage.objects (bucket_id, name, created_at)
     select 'my-story-photos', $1 || '/f' || n || '.jpg', now() - interval '2 days' from generate_series(1, 40) n`,
    [adult],
  );
  expect(await can(adult)).toBe(false);
  const client = await uuid();
  await db.admin.query("update storage.objects set name = $1 where name = $2", [
    `${adult}/${client}.jpg`,
    `${adult}/f1.jpg`,
  ]);
  await db.admin.query(
    "insert into storage.objects (bucket_id, name) values ('my-story-photos', $1)",
    [`${adult}/fresh.jpg`],
  );
  expect((await save(adult, client)).result).toBe("ok");
  const queued = (
    (await server.query("select public.companion_my_story_file_purges(now(), 100) as r")).rows[0]
      .r as { path: string }[]
  ).map((row) => row.path);
  // 하루 넘은 39개만 — 스토리가 가리키는 사진과 방금 올린 파일은 남긴다. 다시 불러도 겹쳐 넣지 않는다.
  expect(queued).toHaveLength(39);
  expect(queued).not.toContain(`${adult}/${client}.jpg`);
  expect(queued).not.toContain(`${adult}/fresh.jpg`);
  expect(await count("my_story_file_purges")).toBe(39);
  await server.query("select public.companion_my_story_file_purges(now(), 100)");
  expect(await count("my_story_file_purges")).toBe(39);
  await db.admin.query("delete from storage.objects where bucket_id = 'my-story-photos'");
  expect(await can(minor)).toBe(false);
  expect(await can(unknown)).toBe(false);
  await settings("my_story_photo = 'off'");
  expect(await can(adult)).toBe(false);
});
