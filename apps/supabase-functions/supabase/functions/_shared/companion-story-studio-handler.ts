// `POST /functions/v1/companion-story-studio` — 친구 스토리 주간 기획(ADR-0192 D4). 서버 키만 받는다(운영 도구가 부른다).
// 본문 `{ action, … }`:
// - `calendar { from, days }` · `drafts { from, to }` · `plan { week }` · `save_plan { week, notes, by }` — 읽기 · 메모 저장(RPC 그대로).
// - `research { week, hints?, by }` — 웹 검색으로 그 주의 소재 후보를 모아 주간 메모의 `research` · `sources`에 저장한다.
// - `plan_week { from, days, catalog?, by }` — 한 주 기획: 메모의 소재를 인물 · 날짜에 나누고(중앙 배정) 인물마다 초안을 쓴다. 컷(셀카 · 남이 찍어 준 컷 ·
//   인물 없음)은 코드가 비율대로 배정한다.
// - `write { characterId, from, days, catalog?, by }` — 한 인물의 빈 자리만 다시 쓴다(planned). 다 쓴 한 줄에 카탈로그 단어가 있으면 붙인다.
// - `review { id, step, patch?, by }` — `step`: approve_plan(기획 승인) · edit · redo_image · set_image · approve(최종 승인) · unapprove · discard.
//   최종 승인(`approve`)은 빠진 화면 언어의 뜻을 먼저 번역해 채운다 — 번역이 실패하면 승인하지 않는다(`translate_failed`).
// 응답은 HTTP 200 `{ result, … }`. 그림은 여기서 만들지 않는다 — 기획 승인된 초안을 `companion-story-images`가 한 장씩 그린다.

import type { ChatSendEnv } from "./chat-send.contract.ts";
import { callRpc, isServiceKey } from "./companion-rpc.ts";
import { type Body, count, day, review, str, write } from "./companion-story-studio-actions.ts";
import type { StudioLlm } from "./companion-story-studio-llm.ts";
import { planWeek } from "./companion-story-studio-week.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

export const RESEARCH_TIMEOUT_MS = 130_000;

export type StudioLogEntry = {
  readonly event: "companion_story_studio";
  readonly status: number;
  readonly outcome?: string;
};
export type StudioDeps = {
  readonly env: ChatSendEnv | null;
  readonly outbound: Outbound;
  readonly llm: StudioLlm | null;
  readonly nowMs: () => number;
  readonly log: (entry: StudioLogEntry) => void;
  readonly researchTimeoutMs?: number;
  readonly writeTimeoutMs?: number;
  readonly assignTimeoutMs?: number;
  readonly meaningsTimeoutMs?: number;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export function createStudioHandler(deps: StudioDeps): (request: Request) => Promise<Response> {
  const done = (status: number, body: Record<string, unknown>) => {
    deps.log({ event: "companion_story_studio", status, outcome: String(body["result"] ?? "") });
    return json(status, body);
  };
  return async (request) => {
    if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
    const env = deps.env;
    if (env === null) return json(500, { error: "server_misconfigured" });
    const token = bearerTokenFrom(request.headers.get("authorization"));
    if (token === null || !(await isServiceKey(deps.outbound, env, token)))
      return json(401, { error: "invalid_session" });
    let body: Body;
    try {
      const parsed: unknown = await request.json();
      if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
      body = parsed as Body;
    } catch {
      return json(400, { error: "invalid_request" });
    }
    const now = new Date(deps.nowMs()).toISOString();
    const by = str(body["by"], 120) ?? "ops";
    const rpc = <T>(fn: string, args: Record<string, unknown>) =>
      callRpc<T>(deps.outbound, env, fn, args);

    try {
      switch (body["action"]) {
        case "calendar": {
          const from = day(body["from"]);
          if (from === null) return json(400, { error: "invalid_request" });
          const calendar = await rpc<unknown>("companion_story_calendar", {
            p_from: from,
            p_days: count(body["days"], 7),
          });
          return done(200, { result: "ok", calendar });
        }
        case "drafts": {
          const [from, to] = [day(body["from"]), day(body["to"])];
          if (from === null || to === null) return json(400, { error: "invalid_request" });
          const list = await rpc<{ drafts?: unknown[] } | null>("companion_story_drafts", {
            p_from: from,
            p_to: to,
          });
          return done(200, { result: "ok", drafts: list?.drafts ?? [] });
        }
        case "plan": {
          const week = day(body["week"]);
          if (week === null) return json(400, { error: "invalid_request" });
          return done(200, {
            result: "ok",
            plan: await rpc<unknown>("companion_story_plan", { p_week: week }),
          });
        }
        case "save_plan": {
          const week = day(body["week"]);
          if (week === null || typeof body["notes"] !== "string")
            return json(400, { error: "invalid_request" });
          const plan = await rpc<unknown>("companion_save_story_plan", {
            p_week: week,
            p_notes: body["notes"],
            p_research: null,
            p_sources: null,
            p_by: by,
            p_now: now,
          });
          return done(200, { result: "ok", plan });
        }
        case "research": {
          const week = day(body["week"]);
          if (week === null) return json(400, { error: "invalid_request" });
          if (deps.llm === null) return done(200, { result: "not_configured" });
          let found;
          try {
            found = await deps.llm.research({
              week,
              hints: str(body["hints"], 2000) ?? "",
              signal: AbortSignal.timeout(deps.researchTimeoutMs ?? RESEARCH_TIMEOUT_MS),
            });
          } catch {
            return done(200, { result: "failed" });
          }
          const plan = await rpc<unknown>("companion_save_story_plan", {
            p_week: week,
            p_notes: null,
            p_research: found.research,
            p_sources: found.sources,
            p_by: by,
            p_now: now,
          });
          return done(200, { result: "ok", plan });
        }
        case "plan_week":
          return done(200, await planWeek(deps, rpc, body, by, now));
        case "write":
          return done(200, await write(deps, rpc, body, by, now));
        case "review":
          return done(200, await review(deps, rpc, body, by, now));
        default:
          return json(400, { error: "invalid_request" });
      }
    } catch {
      return done(502, { result: "rpc_failed" });
    }
  };
}
