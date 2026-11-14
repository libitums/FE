// `POST /functions/v1/companion-snapshot` · `POST /functions/v1/companion-voice` — 캐릭터 메시지 하나의 스냅샷 · 음성(ADR-0146).
//
// 흐름: 호출자 확인 → 엔진 키(없으면 503 `not_configured`) → `companion_media_begin`(서버가 메시지를 직접 읽는다 — 앱이 보낸 글은 믿지 않는다.
// 남의 메시지 403 · 자격 · 판정 · 동시 1 · 하루 상한 · 엽전 예약 · pending 행) → 202로 바로 돌려주고 백그라운드(`waitUntil`)에서 만든다.
// 저장본이 있으면(스냅샷은 「다시 그리기」가 아니면, 음성은 「다시」가 아니면) 200 · `cached: true`, 차감 없음.
//
// 호출자: 앱은 JWT + `{ message_id, again? }`. ops-dashboard 플레이그라운드는 서버 키 + `{ user_id, message_id, again? }`(companion-suggest와 같은 규칙).
// 모양의 정본은 계약 패키지 `media.ts`.

import {
  type CompanionMedia,
  companionMediaRequestSchema,
  MEDIA_ERRORS,
  type MediaErrorCode,
} from "./companion-contract/index.ts";
import type { Fetch } from "./companion-media-engines.ts";
import { type MediaEnv, missingKeys } from "./companion-media-env.ts";
import type { MediaRunDeps } from "./companion-media-job.ts";
import { runSnapshot, type SnapshotJob } from "./companion-media-run.ts";
import { runVoice, type VoiceJob } from "./companion-media-voice.ts";
import { callRpc } from "./companion-rpc.ts";
import { callerFor } from "./companion-suggest-handler.ts";
import { outboundTimeoutMs, timedOutbound } from "./outbound.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

export type MediaKind = "snapshot" | "voice";

export type MediaLogEntry = {
  readonly event: "companion_media";
  readonly kind: string;
  readonly status: number | string;
  readonly outcome?: string;
};

export type MediaDeps = {
  readonly env: MediaEnv | null;
  /** 모든 바깥 호출(Supabase REST · Auth · Storage, Claude, OpenAI, ElevenLabs). 테스트는 가짜를 넣는다. */
  readonly fetch: Fetch;
  readonly nowMs: () => number;
  /** 응답 뒤에도 작업을 끝까지 돌게 런타임에 알린다(`EdgeRuntime.waitUntil`). 없으면 그냥 띄운다. */
  readonly waitUntil?: (work: Promise<unknown>) => void;
  readonly log: (entry: MediaLogEntry) => void;
  readonly imageTimeoutMs?: number;
  readonly textTimeoutMs?: number;
  readonly storageTimeoutMs?: number;
};

type Begun =
  | { readonly result: "ok"; readonly cached: true; readonly media: CompanionMedia }
  | {
      readonly result: "ok";
      readonly cached: false;
      readonly media: CompanionMedia;
      readonly job: SnapshotJob | VoiceJob;
    }
  | { readonly result: string; readonly detail?: Record<string, unknown> };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(status === 405 ? { Allow: "POST" } : {}),
    },
  });

export function createMediaHandler(
  kind: MediaKind,
  deps: MediaDeps,
): (request: Request) => Promise<Response> {
  const outbound = timedOutbound(deps.fetch, outboundTimeoutMs);
  return async (request) => {
    const fail = (code: MediaErrorCode, detail?: Record<string, unknown>, outcome?: string) => {
      const status = MEDIA_ERRORS[code];
      deps.log({ event: "companion_media", kind, status, outcome: outcome ?? code });
      return json(status, detail === undefined ? { error: code } : { error: code, detail });
    };

    if (request.method !== "POST") return fail("method_not_allowed");
    const env = deps.env;
    if (env === null) return fail("server_misconfigured");
    const token = bearerTokenFrom(request.headers.get("authorization"));
    if (token === null) return fail("invalid_session");

    let raw: unknown;
    try {
      raw = JSON.parse(await request.text());
    } catch {
      return fail("invalid_request");
    }
    const parsed = companionMediaRequestSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid_request");
    const body = parsed.data;
    const caller = await callerFor({ outbound }, env, token, body.user_id);
    if (caller === null) return fail("invalid_session");

    const missing = missingKeys(env, kind);
    if (missing.length > 0) return fail("not_configured", { missing });

    let begun: Begun | null;
    try {
      begun = await callRpc<Begun | null>(outbound, env, "companion_media_begin", {
        p_user_id: caller.userId,
        p_message_id: body.message_id.toLowerCase(),
        p_kind: kind,
        p_again: body.again ?? false,
        p_now: new Date(deps.nowMs()).toISOString(),
      });
    } catch {
      return fail("internal_error", undefined, "begin_failed");
    }
    if (begun === null) return fail("internal_error", undefined, "begin_empty");
    if (begun.result !== "ok" || !("media" in begun)) {
      const code = (
        begun.result in MEDIA_ERRORS ? begun.result : "not_available"
      ) as MediaErrorCode;
      // invalid_session은 유저가 사라진 경우(판정) — 그대로 401.
      return fail(code, (begun as { detail?: Record<string, unknown> }).detail, begun.result);
    }
    if (begun.cached) {
      deps.log({
        event: "companion_media",
        kind,
        status: 200,
        outcome: `cached ${begun.media.status}`,
      });
      return json(200, { media: begun.media, cached: true });
    }

    const runDeps: MediaRunDeps = {
      fetch: deps.fetch,
      outbound,
      nowMs: deps.nowMs,
      log: (entry) => deps.log(entry),
      ...(deps.imageTimeoutMs === undefined ? {} : { imageTimeoutMs: deps.imageTimeoutMs }),
      ...(deps.textTimeoutMs === undefined ? {} : { textTimeoutMs: deps.textTimeoutMs }),
      ...(deps.storageTimeoutMs === undefined ? {} : { storageTimeoutMs: deps.storageTimeoutMs }),
    };
    const work =
      kind === "snapshot"
        ? runSnapshot(runDeps, env, begun.job as SnapshotJob)
        : runVoice(runDeps, env, begun.job as VoiceJob);
    if (deps.waitUntil !== undefined) deps.waitUntil(work);
    else void work;
    deps.log({ event: "companion_media", kind, status: 202, outcome: begun.media.charge });
    return json(202, { media: begun.media, cached: false });
  };
}
