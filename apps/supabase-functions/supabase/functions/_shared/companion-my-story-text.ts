// 글 스토리 올리기(ADR-0191 D13) — `companion-my-story`의 `post`에 `background`가 오면. 교정 없이 글 검수만 한다.
// 1. 문(`companion_my_text_gate`): 스위치 · 창 · 24시간 상한 · 하루 검수 시도. 같은 요청이 다시 오면 그 스토리(두 번 눌러도 하나).
// 2. 글 검수(입력 층, 그 사람의 연령대): 사용자가 쓴 글 + 얹은 글(`text`) — 카탈로그 단어 · 카드는 이미 검수된 글이라 넣지 않는다.
//    막히면 `text_blocked`, 위기 신호면 저장하지 않고 `crisis`(앱이 위기 안내를 띄운다). 모델이 실패하면 던진다(검수 없이 올리지 않는다).
// 3. 저장(`companion_save_my_text_story`) — 늘 live, 반응 알람을 적는다. 뜻 줄은 비워 둔다.

import type { AgeBand, CompanionLlm } from "./chat-send.contract.ts";
import type { MyStoryOverlay } from "./companion-contract/index.ts";
import { callRpc, type RpcEnv } from "./companion-rpc.ts";
import { checkStoryText } from "./companion-story-draft.ts";
import type { Outbound } from "./delete-account.contract.ts";

/** 글 스토리의 글 길이 상한 — 서버 저장 판정(`companion_save_my_text_story`)과 같다. */
export const TEXT_STORY_MAX = 200;
const CHECK_TIMEOUT_MS = 20_000;

type Json = Record<string, unknown>;

export type TextPostBody = {
  readonly client_id: string;
  readonly background: string;
  readonly ko: string;
  readonly overlays?: readonly MyStoryOverlay[];
  readonly lang: string;
  readonly tz_offset_min?: number | null;
};

const ageBandOf = (value: unknown): AgeBand =>
  value === "adult" || value === "minor" ? value : "unknown";

/** 검수할 글 — 사용자가 쓴 글과 직접 쓴 얹은 글(`text`)을 줄로 잇는다. 없으면 빈 글. */
export function textStoryCheckText(ko: string, overlays: readonly MyStoryOverlay[]): string {
  return [ko, ...overlays.filter((overlay) => overlay.kind === "text").map((overlay) => overlay.ko)]
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}

export async function postTextStory(
  deps: { readonly outbound: Outbound },
  env: RpcEnv,
  llm: CompanionLlm,
  userId: string,
  body: TextPostBody,
  now: string,
): Promise<Json> {
  const overlays = body.overlays ?? [];
  const ko = body.ko.replace(/\s+/gu, " ").trim();
  if ([...ko].length > TEXT_STORY_MAX || (ko === "" && overlays.length === 0))
    return { result: "invalid" };
  const gate = await callRpc<Json | null>(deps.outbound, env, "companion_my_text_gate", {
    p_user_id: userId,
    p_client_id: body.client_id,
    p_tz_offset_min: body.tz_offset_min ?? null,
    p_now: now,
  });
  if (gate?.["result"] === "exists") return { result: "ok", story: gate["story"] ?? null };
  if (gate?.["result"] !== "ok") return gate ?? { result: "off" };

  const text = textStoryCheckText(ko, overlays);
  if (text !== "") {
    const verdict = await checkStoryText(
      llm,
      text,
      ageBandOf(gate["ageBand"]),
      AbortSignal.timeout(CHECK_TIMEOUT_MS),
    );
    if (verdict === "block") return { result: "text_blocked" };
    if (verdict === "crisis") return { result: "crisis" };
  }
  const saved = await callRpc<Json | null>(deps.outbound, env, "companion_save_my_text_story", {
    p_user_id: userId,
    p_client_id: body.client_id,
    p_background: body.background,
    p_ko: ko,
    p_overlays: overlays,
    p_lang: body.lang,
    p_tz_offset_min: body.tz_offset_min ?? null,
    p_now: now,
  });
  return saved ?? { result: "invalid" };
}
