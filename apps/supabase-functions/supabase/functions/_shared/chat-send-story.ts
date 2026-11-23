// 친구 스토리 답장(ADR-0178 D5 · D6). 요청에 `story_id`가 있으면 관문 **전에** 첫 답장 무료를 판정합니다 — 무료면 서버가 그 메시지에 금액 0
// 예약을 먼저 두고, 관문 · 시작(`begin_turn`)이 그 예약을 그대로 씁니다. 판정은 인용도 남깁니다(기록 읽기의 `story`). 이번 턴 지시에 그 스토리
// 한 줄을 실어 캐릭터가 무엇에 답하는지 압니다. 판정이 실패하면 보통 턴입니다 — 던지지 않습니다.

import { callRpc, type RpcEnv } from "./companion-rpc.ts";
import type { Outbound } from "./delete-account.contract.ts";

export type StoryClaimResult = "free" | "used" | "expired" | "not_found" | "off" | "claim_failed";

/** 이 턴이 답하는 스토리 — `line`은 인용이 남은 결과(free · used · expired)에만 있습니다. */
export type TurnStory = { readonly result: StoryClaimResult; readonly line: string | null };

const RESULTS: readonly StoryClaimResult[] = ["free", "used", "expired", "not_found", "off"];
const QUOTED: ReadonlySet<StoryClaimResult> = new Set(["free", "used", "expired"]);

export async function claimStory(
  outbound: Outbound,
  env: RpcEnv,
  input: {
    readonly userId: string;
    readonly storyId: string;
    readonly characterId: string;
    readonly clientMessageId: string;
    readonly now: string;
  },
): Promise<TurnStory> {
  try {
    const claimed = await callRpc<{ result?: unknown; story?: { line?: unknown } | null } | null>(
      outbound,
      env,
      "companion_claim_story_reply",
      {
        p_user_id: input.userId,
        p_story_id: input.storyId,
        p_character_id: input.characterId,
        p_client_message_id: input.clientMessageId,
        p_now: input.now,
      },
    );
    const result = RESULTS.find((candidate) => candidate === claimed?.result) ?? "claim_failed";
    const line = claimed?.story?.line;
    return {
      result,
      line: QUOTED.has(result) && typeof line === "string" && line.trim() !== "" ? line : null,
    };
  } catch {
    return { result: "claim_failed", line: null };
  }
}

/** 스토리 지시 — 서버가 고른 이번 턴 지시(화제 전환 · 학습 표현)가 있으면 그 앞에 붙입니다. 스토리가 없으면 그 지시 그대로. */
export function withStoryDirective(
  story: TurnStory | null,
  directive: string | null,
): string | null {
  if (story?.line == null) return directive;
  const line = story.line.replace(/\s+/gu, " ").trim();
  const note =
    `The learner is replying to the story you posted today: "${line}". ` +
    "React to it naturally, in character, as a friend who just got a reply to their story.";
  return directive === null ? note : `${note}\n${directive}`;
}
