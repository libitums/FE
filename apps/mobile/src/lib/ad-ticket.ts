// 광고 보고 티켓 1장(ADR-0208)의 순수 규칙 — 시안 A1 ~ A5 상태 기계 · 지급 확인 간격 · 실험군 · UTC 오프셋.
// 상태 전이는 `adTicketStep` 하나가 정하고, 같이 낼 이벤트와 「원장에 1장」 여부를 함께 돌려줍니다 — 결선(훅)은 실행만 합니다.
// 늦게 도착한 결과(다른 단계에서 온 광고 · 서버 응답)는 무시합니다.

import type { AdTicketInput, AdTicketState, AdTicketStep } from "./ad-ticket.contract";

export const adTicketHidden: AdTicketState = { kind: "hidden" };
/** 광고를 불러오는 데 이보다 오래 걸리면 A5(시안 A2 메모 「8초 넘으면 A5」). */
export const adTicketLoadTimeoutMs = 8_000;
/** A5 뒤 버튼이 다시 서기까지(시안 A5 메모 「1분 뒤 버튼 다시」). */
export const adTicketRetryMs = 60_000;

/** 광고를 닫은 뒤 서버 지급(SSV)을 다시 읽는 간격 — 합 21.5초. 다하면 실패 안내. */
const pollDelaysMs: readonly number[] = [1_000, 1_500, 2_000, 3_000, 4_000, 5_000, 5_000];

const stay = (state: AdTicketState): AdTicketStep => ({ state, event: null, grant: false });

export function adTicketStep(state: AdTicketState, input: AdTicketInput): AdTicketStep {
  const busy = state.kind === "busy" ? state : null;
  switch (input.type) {
    case "status": {
      if (busy !== null || state.kind === "granted") return stay(state);
      const s = input.status;
      if (s === null || !s.enabled || !s.eligible) return stay(adTicketHidden);
      if (s.left <= 0) return stay({ kind: "limit", cap: s.cap });
      return stay({ kind: "offer", left: s.left, cap: s.cap, failed: false });
    }
    case "tap":
      if (state.kind !== "offer") return stay(state);
      return stay({
        kind: "busy",
        step: "starting",
        left: state.left,
        cap: state.cap,
        requestId: null,
        polls: 0,
      });
    case "started": {
      if (busy?.step !== "starting") return stay(state);
      const start = input.start;
      if (start === null) {
        return {
          state: { kind: "offer", left: busy.left, cap: busy.cap, failed: true },
          event: { name: "ad_ticket_failed", reason: "start_failed" },
          grant: false,
        };
      }
      if (start.result === "blocked") return stay(adTicketHidden);
      if (start.result === "limit") {
        return {
          state: { kind: "limit", cap: start.cap },
          event: { name: "ad_ticket_failed", reason: "limit" },
          grant: false,
        };
      }
      return {
        state: {
          ...busy,
          step: "loading",
          requestId: start.requestId,
          left: start.left,
          cap: start.cap,
        },
        event: { name: "ad_ticket_started" },
        grant: false,
      };
    }
    case "loaded":
      if (busy?.step !== "loading") return stay(state);
      if (input.load === "loaded") return stay({ ...busy, step: "showing" });
      return {
        state: {
          kind: "no-fill",
          left: busy.left,
          cap: busy.cap,
          retryAtMs: input.nowMs + adTicketRetryMs,
        },
        event: {
          name: "ad_ticket_failed",
          reason: input.load === "timeout" ? "load_timeout" : "no_fill",
        },
        grant: false,
      };
    case "shown":
      if (busy?.step !== "showing") return stay(state);
      if (input.show === "earned") {
        return {
          state: { ...busy, step: "confirming", polls: 0 },
          event: { name: "ad_ticket_completed" },
          grant: false,
        };
      }
      return {
        state: {
          kind: "offer",
          left: busy.left,
          cap: busy.cap,
          failed: input.show === "failed",
        },
        event: {
          name: "ad_ticket_failed",
          reason: input.show === "failed" ? "show_failed" : "closed_early",
        },
        grant: false,
      };
    case "polled": {
      if (busy?.step !== "confirming") return stay(state);
      const request = input.status?.request ?? null;
      if (request?.status === "granted") {
        const left = input.status?.left ?? 0;
        return {
          state: { kind: "granted", left },
          event: { name: "ad_ticket_granted", left: String(left) },
          grant: true,
        };
      }
      if (request?.status === "rejected") {
        return request.reason === "limit"
          ? {
              state: { kind: "limit", cap: input.status?.cap ?? busy.cap },
              event: { name: "ad_ticket_failed", reason: "limit" },
              grant: false,
            }
          : {
              state: adTicketHidden,
              event: { name: "ad_ticket_failed", reason: "rejected" },
              grant: false,
            };
      }
      const polls = busy.polls + 1;
      if (adTicketPollDelayMs(polls) === null) {
        return {
          state: { kind: "offer", left: busy.left, cap: busy.cap, failed: true },
          event: { name: "ad_ticket_failed", reason: "confirm_timeout" },
          grant: false,
        };
      }
      return stay({ ...busy, polls });
    }
    case "retry":
      if (state.kind !== "no-fill") return stay(state);
      return stay({ kind: "offer", left: state.left, cap: state.cap, failed: false });
  }
}

/** `polls`번 물은 뒤 다음 물음까지 기다릴 시간 — 다했으면 null. */
export function adTicketPollDelayMs(polls: number): number | null {
  return pollDelaysMs[polls] ?? null;
}

/**
 * PostHog `/flags/?v=2` 응답에서 이 회원의 실험군을 읽습니다. 플래그가 켜졌고 변형이 없거나(불리언 50% 출시) `test`면 실험군,
 * 그 밖(꺼짐 · 대조 변형 · 플래그 없음 · 읽지 못함)은 대조군 — 기본 꺼짐입니다.
 */
export function adTicketArmFrom(bodyText: string | null, flagKey: string): "test" | "control" {
  if (bodyText === null) return "control";
  try {
    const body = JSON.parse(bodyText) as { flags?: Record<string, unknown> } | null;
    const flag = body?.flags?.[flagKey] as { enabled?: unknown; variant?: unknown } | undefined;
    if (flag?.enabled !== true) return "control";
    return flag.variant === undefined || flag.variant === null || flag.variant === "test"
      ? "test"
      : "control";
  } catch {
    return "control";
  }
}

/** 서버 「하루」의 기준 — UTC보다 앞선 분(UTC+7 = 420). Android PrimJS에 `Intl`이 없어 시간대 이름 대신 씁니다. */
export function utcOffsetMinutes(date: Date): number {
  const offset = -date.getTimezoneOffset();
  return offset === 0 ? 0 : offset;
}
