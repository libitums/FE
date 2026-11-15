import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { signIn, startTestDatabase } from "./postgres.test-support";

// 앨범 칸(20261203, ADR-0150): `media_json`에 그때의 말(`line {ko, en}`) · 지난 대화(`fromPastChat`)가 더해진다.
const tester = "00000000-0000-4000-8000-000000000001";
const now = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();

let db: Awaited<ReturnType<typeof startTestDatabase>>;
let app: Awaited<ReturnType<typeof db.connect>>;
let server: typeof app;

type Item = { id: string; line: { ko: string; en: string }; fromPastChat: boolean };

async function message(segments: unknown[]): Promise<string> {
  const conversation = await db.admin.query(
    `insert into companion.conversations (user_id, character_id) values ($1, 'duksu')
     on conflict (user_id, character_id) where kind = 'companion' do update set character_id = excluded.character_id
     returning id`,
    [tester],
  );
  const result = await db.admin.query(
    `insert into companion.messages (conversation_id, user_id, role, origin, status, segments, created_at)
     values ($1, $2, 'assistant', 'turn', 'complete', $3::jsonb, now() - interval '1 hour') returning id`,
    [conversation.rows[0].id, tester, JSON.stringify(segments)],
  );
  return result.rows[0].id as string;
}
async function made(messageId: string, kind = "snapshot") {
  const begun = (
    await server.query("select public.companion_media_begin($1, $2, $3, false, $4) as b", [
      tester,
      messageId,
      kind,
      now,
    ])
  ).rows[0].b as { media: { id: string } };
  await server.query("select public.companion_media_finish($1, 'complete', $2::jsonb, $3)", [
    begun.media.id,
    JSON.stringify({
      path: `${tester}/${begun.media.id}.${kind === "snapshot" ? "png" : "mp3"}`,
      mime: kind === "snapshot" ? "image/png" : "audio/mpeg",
      bytes: 10,
      aspect: kind === "snapshot" ? "3:2" : null,
    }),
    now,
  ]);
  return begun.media.id;
}
const album = async () =>
  (
    (await app.query("select public.companion_list_media('duksu', null, null, 10) as a")).rows[0]
      .a as { items: Item[] }
  ).items;

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
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 't@libitum.test', '{"duru_tester": true}')`,
    [tester],
  );
  await db.admin.query(
    "insert into storage.objects (bucket_id, name) values ('companion-refs', 'deoksu-ref.png')",
  );
  await server.query(
    "select public.companion_grant_credits($1, 'grant', 200, 'operator', null, null)",
    [tester],
  );
  await signIn(app, tester);
});

test("MA1. 그때의 말은 말(speech) 조각의 한국어 · 번역을 이어 붙이고, 말이 없으면 지문을 쓴다", async () => {
  const spoken = await message([
    { kind: "speech", text: "떡볶이 맛있죠?", translation: "Tteokbokki is good, right?" },
    { kind: "action", text: "웃는다" },
    { kind: "speech", text: "또 와요." },
  ]);
  const acted = await message([
    { kind: "action", text: "칠판에 쓴다", translation: "Writes on the board" },
  ]);
  const a = await made(spoken);
  const b = await made(acted);
  const items = await album();
  expect(items.find((item) => item.id === a)?.line).toEqual({
    ko: "떡볶이 맛있죠? 또 와요.",
    en: "Tteokbokki is good, right?",
  });
  expect(items.find((item) => item.id === b)?.line).toEqual({
    ko: "칠판에 쓴다",
    en: "Writes on the board",
  });
});

test("MA2. 메시지가 지워지면(대화 초기화) 지난 대화로 보인다 · 상태 조회에도 같은 칸", async () => {
  const target = await message([{ kind: "speech", text: "안녕하세요", translation: "Hello" }]);
  const id = await made(target, "voice");
  expect((await album())[0]).toMatchObject({ id, fromPastChat: false });
  await server.query("select public.companion_operator_reset($1, 'duksu')", [tester]);
  expect((await album())[0]).toMatchObject({
    id,
    fromPastChat: true,
    line: { ko: "안녕하세요", en: "Hello" },
  });
  const byId = (await app.query("select public.companion_get_media($1, null) as m", [[id]])).rows[0]
    .m as Item[];
  expect(byId[0]).toMatchObject({ fromPastChat: true });
});
