import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 20270105(ADR-0192): 친구 스토리 AI 생성 — 인물별 빈도 · 초안(기획 승인 → 그림 → 최종 승인) · 그날짜 한 번짜리 줄 · 그림 일꾼.
const member = "00000000-0000-4000-8000-000000000002";
const CAST = [
  "duksu",
  "yoonkyung",
  "mina",
  "doyun",
  "jaemin",
  "seoyeon",
  "haejun",
  "daeun",
  "geonwoo",
];

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

const settings = (assignments: string) =>
  db.admin.query(`update companion.settings set ${assignments}`);

async function pool(id: string, character: string) {
  await db.admin.query(
    `insert into companion.story_pool (id, character_id, image_path, line_ko, line_roman, meaning, word, replies, active)
     values ($1, $2, $3, $4, $5, '{"en":"line"}', null, '["좋아요!"]', true)`,
    [id, character, `content/images/${id}.webp`, `${id} 한 줄`, `${id} han jul`],
  );
}

type Posted = {
  posted: { storyId: string; characterId: string; poolId: string; generated: boolean }[];
};
const post = async (now: string) =>
  (await server.query("select public.companion_post_stories($1) as p", [now])).rows[0].p as Posted;
const postedIds = async (now: string) => (await post(now)).posted.map((p) => p.characterId).sort();

type Draft = {
  id: string;
  characterId: string;
  publishOn: string;
  status: string;
  line: { ko: string; roman: string; meaning: Record<string, string> };
  shot: string;
  scene: string;
  imagePath: string | null;
  imageSource: string | null;
  imageTries: number;
  imageError: string | null;
  imageMeta: Record<string, unknown>;
  poolId: string | null;
  reviewedBy: string | null;
};
const item = (characterId: string, publishOn: string, extra: Record<string, unknown> = {}) => ({
  characterId,
  publishOn,
  topic: "성수동 팝업",
  note: "웹 검색",
  ko: "성수동 팝업에 왔어요!",
  roman: "seongsudong pabeobe wasseoyo!",
  meaning: { en: "I came to a pop-up in Seongsu!", ja: "聖水洞のポップアップに来ました！" },
  replies: ["우와, 어때요?", "저도 가고 싶어요"],
  word: null,
  shot: "selfie",
  scene: "Standing in line outside a small pop-up store on a sunny street.",
  ...extra,
});
const add = async (drafts: unknown[], now = "2026-11-22T00:00:00Z") =>
  (
    await server.query("select public.companion_add_story_drafts($1, 'ops', $2) as r", [
      JSON.stringify(drafts),
      now,
    ])
  ).rows[0].r as { drafts: Draft[]; skipped: number };
const review = async (
  id: string,
  action: string,
  patch: Record<string, unknown> = {},
  now = "2026-11-22T00:00:00Z",
) =>
  (
    await server.query(
      "select public.companion_review_story_draft($1, $2, $3, 'reviewer', $4) as r",
      [id, action, JSON.stringify(patch), now],
    )
  ).rows[0].r as { result: string; draft: Draft | null };
type ClaimRow = {
  id: string;
  characterId: string;
  characterName: string;
  persona: unknown;
  replies: string[];
  word: unknown;
  refSlug: string | null;
  shot: string;
  scene: string;
  tries: number;
  claimedAt: string;
  previousPath: string | null;
  recent: unknown[];
  engine: string;
};
/** 고를 때 받은 증표(초안 → claimedAt) — 닫기에 그대로 낸다. */
const tokens = new Map<string, string>();
const claim = async (now: string, limit = 5) => {
  const rows = (
    (await server.query("select public.companion_claim_story_images($1, $2) as r", [now, limit]))
      .rows[0].r as { rows: ClaimRow[] }
  ).rows;
  for (const row of rows) tokens.set(row.id, row.claimedAt);
  return rows;
};
const finish = async (
  id: string,
  ok: boolean,
  path: string | null,
  options: {
    error?: string;
    retry?: boolean;
    meta?: unknown;
    token?: string | null;
    line?: unknown;
  } = {},
) =>
  (
    await server.query(
      "select public.companion_finish_story_image($1, $2, $3, $4, $5, $6, $7, '2026-11-22T00:05:00Z', $8) as r",
      [
        id,
        options.token === undefined ? (tokens.get(id) ?? null) : options.token,
        ok,
        path,
        JSON.stringify(
          options.meta ?? (ok ? { plan: { shot: "medium", angle: "eye_level" } } : {}),
        ),
        options.error ?? null,
        options.retry ?? true,
        options.line === undefined ? null : JSON.stringify(options.line),
      ],
    )
  ).rows[0].r as { saved: boolean; status?: string };
const poolRow = async (id: string) =>
  (
    await db.admin.query(
      "select line_ko, image_path, publish_on::text, draft_id, meaning from companion.story_pool where id = $1",
      [id],
    )
  ).rows[0] as
    | {
        line_ko: string;
        image_path: string;
        publish_on: string;
        draft_id: string;
        meaning: Record<string, string>;
      }
    | undefined;

/** 그림까지 끝난(ready) 초안 하나. */
async function ready(character: string, day: string) {
  const [draft] = (await add([item(character, day)])).drafts;
  await review(draft!.id, "approve_plan");
  await claim("2026-11-22T00:01:00Z");
  await finish(draft!.id, true, `content/images/friend-stories/${character}/${draft!.id}-1.png`);
  return draft!.id;
}

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
  await db.admin.query("delete from companion.stories");
  await db.admin.query("delete from companion.story_drafts");
  await db.admin.query("delete from companion.story_pool");
  await db.admin.query("delete from companion.story_plans");
  await db.admin.query("update companion.characters set active = (id = any ($1))", [CAST]);
  await settings("friend_stories = 'on', story_schedule = 'cadence', story_cadence = default");
  await db.admin.query("insert into auth.users (id, email) values ($1, 'm@libitum.test')", [
    member,
  ]);
});

test("pool: 1단계 그대로 — 인물마다 날마다 하나, 한 번짜리 줄은 돌려쓰지 않는다", async () => {
  await settings("story_schedule = 'pool'");
  for (const id of ["duksu", "yoonkyung", "daeun"]) await pool(`${id}-01`, id);
  expect(await postedIds("2026-11-23T23:00:00Z")).toEqual(["daeun", "duksu", "yoonkyung"]);
  // 승인된 한 번짜리 줄은 그날만 — 다른 날의 돌림에 끼지 않는다.
  const id = await ready("daeun", "2026-11-25");
  expect((await review(id, "approve")).result).toBe("ok");
  const next = await post("2026-11-24T23:00:00Z");
  expect(next.posted.find((p) => p.characterId === "daeun")).toMatchObject({
    poolId: "daeun-01",
    generated: false,
  });
  const day = await post("2026-11-25T23:00:00Z");
  expect(day.posted.find((p) => p.characterId === "daeun")).toMatchObject({
    poolId: "g20261125-daeun",
    generated: true,
  });
  const after = await post("2026-11-26T23:00:00Z");
  expect(after.posted.find((p) => p.characterId === "daeun")?.poolId).toBe("daeun-01");
});

test("cadence: 덕수쌤 매일 · 윤경 토요일 · 세 조가 하루씩", async () => {
  for (const id of CAST) await pool(`${id}-01`, id);
  // 2026-11-23은 월요일 · 조 순환의 기준일.
  expect(await postedIds("2026-11-23T23:00:00Z")).toEqual(["doyun", "duksu", "geonwoo", "seoyeon"]);
  expect(await postedIds("2026-11-24T23:00:00Z")).toEqual(["daeun", "duksu", "jaemin"]);
  expect(await postedIds("2026-11-25T23:00:00Z")).toEqual(["duksu", "haejun", "mina"]);
  expect(await postedIds("2026-11-26T23:00:00Z")).toEqual(["doyun", "duksu", "geonwoo", "seoyeon"]);
  // 토요일(28일)은 조 3(11-23 + 5 → 5 % 3 = 2) + 윤경.
  expect(await postedIds("2026-11-28T23:00:00Z")).toEqual(["duksu", "haejun", "mina", "yoonkyung"]);
  // 기준일 앞의 날도 같은 순환이다(음수 나머지).
  expect(await postedIds("2026-11-22T23:00:00Z")).toEqual(["duksu", "haejun", "mina"]);
});

test("cadence: 올림 시각은 설정값 — 조 안에서 6시간씩 벌어진다", async () => {
  for (const id of CAST) await pool(`${id}-01`, id);
  expect(await postedIds("2026-11-23T00:30:00Z")).toEqual([]);
  expect(await postedIds("2026-11-23T01:10:00Z")).toEqual(["duksu"]);
  expect(await postedIds("2026-11-23T02:10:00Z")).toEqual(["seoyeon"]);
  expect(await postedIds("2026-11-23T08:10:00Z")).toEqual(["geonwoo"]);
  expect(await postedIds("2026-11-23T13:10:00Z")).toEqual([]);
  expect(await postedIds("2026-11-23T14:10:00Z")).toEqual(["doyun"]);
  // 설정을 고치면 배포 없이 바뀐다. 설정에 없는 인물은 올리지 않는다.
  await settings(
    `story_cadence = '{"epoch":"2026-11-23","daily":{"mina":0},"groups":[{"duksu":5}]}'`,
  );
  expect(await postedIds("2026-11-24T06:00:00Z")).toEqual(["duksu", "mina"]);
  expect(await postedIds("2026-11-25T23:00:00Z")).toEqual(["duksu", "mina"]);
});

test("cadence: 틀린 설정값에도 던지지 않는다", async () => {
  await pool("duksu-01", "duksu");
  await pool("mina-01", "mina");
  await settings(
    `story_cadence = '{"epoch":"2026-99-99","daily":{"duksu":"noon"},"weekly":{"mina":{"dow":9}},"groups":"x"}'`,
  );
  // 시각이 숫자가 아니면 해시 시각(01 ~ 10시), 요일이 틀리면 토요일.
  expect(await postedIds("2026-11-27T23:00:00Z")).toEqual(["duksu"]);
  expect(await postedIds("2026-11-28T23:00:00Z")).toEqual(["duksu", "mina"]);
  // 정수에 안 들어가는 큰 수 · 음수도 던지지 않는다(시각은 해시 시각, 요일은 토요일).
  await settings(
    `story_cadence = '{"daily":{"duksu":10000000000},"weekly":{"mina":{"dow":-1,"hour":99999999999}}}'`,
  );
  expect(await postedIds("2026-11-29T23:00:00Z")).toEqual(["duksu"]);
  expect(await postedIds("2026-12-05T23:00:00Z")).toEqual(["duksu", "mina"]);
  await expect(
    server.query("select public.companion_story_calendar('2026-11-23', 7)"),
  ).resolves.toBeTruthy();
});

test("초안: 넣기 → 기획 승인 → 그림 → 최종 승인 → 그날 올림", async () => {
  await pool("doyun-01", "doyun");
  const added = await add([
    item("doyun", "2026-11-23"),
    item("doyun", "2026-11-23", { ko: "같은 자리" }),
    item("nobody", "2026-11-23"),
    item("mina", "not-a-date"),
    item("mina", "2026-11-25", { replies: [] }),
  ]);
  expect(added.drafts).toHaveLength(1);
  expect(added.skipped).toBe(4);
  const id = added.drafts[0]!.id;
  expect(added.drafts[0]).toMatchObject({ status: "planned", shot: "selfie", poolId: null });

  // 글만 본 승인 전에는 그림 일꾼이 고르지 않는다.
  expect(await claim("2026-11-22T00:01:00Z")).toEqual([]);
  expect((await review(id, "approve")).result).toBe("wrong_state");
  expect((await review(id, "approve_plan")).draft?.status).toBe("queued");
  expect((await review(id, "approve_plan")).result).toBe("wrong_state");

  const rows = await claim("2026-11-22T00:01:00Z");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    id,
    characterId: "doyun",
    shot: "selfie",
    tries: 1,
    previousPath: null,
    refSlug: null,
  });
  expect(typeof rows[0]!.engine).toBe("string");
  // 같은 줄을 두 번 고르지 않는다.
  expect(await claim("2026-11-22T00:02:00Z")).toEqual([]);

  const path = `content/images/friend-stories/doyun/${id}-1.png`;
  expect(await finish(id, true, path)).toEqual({ saved: true, status: "ready" });
  const approved = await review(id, "approve");
  expect(approved).toMatchObject({
    result: "ok",
    draft: { status: "approved", poolId: "g20261123-doyun", reviewedBy: "reviewer" },
  });
  expect(await poolRow("g20261123-doyun")).toMatchObject({
    line_ko: "성수동 팝업에 왔어요!",
    image_path: path,
    publish_on: "2026-11-23",
    draft_id: id,
  });

  // 올림 시각(14시) 전에는 아직. 지나면 묶음 줄이 아니라 승인된 줄을 올린다.
  expect(await postedIds("2026-11-23T13:30:00Z")).toEqual([]);
  const posted = await post("2026-11-23T14:30:00Z");
  expect(posted.posted).toEqual([
    expect.objectContaining({
      characterId: "doyun",
      poolId: "g20261123-doyun",
      generated: true,
    }),
  ]);
  const after = (await server.query("select public.companion_story_draft($1) as d", [id])).rows[0]
    .d as Draft;
  expect(after.status).toBe("published");
  // 올린 뒤에는 고칠 수 없다.
  for (const action of ["edit", "unapprove", "redo_image", "discard", "set_image"])
    expect((await review(id, action, { imagePath: "content/images/x.png" })).result).toBe(
      "already_posted",
    );
  // 앱 읽기는 1단계 그대로 그 줄을 본다.
  await db.admin.query(
    "update companion.stories set posted_at = now() - interval '1 hour', expires_at = now() + interval '23 hours'",
  );
  await signIn(app, member);
  const seen = (
    (await app.query("select public.companion_friend_stories() as s")).rows[0].s as {
      stories: { characterId: string; imagePath: string; line: { ko: string } }[];
    }
  ).stories;
  expect(seen.find((story) => story.characterId === "doyun")).toMatchObject({
    imagePath: path,
    line: { ko: "성수동 팝업에 왔어요!" },
  });
});

test("초안: 차례가 아닌 날로 승인해도 그날 올린다 · 승인된 것이 없으면 묶음에서", async () => {
  await pool("yoonkyung-01", "yoonkyung");
  await pool("duksu-01", "duksu");
  // 윤경은 토요일만인데 화요일(24일)로 승인했다.
  const id = await ready("yoonkyung", "2026-11-24");
  expect((await review(id, "approve")).result).toBe("ok");
  const posted = await post("2026-11-24T23:00:00Z");
  expect(posted.posted.map((p) => [p.characterId, p.generated]).sort()).toEqual([
    ["duksu", false],
    ["yoonkyung", true],
  ]);
});

test("초안 넣기: 한 번에 예순 개가 넘어도 다 넣는다", async () => {
  const days = Array.from({ length: 8 }, (_, i) => `2026-12-${String(i + 1).padStart(2, "0")}`);
  const batch = CAST.flatMap((id) => days.map((day) => item(id, day)));
  const added = await add(batch);
  expect([added.drafts.length, added.skipped]).toEqual([72, 0]);
});

test("검토: 고치기는 다른 언어 뜻을 비운다 · 승인된 것은 고칠 수 없다", async () => {
  const id = await ready("mina", "2026-11-25");
  // 영어만 바꾸거나 한 줄을 바꾸면 다른 언어는 지운다(최종 승인 때 다시 번역).
  const edited = await review(id, "edit", { ko: "성수동은 사람이 많아요!", roman: "saram" });
  expect(edited.draft?.line).toEqual({
    ko: "성수동은 사람이 많아요!",
    roman: "saram",
    meaning: { en: "I came to a pop-up in Seongsu!" },
  });
  // 여러 언어를 같이 주면 그대로 쓴다.
  const translated = await review(id, "edit", {
    meaning: { en: "Seongsu is so crowded!", ja: "聖水洞は人が多いです！" },
  });
  expect(translated.draft?.line.meaning).toEqual({
    en: "Seongsu is so crowded!",
    ja: "聖水洞は人が多いです！",
  });
  // 그림 주문만 바꾸는 것은 뜻을 건드리지 않는다.
  const scene = await review(id, "edit", { scene: "A crowded street.", shot: "scene" });
  expect(scene.draft).toMatchObject({ shot: "scene", scene: "A crowded street." });
  expect(scene.draft?.line.meaning["ja"]).toBe("聖水洞は人が多いです！");

  expect((await review(id, "approve")).result).toBe("ok");
  // 승인된 것은 고칠 수 없다 — 고친 글이 번역 · 두 번째 확인 없이 나가지 않게. 승인을 풀고 고친다.
  for (const patch of [{ ko: "성수동 최고!" }, { publishOn: "2026-11-26" }, { scene: "x" }])
    expect((await review(id, "edit", patch)).result).toBe("wrong_state");
  expect(await poolRow("g20261125-mina")).toMatchObject({
    line_ko: "성수동은 사람이 많아요!",
    meaning: { en: "Seongsu is so crowded!", ja: "聖水洞は人が多いです！" },
  });
  expect((await review(id, "unapprove")).draft).toMatchObject({ status: "ready", poolId: null });
  expect(await poolRow("g20261125-mina")).toBeUndefined();
  expect((await review(id, "edit", { publishOn: "2026-11-26" })).draft?.publishOn).toBe(
    "2026-11-26",
  );
  expect((await review(id, "edit", { publishOn: "tomorrow" })).result).toBe("invalid");
  expect((await review(id, "edit", { replies: [] })).result).toBe("invalid");
  // 다른 초안이 있는 자리로는 못 옮긴다.
  const other = (await add([item("mina", "2026-11-27")])).drafts[0]!.id;
  expect((await review(other, "edit", { publishOn: "2026-11-26" })).result).toBe("slot_taken");
});

test("검토: 그림 다시 · 직접 올리기 · 버리기 · 지난 날짜", async () => {
  const id = await ready("haejun", "2026-11-25");
  expect((await review(id, "approve")).result).toBe("ok");
  // 그림 다시 — 승인이 풀리고 묶음 줄이 사라진다. 앞 그림의 경로를 일꾼에게 준다(바꾼 뒤 지우게).
  const redo = await review(id, "redo_image", { scene: "A quiet cafe table.", shot: "scene" });
  expect(redo.draft).toMatchObject({
    status: "queued",
    poolId: null,
    scene: "A quiet cafe table.",
    shot: "scene",
    imageTries: 0,
  });
  expect(await poolRow("g20261125-haejun")).toBeUndefined();
  const rows = await claim("2026-11-22T01:00:00Z");
  expect(rows[0]).toMatchObject({
    id,
    shot: "scene",
    previousPath: `content/images/friend-stories/haejun/${id}-1.png`,
  });
  // 그리는 중에 사람이 그림을 직접 올리면 일꾼의 결과는 버린다.
  const uploaded = await review(id, "set_image", {
    imagePath: "content/images/friend-stories/haejun/manual.webp",
  });
  expect(uploaded.draft).toMatchObject({ status: "ready", imageSource: "uploaded" });
  expect(await finish(id, true, "content/images/friend-stories/haejun/late.png")).toEqual({
    saved: false,
  });
  expect((await review(id, "set_image", {})).result).toBe("invalid");
  expect((await review(id, "set_image", { imagePath: "../etc/passwd" })).result).toBe("invalid");
  for (const imagePath of [
    "content/images/../../other/x.webp",
    "other-bucket/x.webp",
    "content/x.webp",
  ])
    expect((await review(id, "set_image", { imagePath })).result).toBe("invalid");
  // 지난 날짜는 승인하지 않는다.
  expect((await review(id, "approve", {}, "2026-11-26T00:00:00Z")).result).toBe("past_date");
  // 오늘 날짜여도 마지막 올림 회차(23시 5분)가 지났으면 올라갈 길이 없다.
  expect((await review(id, "approve", {}, "2026-11-25T23:30:00Z")).result).toBe("past_date");
  expect((await review(id, "approve", {}, "2026-11-25T22:59:00Z")).result).toBe("ok");
  // 버리면 묶음 줄도 사라지고, 그 자리에 새 초안을 넣을 수 있다.
  expect((await review(id, "discard")).draft).toMatchObject({ status: "discarded", poolId: null });
  expect(await poolRow("g20261125-haejun")).toBeUndefined();
  expect((await review(id, "edit", { ko: "x" })).result).toBe("wrong_state");
  expect((await add([item("haejun", "2026-11-25")])).drafts).toHaveLength(1);
  expect((await review("00000000-0000-4000-8000-00000000dead", "discard")).result).toBe(
    "not_found",
  );
  expect((await review(id, "nonsense")).result).toBe("wrong_state");
  const live = (await add([item("haejun", "2026-11-28")])).drafts[0]!.id;
  expect((await review(live, "nonsense")).result).toBe("invalid");
  // 지난 날짜의 초안은 그림을 주문하지 않는다.
  expect((await review(live, "approve_plan", {}, "2026-11-29T00:00:00Z")).result).toBe("past_date");
});

test("그림 일꾼: 실패는 세 번까지 다시 · 그릴 수 없음은 바로 실패 · 죽은 일꾼의 줄은 되돌린다", async () => {
  const ok = await ready("mina", "2026-11-25");
  const [a, b, c] = (
    await add([
      item("duksu", "2026-11-23"),
      item("duksu", "2026-11-24"),
      item("duksu", "2026-11-25"),
    ])
  ).drafts.map((draft) => draft.id);
  for (const id of [a!, b!, c!]) await review(id, "approve_plan");
  // 올릴 날이 가까운 것부터, 한 번에 `limit`개.
  expect((await claim("2026-11-22T00:01:00Z", 1)).map((row) => row.id)).toEqual([a]);
  expect(await finish(a!, false, null, { error: "engine 500" })).toEqual({
    saved: true,
    status: "queued",
  });
  expect((await claim("2026-11-22T00:02:00Z", 1))[0]).toMatchObject({ id: a, tries: 2 });
  await finish(a!, false, null, { error: "engine 500" });
  await claim("2026-11-22T00:03:00Z", 1);
  expect(await finish(a!, false, null, { error: "engine 500" })).toEqual({
    saved: true,
    status: "failed",
  });
  const failed = (await server.query("select public.companion_story_draft($1) as d", [a])).rows[0]
    .d as Draft;
  expect(failed).toMatchObject({ status: "failed", imageError: "engine 500", imageTries: 3 });
  // 실패한 것은 최종 승인할 수 없고, 다시 그리기로 되살린다.
  expect((await review(a!, "approve")).result).toBe("wrong_state");
  expect((await review(a!, "redo_image")).draft?.status).toBe("queued");
  await review(a!, "discard");

  // 설계 · 검사가 「그릴 수 없음」이면 다시 하지 않는다.
  expect((await claim("2026-11-22T00:04:00Z", 1)).map((row) => row.id)).toEqual([b]);
  expect(await finish(b!, false, null, { error: "check_failed", retry: false })).toEqual({
    saved: true,
    status: "failed",
  });

  // 닫지 못하고 죽은 줄은 10분 뒤 다시 고른다. 앞서 그린 계획은 다음 줄의 `recent`로 간다.
  expect((await claim("2026-11-22T00:05:00Z", 1)).map((row) => row.id)).toEqual([c]);
  const first = tokens.get(c!)!;
  expect(await claim("2026-11-22T00:10:00Z", 1)).toEqual([]);
  const again = await claim("2026-11-22T00:16:00Z", 1);
  expect(again[0]).toMatchObject({ id: c, tries: 2 });
  expect(again[0]!.recent).toEqual([]);
  // 늦게 끝난 첫 일꾼은 새로 고른 줄을 덮지 못한다(증표가 다르다).
  expect(
    await finish(c!, true, "content/images/friend-stories/duksu/late.webp", { token: first }),
  ).toEqual({
    saved: false,
  });
  // 세 번째에도 닫지 못하면 다시 고르지 않고 실패로 끝낸다(10분마다 그림 값을 치르지 않게).
  expect((await claim("2026-11-22T00:27:00Z", 1))[0]).toMatchObject({ id: c, tries: 3 });
  expect(await claim("2026-11-22T00:38:00Z", 1)).toEqual([]);
  const dead = (await server.query("select public.companion_story_draft($1) as d", [c])).rows[0]
    .d as Draft;
  expect(dead).toMatchObject({ status: "failed", imageError: "worker timed out" });

  const mina = (await add([item("mina", "2026-11-28")])).drafts[0]!.id;
  await review(mina, "approve_plan");
  const next = await claim("2026-11-22T00:40:00Z", 5);
  expect(next.find((row) => row.id === mina)?.recent).toEqual([
    { shot: "medium", angle: "eye_level" },
  ]);
  expect(ok).toBeTruthy();
});

test("그림 일꾼: 그리는 중의 그림 다시 · 주문 고치기는 그리던 그림을 버린다 · 지난 날짜는 그리지 않는다", async () => {
  const [draft] = (await add([item("mina", "2026-11-25"), item("mina", "2026-11-28")])).drafts;
  const id = draft!.id;
  await review(id, "approve_plan");
  await claim("2026-11-22T00:01:00Z");
  const old = tokens.get(id)!;
  // 그리는 중에 그림 다시 → 다음 회차가 새로 고른다(시도 횟수는 처음부터).
  expect((await review(id, "redo_image", { scene: "A new scene." })).draft?.status).toBe("queued");
  expect((await claim("2026-11-22T00:02:00Z"))[0]).toMatchObject({
    id,
    tries: 1,
    scene: "A new scene.",
  });
  // 옛 주문으로 그리던 일꾼이 먼저 끝나도 저장되지 않는다.
  expect(
    await finish(id, true, "content/images/friend-stories/mina/old.webp", { token: old }),
  ).toEqual({
    saved: false,
  });
  // 그리는 중에 주문을 고쳐도 같다 — 다시 줄을 선다.
  const edited = await review(id, "edit", { scene: "Another scene.", shot: "scene" });
  expect(edited.draft).toMatchObject({
    status: "queued",
    scene: "Another scene.",
    shot: "scene",
  });
  expect(await finish(id, true, "content/images/friend-stories/mina/stale.webp")).toEqual({
    saved: false,
  });
  // 글만 고치면 그리던 것은 그대로 간다.
  await claim("2026-11-22T00:03:00Z");
  expect((await review(id, "edit", { topic: "새 소재" })).draft?.status).toBe("drawing");
  expect(await finish(id, true, "content/images/friend-stories/mina/new.webp")).toEqual({
    saved: true,
    status: "ready",
  });
  // 올릴 날이 지난 초안은 고르지 않는다.
  const late = (await add([item("haejun", "2026-11-25")])).drafts[0]!.id;
  await review(late, "approve_plan");
  expect(await claim("2026-11-26T00:00:00Z")).toEqual([]);
  expect((await claim("2026-11-25T12:00:00Z")).map((row) => row.id)).toEqual([late]);
});

test("그림 뒤에 맞춘 문구: 닫기가 글을 바꾸고 다른 언어 뜻을 비운다 · 틀린 글이면 초안 그대로", async () => {
  const [a, b] = (
    await add([
      item("mina", "2026-11-25", { word: { episodeId: "u", ref: "voca:1", ko: "팝업" } }),
      item("mina", "2026-11-28"),
    ])
  ).drafts.map((draft) => draft.id);
  for (const id of [a!, b!]) await review(id, "approve_plan");
  const rows = await claim("2026-11-22T00:01:00Z");
  // 일꾼은 문구를 맞추는 데 쓸 인물 카드 · 추천 답안 · 단어를 같이 받는다.
  expect(rows[0]).toMatchObject({
    replies: ["우와, 어때요?", "저도 가고 싶어요"],
    word: { ko: "팝업" },
    persona: expect.objectContaining({ name: expect.any(String) }),
  });
  const line = {
    ko: "팝업 앞에 줄이 정말 길어요!",
    roman: "pabeop ape juri jeongmal gireoyo!",
    en: "The line in front of the pop-up is so long!",
    replies: ["얼마나 기다렸어요?"],
    word: null,
  };
  expect(await finish(a!, true, "content/images/friend-stories/mina/a.webp", { line })).toEqual({
    saved: true,
    status: "ready",
  });
  const changed = (await server.query("select public.companion_story_draft($1) as d", [a])).rows[0]
    .d as Draft & { replies: string[]; word: unknown };
  expect(changed.line).toEqual({
    ko: "팝업 앞에 줄이 정말 길어요!",
    roman: "pabeop ape juri jeongmal gireoyo!",
    meaning: { en: "The line in front of the pop-up is so long!" },
  });
  expect(changed).toMatchObject({ status: "ready", replies: ["얼마나 기다렸어요?"], word: null });
  // 맞추기 전의 글이 남는다(추천 답안 · 단어까지).
  expect((changed as unknown as { lineDraft: unknown }).lineDraft).toEqual({
    ko: "성수동 팝업에 왔어요!",
    roman: "seongsudong pabeobe wasseoyo!",
    en: "I came to a pop-up in Seongsu!",
    replies: ["우와, 어때요?", "저도 가고 싶어요"],
    word: { episodeId: "u", ref: "voca:1", ko: "팝업" },
  });
  // 「그림 다시」는 그 전의 글로 되돌려 다시 맞춘다 — 고친 글이 「초안」 행세를 하지 않는다.
  const redo = (await review(a!, "redo_image")).draft as Draft & {
    lineDraft: unknown;
    word: unknown;
  };
  expect(redo.line).toEqual({
    ko: "성수동 팝업에 왔어요!",
    roman: "seongsudong pabeobe wasseoyo!",
    meaning: { en: "I came to a pop-up in Seongsu!" },
  });
  expect(redo).toMatchObject({ status: "queued", lineDraft: null, word: { ko: "팝업" } });
  // 그리는 사이 사람이 글을 고치면 맞춘 글을 쓰지 않는다(사람의 글이 이긴다).
  await claim("2026-11-22T00:06:00Z");
  expect((await review(a!, "edit", { ko: "사람이 고친 줄이에요." })).draft?.status).toBe("drawing");
  expect(
    await finish(a!, true, "content/images/friend-stories/mina/a2.webp", {
      line: { ...line, from: "성수동 팝업에 왔어요!" },
      meta: { caption: { changed: true } },
    }),
  ).toEqual({ saved: true, status: "ready", line: false });
  const human = (await server.query("select public.companion_story_draft($1) as d", [a])).rows[0]
    .d as Draft & { lineDraft: unknown };
  expect(human).toMatchObject({ line: { ko: "사람이 고친 줄이에요." }, lineDraft: null });
  expect(human.imageMeta).toEqual({ caption: "rejected" });
  // 최종 승인은 번역한 글과 지금 글이 같을 때만.
  expect(
    (await review(a!, "approve", { expect: "성수동 팝업에 왔어요!" }, "2026-11-22T00:10:00Z"))
      .result,
  ).toBe("wrong_state");
  expect(
    (await review(a!, "approve", { expect: "사람이 고친 줄이에요." }, "2026-11-22T00:10:00Z"))
      .result,
  ).toBe("ok");
  // 모양이 틀린 글(추천 답안 없음)이면 그림만 저장하고 글은 그대로.
  expect(
    await finish(b!, true, "content/images/friend-stories/mina/b.webp", {
      line: { ...line, replies: [] },
    }),
  ).toEqual({ saved: true, status: "ready", line: false });
  const kept = (await server.query("select public.companion_story_draft($1) as d", [b])).rows[0]
    .d as Draft;
  expect(kept).toMatchObject({ status: "ready", line: { ko: "성수동 팝업에 왔어요!" } });
  expect(kept.imagePath).toBe("content/images/friend-stories/mina/b.webp");
});

test("달력 · 기획 맥락 · 주간 메모", async () => {
  await db.admin.query(
    "insert into storage.buckets (id, name) values ('companion-refs', 'companion-refs') on conflict do nothing",
  );
  await db.admin.query(
    "insert into storage.objects (bucket_id, name) values ('companion-refs', 'v2/mina/manifest.json'), ('companion-refs', 'duksu-ref.png')",
  );
  await pool("mina-01", "mina");
  const id = (await add([item("mina", "2026-11-25")])).drafts[0]!.id;
  const off = (await add([item("yoonkyung", "2026-11-24")])).drafts[0]!.id;
  await db.admin.query(
    `insert into companion.stories (pool_id, character_id, day, posted_at, expires_at)
     values ('mina-01', 'mina', '2026-11-22', '2026-11-22T04:00:00Z', '2026-11-23T04:00:00Z')`,
  );

  type Calendar = {
    schedule: string;
    characters: { id: string; name: string; hour: number; hasRef: boolean; poolSize: number }[];
    days: {
      day: string;
      slots: {
        characterId: string;
        hour: number;
        due: boolean;
        posted: boolean;
        draftId: string | null;
        status: string | null;
      }[];
    }[];
  };
  const calendar = (
    await server.query("select public.companion_story_calendar('2026-11-22', 7) as c")
  ).rows[0].c as Calendar;
  expect(calendar.schedule).toBe("cadence");
  expect(calendar.days.map((day) => day.day)).toEqual([
    "2026-11-22",
    "2026-11-23",
    "2026-11-24",
    "2026-11-25",
    "2026-11-26",
    "2026-11-27",
    "2026-11-28",
  ]);
  expect(calendar.characters.find((c) => c.id === "mina")).toMatchObject({
    hour: 4,
    hasRef: true,
    poolSize: 1,
  });
  expect(calendar.characters.find((c) => c.id === "duksu")?.hasRef).toBe(false);
  const slots = (day: string) =>
    calendar.days.find((d) => d.day === day)!.slots.map((slot) => slot.characterId);
  // 시각 순.
  expect(slots("2026-11-23")).toEqual(["duksu", "seoyeon", "geonwoo", "doyun"]);
  expect(calendar.days[0]!.slots.find((slot) => slot.characterId === "mina")).toMatchObject({
    due: true,
    posted: true,
    draftId: null,
  });
  // 차례가 아닌 날의 초안도 보인다.
  expect(calendar.days[2]!.slots.find((slot) => slot.characterId === "yoonkyung")).toMatchObject({
    due: false,
    draftId: off,
    status: "planned",
  });
  expect(calendar.days[3]!.slots.find((slot) => slot.characterId === "mina")).toMatchObject({
    due: true,
    draftId: id,
    status: "planned",
  });

  // 주간 메모 — 어느 날을 주든 그 주의 월요일로.
  const save = async (notes: string | null, research: string | null, sources: unknown) =>
    (
      await server.query(
        "select public.companion_save_story_plan('2026-11-26', $1, $2, $3, 'ops', '2026-11-22T00:00:00Z') as p",
        [notes, research, JSON.stringify(sources)],
      )
    ).rows[0].p as { week: string; notes: string; research: string; sources: unknown[] };
  expect(
    await save(null, "성수동 팝업 · 두바이 초콜릿", [{ title: "t", url: "https://x" }]),
  ).toMatchObject({ week: "2026-11-23", notes: "", research: "성수동 팝업 · 두바이 초콜릿" });
  // 메모만 고치면 조사 결과는 그대로.
  expect(await save("덕수쌤: -(으)ㄹ까요", null, null)).toMatchObject({
    notes: "덕수쌤: -(으)ㄹ까요",
    research: "성수동 팝업 · 두바이 초콜릿",
    sources: [{ title: "t", url: "https://x" }],
  });

  type Context = {
    character: { id: string; name: string; look: string; hasRef: boolean; persona: unknown } | null;
    slots: string[];
    recent: string[];
    shots: string[];
    shotMix: Record<string, number>;
    others: { characterId: string; day: string; topic: string; line: string }[];
    plan: { week: string; notes: string };
  };
  const context = (
    await server.query("select public.companion_story_plan_context('mina', '2026-11-23', 7) as c")
  ).rows[0].c as Context;
  expect(context.character).toMatchObject({ id: "mina", hasRef: true });
  // 미나의 차례(25 · 28일) 중 초안이 없는 날만.
  expect(context.slots).toEqual(["2026-11-28"]);
  expect(context.recent).toEqual(
    expect.arrayContaining(["성수동 팝업에 왔어요!", "mina-01 한 줄"]),
  );
  expect(context.plan).toMatchObject({ week: "2026-11-23", notes: "덕수쌤: -(으)ㄹ까요" });
  // 컷 배정에 쓰는 것: 이 인물의 최근 컷과 비율.
  expect(context.shots).toEqual(["selfie"]);
  expect(context.shotMix).toEqual({ selfie: 0.3, other: 0.2, scene: 0.5 });
  // 다른 인물의 그 무렵 초안(자기 것은 빼고).
  expect(context.others).toEqual([
    {
      characterId: "yoonkyung",
      day: "2026-11-24",
      topic: "성수동 팝업",
      line: "성수동 팝업에 왔어요!",
    },
  ]);
  // 스위치가 `pool`이어도 기획(빈 자리 · 달력)은 빈도 설정대로 — 넘어갈 한 주를 미리 기획해 볼 수 있다.
  await settings("story_schedule = 'pool'");
  const pooled = (
    await server.query("select public.companion_story_plan_context('mina', '2026-11-23', 7) as c")
  ).rows[0].c as Context;
  expect(pooled.slots).toEqual(["2026-11-28"]);
  const pooledCalendar = (
    await server.query("select public.companion_story_calendar('2026-11-23', 7) as c")
  ).rows[0].c as Calendar;
  expect(pooledCalendar.days.reduce((sum, day) => sum + day.slots.length, 0)).toBeLessThan(30);
  await settings("story_schedule = 'cadence'");
  const none = (
    await server.query("select public.companion_story_plan_context('nobody', '2026-11-23', 7) as c")
  ).rows[0].c as Context;
  expect(none.character).toBeNull();

  const list = (
    await server.query("select public.companion_story_drafts('2026-11-23', '2026-11-29') as d")
  ).rows[0].d as { drafts: Draft[] };
  expect(list.drafts.map((draft) => draft.id)).toEqual([off, id]);
});

test("앱 역할은 운영 RPC를 부를 수 없다", async () => {
  await signIn(app, member);
  for (const call of [
    "select public.companion_story_calendar('2026-11-23', 7)",
    "select public.companion_story_drafts('2026-11-23', '2026-11-29')",
    "select public.companion_add_story_drafts('[]', 'x', now())",
    "select public.companion_claim_story_images(now(), 1)",
    "select public.companion_story_plan('2026-11-23')",
    "select public.companion_save_story_plan('2026-11-23', 'x', null, null, 'x', now())",
    "select public.companion_story_plan_context('mina', '2026-11-23', 7)",
    "select public.companion_review_story_draft(gen_random_uuid(), 'discard', '{}', 'x', now())",
    "select public.companion_story_draft(gen_random_uuid())",
    "select public.companion_finish_story_image(gen_random_uuid(), now(), false, null, '{}', 'x', false, now(), null)",
  ])
    await expect(app.query(call)).rejects.toThrow(/permission denied/);
  await expect(app.query("select * from companion.story_drafts")).rejects.toThrow(
    /permission denied/,
  );
});
