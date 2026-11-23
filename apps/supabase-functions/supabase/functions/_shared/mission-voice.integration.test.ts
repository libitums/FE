import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { startTestDatabase } from "../../migrations/postgres.test-support";
import type { ChatSendDeps, ChatSendEnv } from "./chat-send.contract.ts";
import {
  missionHintResponseSchema,
  missionStartResponseSchema,
} from "./companion-contract/index.ts";
import { fakeMissionLlm } from "./companion-llm-mission.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";
import { createMissionFinishHandler } from "./mission-finish-handler.ts";
import { createMissionHintHandler } from "./mission-hint-handler.ts";
import { createMissionStartHandler } from "./mission-start-handler.ts";
import { createMissionSttHandler } from "./mission-stt-handler.ts";
import { createMissionTtsHandler } from "./mission-tts-handler.ts";
import { fakeVoice, sttRequest, ttsRequest, userToken } from "./mission-voice.test-support.ts";
import { spokenText } from "./mission-voice-spoken.ts";

// 미션 음성 두 함수를 실제 SQL(일회용 PostgreSQL + 모든 마이그레이션)에 문다 — 소유 · 판 상태 · 상한 · 기록 줄 · 힌트 예문 저장 · 공유 캐시.
// ElevenLabs · Storage는 가짜 fetch(`fakeVoice`), RPC는 PostgREST 모양을 pg 질의로 옮기는 가짜 outbound(미션 서버 통합 테스트와 같은 방식).

const at = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const cafe = JSON.parse(readFileSync(at("./missions/u06-cafe.json"), "utf8"));
const water = JSON.parse(readFileSync(at("./missions/u01-water.json"), "utf8"));
const learner = "00000000-0000-4000-8000-0000000000aa"; // fakeVoice의 사용자와 같다
const stranger = "00000000-0000-4000-8000-0000000000f2";
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-key",
  llm: { kind: "fake" },
  translation: "every",
};

type Json = Record<string, any>;
let db: Awaited<ReturnType<typeof startTestDatabase>>;
let server: Awaited<ReturnType<typeof db.connect>>;

async function outbound(request: OutboundRequest) {
  const reply = (status: number, body: unknown) => ({
    status,
    text: async () => (body === null ? "" : JSON.stringify(body)),
  });
  if (request.url.endsWith("/auth/v1/user"))
    return request.headers["Authorization"] === `Bearer ${userToken}`
      ? reply(200, { id: learner })
      : reply(401, {});
  const fn = /\/rest\/v1\/rpc\/([a-z_]+)$/.exec(request.url)?.[1];
  if (fn === undefined) return reply(404, null);
  const args = JSON.parse(request.body ?? "{}") as Record<string, unknown>;
  const names = Object.keys(args);
  const values = names.map((name) => {
    const value = args[name];
    return value !== null && typeof value === "object" ? JSON.stringify(value) : value;
  });
  const sql = `select public.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(", ")}) as r`;
  try {
    return reply(200, (await server.query(sql, values)).rows[0].r);
  } catch (error) {
    return reply(400, { message: String(error) });
  }
}

const chatDeps = (): ChatSendDeps => ({
  env,
  outbound,
  llm: fakeMissionLlm(),
  nowMs: () => Date.now(),
  randomUuid: () => randomUUID(),
  log: () => undefined,
});
const post = (fn: string, body: unknown) =>
  new Request(`https://ref.supabase.co/functions/v1/${fn}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ contract_version: 1, ...(body as object) }),
  });
const voice = (stored = new Map<string, Uint8Array>()) => {
  const fake = fakeVoice({ stored });
  return { ...fake, deps: { ...fake.deps, outbound, nowMs: () => Date.now() } };
};
const start = async (missionId = "u06-cafe") =>
  missionStartResponseSchema.parse(
    await (
      await createMissionStartHandler(chatDeps())(post("mission-start", { mission_id: missionId }))
    ).json(),
  );
const calls = async () =>
  (await db.admin.query("select * from companion.mission_voice_calls order by created_at, id"))
    .rows as Json[];

beforeAll(async () => {
  db = await startTestDatabase();
  server = await db.connect();
  await server.query("set role service_role");
  for (const definition of [cafe, water])
    await server.query("select public.companion_upsert_mission($1::jsonb)", [
      JSON.stringify(definition),
    ]);
}, 90_000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.admin.query("truncate auth.users cascade");
  for (const id of [learner, stranger])
    await db.admin.query(
      `insert into auth.users (id, email, raw_app_meta_data) values ($1, $2, '{"duru_tester":"true"}')`,
      [id, `${id}@libitum.test`],
    );
  await db.admin.query("insert into public.learning_progress (user_id, progress) values ($1, $2)", [
    learner,
    JSON.stringify({ catalogProgress: { "u06-cafe": ["RP"], "u01-water": ["RP"] } }),
  ]);
  await db.admin.query(
    // 하루 무료 1판 뒤에도 새 판을 열 수 있게 정액 0(값은 이 테스트의 관심이 아니다).
    `update companion.settings set missions_enabled = true, missions_testers_only = true, mission_hint_limit = 3, mission_cost = 0,
       mission_voice_per_turn = 3, mission_stt_daily_seconds = 1800, mission_tts_daily_chars = 20000`,
  );
});

describe("mission-stt + 실제 SQL", () => {
  test("VI1. 열린 판 → 받아 적기 · 기록 줄(초 · 결과 · 벤더 시간 · 모델), 녹음 · 글은 DB에 없음", async () => {
    const game = await start();
    const fake = voice();
    const response = await createMissionSttHandler(fake.deps)(
      sttRequest({ conversation: game.conversationId }),
    );
    expect(response.status).toBe(200);
    const [row] = await calls();
    expect(row).toMatchObject({
      user_id: learner,
      kind: "stt",
      seconds: "1.60",
      outcome: "ok",
      model: "scribe_v3",
    });
    expect(row!["vendor_ms"]).toEqual(expect.any(Number));
    expect(JSON.stringify(row)).not.toContain("아메리카노");
  });

  test("VI2. 남의 판 404 · 닫힌 판 409 — 기록 줄을 만들지 않음", async () => {
    const game = await start();
    await db.admin.query("update companion.conversations set user_id = $1 where id = $2", [
      stranger,
      game.conversationId,
    ]);
    const other = await createMissionSttHandler(voice().deps)(
      sttRequest({ conversation: game.conversationId }),
    );
    expect(other.status).toBe(404);
    await db.admin.query("update companion.conversations set user_id = $1 where id = $2", [
      learner,
      game.conversationId,
    ]);
    await createMissionFinishHandler(chatDeps())(
      post("mission-finish", { conversation_id: game.conversationId, abandon: true }),
    );
    const closed = await createMissionSttHandler(voice().deps)(
      sttRequest({ conversation: game.conversationId }),
    );
    expect(closed.status).toBe(409);
    expect(await closed.json()).toMatchObject({ error: "mission_closed" });
    expect(await calls()).toEqual([]);
  });

  test("VI3. 상한 — 판당(턴 상한 × 배수) · 하루 초 · 비상 스위치 0", async () => {
    const game = await start();
    const send = async () =>
      createMissionSttHandler(voice().deps)(sttRequest({ conversation: game.conversationId }));
    await db.admin.query("update companion.settings set mission_stt_daily_seconds = 3");
    expect((await send()).status).toBe(200);
    const day = await send();
    expect(day.status).toBe(429);
    expect(await day.json()).toMatchObject({
      error: "voice_limit",
      detail: { scope: "day", limit: 3 },
    });
    await db.admin.query(
      "update companion.settings set mission_stt_daily_seconds = 1800, mission_voice_per_turn = 0",
    );
    expect(await (await send()).json()).toMatchObject({ detail: { scope: "mission", limit: 0 } });
    await db.admin.query("update companion.settings set mission_voice_per_turn = 1"); // u06 턴 상한 10 → 10번
    for (let i = 0; i < 9; i += 1) expect((await send()).status).toBe(200);
    expect(await (await send()).json()).toMatchObject({ detail: { scope: "mission", limit: 10 } });
  });
});

describe("mission-tts + 실제 SQL", () => {
  test("VI4. 진입 대사(메시지 id) → 서버가 말 조각을 꺼내 합성 · 다른 사용자의 같은 대사는 공유 캐시", async () => {
    const stored = new Map<string, Uint8Array>();
    const game = await start();
    const first = voice(stored);
    const response = await createMissionTtsHandler(first.deps)(
      ttsRequest({
        conversation_id: game.conversationId,
        kind: "message",
        message_id: game.opening.messageId,
      }),
    );
    expect(response.status).toBe(200);
    expect(first.vendor).toHaveLength(1);
    expect(first.vendor[0]!.url).toContain("/text-to-speech/rCm09Tf1yMYbOyCRLDyB?");
    expect((first.vendor[0]!.body as Json)["text"]).toBe(game.opening.ko);

    // 새 판(같은 미션) — 진입 대사가 같으니 벤더를 다시 부르지 않는다.
    const next = await start();
    const again = voice(stored);
    const cached = await createMissionTtsHandler(again.deps)(
      ttsRequest({
        conversation_id: next.conversationId,
        kind: "message",
        message_id: next.opening.messageId,
      }),
    );
    expect(await cached.json()).toMatchObject({ cached: true });
    expect(again.vendor).toEqual([]);
    expect((await calls()).map((row) => [row["outcome"], row["chars"]])).toEqual([
      ["ok", game.opening.ko.length],
      ["cached", game.opening.ko.length],
    ]);
  });

  test("VI5. 다른 판의 메시지 id · 없는 힌트 → 404 voice_target_not_found", async () => {
    const game = await start("u01-water");
    const other = await start("u06-cafe"); // 앞 판은 그만둠으로 닫힌다 — 메시지는 남는다
    const crossed = await createMissionTtsHandler(voice().deps)(
      ttsRequest({
        conversation_id: other.conversationId,
        kind: "message",
        message_id: game.opening.messageId,
      }),
    );
    expect(crossed.status).toBe(404);
    expect(await crossed.json()).toMatchObject({ error: "voice_target_not_found" });
    const noHint = await createMissionTtsHandler(voice().deps)(
      ttsRequest({ conversation_id: other.conversationId, kind: "hint", hint_no: 1 }),
    );
    expect(noHint.status).toBe(404);
  });

  test("VI6. 힌트 → 예문을 저장하고 hintNo를 준다 → mission-tts가 저장된 예문을 읽는다", async () => {
    const game = await start();
    const hint = missionHintResponseSchema.parse(
      await (
        await createMissionHintHandler(chatDeps())(
          post("mission-hint", { conversation_id: game.conversationId }),
        )
      ).json(),
    );
    expect(hint.hintNo).toBe(1);
    const fake = voice();
    const response = await createMissionTtsHandler(fake.deps)(
      ttsRequest({ conversation_id: game.conversationId, kind: "hint", hint_no: 1 }),
    );
    expect(response.status).toBe(200);
    expect((fake.vendor[0]!.body as Json)["text"]).toBe(spokenText(hint.ko));
    const [row] = (await calls()).filter((call) => call["kind"] === "tts");
    expect(row).toMatchObject({ target: "hint:1", outcome: "ok", chars: hint.ko.length });
  });

  test("VI7. 계정 삭제 — 기록 줄 · 힌트 예문이 CASCADE로 지워진다 · 공유 캐시 파일은 주인 없는 파일로 세지 않는다", async () => {
    const game = await start();
    await createMissionSttHandler(voice().deps)(sttRequest({ conversation: game.conversationId }));
    await createMissionHintHandler(chatDeps())(
      post("mission-hint", { conversation_id: game.conversationId }),
    );
    await db.admin.query("delete from auth.users where id = $1", [learner]);
    for (const table of ["companion.mission_voice_calls", "companion.mission_hints"])
      expect((await db.admin.query(`select count(*)::int n from ${table}`)).rows[0].n).toBe(0);
    await db.admin.query(
      "insert into storage.objects (bucket_id, name) values ('companion-media', 'mission-tts/m/v/a.mp3'), ('companion-media', 'x/stray.png')",
    );
    expect(
      (await server.query("select public.companion_media_orphans(100) as r")).rows[0].r,
    ).toEqual(["x/stray.png"]);
  });
});
