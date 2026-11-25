// `POST /functions/v1/companion-story-images` — 친구 스토리 그림 일꾼(ADR-0192 D4 · D5). 서버 키만 받는다(pg_cron 매분 · 운영 도구의 「지금 그리기」).
// 1. `companion_claim_story_images(now, limit)` — 기획 승인된 초안(queued)을 올릴 날이 가까운 것부터 골라 drawing으로. 죽은 일꾼의 줄은 10분 뒤 되돌아온다.
// 2. 줄마다(동시 둘) 그림 한 장(`drawStoryImage` — 컷에 따라 인물이 나오는 길 · 인물 없는 길, 그 뒤 그림을 보고 문구 맞추기) → 공개 콘텐츠 버킷 `images/friend-stories/<인물>/<초안>-<시도>.webp`.
// 3. `companion_finish_story_image` — ready(최종 승인 대기) · 다시 queued(세 번까지) · failed. 앞서 만든 그림 파일은 새 그림이 저장된 뒤 지운다.
//    닫기에는 고를 때 받은 `claimedAt`을 그대로 낸다 — 그 사이 다시 고른 줄(그림 다시 · 죽은 일꾼 되돌림)을 늦게 끝난 일꾼이 덮지 못한다.
//    파일 이름은 시도마다 다르다(`<초안>-<시각>.webp`) — 공개 파일이 오래 캐시되므로 같은 주소에 다른 그림을 덮어쓰지 않는다.
// 일주일 치를 한 번에 그리지 않는다 — 한 장에 1분 안팎이라 함수 한 번(150초)에 둘까지만. 던지지 않는다.

import type { Fetch } from "./companion-media-engines.ts";
import { type MediaEnv, missingKeys } from "./companion-media-env.ts";
import { callRpc, isServiceKey } from "./companion-rpc.ts";
import type { StoryCaptioner } from "./companion-story-caption.ts";
import { drawStoryImage, type StoryImageJob, type StoryLine } from "./companion-story-image.ts";
import { nounInLine, verbInLine } from "./companion-story-studio-items.ts";
import { isStoryShot } from "./companion-story-studio-shots.ts";
import { romanize } from "./korean-romanize.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { mapLimited } from "./map-limited.ts";
import { serviceKeyHeaders } from "./service-key.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

export const STORY_IMAGE_BATCH = 2;
/** 묶음(`story_pool.image_path`)에 적는 경로의 앞부분 — 앱은 맨 앞 `content/`를 떼고 공개 콘텐츠 버킷에서 읽는다. */
export const STORY_IMAGE_PREFIX = "content/images/friend-stories";

export type StoryImagesLogEntry = {
  readonly event: "companion_story_images";
  readonly status: number;
  readonly outcome?: string;
};
export type StoryImagesDeps = {
  readonly env: MediaEnv | null;
  /** 공개 콘텐츠 버킷 이름(`COMPANION_CONTENT_BUCKET`, 기본 `content`) — 앱이 읽는 버킷과 같아야 한다. */
  readonly bucket: string;
  readonly outbound: Outbound;
  readonly fetch: Fetch;
  readonly nowMs: () => number;
  readonly log: (entry: StoryImagesLogEntry) => void;
  readonly budgetMs?: number;
  /** 그림을 보고 문구를 맞추는 단계. 없으면(키 없음) 초안 그대로 간다. */
  readonly caption?: StoryCaptioner | null;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** 묶음 경로(`content/…`) → 버킷 안의 객체 경로. */
export const objectPathOf = (poolPath: string) => poolPath.replace(/^content\//, "");
const objectUrl = (env: MediaEnv, bucket: string, path: string) =>
  `${env.supabaseUrl}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;

type ClaimedJob = StoryImageJob & {
  previousPath: string | null;
  claimedAt: string | null;
  /** 붙어 있던 단어 — 고친 한 줄에 그 단어가 남아 있으면 그대로 붙인다. */
  word: Record<string, unknown> | null;
};

/**
 * 그림에 맞춰 고친 문구 → 닫기에 낼 글. 로마자는 규칙으로 만든다. 단어는 고친 한 줄에 남아 있을 때만 둔다 — 체언은 낱말로 들어 있는가,
 * 용언은 초안에서 그 단어였던 낱말(활용형)이 그대로 남아 있는가(어간만 겹치는 다른 말 — 오다 · 「오늘」 — 에 속지 않게).
 */
export function linePatch(line: StoryLine, word: Record<string, unknown> | null) {
  const reading = /[0-9A-Za-z]/.test(line.ko) ? line.reading : "";
  const wordKo = typeof word?.["ko"] === "string" ? word["ko"] : null;
  const kept =
    wordKo !== null &&
    (wordKo.endsWith("다")
      ? line.from
          .split(/[^가-힣]+/u)
          .some((token) => token !== "" && verbInLine(token, wordKo) && line.ko.includes(token))
      : nounInLine(line.ko, wordKo));
  return {
    from: line.from,
    ko: line.ko,
    roman: romanize(reading || line.ko).slice(0, 400),
    en: line.en,
    replies: line.replies,
    word: kept ? word : null,
  };
}

function jobOf(raw: unknown): ClaimedJob | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const [id, characterId] = [text(row["id"]), text(row["characterId"])];
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^[a-z][a-z0-9-]{0,63}$/.test(characterId)) return null;
  return {
    id,
    characterId,
    characterName: text(row["characterName"]) || characterId,
    look: text(row["look"]),
    refSlug: /^[a-z0-9-]+$/.test(text(row["refSlug"])) ? text(row["refSlug"]) : null,
    ko: text(row["ko"]),
    meaning: text(row["meaning"]),
    shot: isStoryShot(row["shot"]) ? row["shot"] : "scene",
    persona: row["persona"] ?? null,
    topic: text(row["topic"]),
    replies: Array.isArray(row["replies"])
      ? row["replies"].filter((reply): reply is string => typeof reply === "string")
      : [],
    wordKo: text((row["word"] as Record<string, unknown> | null)?.["ko"]) || null,
    word: typeof row["word"] === "object" ? (row["word"] as Record<string, unknown> | null) : null,
    scene: text(row["scene"]),
    tries: typeof row["tries"] === "number" ? row["tries"] : 1,
    recent: Array.isArray(row["recent"])
      ? row["recent"].filter((plan) => typeof plan === "object" && plan !== null)
      : [],
    engine: text(row["engine"]),
    quality: text(row["quality"]) || "medium",
    previousPath: text(row["previousPath"]) || null,
    claimedAt: text(row["claimedAt"]) || null,
  };
}

export function createStoryImagesHandler(
  deps: StoryImagesDeps,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
    const env = deps.env;
    if (env === null) return json(500, { error: "server_misconfigured" });
    const token = bearerTokenFrom(request.headers.get("authorization"));
    if (token === null || !(await isServiceKey(deps.outbound, env, token)))
      return json(401, { error: "invalid_session" });
    // 키가 없으면 고르지 않는다 — 고르면 시도 횟수만 쓴다.
    const missing = missingKeys(env, "snapshot");
    if (missing.length > 0) return json(503, { error: "not_configured", missing });
    const now = new Date(deps.nowMs()).toISOString();

    let rows: unknown[] = [];
    try {
      const claimed = await callRpc<{ rows?: unknown[] } | null>(
        deps.outbound,
        env,
        "companion_claim_story_images",
        { p_now: now, p_limit: STORY_IMAGE_BATCH },
      );
      rows = Array.isArray(claimed?.rows) ? claimed.rows : [];
    } catch {
      deps.log({ event: "companion_story_images", status: 502, outcome: "claim_failed" });
      return json(502, { error: "claim_failed" });
    }

    const upload = async (job: StoryImageJob, bytes: Uint8Array, timeoutMs: number) => {
      const path = `${STORY_IMAGE_PREFIX}/${job.characterId}/${job.id}-${deps.nowMs().toString(36)}.webp`;
      const response = await deps.fetch(objectUrl(env, deps.bucket, objectPathOf(path)), {
        method: "POST",
        headers: {
          ...serviceKeyHeaders(env.supabaseServiceRoleKey),
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
          "x-upsert": "true",
        },
        body: new Blob([bytes as BlobPart], { type: "image/webp" }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status < 200 || response.status >= 300)
        throw new Error(`upload ${response.status}`);
      return path;
    };
    const remove = (path: string) =>
      deps
        .fetch(`${env.supabaseUrl}/storage/v1/object/${deps.bucket}`, {
          method: "DELETE",
          headers: {
            ...serviceKeyHeaders(env.supabaseServiceRoleKey),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prefixes: [objectPathOf(path)] }),
          signal: AbortSignal.timeout(8_000),
        })
        .catch(() => undefined);

    const results = await mapLimited(rows, STORY_IMAGE_BATCH, async (raw) => {
      const job = jobOf(raw);
      const id = job?.id ?? text((raw as Record<string, unknown> | null)?.["id"]);
      const drawn =
        job === null
          ? { ok: false as const, error: "bad row", retry: false, meta: {}, line: null }
          : await drawStoryImage(
              {
                fetch: deps.fetch,
                nowMs: deps.nowMs,
                upload,
                caption: deps.caption ?? null,
                ...(deps.budgetMs === undefined ? {} : { budgetMs: deps.budgetMs }),
              },
              env,
              job,
            );
      try {
        const finished = await callRpc<{ saved?: boolean; status?: string } | null>(
          deps.outbound,
          env,
          "companion_finish_story_image",
          {
            p_id: id,
            p_claimed_at: job?.claimedAt ?? null,
            p_ok: drawn.ok,
            p_image_path: drawn.ok ? drawn.path : null,
            p_meta: drawn.meta,
            p_error: drawn.ok ? null : drawn.error,
            p_retry: drawn.ok ? null : drawn.retry,
            p_now: new Date(deps.nowMs()).toISOString(),
            p_line:
              drawn.ok && drawn.line !== null ? linePatch(drawn.line, job?.word ?? null) : null,
          },
        );
        // 저장되지 않았으면(그 사이 사람이 손댐) 방금 올린 그림을, 저장됐으면 앞 그림을 지운다.
        if (drawn.ok && finished?.saved !== true) await remove(drawn.path);
        else if (drawn.ok && job?.previousPath && job.previousPath !== drawn.path)
          await remove(job.previousPath);
        return finished?.saved === true ? (finished.status ?? "failed") : "gone";
      } catch {
        // 닫지 못했다 — 줄은 drawing으로 남아 10분 뒤 다시 고른다. 방금 올린 그림은 어디에도 적히지 않았으니 지운다.
        if (drawn.ok) await remove(drawn.path);
        return "finish_failed";
      }
    });
    const count = (status: string) => results.filter((result) => result === status).length;
    const body = {
      claimed: rows.length,
      ready: count("ready"),
      queued: count("queued"),
      failed: count("failed") + count("finish_failed"),
      gone: count("gone"),
    };
    deps.log({
      event: "companion_story_images",
      status: 200,
      outcome: `ready=${body.ready}/${body.claimed} queued=${body.queued} failed=${body.failed} gone=${body.gone}`,
    });
    return json(200, body);
  };
}
