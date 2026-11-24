// 내 스토리 반응의 푸시(ADR-0191 D7). 반응이 그 인물 방의 메시지로 저장된 뒤 한 통 — 누르면 그 방(`{ kind: "companion-chat", characterId }`).
// - 스위치 `companion.settings.story_reaction_push`: off(기본) · testers(시험 계정만) · on. 대조군은 없다.
// - 「하루 한 번」 상한(ADR-0178 D7)에 넣지 않는다 — 내가 올린 것에 대한 답이다. 현지 시각 제한도 없다(올린 직후 한 시간 안).
// - 배정은 `push_campaign_sends`(묶음 「스토리 반응」)에 먼저 남긴다. 그 줄이 있으면 그날 선톡 푸시 · 친구 스토리 알림이 건너뛴다
//   (`companion.pushed_today`). 기록 없이 나간 알림은 그 판정에 잡히지 않으므로 보내지 않는다.
// - 그 사람 기기에 그 인물의 방이 있다고 볼 수 있을 때만(선톡 푸시의 `hasRoom` 규칙). 던지지 않는다 — 푸시가 실패해도 반응은 남는다.

import type { Segment } from "./chat-send.contract.ts";
import { previewLine } from "./companion-proactive-push.ts";
import { callRpc, type RpcEnv } from "./companion-rpc.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { serviceKeyHeaders } from "./service-key.ts";

export const REACTION_PUSH_SERIES = "스토리 반응";
export const REACTION_PUSH_SEGMENT = "companion-story-reaction";

export type ReactionPushResult =
  | "off"
  | "not_tester"
  | "no_device"
  | "no_room"
  | "empty"
  | "sent"
  | "record_failed"
  | "send_failed";

type Gate = { mode?: unknown; tester?: unknown; hasDevice?: unknown; hasRoom?: unknown };

const succeeded = (status: number) => status >= 200 && status < 300;

/** 보낼지 — 순수. 보내면 null, 아니면 건너뛰는 까닭. */
export function reactionPushSkip(gate: Gate | null): ReactionPushResult | null {
  if (gate?.mode !== "on" && gate?.mode !== "testers") return "off";
  if (gate.mode === "testers" && gate.tester !== true) return "not_tester";
  if (gate.hasDevice !== true) return "no_device";
  if (gate.hasRoom !== true) return "no_room";
  return null;
}

export async function pushReaction(
  outbound: Outbound,
  env: RpcEnv,
  input: {
    readonly userId: string;
    readonly characterId: string;
    readonly name: string;
    readonly segments: readonly Segment[];
    readonly now: string;
  },
): Promise<ReactionPushResult> {
  let gate: Gate | null;
  try {
    gate = await callRpc<Gate | null>(outbound, env, "companion_story_reaction_push_gate", {
      p_user_id: input.userId,
      p_character_id: input.characterId,
    });
  } catch {
    return "off";
  }
  const skip = reactionPushSkip(gate);
  if (skip !== null) return skip;
  const body = previewLine(input.segments);
  if (body === null) return "empty";

  try {
    const recorded = await outbound({
      url: `${env.supabaseUrl}/rest/v1/push_campaign_sends`,
      method: "POST",
      headers: {
        ...serviceKeyHeaders(env.supabaseServiceRoleKey),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify([
        {
          run_at: input.now,
          series: REACTION_PUSH_SERIES,
          segment: REACTION_PUSH_SEGMENT,
          user_id: input.userId,
          group: "sent",
          variant: "a",
          lang: "ko",
          story_step: null,
          title: input.name,
          body,
          character_id: input.characterId,
        },
      ]),
    });
    if (!succeeded(recorded.status)) return "record_failed";

    const response = await outbound({
      url: `${env.supabaseUrl}/functions/v1/send-push`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: "announcement",
        audience: { userIds: [input.userId] },
        title: input.name,
        body,
        target: { kind: "companion-chat", characterId: input.characterId },
      }),
    });
    if (!succeeded(response.status)) return "send_failed";
    const summary = JSON.parse((await response.text()) || "null") as { sent?: unknown } | null;
    return Number(summary?.sent ?? 0) > 0 ? "sent" : "send_failed";
  } catch {
    return "send_failed";
  }
}
