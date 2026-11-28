// `POST /functions/v1/companion-stories` — 친구 스토리(ADR-0178 D1 · D7). 서버 키만 받는다(pg_cron 매시 5분).
//
// 1. 올림 `companion_post_stories(now)` — 인물마다 UTC 하루 하나(올림 시각이 지났을 때). 실패해도 2를 돈다(앞 시각에 올린 스토리의 알림).
// 2. 알림 후보 `companion_story_push_candidates(now, limit)` — 스위치 · 기기 · 방 · 답함 · 6시간 · 현지 09 ~ 21시 · 오늘 알림 없음(선톡 · 스토리 ·
//    스토리 반응 등 합산, 학습 자동 캠페인은 빼고 — ADR-0178 D7 개정)을 서버가 거르고 사람마다 가장 새 스토리 하나.
// 3. 사람마다 계획(`storyPushPlan`) → 배정을 `push_campaign_sends`에 먼저 남기고 → `send-push`(목적지 companion-chat + story). 기록 없이 나간 알림은
//    하루 한 번 판정 · 결과 집계에서 셀 수 없어 보내지 않는다. 시험 계정 단계도 기록한다(묶음 「스토리 시험」 — 결과에 섞이지 않고 하루 한 번은 지킨다).
// 던지지 않는다 — 한 사람의 실패는 그 사람의 결과에만 남는다.

import type { ChatSendEnv, ChatSendLogEntry } from "./chat-send.contract.ts";
import { callRpc, isServiceKey } from "./companion-rpc.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { mapLimited } from "./map-limited.ts";
import { storyLanguageFor } from "./push-campaign-locale.ts";
import { inHoldout } from "./push-campaign-text.ts";
import { serviceKeyHeaders } from "./service-key.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

export const STORY_PUSH_SERIES = "스토리";
/** 시험 계정 단계의 묶음 — 콘솔 결과(묶음 「스토리」)에 섞이지 않게 따로 남긴다. */
export const STORY_PUSH_TEST_SERIES = "스토리 시험";
export const STORY_PUSH_SEGMENT = "friend-story";
export const STORY_PUSH_HOLDOUT = 30;
const SEED = `series:${STORY_PUSH_SERIES}`;
/** 본문의 한국어 한 줄 상한(글자) — 넘으면 자르고 「…」. 잠금 화면 두 줄 안. */
const LINE_MAX = 40;
const CANDIDATE_LIMIT = 200;
/**
 * 사람마다 알림(기록 + send-push 두 번 왕복)을 동시에 몇 명까지 — 200명을 하나씩 돌면 Edge 시간 상한에 닿을 수 있다. 후보는 사람마다 하나라
 * 같은 사람의 줄이 겹치지 않는다. send-push 한 번이 그 사람 기기 묶음만 보내므로 8이면 FCM · APNs에도 무리가 없다.
 */
export const STORY_PUSH_CONCURRENCY = 8;

export type StoryPushMode = "off" | "testers" | "on";

/**
 * 본문 — 받는 사람 나라의 언어(여덟, 검수 B1 · zh-TW는 ADR-0185). 제목이 인물 이름이라 본문은 「올렸다」로 시작하고 한국어 한 줄은 번역하지 않는다.
 * 나라 → 언어는 예고 캠페인과 같은 표(`storyLanguageFor` — 말레이시아는 인도네시아어, 미얀마는 미얀마어).
 */
const STORY_PUSH_BODY: Readonly<Record<string, (line: string) => string>> = {
  en: (line) => `posted a story — ${line}`,
  es: (line) => `publicó una historia — ${line}`,
  id: (line) => `membagikan cerita — ${line}`,
  ja: (line) => `ストーリーを投稿しました — ${line}`,
  vi: (line) => `vừa đăng tin — ${line}`,
  th: (line) => `โพสต์สตอรี่ใหม่ — ${line}`,
  my: (line) => `စတိုရီအသစ် တင်လိုက်ပါပြီ — ${line}`,
  // 대만 중국어(ADR-0185) — 번역 초안, 원어민 검수 필요.
  "zh-TW": (line) => `發布了限時動態 — ${line}`,
};

export type StoryPushPlan = {
  readonly group: "sent" | "control";
  readonly variant: "a" | null;
  readonly series: string;
  readonly lang: string;
  readonly title: string;
  readonly body: string;
};

/** 누구에게 · 어떤 문구로 — 순수. 보내지 않을 사람은 null(후보 함수가 이미 거르지만 스위치를 다시 본다). */
export function storyPushPlan(input: {
  readonly mode: StoryPushMode;
  readonly tester: boolean;
  readonly userId: string;
  readonly name: string;
  readonly line: string;
  /** 받는 사람 나라(학습 프로필) — 모르면 영어. */
  readonly country?: string | null;
}): StoryPushPlan | null {
  if (input.mode === "off") return null;
  if (input.mode === "testers" && !input.tester) return null;
  const experiment = input.mode === "on";
  const group =
    experiment && inHoldout(SEED, input.userId, STORY_PUSH_HOLDOUT) ? "control" : "sent";
  const chars = [...input.line.replace(/\s+/gu, " ").trim()];
  const line =
    chars.length <= LINE_MAX ? chars.join("") : `${chars.slice(0, LINE_MAX - 1).join("")}…`;
  const lang = storyLanguageFor(input.country ?? null);
  const body = STORY_PUSH_BODY[lang] ?? STORY_PUSH_BODY["en"]!;
  return {
    group,
    // 문구 A/B는 없다 — 받는 쪽은 늘 a, 대조군(기록만)만 둔다.
    variant: group === "control" ? null : "a",
    series: experiment ? STORY_PUSH_SERIES : STORY_PUSH_TEST_SERIES,
    lang: STORY_PUSH_BODY[lang] === undefined ? "en" : lang,
    title: [...input.name.trim()].slice(0, 100).join("") || "DURU",
    body: body(line),
  };
}

type Candidate = {
  readonly userId: string;
  readonly storyId: string;
  readonly characterId: string;
  readonly name: string;
  readonly line: string;
  readonly mode: StoryPushMode;
  readonly tester: boolean;
  readonly country: string | null;
};
type Outcome = {
  readonly userId: unknown;
  readonly characterId: unknown;
  readonly storyId: unknown;
  readonly result: "sent" | "control" | "skipped" | "record_failed" | "send_failed" | "invalid";
};

const MODES: readonly StoryPushMode[] = ["off", "testers", "on"];
const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const succeeded = (status: number) => status >= 200 && status < 300;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function candidateOf(raw: unknown): Candidate | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const mode = MODES.find((candidate) => candidate === row["mode"]);
  const fields = [row["userId"], row["storyId"], row["characterId"], row["name"], row["line"]];
  if (mode === undefined || !fields.every((field) => typeof field === "string")) return null;
  if (!uuidShape.test(row["userId"] as string)) return null;
  return {
    userId: row["userId"] as string,
    storyId: row["storyId"] as string,
    characterId: row["characterId"] as string,
    name: row["name"] as string,
    line: row["line"] as string,
    mode,
    tester: row["tester"] === true,
    country: typeof row["country"] === "string" ? row["country"] : null,
  };
}

export type StoriesDeps = {
  readonly env: ChatSendEnv | null;
  readonly outbound: Outbound;
  readonly nowMs: () => number;
  readonly log: (entry: ChatSendLogEntry) => void;
};

async function pushOne(deps: StoriesDeps, env: ChatSendEnv, candidate: Candidate, now: string) {
  const plan = storyPushPlan(candidate);
  if (plan === null) return "skipped" as const;
  try {
    const recorded = await deps.outbound({
      url: `${env.supabaseUrl}/rest/v1/push_campaign_sends`,
      method: "POST",
      headers: {
        ...serviceKeyHeaders(env.supabaseServiceRoleKey),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify([
        {
          run_at: now,
          series: plan.series,
          segment: STORY_PUSH_SEGMENT,
          user_id: candidate.userId,
          group: plan.group,
          variant: plan.variant,
          lang: plan.lang,
          story_step: null,
          title: plan.title,
          body: plan.body,
          // 어느 인물 · 어느 스토리의 알림인가(검수 A15) — 대조군 줄도 남긴다.
          character_id: candidate.characterId,
          story_id: candidate.storyId,
        },
      ]),
    });
    if (!succeeded(recorded.status)) return "record_failed" as const;
  } catch {
    return "record_failed" as const;
  }
  if (plan.group === "control") return "control" as const;
  try {
    const response = await deps.outbound({
      url: `${env.supabaseUrl}/functions/v1/send-push`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: "announcement",
        audience: { userIds: [candidate.userId] },
        title: plan.title,
        body: plan.body,
        target: { kind: "companion-chat", characterId: candidate.characterId, story: true },
      }),
    });
    if (!succeeded(response.status)) return "send_failed" as const;
    const summary = JSON.parse((await response.text()) || "null") as { sent?: unknown } | null;
    return Number(summary?.sent ?? 0) > 0 ? ("sent" as const) : ("send_failed" as const);
  } catch {
    return "send_failed" as const;
  }
}

export function createStoriesHandler(deps: StoriesDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
    const env = deps.env;
    if (env === null) return json(500, { error: "server_misconfigured" });
    const token = bearerTokenFrom(request.headers.get("authorization"));
    if (token === null || !(await isServiceKey(deps.outbound, env, token)))
      return json(401, { error: "invalid_session" });

    const now = new Date(deps.nowMs()).toISOString();
    let posted = 0;
    try {
      const result = await callRpc<{ posted?: unknown[] } | null>(
        deps.outbound,
        env,
        "companion_post_stories",
        { p_now: now },
      );
      posted = Array.isArray(result?.posted) ? result.posted.length : 0;
    } catch {
      deps.log({ event: "companion_stories", status: 200, outcome: "post_failed" });
    }

    let rows: unknown[] = [];
    try {
      const result = await callRpc<unknown[] | null>(
        deps.outbound,
        env,
        "companion_story_push_candidates",
        { p_now: now, p_limit: CANDIDATE_LIMIT },
      );
      rows = Array.isArray(result) ? result : [];
    } catch {
      deps.log({ event: "companion_stories", status: 200, outcome: "candidates_failed" });
    }

    const outcomes: Outcome[] = await mapLimited(rows, STORY_PUSH_CONCURRENCY, async (raw) => {
      const candidate = candidateOf(raw);
      const row = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      return {
        userId: candidate?.userId ?? row["userId"] ?? null,
        characterId: candidate?.characterId ?? row["characterId"] ?? null,
        storyId: candidate?.storyId ?? row["storyId"] ?? null,
        result: candidate === null ? "invalid" : await pushOne(deps, env, candidate, now),
      };
    });
    deps.log({
      event: "companion_stories",
      status: 200,
      outcome: `posted=${posted} sent=${outcomes.filter((o) => o.result === "sent").length}/${outcomes.length}`,
    });
    return json(200, { posted, outcomes });
  };
}
