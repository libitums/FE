// `POST /functions/v1/companion-my-story` — 사진 스토리(ADR-0191 D11). 앱 JWT. 본문은 계약의 `myStoryRequestSchema`.
// - `draft`: 올리기 전 교정. 하루 횟수 상한(`my_story_draft_daily`) → 글 검수 → 자연스러운 한국어 한 줄 · 뜻 · 팁.
// - `post`: 사진 올리기(`companion-my-story-post.ts`). `background`가 오면 글 스토리(`companion-my-story-text.ts` — 교정 없이 검수만).
// - `edit`: 올린 뒤 글만 고친다 — 글 검수를 다시 거치고 스토리당 횟수 상한(`my_story_edit_limit`)이 있다.
// 결과는 늘 HTTP 200의 `{ result, … }`(계약 `myStoryResponseSchema`). 세션 · 본문 · 서버 설정 문제만 4xx · 5xx다.

import type { AgeBand, ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import { myStoryRequestSchema, type MyStoryRequest } from "./companion-contract/index.ts";
import { postPhotoStory } from "./companion-my-story-post.ts";
import { postTextStory } from "./companion-my-story-text.ts";
import { callRpc } from "./companion-rpc.ts";
import {
  checkStoryText,
  draftStoryLine,
  STORY_DRAFT_TEXT_MAX,
  STORY_LINE_MAX,
} from "./companion-story-draft.ts";
import type { StoryReader } from "./companion-story-read.ts";
import type { StoryFetch } from "./companion-story-storage.ts";
import { callerFor } from "./companion-suggest-handler.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

const TEXT_TIMEOUT_MS = 20_000;
const MAX_BODY_BYTES = 32_000;

export type MyStoryLogEntry = {
  readonly event: "companion_my_story";
  readonly status: number;
  readonly outcome?: string;
};

export type MyStoryDeps = {
  readonly env: ChatSendEnv | null;
  readonly outbound: Outbound;
  readonly fetch: StoryFetch;
  readonly llm: CompanionLlm | null;
  /** 사진 읽기. 키가 없으면 null — `post`를 받지 않는다(500). */
  readonly reader: StoryReader | null;
  readonly nowMs: () => number;
  readonly log: (entry: MyStoryLogEntry) => void;
  readonly readTimeoutMs?: number;
};

type Json = Record<string, unknown>;
type Counted = { allowed?: unknown; reason?: unknown; l1?: unknown; ageBand?: unknown } | null;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const flat = (text: string) => text.replace(/\s+/gu, " ").trim();
const within = (text: string, max: number) => {
  const length = [...flat(text)].length;
  return length >= 1 && length <= max;
};
const ageBandOf = (value: unknown): AgeBand =>
  value === "adult" || value === "minor" ? value : "unknown";

async function countDraft(deps: MyStoryDeps, env: ChatSendEnv, userId: string, now: string) {
  return callRpc<Counted>(deps.outbound, env, "companion_count_story_draft", {
    p_user_id: userId,
    p_now: now,
  });
}

async function draft(
  deps: MyStoryDeps,
  env: ChatSendEnv,
  llm: CompanionLlm,
  userId: string,
  body: Extract<MyStoryRequest, { action: "draft" }>,
  now: string,
): Promise<Json> {
  if (!within(body.text, STORY_DRAFT_TEXT_MAX)) return { result: "invalid" };
  const counted = await countDraft(deps, env, userId, now);
  if (counted?.allowed !== true)
    return { result: counted?.reason === "draft_limit" ? "draft_limit" : "off" };
  const signal = AbortSignal.timeout(TEXT_TIMEOUT_MS);
  const verdict = await checkStoryText(llm, flat(body.text), ageBandOf(counted.ageBand), signal);
  if (verdict === "block") return { result: "text_blocked" };
  if (verdict === "crisis") return { result: "crisis" };
  const made = await draftStoryLine(
    llm,
    env,
    { text: body.text, l1: typeof counted.l1 === "string" ? counted.l1 : null },
    signal,
  );
  return made === null ? { result: "unavailable" } : { result: "ok", draft: made };
}

async function edit(
  deps: MyStoryDeps,
  env: ChatSendEnv,
  llm: CompanionLlm,
  userId: string,
  body: Extract<MyStoryRequest, { action: "edit" }>,
  now: string,
): Promise<Json> {
  if (!within(body.ko, STORY_LINE_MAX)) return { result: "invalid" };
  const counted = await countDraft(deps, env, userId, now);
  if (counted?.allowed !== true)
    return { result: counted?.reason === "draft_limit" ? "draft_limit" : "off" };
  const verdict = await checkStoryText(
    llm,
    flat(body.ko),
    ageBandOf(counted.ageBand),
    AbortSignal.timeout(TEXT_TIMEOUT_MS),
  );
  if (verdict === "block") return { result: "text_blocked" };
  const edited = await callRpc<Json | null>(deps.outbound, env, "companion_edit_my_story_line", {
    p_user_id: userId,
    p_story_id: body.story_id,
    p_ko: flat(body.ko),
    p_roman: body.roman ?? "",
    p_meaning: body.meaning ?? "",
    p_now: now,
  });
  return edited ?? { result: "invalid" };
}

export function createMyStoryHandler(deps: MyStoryDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    const respond = (status: number, body: Json, outcome: string) => {
      deps.log({ event: "companion_my_story", status, outcome });
      return json(status, body);
    };
    if (request.method !== "POST")
      return respond(405, { error: "method_not_allowed" }, "method_not_allowed");
    const env = deps.env;
    if (env === null || deps.llm === null)
      return respond(500, { error: "server_misconfigured" }, "server_misconfigured");
    const token = bearerTokenFrom(request.headers.get("authorization"));
    if (token === null) return respond(401, { error: "invalid_session" }, "invalid_session");
    let raw: unknown;
    try {
      // 길이는 본문을 읽기 전에도 본다(헤더가 없거나 틀릴 수 있어 읽은 뒤에도 본다).
      if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY_BYTES)
        throw new Error("too large");
      const text = await request.text();
      if (text.length > MAX_BODY_BYTES) throw new Error("too large");
      raw = JSON.parse(text);
    } catch {
      return respond(400, { error: "invalid_request" }, "invalid_request");
    }
    const parsed = myStoryRequestSchema.safeParse(raw);
    if (!parsed.success) return respond(400, { error: "invalid_request" }, "invalid_request");
    const body = parsed.data;
    const caller = await callerFor({ outbound: deps.outbound }, env, token, undefined);
    if (caller === null) return respond(401, { error: "invalid_session" }, "invalid_session");
    const now = new Date(deps.nowMs()).toISOString();
    try {
      let result: Json;
      if (body.action === "draft")
        result = await draft(deps, env, deps.llm, caller.userId, body, now);
      else if (body.action === "edit")
        result = await edit(deps, env, deps.llm, caller.userId, body, now);
      else if ((body.background === undefined) === (body.image_path === undefined))
        // 사진 경로와 바탕색 중 정확히 하나 — 둘 다거나 둘 다 없으면 어떤 스토리인지 모른다.
        result = { result: "invalid" };
      else if (body.background !== undefined)
        result = await postTextStory(
          { outbound: deps.outbound },
          env,
          deps.llm,
          caller.userId,
          { ...body, background: body.background },
          now,
        );
      else if (deps.reader === null)
        return respond(500, { error: "server_misconfigured" }, "no_reader");
      else if (!within(body.ko, STORY_LINE_MAX)) result = { result: "invalid" };
      else
        result = await postPhotoStory(
          {
            outbound: deps.outbound,
            fetch: deps.fetch,
            reader: deps.reader,
            readTimeoutMs: deps.readTimeoutMs,
          },
          env,
          deps.llm,
          caller.userId,
          { ...body, image_path: body.image_path ?? "", ko: flat(body.ko) },
          now,
        );
      return respond(200, result, `${body.action}:${String(result["result"])}`);
    } catch {
      return respond(500, { error: "internal_error" }, `${body.action}:failed`);
    }
  };
}
