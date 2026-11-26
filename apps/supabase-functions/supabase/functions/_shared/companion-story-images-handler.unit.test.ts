import { beforeEach, expect, test } from "vitest";

import type { MediaEnv } from "./companion-media-env.ts";
import type { StoryCaption, StoryCaptioner, StoryCaptionInput } from "./companion-story-caption.ts";
import {
  createStoryImagesHandler,
  objectPathOf,
  type StoryImagesDeps,
} from "./companion-story-images-handler.ts";

// 친구 스토리 그림 일꾼(ADR-0192 D5): 서버 키만 → 고르기 → 인물 컷(장면 설계 · 기준 그림 · 편집) 또는 사물 · 풍경 컷(생성) → 검사 →
// 공개 콘텐츠 버킷 → 닫기. 안전하지 않은 그림은 올리지 않고, 흠 있는 그림은 다시 그리다 마지막 시도에 경고를 달아 사람에게 보인다.
const SUPA = "https://ref.supabase.co";
const env: MediaEnv = {
  supabaseUrl: SUPA,
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
  anthropicKey: "sk-ant-test",
  snapshotModel: "claude-haiku-5-5",
  snapshotCheck: false,
  snapshotPartialImages: 0,
  snapshotRefs: "all",
  snapshotComplexity: null,
  snapshotPipeline: "v2m",
  openaiKey: "sk-openai-test",
  elevenKey: null,
};
const ID = "11111111-1111-4111-8111-111111111111";
/** 파일 이름의 시각 꼬리(테스트 시계). */
const STAMP = Date.parse("2026-11-22T00:00:00Z").toString(36);
const WEBP = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4]);
const B64 = btoa(String.fromCharCode(...WEBP));
const manifest = {
  version: 1,
  pipeline: "v2m",
  slug: "mina",
  figureKeep: false,
  outfits: [
    { id: 1, name: "casual", description: "a cream knit and jeans", default: true, image: true },
  ],
  refs: { neutral: { default: { file: "neutral.png", roles: ["sheet"], merged: false } } },
};
const row = (extra: Record<string, unknown> = {}) => ({
  id: ID,
  characterId: "mina",
  characterName: "미나",
  look: "wavy dark-blonde hair",
  refSlug: "mina",
  publishOn: "2026-11-25",
  topic: "붕어빵",
  ko: "붕어빵을 샀어요!",
  meaning: "I bought fish-shaped pastries!",
  persona: { name: "미나", speech: "해요체" },
  replies: ["맛있겠다!", "어디서 샀어요?"],
  word: { episodeId: "u01", ref: "voca:9", ko: "붕어빵" },
  shot: "other",
  scene: "Holding a paper bag of fish-shaped pastries on a winter street at dusk.",
  tries: 1,
  claimedAt: "2026-11-22T00:00:00.000000Z",
  previousPath: null,
  recent: [{ shot: "medium", angle: "eye_level" }],
  engine: "gpt-image-2.6-flare",
  quality: "medium",
  ...extra,
});
const planInput = {
  action: "holding a paper bag of pastries",
  setting: "a winter street at dusk",
  lighting: "warm street lights",
  shot: "over_shoulder",
  angle: "eye_level",
  expression: "smile",
  outfit_change: "none",
  outfit_id: 1,
  new_outfit: null,
  new_outfit_name: null,
  learner: "back_view",
  aspect: "3:2",
  background_text: "붕어빵",
  safety: "allow",
  reason: "",
};

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };
let calls: Call[];
let rows: unknown[];
let plan: Record<string, unknown>;
let check: Record<string, unknown>;
let scenery: Record<string, unknown>;
let bundle: unknown;
let imageStatus: { status: number; body?: unknown };
let uploadStatus: number;
let saved: boolean;
let finishStatus: number;
let clock: number;

const respond = (status: number, body: unknown = {}, bytes?: Uint8Array) =>
  new Response(bytes ? new Blob([bytes as BlobPart]) : JSON.stringify(body), {
    status,
    headers: { "content-type": bytes ? "image/png" : "application/json" },
  });
const tool = (name: string, input: unknown) =>
  respond(200, {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-haiku-5-5",
    content: [{ type: "tool_use", id: "tu_1", name, input }],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 20 },
  });

const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const method = init?.method ?? "GET";
  const headers = Object.fromEntries(
    Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [
      k.toLowerCase(),
      v,
    ]),
  );
  let body: unknown = null;
  if (typeof init?.body === "string") body = JSON.parse(init.body);
  else if (init?.body instanceof FormData)
    body = Object.fromEntries(
      [...init.body.entries()].map(([k, v]) => [k, typeof v === "string" ? v : "(file)"]),
    );
  else if (init?.body instanceof Blob) body = `(blob ${init.body.type} ${init.body.size})`;
  calls.push({ url, method, headers, body });
  if (url === `${SUPA}/rest/v1/rpc/companion_claim_story_images`) return respond(200, { rows });
  if (url === `${SUPA}/rest/v1/rpc/companion_finish_story_image`) {
    if (finishStatus !== 200) return respond(finishStatus);
    const args = body as { p_ok: boolean; p_retry: boolean | null };
    return respond(200, {
      saved,
      status: args.p_ok ? "ready" : args.p_retry ? "queued" : "failed",
    });
  }
  if (url === `${SUPA}/storage/v1/object/companion-refs/v2/mina/manifest.json`)
    return bundle === null
      ? respond(404)
      : bundle === "error"
        ? respond(503)
        : respond(200, bundle);
  if (url.startsWith(`${SUPA}/storage/v1/object/companion-refs/`)) return respond(200, null, WEBP);
  if (url.startsWith(`${SUPA}/storage/v1/object/content-test`))
    return respond(method === "DELETE" ? 200 : uploadStatus);
  if (url === "https://api.anthropic.com/v1/messages") {
    const name = (body as { tool_choice: { name: string } }).tool_choice.name;
    return tool(
      name,
      name === "snapshot_plan" ? plan : name === "snapshot_check" ? check : scenery,
    );
  }
  if (url.startsWith("https://api.openai.com/v1/images/"))
    return respond(
      imageStatus.status,
      imageStatus.body ?? { data: [{ b64_json: B64 }], usage: { total_tokens: 9 } },
    );
  return respond(404, { url });
}) as typeof fetch;

function handler(overrides: Partial<StoryImagesDeps> = {}) {
  return createStoryImagesHandler({
    env,
    bucket: "content-test",
    fetch: fakeFetch,
    outbound: async (request) => {
      const response = await fakeFetch(request.url, {
        method: request.method,
        headers: request.headers as Record<string, string>,
        ...(request.body === null ? {} : { body: request.body }),
      });
      return { status: response.status, text: () => response.text() };
    },
    nowMs: () => clock,
    log: () => {},
    ...overrides,
  });
}
async function run(overrides: Partial<StoryImagesDeps> = {}, token = "service-secret") {
  const response = await handler(overrides)(
    new Request("https://fn/companion-story-images", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: "{}",
    }),
  );
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}
const callsTo = (prefix: string) => calls.filter((call) => call.url.startsWith(prefix));
const finished = () => {
  const finishes = callsTo(`${SUPA}/rest/v1/rpc/companion_finish_story_image`);
  expect(finishes).toHaveLength(1);
  return finishes[0]!.body as {
    p_id: string;
    p_claimed_at: string | null;
    p_ok: boolean;
    p_image_path: string | null;
    p_meta: Record<string, unknown>;
    p_error: string | null;
    p_retry: boolean | null;
    p_line: Record<string, unknown> | null;
  };
};

beforeEach(() => {
  calls = [];
  rows = [row()];
  plan = planInput;
  check = {
    reasons: "",
    safe: true,
    identity: 5,
    garbled_text: false,
    learner_face: false,
    learner_matches: true,
  };
  scenery = {
    reasons: "",
    safe: true,
    face: false,
    person: false,
    text_or_logo: false,
    matches: true,
  };
  bundle = manifest;
  imageStatus = { status: 200 };
  uploadStatus = 200;
  saved = true;
  finishStatus = 200;
  clock = Date.parse("2026-11-22T00:00:00Z");
});

test("서버 키만 · 키가 없으면 고르지 않는다", async () => {
  expect((await run({}, "app-token")).status).toBe(401);
  expect(await run({ env: { ...env, openaiKey: null } })).toEqual({
    status: 503,
    body: { error: "not_configured", missing: ["OPENAI_API_KEY"] },
  });
  expect((await run({ env: null })).status).toBe(500);
  expect(callsTo(`${SUPA}/rest/v1/rpc/`)).toEqual([]);
  rows = [];
  expect(await run()).toEqual({
    status: 200,
    body: { claimed: 0, ready: 0, queued: 0, failed: 0, gone: 0 },
  });
});

test("인물 컷: 장면 설계 → 기준 그림 + 편집 → 검사 → 공개 버킷 → ready", async () => {
  expect((await run()).body).toEqual({ claimed: 1, ready: 1, queued: 0, failed: 0, gone: 0 });
  const [planCall, checkCall] = callsTo("https://api.anthropic.com/");
  const system = (planCall!.body as { system: string }).system;
  // 모두에게 보이므로 미성년자 규칙 + 스토리 규칙.
  expect(system).toContain("Story post rules");
  expect(system).toContain("No romance or flirting");
  const content = (planCall!.body as { messages: { content: string }[] }).messages[0]!.content;
  expect(content).toContain(
    "*Holding a paper bag of fish-shaped pastries on a winter street at dusk.* 붕어빵을 샀어요! (I bought fish-shaped pastries!)",
  );
  expect(content).toContain("- medium, eye_level");
  const edit = callsTo("https://api.openai.com/v1/images/edits")[0]!.body as Record<string, string>;
  expect(edit).toMatchObject({
    model: "gpt-image-2.6-flare",
    size: "1024x1536",
    quality: "medium",
    output_format: "webp",
  });
  // 학습자는 그림에 없다 — 모델이 뭐라 했든.
  expect(edit["prompt"]).toContain("The character is alone in the picture");
  expect(edit["prompt"]).toContain("a medium shot from the waist up");
  expect(edit["prompt"]).toContain("No text anywhere in the image.");
  expect(edit["prompt"]).toContain("Vertical 2:3 portrait framing");
  expect((checkCall!.body as { system: string }).system).toContain("face reference");
  const upload = callsTo(`${SUPA}/storage/v1/object/content-test/`)[0]!;
  expect(upload.url).toBe(
    `${SUPA}/storage/v1/object/content-test/images/friend-stories/mina/${ID}-${STAMP}.webp`,
  );
  expect(upload.headers).toMatchObject({ "content-type": "image/webp", "x-upsert": "true" });
  const done = finished();
  expect(done).toMatchObject({
    p_id: ID,
    // 고를 때 받은 증표를 그대로 낸다.
    p_claimed_at: "2026-11-22T00:00:00.000000Z",
    p_ok: true,
    p_image_path: `content/images/friend-stories/mina/${ID}-${STAMP}.webp`,
    p_error: null,
  });
  expect(done.p_meta).toMatchObject({
    pipeline: "story-v2m",
    size: "1024x1536",
    plan: { learner: "none", shot: "medium", background_text: null, ref: "v2/mina/neutral.png" },
    verdict: { pass: true },
  });
  expect(done.p_meta["warnings"]).toBeUndefined();
  expect(objectPathOf("content/images/x.webp")).toBe("images/x.webp");
});

test("셀카는 각도를 셀카로 고정하고, 남이 찍어 준 컷은 셀카 각도를 쓰지 않는다", async () => {
  rows = [row({ shot: "selfie" })];
  plan = { ...planInput, shot: "full_body", angle: "low" };
  await run();
  const system = (callsTo("https://api.anthropic.com/")[0]!.body as { system: string }).system;
  expect(system).toContain("This story is a selfie the character took");
  const selfie = callsTo("https://api.openai.com/v1/images/edits")[0]!.body as Record<
    string,
    string
  >;
  // 계획이 뭐라 했든 팔 길이 셀카 · 허리 위.
  expect(selfie["prompt"]).toContain("a medium shot from the waist up");
  expect(selfie["prompt"]).toMatch(/selfie/i);
  expect(finished().p_meta).toMatchObject({
    shot: "selfie",
    plan: { angle: "selfie", shot: "medium" },
  });

  calls = [];
  rows = [row({ shot: "other" })];
  plan = { ...planInput, shot: "full_body", angle: "selfie" };
  await run();
  expect((callsTo("https://api.anthropic.com/")[0]!.body as { system: string }).system).toContain(
    "This photo was taken by someone else",
  );
  // 셀카 각도는 눈높이로 바뀐다(구도는 스냅샷의 계획 정리가 셀카용으로 이미 좁혔다).
  expect(finished().p_meta).toMatchObject({ plan: { angle: "eye_level", shot: "medium" } });
});

test("문구 맞추기: 그림을 보고 고친 글을 닫기에 낸다 — 로마자는 규칙으로, 단어는 남아 있을 때만", async () => {
  const seen: StoryCaptionInput[] = [];
  const caption =
    (out: Partial<StoryCaption>): StoryCaptioner =>
    async (input) => {
      seen.push(input);
      return {
        changed: true,
        ko: "붕어빵이 아직 따뜻해요!",
        reading: "붕어빵이 아직 따뜻해요!",
        en: "The pastries are still warm!",
        replies: ["맛있겠다!", " 맛있겠다! ", "몇 개 샀어요?"],
        ...out,
      };
    };
  await run({ caption: caption({}) });
  // 검사를 통과한 그림 · 인물 카드 · 초안 · 붙어 있는 단어를 받는다.
  expect(seen[0]).toMatchObject({
    characterName: "미나",
    shot: "other",
    topic: "붕어빵",
    ko: "붕어빵을 샀어요!",
    en: "I bought fish-shaped pastries!",
    replies: ["맛있겠다!", "어디서 샀어요?"],
    wordKo: "붕어빵",
    persona: { name: "미나" },
  });
  expect(seen[0]!.image).toMatchObject({ mime: "image/webp" });
  const done = finished();
  expect(done.p_line).toEqual({
    // 맞출 때 본 초안의 한 줄 — 그 사이 사람이 글을 고쳤으면 서버가 쓰지 않는다.
    from: "붕어빵을 샀어요!",
    ko: "붕어빵이 아직 따뜻해요!",
    roman: "bungeoppangi ajik ttatteuthaeyo!",
    en: "The pastries are still warm!",
    replies: ["맛있겠다!", "몇 개 샀어요?"],
    word: { episodeId: "u01", ref: "voca:9", ko: "붕어빵" },
  });
  expect(done.p_meta["caption"]).toEqual({
    changed: true,
    draft: { ko: "붕어빵을 샀어요!", en: "I bought fish-shaped pastries!" },
  });

  // 고친 한 줄에 단어가 없으면 단어를 뗀다. 숫자가 있으면 읽는 법으로 로마자를 만든다.
  calls = [];
  await run({ caption: caption({ ko: "12월의 간식이에요!", reading: "십이월의 간식이에요!" }) });
  expect(finished().p_line).toMatchObject({ roman: "sibiworui gansigieyo!", word: null });

  // 그대로 두면(또는 같은 글이면) 글을 건드리지 않는다.
  for (const out of [{ changed: false }, { ko: "붕어빵을 샀어요!" }]) {
    calls = [];
    await run({ caption: caption(out) });
    expect(finished().p_line).toBeNull();
    expect(finished().p_meta["caption"]).toEqual({ changed: false });
  }
  // 고쳤다는데 쓸 수 없는 글은 초안 그대로 — 사람에게 「그대로」라고 알리지 않는다.
  for (const out of [
    { replies: [] },
    { en: " " },
    { ko: "Visit evil.example now" },
    { ko: "붕어빵 최고 😋" },
    { ko: "…" },
    { ko: "붕어빵 사러 가요. ".repeat(8) },
  ]) {
    calls = [];
    await run({ caption: caption(out) });
    expect([out, finished().p_line]).toEqual([out, null]);
    expect(finished().p_meta["caption"]).toBe("unusable");
  }
  // 용언 단어는 초안의 그 낱말이 그대로 남아 있을 때만 둔다(어간만 겹치는 다른 말에 속지 않는다).
  const verb = { episodeId: "u", ref: "voca:v", ko: "먹다" };
  calls = [];
  rows = [row({ ko: "붕어빵을 먹었어요!", word: verb })];
  await run({ caption: caption({ ko: "먹음직한 붕어빵이에요!" }) });
  expect(finished().p_line).toMatchObject({ word: null });
  calls = [];
  await run({ caption: caption({ ko: "따뜻한 붕어빵을 먹었어요!" }) });
  expect(finished().p_line).toMatchObject({ word: verb });
  rows = [row()];
  // 실패해도 그림은 살린다.
  calls = [];
  await run({
    caption: async () => {
      throw new Error("boom");
    },
  });
  expect(finished()).toMatchObject({ p_ok: true, p_line: null });
  expect(finished().p_meta["caption"]).toBe("failed");
  // 검사에 떨어진 그림은 문구를 맞추지 않는다(값을 치르지 않는다).
  calls = [];
  seen.length = 0;
  check = { ...check, safe: false };
  await run({ caption: caption({}) });
  expect(seen).toEqual([]);
});

test("사물 · 풍경 컷: 기준 그림 없이 생성", async () => {
  rows = [row({ shot: "scene", scene: "A paper bag of fish-shaped pastries on a bench." })];
  await run();
  expect(callsTo("https://api.openai.com/v1/images/edits")).toEqual([]);
  const generated = callsTo("https://api.openai.com/v1/images/generations")[0]!.body as Record<
    string,
    unknown
  >;
  expect(generated).toMatchObject({ size: "1024x1536", output_format: "webp", n: 1 });
  expect(generated["prompt"]).toContain(
    "A paper bag of fish-shaped pastries on a bench. Korean webtoon",
  );
  // 인물은 없고, 찍는 사람의 손까지만.
  expect(generated["prompt"]).toContain("photographer's hand at the edge of the frame");
  expect(generated["prompt"]).toContain("Never a visible face");
  expect(callsTo("https://api.anthropic.com/")).toHaveLength(1);
  expect(finished().p_meta).toMatchObject({ pipeline: "story-scenery", verdict: { pass: true } });
});

test("인물 컷인데 묶음이 없으면 그리지 않는다 — 풍경 컷으로 바꾸지 않고 사람에게 넘긴다", async () => {
  bundle = null;
  await run();
  expect(callsTo("https://api.openai.com/")).toEqual([]);
  expect(finished()).toMatchObject({ p_ok: false, p_error: "no_bundle", p_retry: false });
  calls = [];
  rows = [row({ refSlug: null })];
  await run();
  expect(callsTo(`${SUPA}/storage/v1/object/companion-refs/`)).toEqual([]);
  expect(finished()).toMatchObject({ p_ok: false, p_error: "no_bundle", p_retry: false });
  // 묶음 읽기가 잠깐 실패한 것은 다음 회차에 다시.
  calls = [];
  rows = [row()];
  bundle = "error";
  await run();
  expect(finished()).toMatchObject({ p_ok: false, p_retry: true });
  expect(finished().p_error).toContain("bundle:");
});

test("인물 없는 컷에 사람이 주인공으로 나오면(얼굴이 안 보여도) 올리지 않는다 · 인물 컷의 둘째 인물은 경고", async () => {
  rows = [row({ shot: "scene", tries: 3 })];
  scenery = { ...scenery, person: true };
  await run();
  expect(finished()).toMatchObject({ p_ok: false, p_error: "check: unsafe", p_retry: false });
  expect(callsTo(`${SUPA}/storage/v1/object/content-test/`)).toEqual([]);
  calls = [];
  rows = [row({ tries: 3 })];
  check = { ...check, learner_matches: false };
  await run();
  expect(finished().p_meta["warnings"]).toEqual(["second_person"]);
});

test("안전하지 않은 그림은 올리지 않는다 — 다시 그리고, 마지막 시도면 실패", async () => {
  check = { ...check, safe: false };
  expect((await run()).body).toMatchObject({ ready: 0, queued: 1 });
  expect(callsTo(`${SUPA}/storage/v1/object/content-test/`)).toEqual([]);
  expect(finished()).toMatchObject({
    p_ok: false,
    p_image_path: null,
    p_error: "check: unsafe",
    p_retry: true,
  });
  calls = [];
  rows = [row({ tries: 3 })];
  expect((await run()).body).toMatchObject({ failed: 1 });
  expect(finished()).toMatchObject({ p_ok: false, p_retry: false });
  expect(callsTo(`${SUPA}/storage/v1/object/content-test/`)).toEqual([]);
  // 사물 · 풍경 컷에 얼굴이 나온 것도 같다.
  calls = [];
  rows = [row({ shot: "scene", tries: 3 })];
  scenery = { ...scenery, face: true };
  await run();
  expect(finished()).toMatchObject({ p_ok: false, p_retry: false });
});

test("흠 있는 그림(동일성 · 깨진 글자 · 주문과 다름)은 다시 그리다, 마지막 시도면 경고를 달아 보인다", async () => {
  check = { ...check, identity: 2, garbled_text: true };
  await run();
  expect(finished()).toMatchObject({
    p_ok: false,
    p_error: "check: identity, garbled_text",
    p_retry: true,
  });
  calls = [];
  rows = [row({ tries: 3 })];
  await run();
  const done = finished();
  expect(done.p_ok).toBe(true);
  expect(done.p_meta["warnings"]).toEqual(["identity", "garbled_text"]);
  calls = [];
  rows = [row({ shot: "scene", tries: 3 })];
  scenery = { ...scenery, text_or_logo: true, matches: false };
  await run();
  expect(finished().p_meta["warnings"]).toEqual(["text_or_logo", "mismatch"]);
});

test("설계가 막으면 · 엔진이 거절하면 다시 하지 않는다 · 엔진 오류는 다음 회차에", async () => {
  plan = { ...planInput, safety: "block", reason: "not drawable" };
  await run();
  expect(finished()).toMatchObject({
    p_ok: false,
    p_error: "plan blocked: not drawable",
    p_retry: false,
  });
  expect(callsTo("https://api.openai.com/")).toEqual([]);

  calls = [];
  plan = planInput;
  imageStatus = {
    status: 400,
    body: { error: { code: "moderation_blocked", message: "safety system" } },
  };
  await run();
  expect(finished()).toMatchObject({ p_ok: false, p_retry: false });
  expect(finished().p_error).toContain("engine refused");

  calls = [];
  imageStatus = { status: 500, body: { error: { message: "boom" } } };
  await run();
  expect(finished()).toMatchObject({ p_ok: false, p_retry: true });

  calls = [];
  imageStatus = { status: 200 };
  uploadStatus = 500;
  await run();
  expect(finished()).toMatchObject({ p_ok: false, p_error: "upload: upload 500", p_retry: true });
});

test("앞 그림은 새 그림이 저장된 뒤 지우고, 저장되지 않으면 방금 올린 것을 지운다", async () => {
  const old = `content/images/friend-stories/mina/${ID}-old.webp`;
  rows = [row({ tries: 1, previousPath: old })];
  await run();
  const removed = () =>
    calls
      .filter((call) => call.method === "DELETE")
      .map((call) => (call.body as { prefixes: string[] }).prefixes[0]);
  // 그림 다시(시도 횟수가 처음부터)여도 새 파일은 다른 이름이다 — 캐시된 앞 그림과 섞이지 않는다.
  expect(finished().p_image_path).toBe(`content/images/friend-stories/mina/${ID}-${STAMP}.webp`);
  expect(removed()).toEqual([`images/friend-stories/mina/${ID}-old.webp`]);
  // 그 사이 사람이 손댔거나 다른 일꾼이 다시 골랐다 — 닫기가 저장하지 않는다. 방금 올린 것만 지운다(앞 그림은 그대로).
  calls = [];
  saved = false;
  expect((await run()).body).toMatchObject({ ready: 0, gone: 1 });
  expect(removed()).toEqual([`images/friend-stories/mina/${ID}-${STAMP}.webp`]);
  // 닫기 RPC가 실패해도 방금 올린 그림을 남기지 않는다.
  calls = [];
  finishStatus = 500;
  expect((await run()).body).toMatchObject({ failed: 1 });
  expect(removed()).toEqual([`images/friend-stories/mina/${ID}-${STAMP}.webp`]);
});

test("시간 예산이 없으면 그리지 않고 다음 회차로 · 틀린 줄은 실패로 닫는다", async () => {
  await run({ budgetMs: 2_000 });
  expect(callsTo("https://api.openai.com/")).toEqual([]);
  expect(finished()).toMatchObject({ p_ok: false, p_error: "budget exhausted", p_retry: true });
  calls = [];
  rows = [{ id: ID, characterId: "../etc" }];
  expect((await run()).body).toMatchObject({ failed: 1 });
  expect(finished()).toMatchObject({ p_id: ID, p_ok: false, p_error: "bad row", p_retry: false });
});
