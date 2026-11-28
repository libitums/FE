import { expect, test } from "vitest";

import type { ChatSendEnv, CompanionLlm, ModerationVerdict } from "./chat-send.contract.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import { createMyStoryHandler } from "./companion-my-story-handler.ts";
import type { StoryRead, StoryReadInput } from "./companion-story-read.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

// 사진 스토리 올리기의 겹치기(ADR-0191 D11 개정 ⟨겹쳐 읽기⟩): 문을 지나면 글 검수와 사진 내려받기 · 읽기를 함께 돌린다.
// 결과는 차례로 돌 때와 같다 — 글 판정이 먼저(막힘 · 위기면 사진 읽기를 버리고 멈춤), 그다음 사진 없음 · 거절 · 게시. 저장 · 거절 RPC는 둘 다 끝난 뒤 하나만.
// 시계 대신 손으로 푸는 약속으로 「누가 먼저 끝나는가」를 정한다.

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
const OK_READ: StoryRead = {
  verdict: "ok",
  scene: { description: "A plane window.", hooks: [], crisis: false },
};

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

/** 응답 본문 읽기가 매크로 작업을 거치므로 타이머 몇 번을 넘긴다(실제 지연 없음). */
const tick = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

/** 글 검수 · 사진 읽기 · 내려받기를 손으로 푼다. 일어난 일은 `events`에 차례로 적는다. */
function setup(options: { download?: "ok" | "throw" } = {}) {
  const events: string[] = [];
  const text = deferred<ModerationVerdict>();
  const read = deferred<StoryRead>();
  let readSignal: AbortSignal | null = null;
  const base = fakeCompanionLlm();
  const llm: CompanionLlm = {
    ...base,
    moderate: async (request) => {
      events.push("text:start");
      const verdict = await text.promise;
      events.push(`text:${verdict.action}`);
      return verdict;
    },
  };
  const reader = async (input: StoryReadInput) => {
    events.push("read:start");
    readSignal = input.signal;
    return read.promise;
  };
  const outbound = async (request: OutboundRequest) => {
    if (request.url.includes("/auth/v1/user"))
      return { status: 200, text: async () => JSON.stringify({ id: userId }) };
    const fn = request.url.split("/rpc/")[1] ?? "";
    const args = JSON.parse(request.body ?? "{}") as Record<string, unknown>;
    events.push(`rpc:${fn}`);
    const body =
      fn === "companion_my_photo_gate"
        ? { result: "ok" }
        : fn === "companion_save_my_photo_story"
          ? { result: "ok", story: { id: "s1", status: args["p_status"] } }
          : fn === "companion_reject_my_photo"
            ? { id: "r1", category: args["p_category"] }
            : {};
    return { status: 200, text: async () => JSON.stringify(body) };
  };
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    events.push(`storage:${method} ${String(input).replace(env.supabaseUrl, "").split("/")[4]}`);
    if (method !== "GET") return new Response("{}", { status: 200 });
    if (options.download === "throw") return new Response("", { status: 503 });
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });
  }) as typeof fetch;
  const handler = createMyStoryHandler({
    env,
    outbound,
    fetch: fetchImpl,
    llm,
    reader,
    nowMs: () => Date.parse("2026-11-24T03:00:00Z"),
    log: () => undefined,
  });
  const call = () =>
    handler(
      new Request("https://ref.supabase.co/functions/v1/companion-my-story", {
        method: "POST",
        headers: { Authorization: "Bearer user-token" },
        body: JSON.stringify({
          action: "post",
          client_id: clientId,
          image_path: path,
          ko: "서울에 도착했어!",
          lang: "en",
        }),
      }),
    ).then(async (response) => ({
      status: response.status,
      body: (await response.json()) as Record<string, unknown>,
    }));
  return { events, text, read, call, readSignal: () => readSignal };
}

const allow: ModerationVerdict = { category: "safe", action: "allow" };
const block: ModerationVerdict = { category: "profanity", action: "block" };
const writes = (events: readonly string[]) =>
  events.filter(
    (event) =>
      event === "rpc:companion_save_my_photo_story" ||
      event === "rpc:companion_reject_my_photo" ||
      (event.startsWith("storage:") && !event.startsWith("storage:GET")),
  );

test("MP1. 겹치기 — 문을 지나면 글 검수가 끝나기 전에 사진을 내려받아 읽기 시작하고, 둘 다 끝난 뒤에 한 번 저장(live)", async () => {
  const t = setup();
  const pending = t.call();
  await tick();
  // 글 검수가 아직 판정하지 않았는데 사진은 이미 읽히는 중이다(둘 다 문 뒤).
  expect(t.events[0]).toBe("rpc:companion_my_photo_gate");
  expect([...t.events].sort()).toEqual([
    "read:start",
    "rpc:companion_my_photo_gate",
    "storage:GET my-story-photos",
    "text:start",
  ]);
  t.read.resolve(OK_READ);
  await tick();
  expect(writes(t.events)).toEqual([]);
  t.text.resolve(allow);
  const result = await pending;
  expect(result.body).toMatchObject({ result: "ok", story: { status: "live" } });
  expect(writes(t.events)).toEqual(["rpc:companion_save_my_photo_story"]);
});

test("MP2. 글이 막히면 — 사진 읽기를 멈추고(신호) 읽기 결과는 버린다. 저장 · 거절 · 격리 없이 text_blocked", async () => {
  const t = setup();
  const pending = t.call();
  await tick();
  t.text.resolve(block);
  const result = await pending;
  expect(result.body).toEqual({ result: "text_blocked" });
  expect(t.readSignal()?.aborted).toBe(true);
  // 늦게 온 거절 판정도 아무것도 쓰지 않는다.
  t.read.resolve({ verdict: "reject", category: "nudity" });
  await tick();
  expect(writes(t.events)).toEqual([]);
});

test("MP3. 위기 글 — 사진 읽기를 멈추고 저장 없이 crisis", async () => {
  const t = setup();
  const pending = t.call();
  await tick();
  t.text.resolve({ category: "self_harm", action: "crisis" });
  const result = await pending;
  expect(result.body).toMatchObject({ result: "crisis" });
  expect(t.readSignal()?.aborted).toBe(true);
  expect(writes(t.events)).toEqual([]);
});

test("MP4. 사진 거절 — 글 검수가 늦게 통과해도 지금처럼 격리 → 거절 기록, 저장 없음", async () => {
  const t = setup();
  const pending = t.call();
  await tick();
  t.read.resolve({ verdict: "reject", category: "nudity" });
  await tick();
  expect(writes(t.events)).toEqual([]);
  t.text.resolve(allow);
  const result = await pending;
  expect(result.body).toEqual({ result: "rejected", rejection: { id: "r1", category: "nudity" } });
  expect(writes(t.events)).toEqual([
    "storage:POST my-story-quarantine",
    "storage:DELETE my-story-photos",
    "rpc:companion_reject_my_photo",
  ]);
});

test("MP5. 한쪽 실패 — 글 검수가 던지면 500(저장 없음), 내려받기가 실패해도 글이 막혔으면 text_blocked, 글이 통과했으면 500", async () => {
  const textThrows = setup();
  const first = textThrows.call();
  await tick();
  textThrows.text.reject(new Error("moderation down"));
  expect((await first).status).toBe(500);
  expect(textThrows.readSignal()?.aborted).toBe(true);
  expect(writes(textThrows.events)).toEqual([]);

  const downBlocked = setup({ download: "throw" });
  const second = downBlocked.call();
  await tick();
  expect(downBlocked.events).not.toContain("read:start");
  downBlocked.text.resolve(block);
  expect((await second).body).toEqual({ result: "text_blocked" });

  const downAllowed = setup({ download: "throw" });
  const third = downAllowed.call();
  await tick();
  downAllowed.text.resolve(allow);
  expect((await third).status).toBe(500);
  expect(writes(downAllowed.events)).toEqual([]);
});
