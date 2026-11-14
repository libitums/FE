import { beforeEach, expect, test } from "vitest";

import { base64FromBytes } from "./base64.ts";
import { createMediaHandler, type MediaDeps, type MediaKind } from "./companion-media-handler.ts";
import { type MediaEnv, missingKeys as missingFor } from "./companion-media-env.ts";
import { purgeUserMedia } from "./companion-media-purge.ts";
import { createDeleteAccountHandler } from "./delete-account-handler.ts";
import {
  imagePrompt,
  messageLine,
  PROMPT_MINOR_RULES,
  PROMPT_SYSTEM,
  verdictFrom,
} from "./companion-snapshot-prompts.ts";

// 스냅샷 · 음성(ADR-0146): 가짜 fetch 하나로 Supabase(Auth · RPC · Storage) · Claude · OpenAI · ElevenLabs를 모두 받는다 — 실제 유료 호출 없음.
const SUPA = "https://example.supabase.co";
const USER = "11111111-1111-4111-8111-111111111111";
const PLAY = "22222222-2222-4222-8222-222222222222";
const MESSAGE = "33333333-3333-4333-8333-333333333333";
const MEDIA = "44444444-4444-4444-8444-444444444444";
const SERVICE = "service-role-key";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 9, 9]);

const env: MediaEnv = {
  supabaseUrl: SUPA,
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: SERVICE,
  anthropicKey: "sk-ant-test",
  snapshotModel: "claude-haiku-5-5",
  openaiKey: "sk-openai-test",
  elevenKey: "eleven-test",
};

type Call = { url: string; method: string; body: unknown; headers: Record<string, string> };
type Reply = { status: number; body?: unknown; bytes?: Uint8Array };

let calls: Call[];
let begin: Reply;
let promptInput: Record<string, unknown>;
let checkInput: Record<string, unknown>;
let anthropicStatus: number;
let openai: Reply[];
let eleven: Reply[];
let uploadStatus: number;
let work: Promise<unknown>[];

const pendingMedia = (kind: MediaKind, charge = kind === "voice" ? "voice" : "photo") => ({
  id: MEDIA,
  characterId: "duksu",
  messageId: MESSAGE,
  kind,
  status: "pending",
  charge,
  cost: charge === "voice" ? 15 : 35,
  path: null,
  mime: null,
  aspect: null,
  failure: null,
  aiGenerated: true,
  engine: null,
  model: null,
  createdAt: "2026-11-13T00:00:00.000Z",
  finishedAt: null,
});
const snapshotJob = (overrides: Record<string, unknown> = {}) => ({
  mediaId: MEDIA,
  userId: USER,
  characterId: "duksu",
  characterName: "덕수쌤",
  look: "Korean language teacher in his 30s",
  ageBand: "adult",
  snapshotSelf: "female",
  segments: [
    { kind: "speech", text: "오늘은 궁 마당에서 수업해요!" },
    { kind: "action", text: "칠판 대신 스케치북을 든다" },
  ],
  context: [{ role: "user", text: "오늘 수업 어디서 해요?", segments: [] }],
  refs: ["deoksu-ref.png", "deoksu-expressions.png"],
  engine: "gpt-image-2.5-flare",
  quality: "medium",
  aspect: "3:2",
  ...overrides,
});
const voiceJob = {
  mediaId: MEDIA,
  userId: USER,
  characterId: "duksu",
  voiceId: "WW9FljMgKZtSNvBwgs3R",
  model: "eleven_v3",
  text: "오늘은 궁 마당에서 수업해요!",
};
const okBegin = (kind: MediaKind, job: unknown): Reply => ({
  status: 200,
  body: { result: "ok", cached: false, media: pendingMedia(kind), holdId: "h1", job },
});

const respond = (reply: Reply) =>
  reply.bytes !== undefined
    ? new Response(reply.bytes as BodyInit, { status: reply.status })
    : new Response(reply.body === undefined ? "" : JSON.stringify(reply.body), {
        status: reply.status,
        headers: { "content-type": "application/json" },
      });

const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : String(input);
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const headers: Record<string, string> = {};
  new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).forEach(
    (value, key) => (headers[key] = value),
  );
  let body: unknown = init?.body ?? null;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      // 그대로.
    }
  }
  calls.push({ url, method, body, headers });

  if (url === `${SUPA}/auth/v1/user`) {
    return headers["authorization"] === "Bearer app-token"
      ? respond({ status: 200, body: { id: USER } })
      : respond({ status: 401, body: {} });
  }
  if (url === `${SUPA}/rest/v1/rpc/companion_media_begin`) return respond(begin);
  if (url === `${SUPA}/rest/v1/rpc/companion_media_finish`)
    return respond({ status: 200, body: { result: "ok" } });
  if (url.startsWith(`${SUPA}/storage/v1/object/companion-refs/`))
    return respond({ status: 200, bytes: PNG });
  if (url.startsWith(`${SUPA}/storage/v1/object/companion-media/`))
    return respond({ status: uploadStatus, body: {} });
  if (url === "https://api.anthropic.com/v1/messages") {
    if (anthropicStatus !== 200) {
      return respond({
        status: anthropicStatus,
        body: { type: "error", error: { type: "api_error", message: "x" } },
      });
    }
    const name = ((body as { tool_choice: { name: string } }).tool_choice ?? { name: "" }).name;
    return respond({
      status: 200,
      body: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "claude-haiku-5-5",
        content: [
          {
            type: "tool_use",
            id: "tu_1",
            name,
            input: name === "snapshot_prompt" ? promptInput : checkInput,
          },
        ],
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 20 },
      },
    });
  }
  if (url === "https://api.openai.com/v1/images/edits")
    return respond(openai.shift() ?? { status: 500 });
  if (url.startsWith("https://api.elevenlabs.io/v1/text-to-speech/"))
    return respond(eleven.shift() ?? { status: 500 });
  return respond({ status: 404, body: { url } });
}) as typeof fetch;

function handler(kind: MediaKind, overrides: Partial<MediaDeps> = {}) {
  return createMediaHandler(kind, {
    env,
    fetch: fakeFetch,
    nowMs: () => Date.parse("2026-11-13T00:00:00Z"),
    waitUntil: (promise) => work.push(promise),
    log: () => {},
    ...overrides,
  });
}
const post = (body: unknown, token = "app-token") =>
  new Request("https://fn/companion", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
async function run(kind: MediaKind, body: unknown = { message_id: MESSAGE }, token?: string) {
  const response = await handler(kind)(post(body, token));
  await Promise.all(work);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}
const callsTo = (prefix: string) => calls.filter((call) => call.url.startsWith(prefix));
const finished = () => {
  const finishes = callsTo(`${SUPA}/rest/v1/rpc/companion_media_finish`);
  expect(finishes).toHaveLength(1);
  return finishes[0]!.body as {
    p_media_id: string;
    p_status: string;
    p_result: Record<string, unknown>;
  };
};
const openaiCalls = () => callsTo("https://api.openai.com/");
const formOf = (call: Call) => call.body as FormData;

beforeEach(() => {
  calls = [];
  work = [];
  begin = okBegin("snapshot", snapshotJob());
  promptInput = {
    scene: "A cheerful teacher holds a sketchbook in a palace courtyard on a sunny day.",
    aspect: "1:1",
    background_text: null,
    safety: "allow",
    reason: "everyday lesson",
  };
  checkInput = {
    reasons: "fine",
    safe: true,
    identity: 4,
    garbled_text: false,
    learner_face: false,
  };
  anthropicStatus = 200;
  openai = [
    {
      status: 200,
      body: { data: [{ b64_json: base64FromBytes(PNG) }], usage: { output_tokens: 1568 } },
    },
  ];
  eleven = [{ status: 200, bytes: MP3 }];
  uploadStatus = 200;
});

test("MH1. HTTP 가장자리 — 405 · 500(환경 없음) · 401(토큰 없음 · 틀림) · 400(본문)", async () => {
  expect((await handler("snapshot")(new Request("https://fn/x", { method: "GET" }))).status).toBe(
    405,
  );
  expect((await handler("snapshot", { env: null })(post({ message_id: MESSAGE }))).status).toBe(
    500,
  );
  const noToken = new Request("https://fn/x", {
    method: "POST",
    body: JSON.stringify({ message_id: MESSAGE }),
  });
  expect((await handler("snapshot")(noToken)).status).toBe(401);
  expect((await run("snapshot", { message_id: MESSAGE }, "bad-token")).status).toBe(401);
  expect(await run("snapshot", { message_id: "not-a-uuid" })).toEqual({
    status: 400,
    body: { error: "invalid_request" },
  });
  expect(callsTo(`${SUPA}/rest/v1/rpc/`)).toHaveLength(0);
});

test("MH2. 키가 없으면 503 not_configured — 이름만 알리고 예약하지 않는다", async () => {
  const snapshot = handler("snapshot", { env: { ...env, openaiKey: null } });
  const response = await snapshot(post({ message_id: MESSAGE }));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    error: "not_configured",
    detail: { missing: ["OPENAI_API_KEY"] },
  });
  const voice = handler("voice", { env: { ...env, elevenKey: null, anthropicKey: null } });
  expect(await (await voice(post({ message_id: MESSAGE }))).json()).toEqual({
    error: "not_configured",
    detail: { missing: ["ELEVENLABS_API_KEY"] },
  });
  // 음성은 Claude · OpenAI 키가 없어도 된다.
  expect(missingFor({ ...env, anthropicKey: null, openaiKey: null }, "voice")).toEqual([]);
  expect(callsTo(`${SUPA}/rest/v1/rpc/companion_media_begin`)).toHaveLength(0);
});
test("MH3. 판정 결과 → HTTP — 남의 메시지 403 · 없음 404 · 자격 422 · 엽전 402 · 동시 409 · 상한 429 · 설정 503", async () => {
  const cases: [Record<string, unknown>, number][] = [
    [{ result: "forbidden" }, 403],
    [{ result: "message_not_found" }, 404],
    [{ result: "not_eligible" }, 422],
    [{ result: "no_speech" }, 422],
    [{ result: "insufficient_credits", detail: { required: 35, balance: 10 } }, 402],
    [{ result: "snapshot_in_progress", detail: { mediaId: MEDIA } }, 409],
    [{ result: "daily_limit", detail: { limit: 20 } }, 429],
    [{ result: "not_configured", detail: { missing: "refs" } }, 503],
    [{ result: "temporarily_blocked", detail: { until: "x" } }, 403],
    [{ result: "something_new" }, 403],
  ];
  for (const [result, status] of cases) {
    begin = { status: 200, body: result };
    const answer = await run("snapshot");
    expect(answer.status).toBe(status);
    expect(answer.body["error"]).toBe(
      result["result"] === "something_new" ? "not_available" : result["result"],
    );
    expect(answer.body["detail"]).toEqual(result["detail"]);
  }
  begin = { status: 500, body: {} };
  expect(await run("snapshot")).toEqual({ status: 500, body: { error: "internal_error" } });
  // 어느 경우도 엔진을 부르지 않았다.
  expect(callsTo("https://api.")).toHaveLength(0);
});

test("MH4. 저장본 → 200 cached, 엔진 호출 없음 · 메시지 id는 서버가 읽는다(앱 글을 보내지 않는다)", async () => {
  begin = {
    status: 200,
    body: { result: "ok", cached: true, media: { ...pendingMedia("voice"), status: "complete" } },
  };
  const answer = await run("voice", { message_id: MESSAGE.toUpperCase(), again: false });
  expect(answer.status).toBe(200);
  expect(answer.body).toMatchObject({ cached: true, media: { status: "complete" } });
  expect(work).toHaveLength(0);
  expect(callsTo(`${SUPA}/rest/v1/rpc/companion_media_begin`)[0]!.body).toEqual({
    p_user_id: USER,
    p_message_id: MESSAGE,
    p_kind: "voice",
    p_again: false,
    p_now: "2026-11-13T00:00:00.000Z",
  });
});

test("MH5. 스냅샷 — 202 pending → 프롬프트 노드 → 엔진 1회 → 검사 → 올리기 → complete(AI 생성 메타)", async () => {
  const answer = await run("snapshot", { message_id: MESSAGE, again: true });
  expect(answer).toMatchObject({
    status: 202,
    body: { cached: false, media: { status: "pending", cost: 35 } },
  });
  expect(
    (callsTo(`${SUPA}/rest/v1/rpc/companion_media_begin`)[0]!.body as Record<string, unknown>)[
      "p_again"
    ],
  ).toBe(true);

  const [promptCall, checkCall] = callsTo("https://api.anthropic.com/");
  const promptBody = promptCall!.body as Record<string, unknown>;
  expect(promptBody).toMatchObject({
    model: "claude-haiku-5-5",
    system: PROMPT_SYSTEM,
    tool_choice: { type: "tool", name: "snapshot_prompt" },
  });
  const content = (promptBody["messages"] as { content: string }[])[0]!.content;
  expect(content).toContain("Character: 덕수쌤");
  expect(content).toContain("Learner: 오늘 수업 어디서 해요?");
  expect(content).toContain(
    "Character (the message to draw): 오늘은 궁 마당에서 수업해요! *칠판 대신 스케치북을 든다*",
  );
  expect(content).toContain(
    "Learner look: a young woman with long hair, seen only from behind, over the shoulder or as hands at the frame edge — never her face",
  );
  // SDK 1.3.0은 키를 Authorization에 싣는다. SDK 재시도는 끈다(노드는 다시 하지 않는다).
  expect(promptCall!.headers["authorization"]).toBe("Bearer sk-ant-test");
  expect(promptCall!.headers["x-stainless-retry-count"]).toBe("0");

  expect(openaiCalls()).toHaveLength(1);
  const form = formOf(openaiCalls()[0]!);
  expect(form.get("model")).toBe("gpt-image-2.5-flare");
  // 비율은 설정값(3:2) — 프롬프트 노드가 1:1을 골라도 auto가 아니면 따르지 않는다.
  expect(form.get("size")).toBe("1536x1024");
  expect(form.get("quality")).toBe("medium");
  expect(form.getAll("image[]")).toHaveLength(2);
  expect(String(form.get("prompt"))).toContain("No speech bubbles, captions or dialogue.");
  expect(String(form.get("prompt"))).toContain(
    "is a young woman with long hair seen only from behind",
  );
  expect(openaiCalls()[0]!.headers["authorization"]).toBe("Bearer sk-openai-test");

  const checkBody = checkCall!.body as {
    messages: { content: { type: string }[] }[];
    tool_choice: { name: string };
  };
  expect(checkBody.tool_choice.name).toBe("snapshot_check");
  expect(checkBody.messages[0]!.content.map((block) => block.type)).toEqual([
    "image",
    "image",
    "text",
  ]);

  const uploads = callsTo(`${SUPA}/storage/v1/object/companion-media/`);
  expect(uploads.map((call) => [call.url, call.method, call.headers["content-type"]])).toEqual([
    [`${SUPA}/storage/v1/object/companion-media/${USER}/${MEDIA}.png`, "POST", "image/png"],
  ]);
  expect(uploads[0]!.body).toEqual(PNG);

  const done = finished();
  expect(done.p_status).toBe("complete");
  expect(done.p_result).toMatchObject({
    path: `${USER}/${MEDIA}.png`,
    mime: "image/png",
    bytes: PNG.length,
    aspect: "3:2",
    prompt: { safety: "allow" },
    verdict: { pass: true, identity: 4 },
    meta: {
      aiGenerated: true,
      engine: "openai-images-edit",
      model: "gpt-image-2.5-flare",
      size: "1536x1024",
      retries: 0,
      nodeModel: "claude-haiku-5-5",
    },
  });
  expect((done.p_result["meta"] as { promptHash: string }).promptHash).toMatch(/^[0-9a-f]{64}$/);
});

test("MH6. 재시도는 엔진 오류일 때만 — 5xx는 한 번 다시, 두 번이면 failed · 안전 거절은 다시 하지 않고 blocked · 다른 4xx는 failed", async () => {
  openai = [{ status: 503, body: {} }, openai[0]!];
  await run("snapshot");
  expect(openaiCalls()).toHaveLength(2);
  expect(finished()).toMatchObject({ p_status: "complete", p_result: { meta: { retries: 1 } } });

  calls = [];
  work = [];
  openai = [
    { status: 500, body: {} },
    { status: 502, body: {} },
    { status: 200, body: {} },
  ];
  await run("snapshot");
  expect(openaiCalls()).toHaveLength(2);
  expect(finished()).toMatchObject({
    p_status: "failed",
    p_result: { failure: "engine_failed", meta: { retries: 1 } },
  });
  expect(callsTo(`${SUPA}/storage/v1/object/companion-media/`)).toHaveLength(0);

  calls = [];
  work = [];
  openai = [
    {
      status: 400,
      body: { error: { code: "moderation_blocked", message: "rejected by the safety system" } },
    },
  ];
  await run("snapshot");
  expect(openaiCalls()).toHaveLength(1);
  expect(finished()).toMatchObject({
    p_status: "blocked",
    p_result: { failure: "engine_refused" },
  });

  calls = [];
  work = [];
  openai = [{ status: 400, body: { error: { code: "invalid_size" } } }];
  await run("snapshot");
  expect(openaiCalls()).toHaveLength(1);
  expect(finished()).toMatchObject({ p_status: "failed", p_result: { failure: "engine_failed" } });

  // 이미지가 비어 오면 엔진 오류(한 번 다시).
  calls = [];
  work = [];
  openai = [
    { status: 200, body: { data: [{}] } },
    { status: 200, body: { data: [{}] } },
  ];
  await run("snapshot");
  expect(openaiCalls()).toHaveLength(2);
  expect(finished()).toMatchObject({ p_status: "failed", p_result: { failure: "engine_failed" } });
});

test("MH7. 검사 탈락이면 올리지 않고 blocked — 서버가 예약을 푼다", async () => {
  checkInput = {
    reasons: "a face",
    safe: true,
    identity: 5,
    garbled_text: false,
    learner_face: true,
  };
  await run("snapshot");
  expect(callsTo(`${SUPA}/storage/v1/object/companion-media/`)).toHaveLength(0);
  expect(finished()).toMatchObject({
    p_status: "blocked",
    p_result: { failure: "check_failed", verdict: { pass: false, learner_face: true } },
  });
  // 검사 노드가 실패하면(호출 오류) 검사 안 된 그림을 내보내지 않는다.
  calls = [];
  work = [];
  checkInput = { nonsense: true };
  openai = [{ status: 200, body: { data: [{ b64_json: base64FromBytes(PNG) }] } }];
  await run("snapshot");
  expect(finished()).toMatchObject({ p_status: "failed", p_result: { failure: "check_error" } });
});

test("MH8. 프롬프트 노드 차단 → 엔진을 부르지 않고 blocked · 노드 오류는 다시 하지 않고 failed", async () => {
  promptInput = { ...promptInput, safety: "block", reason: "romantic scene" };
  await run("snapshot");
  expect(openaiCalls()).toHaveLength(0);
  expect(finished()).toMatchObject({
    p_status: "blocked",
    p_result: { failure: "prompt_blocked", prompt: { safety: "block", reason: "romantic scene" } },
  });

  calls = [];
  work = [];
  anthropicStatus = 500;
  await run("snapshot");
  expect(callsTo("https://api.anthropic.com/")).toHaveLength(1);
  expect(openaiCalls()).toHaveLength(0);
  expect(finished()).toMatchObject({ p_status: "failed", p_result: { failure: "prompt_failed" } });
});

test("MH9. 나이 모름 · 미성년자는 더 엄격한 규칙 · 학습자 뒷모습 설정을 그대로 · auto면 노드가 비율을 고른다", async () => {
  begin = okBegin(
    "snapshot",
    snapshotJob({ ageBand: "unknown", snapshotSelf: "hidden", aspect: "auto" }),
  );
  await run("snapshot");
  const system = (callsTo("https://api.anthropic.com/")[0]!.body as { system: string }).system;
  expect(system).toBe(PROMPT_SYSTEM + PROMPT_MINOR_RULES);
  const form = formOf(openaiCalls()[0]!);
  expect(form.get("size")).toBe("1024x1024");
  expect(String(form.get("prompt"))).toContain("is only hands and a shoulder at the frame edge");
  expect(String(form.get("prompt"))).not.toContain("young woman");
  expect(finished().p_result).toMatchObject({ aspect: "1:1", meta: { snapshotSelf: "hidden" } });

  calls = [];
  work = [];
  begin = okBegin("snapshot", snapshotJob({ snapshotSelf: "male" }));
  await run("snapshot");
  expect(String(formOf(openaiCalls()[0]!).get("prompt"))).toContain(
    "is a young man with short hair seen only from behind",
  );
});

test("MH10. 음성 — ElevenLabs eleven_v3(speed 없음) → mp3 올리기 → complete · 5xx는 한 번 다시 · 올리기 실패는 failed", async () => {
  begin = okBegin("voice", voiceJob);
  const answer = await run("voice");
  expect(answer).toMatchObject({ status: 202, body: { media: { kind: "voice", cost: 15 } } });
  const [speech] = callsTo("https://api.elevenlabs.io/");
  expect(speech!.url).toBe(
    "https://api.elevenlabs.io/v1/text-to-speech/WW9FljMgKZtSNvBwgs3R?output_format=mp3_44100_128",
  );
  expect(speech!.body).toEqual({ text: "오늘은 궁 마당에서 수업해요!", model_id: "eleven_v3" });
  expect(speech!.headers["xi-api-key"]).toBe("eleven-test");
  const upload = callsTo(`${SUPA}/storage/v1/object/companion-media/`)[0]!;
  expect([upload.url, upload.headers["content-type"]]).toEqual([
    `${SUPA}/storage/v1/object/companion-media/${USER}/${MEDIA}.mp3`,
    "audio/mpeg",
  ]);
  expect(finished()).toMatchObject({
    p_status: "complete",
    p_result: {
      path: `${USER}/${MEDIA}.mp3`,
      mime: "audio/mpeg",
      meta: { aiGenerated: true, engine: "elevenlabs", model: "eleven_v3", retries: 0 },
    },
  });
  expect(callsTo("https://api.anthropic.com/")).toHaveLength(0);

  calls = [];
  work = [];
  eleven = [
    { status: 503, body: {} },
    { status: 200, bytes: MP3 },
  ];
  await run("voice");
  expect(callsTo("https://api.elevenlabs.io/")).toHaveLength(2);
  expect(finished()).toMatchObject({ p_status: "complete", p_result: { meta: { retries: 1 } } });

  calls = [];
  work = [];
  eleven = [{ status: 401, body: {} }];
  await run("voice");
  expect(callsTo("https://api.elevenlabs.io/")).toHaveLength(1);
  expect(finished()).toMatchObject({ p_status: "failed", p_result: { failure: "engine_failed" } });

  calls = [];
  work = [];
  uploadStatus = 500;
  eleven = [{ status: 200, bytes: MP3 }];
  await run("voice");
  expect(finished()).toMatchObject({ p_status: "failed", p_result: { failure: "storage_failed" } });
});

test("MH11. 플레이그라운드 — 서버 키 + user_id · 앱 토큰으로 user_id를 보내면 401", async () => {
  begin = okBegin("voice", voiceJob);
  expect((await run("voice", { message_id: MESSAGE, user_id: PLAY }, SERVICE)).status).toBe(202);
  expect(
    (callsTo(`${SUPA}/rest/v1/rpc/companion_media_begin`)[0]!.body as Record<string, unknown>)[
      "p_user_id"
    ],
  ).toBe(PLAY);
  calls = [];
  expect((await run("voice", { message_id: MESSAGE, user_id: PLAY })).status).toBe(401);
  expect(callsTo(`${SUPA}/rest/v1/rpc/companion_media_begin`)).toHaveLength(0);
});

test("MH12. 프롬프트 도우미 — lab과 같은 pass 계산 · 메시지 줄 · 이미지 프롬프트 · base64", () => {
  expect(
    verdictFrom({ reasons: "", safe: true, identity: 3, garbled_text: false, learner_face: false })
      ?.pass,
  ).toBe(true);
  expect(
    verdictFrom({ reasons: "", safe: true, identity: 2, garbled_text: false, learner_face: false })
      ?.pass,
  ).toBe(false);
  expect(
    verdictFrom({ reasons: "", safe: false, identity: 5, garbled_text: false, learner_face: false })
      ?.pass,
  ).toBe(false);
  expect(
    verdictFrom({ reasons: "", safe: true, identity: 5, garbled_text: true, learner_face: false })
      ?.pass,
  ).toBe(false);
  expect(verdictFrom({ safe: "yes" })).toBeNull();
  expect(
    messageLine([
      { kind: "speech", text: "안녕" },
      { kind: "action", text: "웃는다" },
    ]),
  ).toBe("안녕 *웃는다*");
  expect(messageLine([], " 글 ")).toBe("글");
  const prompt = {
    scene: "A shop.",
    aspect: "3:2" as const,
    background_text: "떡볶이",
    safety: "allow" as const,
    reason: "",
  };
  expect(imagePrompt(prompt, "female")).toBe(
    'A shop. Background text allowed only: "떡볶이", short and natural. Korean webtoon illustration style matching the reference. ' +
      "Keep the reference character's face, hair and outfit. No speech bubbles, captions or dialogue. The learner, if shown, " +
      "is a young woman with long hair seen only from behind, over the shoulder or as hands — never her face. Modest clothing, " +
      "no body emphasis.",
  );
  expect(imagePrompt({ ...prompt, background_text: null }, "female")).toContain(
    "A shop. No text anywhere in the image.",
  );
  expect(base64FromBytes(new Uint8Array([1, 2, 3, 4]))).toBe("AQIDBA==");
  expect(base64FromBytes(new TextEncoder().encode("hi"))).toBe("aGk=");
});

test("MH13. 계정 삭제 — 내 폴더 파일을 나열해 지운다 · 버킷이 없으면 0 · 지우기가 실패해도 계정은 지운다", async () => {
  const requests: { url: string; method: string; body: unknown }[] = [];
  let listed = false;
  const storage = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({
      url,
      method: init?.method ?? "GET",
      body: JSON.parse(String(init?.body ?? "null")),
    });
    if (url.endsWith("/object/list/companion-media")) {
      const names = listed ? [] : [{ name: `${MEDIA}.png` }, { name: `${MEDIA}.mp3` }];
      listed = true;
      return new Response(JSON.stringify(names), { status: 200 });
    }
    return new Response("[]", { status: 200 });
  }) as typeof fetch;
  expect(await purgeUserMedia(storage, env, USER, 1000)).toBe(2);
  expect(requests.map((request) => [request.method, request.url, request.body])).toEqual([
    [
      "POST",
      `${SUPA}/storage/v1/object/list/companion-media`,
      { prefix: `${USER}/`, limit: 1000, offset: 0 },
    ],
    [
      "DELETE",
      `${SUPA}/storage/v1/object/companion-media`,
      { prefixes: [`${USER}/${MEDIA}.png`, `${USER}/${MEDIA}.mp3`] },
    ],
    [
      "POST",
      `${SUPA}/storage/v1/object/list/companion-media`,
      { prefix: `${USER}/`, limit: 1000, offset: 0 },
    ],
  ]);
  const noBucket = (async () => new Response("{}", { status: 400 })) as unknown as typeof fetch;
  expect(await purgeUserMedia(noBucket, env, USER, 1000)).toBe(0);

  const order: string[] = [];
  const handle = createDeleteAccountHandler({
    env: {
      supabaseUrl: SUPA,
      supabaseAnonKey: "anon",
      supabaseServiceRoleKey: SERVICE,
      apple: null,
    },
    outbound: async (request) => {
      order.push(`${request.method} ${request.url}`);
      const body = request.url.endsWith("/auth/v1/user")
        ? JSON.stringify({ id: USER, identities: [] })
        : "{}";
      return { status: 200, text: async () => body };
    },
    nowMs: () => 0,
    signEs256: async () => null,
    log: () => {},
    purgeUserFiles: async (userId) => {
      order.push(`purge ${userId}`);
      throw new Error("storage down");
    },
  });
  const response = await handle(
    new Request("https://fn/delete-account", {
      method: "POST",
      headers: { Authorization: "Bearer app-token" },
      body: JSON.stringify({ apple_authorization_code: null }),
    }),
  );
  expect(response.status).toBe(204);
  expect(order).toEqual([
    `GET ${SUPA}/auth/v1/user`,
    `purge ${USER}`,
    `DELETE ${SUPA}/auth/v1/admin/users/${USER}`,
  ]);
});
