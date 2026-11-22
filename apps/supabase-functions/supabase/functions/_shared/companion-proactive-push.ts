// 선톡 푸시(ADR-0127의 서버 쪽, 사용자 결정 2026-11-22). 선톡이 저장된 뒤 그 사람에게 알림 한 통을 보냅니다 — 누르면 그 인물의 방
// (`{ kind: "companion-chat", characterId, variant }`). 빈도는 선톡의 규칙 그대로입니다(따로 세지 않음).
// - 스위치 `companion.settings.proactive_push`: off(기본) · testers(시험 계정만 — 대조군 없이 모두 받고 기록하지 않음) · on.
// - on: 대조군 30%(기록만) · 미리보기 A 한국어 첫 말 / B 「{이름} sent you a message」 — 자동 캠페인과 같은 해시(사용자 id)로 나눕니다.
// - 배정은 `push_campaign_sends`(묶음 「선톡」)에 먼저 남깁니다 — 캠페인의 쉬는 시간이 이 표를 보므로 학습 알림이 연달아 가지 않습니다.
// 푸시 기기가 없는 사람은 실험에 넣지 않습니다(받을 수 없어 두 칸의 차이를 흐립니다). 던지지 않습니다 — 푸시가 실패해도 선톡은 남습니다.

import type { Segment } from "./chat-send.contract.ts";
import { callRpc, type RpcEnv } from "./companion-rpc.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { inHoldout, variantIndexOf } from "./push-campaign-text.ts";
import { serviceKeyHeaders } from "./service-key.ts";

export const PROACTIVE_PUSH_SERIES = "선톡";
export const PROACTIVE_PUSH_SEGMENT = "companion-proactive";
export const PROACTIVE_PUSH_HOLDOUT = 30;
const SEED = `series:${PROACTIVE_PUSH_SERIES}`;
const PREVIEW_MAX = 120;

export type ProactivePushMode = "off" | "testers" | "on";
export type ProactivePushSkip = "off" | "not_tester" | "no_device";
export type ProactivePushResult =
  | ProactivePushSkip
  | "control"
  | "sent"
  | "record_failed"
  | "send_failed";

export type ProactivePushPlan =
  | { readonly skip: ProactivePushSkip }
  | {
      readonly group: "sent" | "control";
      readonly variant: "a" | "b" | null;
      /** 배정을 `push_campaign_sends`에 남기는가 — 시험 계정 단계는 남기지 않습니다(결과에 섞이지 않게). */
      readonly record: boolean;
      readonly lang: "ko" | "en";
      readonly title: string;
      readonly body: string;
    };

/** 한국어 첫 말 한 줄 — 줄바꿈은 빈칸으로, 120자를 넘으면 자르고 「…」. 말이 없으면 null. */
function previewLine(segments: readonly Segment[]): string | null {
  const line = segments
    .find((segment) => segment.kind === "speech" && segment.text.trim() !== "")
    ?.text.replace(/\s+/gu, " ")
    .trim();
  if (line === undefined) return null;
  const chars = [...line];
  return chars.length <= PREVIEW_MAX ? line : `${chars.slice(0, PREVIEW_MAX - 1).join("")}…`;
}

/** 누구에게 · 어떤 미리보기로 보낼지 — 순수. */
export function proactivePushPlan(input: {
  readonly mode: ProactivePushMode;
  readonly tester: boolean;
  readonly hasDevice: boolean;
  readonly userId: string;
  readonly name: string;
  readonly segments: readonly Segment[];
}): ProactivePushPlan {
  if (input.mode === "off") return { skip: "off" };
  if (input.mode === "testers" && !input.tester) return { skip: "not_tester" };
  if (!input.hasDevice) return { skip: "no_device" };
  const experiment = input.mode === "on";
  const group =
    experiment && inHoldout(SEED, input.userId, PROACTIVE_PUSH_HOLDOUT) ? "control" : "sent";
  const line = previewLine(input.segments);
  const wantsA = variantIndexOf(SEED, input.userId, 2) === 0 && line !== null;
  const title = [...input.name.trim()].slice(0, 100).join("") || "DURU";
  return {
    group,
    variant: group === "control" ? null : wantsA ? "a" : "b",
    record: experiment,
    lang: wantsA ? "ko" : "en",
    title,
    body: wantsA ? line! : `${title} sent you a message`,
  };
}

type Gate = { mode?: unknown; tester?: unknown; hasDevice?: unknown };
const MODES: readonly ProactivePushMode[] = ["off", "testers", "on"];

const succeeded = (status: number) => status >= 200 && status < 300;

/** 스위치를 읽고 → (on이면) 배정 기록 → `send-push`. 스위치를 못 읽으면(옛 DB · 오류) 꺼진 것으로 봅니다. */
export async function pushProactive(
  outbound: Outbound,
  env: RpcEnv,
  input: {
    readonly userId: string;
    readonly characterId: string;
    readonly name: string;
    readonly segments: readonly Segment[];
    readonly now: string;
  },
): Promise<ProactivePushResult> {
  let gate: Gate | null;
  try {
    gate = await callRpc<Gate | null>(outbound, env, "companion_proactive_push_gate", {
      p_user_id: input.userId,
    });
  } catch {
    return "off";
  }
  const mode = MODES.find((candidate) => candidate === gate?.mode);
  if (mode === undefined) return "off";
  const plan = proactivePushPlan({
    mode,
    tester: gate?.tester === true,
    hasDevice: gate?.hasDevice === true,
    userId: input.userId,
    name: input.name,
    segments: input.segments,
  });
  if ("skip" in plan) return plan.skip;

  try {
    // 배정을 먼저 남깁니다 — 기록 없이 나간 알림은 결과에서 셀 수 없어 보내지 않습니다(자동 캠페인과 같은 규칙).
    if (plan.record) {
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
            series: PROACTIVE_PUSH_SERIES,
            segment: PROACTIVE_PUSH_SEGMENT,
            user_id: input.userId,
            group: plan.group,
            variant: plan.variant,
            lang: plan.lang,
            story_step: null,
            title: plan.title,
            body: plan.body,
          },
        ]),
      });
      if (!succeeded(recorded.status)) return "record_failed";
    }
    if (plan.group === "control") return "control";

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
        title: plan.title,
        body: plan.body,
        target: {
          kind: "companion-chat",
          characterId: input.characterId,
          ...(plan.variant === null || !plan.record ? {} : { variant: plan.variant }),
        },
      }),
    });
    if (!succeeded(response.status)) return "send_failed";
    const summary = JSON.parse((await response.text()) || "null") as { sent?: unknown } | null;
    return Number(summary?.sent ?? 0) > 0 ? "sent" : "send_failed";
  } catch {
    return plan.record && plan.group === "control" ? "record_failed" : "send_failed";
  }
}
