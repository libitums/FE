import { expect, test } from "vitest";

import type { ChatSendEnv } from "./chat-send.contract.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import { createMyStoryHandler, type MyStoryLogEntry } from "./companion-my-story-handler.ts";
import {
  reactionDirective,
  reactionQuizWord,
  reactionUserText,
} from "./companion-reaction-prompt.ts";
import { fakeStoryReader, type StoryReader } from "./companion-story-read.ts";
import { storyUpkeep } from "./companion-story-upkeep.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

// 사진 스토리 함수(ADR-0191 D11): 교정 · 올리기(문 → 글 검수 → 사진 읽기 → 게시 · 거절 · 다시 보기) · 글 고치기, 매분 뒷정리, 사진 반응 지시.
const env: ChatSendEnv = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
  llm: { kind: "fake" },
  translation: "every",
};
const userId = "00000000-0000-4000-8000-000000000011";
const clientId = "7f3f6a0e-6c0e-4f0e-9a43-0d8f5c3b9a12";
const path = `${userId}/${clientId}.jpg`;

type Rpc = { fn: string; args: Record<string, unknown> };
function setup(
  options: {
    rpc?: Record<string, unknown>;
    photo?: Response | null;
    reader?: StoryReader | null;
    readTimeoutMs?: number;
  } = {},
) {
  const rpcs: Rpc[] = [];
  const storage: string[] = [];
  const logs: MyStoryLogEntry[] = [];
  const outbound = async (request: OutboundRequest) => {
    if (request.url.includes("/auth/v1/user"))
      return {
        status: request.headers["Authorization"] === "Bearer user-token" ? 200 : 401,
        text: async () => JSON.stringify({ id: userId }),
      };
    const fn = request.url.split("/rpc/")[1] ?? "";
    const args = JSON.parse(request.body ?? "{}") as Record<string, unknown>;
    rpcs.push({ fn, args });
    const body =
      options.rpc?.[fn] ??
      (fn === "companion_my_photo_gate"
        ? { result: "ok" }
        : fn === "companion_count_story_draft"
          ? { allowed: true, l1: "en", ageBand: "adult" }
          : fn === "companion_save_my_photo_story"
            ? { result: "ok", story: { id: "s1", status: args["p_status"] } }
            : fn === "companion_reject_my_photo"
              ? { id: "r1", category: args["p_category"] }
              : fn === "companion_edit_my_story_line"
                ? { result: "ok", story: { id: "s1", ko: args["p_ko"] } }
                : {});
    return { status: 200, text: async () => JSON.stringify(body) };
  };
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    storage.push(`${init?.method ?? "GET"} ${String(input).replace(env.supabaseUrl, "")}`);
    if ((init?.method ?? "GET") !== "GET") return new Response("{}", { status: 200 });
    return options.photo === null
      ? new Response("", { status: 404 })
      : (options.photo?.clone() ??
          new Response(new Uint8Array([1, 2, 3]), {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }));
  }) as typeof fetch;
  const handler = createMyStoryHandler({
    env,
    outbound,
    fetch: fetchImpl,
    llm: fakeCompanionLlm(),
    reader: options.reader === undefined ? fakeStoryReader : options.reader,
    nowMs: () => Date.parse("2026-11-24T03:00:00Z"),
    log: (entry) => logs.push(entry),
    ...(options.readTimeoutMs === undefined ? {} : { readTimeoutMs: options.readTimeoutMs }),
  });
  const call = async (body: unknown, token = "user-token", method = "POST") => {
    const response = await handler(
      new Request("https://ref.supabase.co/functions/v1/companion-my-story", {
        method,
        headers: { Authorization: `Bearer ${token}` },
        ...(method === "POST"
          ? { body: typeof body === "string" ? body : JSON.stringify(body) }
          : {}),
      }),
    );
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };
  const args = (fn: string) => rpcs.find((rpc) => rpc.fn === fn)?.args;
  return { call, rpcs, storage, logs, args };
}
const post = (extra: Record<string, unknown> = {}) => ({
  action: "post",
  client_id: clientId,
  image_path: path,
  ko: " 서울에 도착했어! ",
  lang: "en",
  ...extra,
});

test("MH1. 세션 · 본문 — POST만, 앱 토큰만, 틀린 본문은 400", async () => {
  expect((await setup().call({}, "user-token", "GET")).status).toBe(405);
  expect((await setup().call(post(), "bad-token")).status).toBe(401);
  expect((await setup().call("not json")).status).toBe(400);
  // 길이 헤더가 상한을 넘으면 본문을 읽기 전에 거절한다.
  const big = await createMyStoryHandler({
    env,
    outbound: async () => ({ status: 500, text: async () => "{}" }),
    fetch: (async () => new Response("")) as typeof fetch,
    llm: fakeCompanionLlm(),
    reader: fakeStoryReader,
    nowMs: () => 0,
    log: () => undefined,
  })(
    new Request("https://ref.supabase.co/functions/v1/companion-my-story", {
      method: "POST",
      headers: { Authorization: "Bearer user-token", "content-length": "9999999" },
      body: "{}",
    }),
  );
  expect(big.status).toBe(400);
  expect((await setup().call({ action: "delete" })).status).toBe(400);
  expect((await setup().call(post({ client_id: "x" }))).status).toBe(400);
});

test("MH2. 올리기 — 문 → 글 검수 → 사진 읽기 → live로 저장(장면 설명 · 얹은 단어 · 교정 전 글)", async () => {
  const t = setup();
  const overlays = [{ kind: "word", ko: "창가 자리", x: 0.3, y: 0.2, scale: 1, rotation: 0 }];
  const result = await t.call(post({ original: "서울 도착했어", overlays, tz_offset_min: 540 }));
  expect(result).toMatchObject({ status: 200, body: { result: "ok", story: { status: "live" } } });
  expect(t.rpcs.map((rpc) => rpc.fn)).toEqual([
    "companion_my_photo_gate",
    "companion_save_my_photo_story",
  ]);
  expect(t.args("companion_my_photo_gate")).toEqual({
    p_user_id: userId,
    p_client_id: clientId,
    p_tz_offset_min: 540,
    p_now: "2026-11-24T03:00:00.000Z",
  });
  expect(t.args("companion_save_my_photo_story")).toMatchObject({
    p_image_path: path,
    p_ko: "서울에 도착했어!",
    p_original: "서울 도착했어",
    p_overlays: overlays,
    p_status: "live",
    p_tz_offset_min: 540,
    p_scene: { description: expect.stringContaining("1 sticker"), crisis: false },
  });
  expect(t.storage).toEqual([`GET /storage/v1/object/my-story-photos/${path}`]);
  expect(t.logs.at(-1)).toMatchObject({ status: 200, outcome: "post:ok" });
});

test("MH3. 올리기가 멈추는 곳 — 문의 결과는 그대로 · 같은 요청은 그 스토리 · 막힌 글 · 사진 없음 · 긴 글", async () => {
  for (const gate of [
    { result: "window_used", window: { used: true } },
    { result: "age" },
    { result: "check_limit" },
    { result: "rejected", rejection: { id: "r0", category: "nudity" } },
  ]) {
    const t = setup({ rpc: { companion_my_photo_gate: gate } });
    expect((await t.call(post())).body).toEqual(gate);
    expect(t.rpcs).toHaveLength(1);
    expect(t.storage).toEqual([]);
  }
  const exists = setup({
    rpc: { companion_my_photo_gate: { result: "exists", story: { id: "s0" } } },
  });
  expect((await exists.call(post())).body).toEqual({ result: "ok", story: { id: "s0" } });
  const blocked = setup();
  expect((await blocked.call(post({ ko: "[block] 나쁜 말" }))).body).toEqual({
    result: "text_blocked",
  });
  expect(blocked.storage).toEqual([]);
  const missing = setup({ photo: null });
  expect((await missing.call(post())).body).toEqual({ result: "no_photo" });
  expect(missing.args("companion_save_my_photo_story")).toBeUndefined();
  // 남의 폴더 · 다른 버킷으로 빠지는 경로는 저장소를 건드리기 전에 막는다(서버 키로 읽고 옮기고 지우기 때문).
  for (const image_path of [
    "00000000-0000-4000-8000-000000000099/a.jpg",
    `${userId}/../other-bucket/a.jpg`,
    `${userId}/a/b.jpg`,
    `${userId}/.hidden`,
    `${userId}/`,
    "a.jpg",
  ]) {
    const foreign = setup();
    expect((await foreign.call(post({ image_path }))).body).toEqual({ result: "invalid" });
    expect(foreign.rpcs).toEqual([]);
    expect(foreign.storage).toEqual([]);
  }
  const long = setup();
  expect((await long.call(post({ ko: "가".repeat(121) }))).body).toEqual({ result: "invalid" });
  expect(long.rpcs).toEqual([]);
  expect((await setup({ reader: null }).call(post())).status).toBe(500);
});

test("MH4. 거절 — 사진을 격리 버킷으로 옮기고 거절을 적는다. 스토리는 저장하지 않는다", async () => {
  const t = setup();
  const result = await t.call(post({ ko: "바다 [unsafe]" }));
  expect(result.body).toEqual({ result: "rejected", rejection: { id: "r1", category: "nudity" } });
  expect(t.storage).toEqual([
    `GET /storage/v1/object/my-story-photos/${path}`,
    `POST /storage/v1/object/my-story-quarantine/${path}`,
    "DELETE /storage/v1/object/my-story-photos",
  ]);
  expect(t.args("companion_reject_my_photo")).toMatchObject({
    p_user_id: userId,
    p_client_id: clientId,
    p_category: "nudity",
    p_quarantine_path: path,
    p_source_path: path,
  });
  expect(t.args("companion_save_my_photo_story")).toBeUndefined();
});

test("MH5. 읽기가 실패 · 늦으면 checking으로 올리고, 위기 신호(글 · 얹은 글 · 사진)는 올리지 않고 crisis + 상담 연락처", async () => {
  const failed = setup();
  expect((await failed.call(post({ ko: "서울 [slow]" }))).body).toMatchObject({
    result: "ok",
    story: { status: "checking" },
  });
  expect(failed.args("companion_save_my_photo_story")).toMatchObject({
    p_status: "checking",
    p_scene: null,
  });
  const slow = setup({
    readTimeoutMs: 20,
    reader: () =>
      new Promise((resolve) => setTimeout(() => resolve(fakeStoryReader as never), 500)),
  });
  expect((await slow.call(post())).body).toMatchObject({ story: { status: "checking" } });
  // 위기 신호(글 · 얹은 글 · 사진 읽기)는 올리지 않고 crisis + 그 지역의 상담 연락처(ADR-0191 D15 — 색 바탕과 같다).
  for (const body of [
    post({ ko: "죽고 싶어", client_region: "KR" }),
    post({
      ko: "오늘",
      client_region: "KR",
      overlays: [{ kind: "text", ko: "죽고 싶어", x: 0, y: 0, scale: 1, rotation: 0 }],
    }),
    post({ ko: "힘든 하루 [crisis]", client_region: "KR" }),
  ]) {
    const t = setup();
    const result = (await t.call(body)).body;
    expect(result).toMatchObject({ result: "crisis" });
    expect((result["resources"] as unknown[]).length).toBeGreaterThan(0);
    expect(t.args("companion_save_my_photo_story")).toBeUndefined();
  }
  // 직접 쓴 얹은 글도 검수한다 · 배운 단어는 검수하지 않는다.
  const overlayBlocked = setup();
  expect(
    (
      await overlayBlocked.call(
        post({
          overlays: [{ kind: "text", ko: "[block] 나쁜 말", x: 0, y: 0, scale: 1, rotation: 0 }],
        }),
      )
    ).body,
  ).toEqual({ result: "text_blocked" });
  const word = setup();
  await word.call(
    post({
      overlays: [
        {
          kind: "word",
          ko: "[block]",
          word: { episodeId: "e", ref: "w" },
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
        },
      ],
    }),
  );
  expect(word.args("companion_save_my_photo_story")).toBeDefined();
});

test("MH6. 교정 — 횟수 상한 → 글 검수 → 한국어 한 줄 · 뜻. 모국어는 한국어로, 막힌 글 · 위기 · 상한", async () => {
  const korean = await setup().call({ action: "draft", text: "서울에 도착했어!" });
  expect(korean.body).toMatchObject({
    result: "ok",
    draft: { kind: "same", ko: "서울에 도착했어!", tip: null },
  });
  expect(typeof (korean.body["draft"] as { meaning: unknown }).meaning).toBe("string");
  const l1 = await setup().call({ action: "draft", text: "I arrived in Seoul" });
  expect(l1.body).toMatchObject({
    result: "ok",
    draft: { kind: "l1_to_ko", ko: "안녕하세요, 반가워요.", meaning: "I arrived in Seoul" },
  });
  expect((await setup().call({ action: "draft", text: "[block] 나쁜 말" })).body).toEqual({
    result: "text_blocked",
  });
  expect((await setup().call({ action: "draft", text: "죽고 싶어" })).body).toEqual({
    result: "crisis",
  });
  const limited = setup({
    rpc: { companion_count_story_draft: { allowed: false, reason: "draft_limit" } },
  });
  expect((await limited.call({ action: "draft", text: "안녕" })).body).toEqual({
    result: "draft_limit",
  });
  expect((await setup().call({ action: "draft", text: " " })).body).toEqual({ result: "invalid" });
  expect((await setup().call({ action: "draft", text: "가".repeat(301) })).body).toEqual({
    result: "invalid",
  });
});

test("MH7. 글 고치기 — 횟수를 세고 글 검수를 다시 거친 뒤 서버 판정 그대로", async () => {
  const t = setup();
  const result = await t.call({
    action: "edit",
    story_id: clientId,
    ko: " 서울 도착! ",
    meaning: "Arrived!",
  });
  expect(result.body).toEqual({ result: "ok", story: { id: "s1", ko: "서울 도착!" } });
  expect(t.rpcs.map((rpc) => rpc.fn)).toEqual([
    "companion_count_story_draft",
    "companion_edit_my_story_line",
  ]);
  expect(t.args("companion_edit_my_story_line")).toMatchObject({
    p_user_id: userId,
    p_story_id: clientId,
    p_ko: "서울 도착!",
    p_meaning: "Arrived!",
  });
  const blocked = setup();
  expect(
    (await blocked.call({ action: "edit", story_id: clientId, ko: "[block] 나쁜 말" })).body,
  ).toEqual({ result: "text_blocked" });
  expect(blocked.args("companion_edit_my_story_line")).toBeUndefined();
  const limit = setup({
    rpc: { companion_edit_my_story_line: { result: "edit_limit", story: null } },
  });
  expect((await limit.call({ action: "edit", story_id: clientId, ko: "넷" })).body).toMatchObject({
    result: "edit_limit",
  });
});

function upkeepSetup(options: {
  purges?: unknown[];
  checks?: unknown[];
  photo?: boolean;
  removeOk?: boolean;
}) {
  const rpcs: Rpc[] = [];
  const storage: string[] = [];
  const outbound = async (request: OutboundRequest) => {
    const fn = request.url.split("/rpc/")[1] ?? "";
    rpcs.push({ fn, args: JSON.parse(request.body ?? "{}") as Record<string, unknown> });
    const body =
      fn === "companion_my_story_file_purges"
        ? (options.purges ?? [])
        : fn === "companion_my_story_checks_due"
          ? (options.checks ?? [])
          : {};
    return { status: 200, text: async () => JSON.stringify(body) };
  };
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    storage.push(`${method} ${String(input).replace(env.supabaseUrl, "")}`);
    if (method === "DELETE")
      return new Response("[]", { status: options.removeOk === false ? 500 : 200 });
    if (method === "POST") return new Response("{}", { status: 200 });
    return options.photo === false
      ? new Response("", { status: 404 })
      : new Response(new Uint8Array([1]), {
          status: 200,
          headers: { "content-type": "image/png" },
        });
  }) as typeof fetch;
  return { rpcs, storage, deps: { outbound, fetch: fetchImpl, reader: fakeStoryReader } };
}

test("MH8. 글 스토리 — 바탕색이 오면 사진 없이: 문 → 글 검수(쓴 글 + 직접 쓴 얹은 글) → 저장. 막힌 글 · 위기는 저장하지 않는다", async () => {
  const text = (extra: Record<string, unknown> = {}) => ({
    action: "post",
    client_id: clientId,
    background: "orange",
    ko: " 오늘 비가  와요 ",
    overlays: [
      { kind: "text", ko: "우산", x: 0.5, y: 0.5, scale: 1, rotation: 0 },
      {
        kind: "word",
        ko: "비",
        word: { episodeId: "e1", ref: "w1" },
        x: 0.2,
        y: 0.2,
        scale: 1,
        rotation: 0,
      },
    ],
    lang: "en",
    ...extra,
  });
  const ok = setup({
    rpc: {
      companion_my_text_gate: { result: "ok", ageBand: "minor" },
      companion_save_my_text_story: { result: "ok", story: { id: "s9", kind: "text" } },
    },
  });
  expect((await ok.call(text())).body).toEqual({ result: "ok", story: { id: "s9", kind: "text" } });
  expect(ok.rpcs.map((rpc) => rpc.fn)).toEqual([
    "companion_my_text_gate",
    "companion_save_my_text_story",
  ]);
  expect(ok.args("companion_save_my_text_story")).toMatchObject({
    p_user_id: userId,
    p_client_id: clientId,
    p_background: "orange",
    p_ko: "오늘 비가 와요",
    p_lang: "en",
  });
  // 사진은 읽지 않는다.
  expect(ok.storage).toEqual([]);

  const blocked = setup({ rpc: { companion_my_text_gate: { result: "ok", ageBand: "adult" } } });
  expect(
    (
      await blocked.call(
        text({
          ko: "",
          overlays: [{ kind: "text", ko: "[block] 나쁜 말", x: 0, y: 0, scale: 1, rotation: 0 }],
        }),
      )
    ).body,
  ).toEqual({ result: "text_blocked" });
  expect(blocked.rpcs.map((rpc) => rpc.fn)).toEqual(["companion_my_text_gate"]);

  const crisis = setup({ rpc: { companion_my_text_gate: { result: "ok", ageBand: "adult" } } });
  expect((await crisis.call(text({ ko: "죽고 싶어" }))).body).toMatchObject({
    result: "crisis",
    resources: [expect.objectContaining({ name: expect.any(String) })],
  });
  expect(crisis.rpcs.map((rpc) => rpc.fn)).toEqual(["companion_my_text_gate"]);

  // 문의 결과는 그대로 · 같은 요청은 그 스토리.
  const used = setup({
    rpc: { companion_my_text_gate: { result: "window_used", window: { used: true } } },
  });
  expect((await used.call(text())).body).toEqual({ result: "window_used", window: { used: true } });
  const again = setup({
    rpc: { companion_my_text_gate: { result: "exists", story: { id: "s9" } } },
  });
  expect((await again.call(text())).body).toEqual({ result: "ok", story: { id: "s9" } });

  // 사진 경로와 바탕색은 정확히 하나 · 빈 스토리 · 긴 글은 invalid(문도 부르지 않는다).
  for (const bad of [
    text({ image_path: path }),
    { ...post(), image_path: undefined },
    text({ ko: "", overlays: [] }),
    text({ ko: "가".repeat(201) }),
  ]) {
    const t = setup();
    expect((await t.call(bad)).body).toEqual({ result: "invalid" });
    expect(t.rpcs).toEqual([]);
  }
  expect((await setup().call(text({ background: "red" }))).status).toBe(400);
});

test("MU1. 뒷정리(파일) — 버킷별로 묶어 지우고, 지운 줄만 대기열에서 뺀다. 실패하면 남긴다", async () => {
  const purges = [
    { id: 1, bucket: "my-story-photos", path: "u1/a.jpg" },
    { id: 2, bucket: "my-story-quarantine", path: "u1/b.jpg" },
    { id: 3, bucket: "my-story-photos", path: "u2/c.jpg" },
  ];
  const t = upkeepSetup({ purges });
  expect(await storyUpkeep(t.deps, env, "2026-11-24T03:00:00.000Z")).toEqual({
    purged: 3,
    checked: 0,
  });
  expect(t.storage).toEqual([
    "DELETE /storage/v1/object/my-story-photos",
    "DELETE /storage/v1/object/my-story-quarantine",
  ]);
  expect(t.rpcs.find((rpc) => rpc.fn === "companion_done_my_story_file_purges")?.args).toEqual({
    p_ids: [1, 3, 2],
  });
  const failing = upkeepSetup({ purges, removeOk: false });
  expect(await storyUpkeep(failing.deps, env, "now")).toEqual({ purged: 0, checked: 0 });
  expect(failing.rpcs.some((rpc) => rpc.fn === "companion_done_my_story_file_purges")).toBe(false);
});

test("MU2. 뒷정리(다시 보기) — 읽히면 live(장면 설명) · 거절이면 격리 뒤 rejected · 사진이 없으면 지움(drop) · 또 실패하면 그대로(게시하지 않음)", async () => {
  const row = (ko: string) => ({
    storyId: "s1",
    imagePath: "u1/a.png",
    ko,
    overlays: [{ ko: "창가 자리" }],
  });
  const resolved = (t: ReturnType<typeof upkeepSetup>) =>
    t.rpcs.find((rpc) => rpc.fn === "companion_resolve_my_story_check")?.args;
  const ok = upkeepSetup({ checks: [row("서울 도착")] });
  expect(await storyUpkeep(ok.deps, env, "now")).toEqual({ purged: 0, checked: 1 });
  expect(resolved(ok)).toMatchObject({
    p_story_id: "s1",
    p_verdict: "live",
    p_scene: { description: expect.stringContaining("1 sticker") },
  });
  const rejected = upkeepSetup({ checks: [row("바다 [unsafe]")] });
  await storyUpkeep(rejected.deps, env, "now");
  expect(resolved(rejected)).toMatchObject({
    p_verdict: "rejected",
    p_category: "nudity",
    p_quarantine_path: "u1/a.png",
  });
  expect(rejected.storage).toContain("POST /storage/v1/object/my-story-quarantine/u1/a.png");
  const missing = upkeepSetup({ checks: [row("서울 도착")], photo: false });
  await storyUpkeep(missing.deps, env, "now");
  expect(resolved(missing)).toMatchObject({ p_verdict: "drop", p_scene: null });
  const again = upkeepSetup({ checks: [row("[slow]")] });
  expect(await storyUpkeep(again.deps, env, "now")).toEqual({ purged: 0, checked: 1 });
  expect(resolved(again)).toBeUndefined();
  // 읽기 구현이 없으면(키 없음) 다시 보기는 건너뛴다.
  const none = upkeepSetup({ checks: [row("서울 도착")] });
  await storyUpkeep({ ...none.deps, reader: null }, env, "now");
  expect(none.rpcs.map((rpc) => rpc.fn)).toEqual(["companion_my_story_file_purges"]);
});

test("RP5. 사진 반응 지시 — 장면 설명 · 글 · 각도, 신원 · 외모 · 사진 속 글자는 말하지 않는다", () => {
  const story = {
    kind: "photo" as const,
    ko: "서울에 도착했어!",
    roman: "",
    meaning: "I made it to Seoul!",
    exampleKo: null,
    angle: "react" as const,
    scene: "A plane window over the sea.",
    hooks: ["Where are you flying?"],
  };
  const react = reactionDirective(story);
  expect(react).toContain("What the photo shows: A plane window over the sea.");
  expect(react).toContain('What they wrote: "서울에 도착했어!" (meaning "I made it to Seoul!")');
  expect(react).toMatch(/React warmly/);
  expect(react).toMatch(/Never guess who the people in the photo are/);
  expect(react).toMatch(/never comment on anyone's looks, face, smile or body/);
  const question = reactionDirective({ ...story, angle: "question" });
  expect(question).toContain('Things you could pick up on: "Where are you flying?"');
  expect(reactionDirective({ ...story, angle: "together" })).toMatch(/doing something together/);
  expect(reactionDirective({ ...story, scene: null })).toMatch(/respond to what they wrote only/);
  expect(reactionUserText(story)).toContain("사진 스토리");
});

test("RP6. 조합 스토리 지시 — 색 바탕 · 사진 × 글 · 단어. 사진 · 글이 먼저(단어는 엮기), 덕수쌤 퀴즈는 사진 · 글과 엮어 뜻으로 묻고, 색 + 단어만은 단어 카드처럼", () => {
  const base = {
    kind: "text" as const,
    ko: "",
    roman: "",
    meaning: "",
    exampleKo: null,
    angle: "react" as const,
  };
  // 색 + 글 + 단어: 글에 먼저 반응하고 단어는 어울리면 엮는다.
  const colored = {
    ...base,
    texts: ["오늘 비가 와요"],
    words: [{ ko: "우산", meaning: "umbrella" }],
  };
  const react = reactionDirective(colored);
  expect(react).toContain("colored background");
  expect(react).toContain('What they wrote: "오늘 비가 와요"');
  expect(react).toContain('Korean words they are learning, placed on it: "우산" (umbrella)');
  expect(react).toMatch(/React warmly to what they wrote first/);
  expect(react).toMatch(/weave in the word/);
  expect(reactionDirective({ ...colored, angle: "question" })).toMatch(/Ask one light question/);
  expect(reactionDirective({ ...colored, angle: "together" })).toMatch(/doing something together/);
  // 덕수쌤 퀴즈: 뜻으로 묻고 단어는 쓰지 않는다.
  const quiz = reactionDirective({ ...colored, angle: "quiz" });
  expect(quiz).toContain('the Korean word for "umbrella"');
  expect(quiz).toContain('Do not write the word "우산" yourself');
  expect(reactionQuizWord(colored)).toBe("우산");
  // 사진 + 단어(글 없음): 사진에 먼저 반응.
  const photo = reactionDirective({
    ...base,
    kind: "photo",
    scene: "A beach.",
    words: [{ ko: "여름", meaning: "summer" }],
  });
  expect(photo).toContain("What the photo shows: A beach.");
  expect(photo).toMatch(/React warmly to the photo first/);
  expect(photo).not.toContain("What they wrote");
  // 색 + 단어만: 단어 카드 모양(첫 단어가 주인공).
  const wordOnly = reactionDirective({
    ...base,
    angle: "word",
    words: [{ ko: "산책", meaning: "a walk" }],
  });
  expect(wordOnly).toContain('the Korean word "산책"');
  expect(wordOnly).toContain('Use the word "산책"');
  expect(reactionUserText({ ...base, texts: [], words: [{ ko: "산책", meaning: "" }] })).toContain(
    "「산책」",
  );
  expect(reactionUserText(colored)).toContain("「오늘 비가 와요 · 우산」");
});
