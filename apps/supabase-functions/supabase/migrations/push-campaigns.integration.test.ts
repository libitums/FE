import { afterAll, beforeAll, expect, test } from "vitest";

import { signIn, startTestDatabase } from "./postgres.test-support.ts";

// ADR-0130 D12 — 자동 푸시 캠페인 표 · 후보 RPC.
const learner = "00000000-0000-4000-8000-000000000011";
const tester = "00000000-0000-4000-8000-000000000012";
let db: Awaited<ReturnType<typeof startTestDatabase>>;

beforeAll(async () => {
  db = await startTestDatabase();
  await db.admin.query(
    `insert into auth.users (id, raw_app_meta_data) values ($1, '{}'), ($2, '{"duru_tester": true}')`,
    [learner, tester],
  );
  await db.admin.query(
    `insert into public.push_devices (token, user_id, environment, last_active_at) values
       ($1, $3, 'production', now() - interval '30 hours'),
       ($2, $3, 'production', now() - interval '40 hours'),
       ($4, $5, 'production', now())`,
    ["a".repeat(64), "b".repeat(64), learner, "c".repeat(64), tester],
  );
  await db.admin.query(
    "insert into public.learner_profiles (user_id, name, country_code) values ($1, 'Ana', 'PH')",
    [learner],
  );
  await db.admin.query(
    `insert into public.learning_progress (user_id, progress) values ($1, '{"catalogProgress": {"u00-tutorial": ["intro", "S1"]}}')`,
    [learner],
  );
}, 30_000);
afterAll(async () => {
  await db?.close();
});

test("PCM1 후보 RPC — 사용자마다 한 행, 가장 최근 활동 · 진행 · 시험 계정 · 마지막 배정", async () => {
  await db.admin.query(
    `insert into public.push_campaign_sends (run_at, series, segment, user_id, "group", variant, lang, title, body)
     values (now() - interval '50 hours', '자동 · tutorial-lesson2', 'tutorial-lesson2', $1, 'sent', 'a', 'en', 't', 'b')`,
    [learner],
  );
  const service = await db.connect();
  await service.query("set role service_role");
  const { rows } = await service.query(
    "select user_id, name, country_code, catalog_progress, tester, last_campaign_at is not null as assigned, now() - last_active_at < interval '31 hours' as latest from public.push_campaign_learners() order by user_id",
  );
  expect(rows).toEqual([
    {
      user_id: learner,
      name: "Ana",
      country_code: "PH",
      catalog_progress: { "u00-tutorial": ["intro", "S1"] },
      tester: false,
      assigned: true,
      latest: true,
    },
    {
      user_id: tester,
      name: null,
      country_code: null,
      catalog_progress: null,
      tester: true,
      assigned: false,
      latest: true,
    },
  ]);
}, 30_000);

test("PCM2 대조군은 변형이 없고, 받은 사람은 변형이 있어야 한다", async () => {
  await expect(
    db.admin.query(
      `insert into public.push_campaign_sends (run_at, series, segment, user_id, "group", variant, lang, title, body)
       values (now(), 's', 'x', $1, 'control', 'a', 'en', 't', 'b')`,
      [learner],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    db.admin.query(
      `insert into public.push_campaign_sends (run_at, series, segment, user_id, "group", variant, lang, title, body)
       values (now(), 's', 'x', $1, 'sent', null, 'en', 't', 'b')`,
      [learner],
    ),
  ).rejects.toMatchObject({ code: "23514" });
}, 30_000);

test("PCM3 앱 사용자는 표 · RPC에 닿지 않는다", async () => {
  const user = await db.connect();
  await signIn(user, learner);
  await expect(user.query("select * from public.push_campaign_sends")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(user.query("select * from public.push_campaign_learners()")).rejects.toMatchObject({
    code: "42501",
  });
}, 30_000);
