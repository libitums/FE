// 턴이 끝난 모양 → 방이 할 일입니다(오류 설계 1단계, ADR-0138) — 순수. 서버 오류 코드 표는
// `packages/companion-contract/src/error-codes.ts`가 정본입니다(값만 맞추고 import하지 않습니다 — 번들).

import type { ChatInputBlock } from "./chat-source.contract";
import type { ChatSendFailureNotice } from "./chat-remote.contract";
import { sendFailureOf } from "./companion-parse";
import type { TurnState } from "./companion-turn";

export type TurnOutcome =
  | { readonly kind: "ok" }
  /**
   * 서버가 내 글을 받았다고 볼 수 없음 — 흐린 말풍선 + Not sent, 까닭이 있으면 회색 줄도. `check`면 받았는지 모르는 경우라
   * 기록을 한 번 읽어 서버에 그 글이 있으면 서버 판으로 바꿉니다(start 전 끊김 · 중복 · 진행 중, 리뷰 W4).
   */
  | {
      readonly kind: "unsent";
      readonly notice: ChatSendFailureNotice | null;
      readonly check: boolean;
    }
  /** 서버는 받았는데 답이 끝까지 안 옴 — 기록을 다시 읽어 채웁니다. */
  | { readonly kind: "recover" }
  | { readonly kind: "notice"; readonly notice: ChatSendFailureNotice }
  | { readonly kind: "block"; readonly block: ChatInputBlock };

const RECEIVED_THEN_FAILED: Readonly<Record<string, ChatSendFailureNotice>> = {
  guardrail_blocked: "cant-reply",
};

// 사전 오류 가운데 Not sent로 둘 것 — 다시 보내면 될 수 있는 것과 그 까닭 줄. check는 받았는지 모르는 것
// (같은 client_message_id가 이미 있음 · 그 턴이 아직 돎)이라 기록으로 확인합니다.
const UNSENT: Readonly<Record<string, Omit<TurnOutcome & { kind: "unsent" }, "kind">>> = {
  internal_error: { notice: null, check: false },
  rate_limited: { notice: "rate-limited", check: false },
  invalid_session: { notice: "signed-out", check: false },
  unsupported_contract_version: { notice: "update-required", check: false },
  turn_in_progress: { notice: null, check: true },
  duplicate_message: { notice: null, check: true },
  not_latest_message: { notice: null, check: true },
};

const codeOf = (detail: string | null): string | null => {
  try {
    const raw = JSON.parse(detail ?? "") as unknown;
    const error =
      typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>).error : null;
    return typeof error === "string" ? error : null;
  } catch {
    return null;
  }
};

function preStreamOutcome(detail: string | null, now: number): TurnOutcome {
  const code = codeOf(detail);
  // 본문이 서버 모양이 아니면(게이트웨이 오류 등) 서버가 받지 못한 것으로 봅니다.
  if (code === null) return { kind: "unsent", notice: null, check: true };
  const unsent = UNSENT[code];
  if (unsent !== undefined) return { kind: "unsent", ...unsent };
  const failure = sendFailureOf(detail, now);
  switch (failure.kind) {
    case "blocked":
      return { kind: "block", block: { kind: "temporarily-blocked", until: failure.until } };
    case "usage-limit":
      return { kind: "block", block: { kind: "usage-time-limit", resetsAt: failure.resetsAt } };
    case "age-restricted":
      return { kind: "block", block: { kind: "age-restricted" } };
    case "no-credits":
    case "not-available":
      return { kind: "notice", notice: failure.kind };
    default:
      return { kind: "notice", notice: "server-error" };
  }
}

export function turnOutcomeOf(
  turn: TurnState,
  reason: string,
  detail: string | null,
  now: number,
): TurnOutcome {
  if (turn.failure?.kind === "stream-error")
    return { kind: "notice", notice: RECEIVED_THEN_FAILED[turn.failure.code] ?? "reply-failed" };
  if (turn.finished) return { kind: "ok" };
  if (reason === "http-error") return preStreamOutcome(detail, now);
  // 서버가 start를 보냈으면 내 글은 서버에 있고 답은 서버가 끝까지 만들어 둡니다(ADR-0134 D2). start 전이면 받았는지
  // 모릅니다 — 서버는 글을 저장한 뒤 start를 보내므로 그 사이에 끊겼을 수 있습니다.
  return turn.userMessageId === null
    ? { kind: "unsent", notice: null, check: true }
    : { kind: "recover" };
}
