// 학습 티켓을 엽전으로 사기(사용자 결정 2026-11-23) — 서버 RPC `companion_buy_ticket`(20261231)이 엽전만 빼고, 티켓은 앱 원장에
// 더합니다(`learning-tickets`). 누를 때마다 새 요청 id를 실어, 응답을 잃어 다시 보내도 서버가 한 번만 뺍니다.
// **던지지 않습니다** — 로그인이 없으면 `signed-out`, 그 밖의 실패 · 틀린 응답은 null.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { bearerHeaders } from "./auth-request";
import { currentAccessToken } from "./progress-api";
import { isSuccessStatus, send, type AuthRequestOutcome } from "./supabase-transport";

export type TicketPurchase = {
  /** `already` — 같은 요청 id로 이미 샀습니다(다시 보낸 경우). 산 것과 같게 다룹니다. */
  readonly result: "bought" | "already" | "short";
  readonly price: number;
  /** `short`일 때 모자란 엽전 수. 아니면 null. */
  readonly shortBy: number | null;
  /** 서버 지갑 잔액 — 응답에 없으면 null. */
  readonly balance: number | null;
};

export type TicketPurchaseDeps = {
  readonly token: () => Promise<string | null>;
  readonly post: (
    build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  ) => Promise<AuthRequestOutcome>;
};

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

const results: readonly TicketPurchase["result"][] = ["bought", "already", "short"];

export function ticketPurchaseFrom(bodyText: string | null): TicketPurchase | null {
  if (bodyText === null || bodyText.trim() === "") return null;
  try {
    const raw = JSON.parse(bodyText) as Record<string, unknown> | null;
    const result = results.find((value) => value === raw?.result);
    const price = count(raw?.price);
    if (result === undefined || price === null) return null;
    const wallet = raw?.wallet as Record<string, unknown> | null | undefined;
    return {
      result,
      price,
      shortBy: result === "short" ? count(raw?.shortBy) : null,
      balance: count(wallet?.balance),
    };
  } catch {
    return null;
  }
}

export function createTicketPurchaseClient(deps: TicketPurchaseDeps): {
  readonly buy: (requestId: string) => Promise<TicketPurchase | "signed-out" | null>;
} {
  return {
    buy: async (requestId) => {
      try {
        const token = await deps.token();
        if (token === null) return "signed-out";
        const outcome = await deps.post((config) => ({
          url: `${config.url}/rest/v1/rpc/companion_buy_ticket`,
          init: {
            method: "POST",
            headers: bearerHeaders(config, token),
            body: JSON.stringify({ p_request_id: requestId }),
          },
        }));
        return outcome.ok && isSuccessStatus(outcome.status)
          ? ticketPurchaseFrom(outcome.bodyText)
          : null;
      } catch {
        return null;
      }
    },
  };
}

/** 누를 때마다 새 요청 id(UUID v4 모양). Lynx에 `crypto.randomUUID`가 없어 난수로 짓습니다 — 한 사람 안에서만 겹치지 않으면 됩니다. */
export function ticketRequestId(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 32; i += 1) {
    let digit = Math.floor(random() * 16) % 16;
    if (i === 12) digit = 4;
    if (i === 16) digit = 8 + (digit % 4);
    out += digit.toString(16);
    if (i === 7 || i === 11 || i === 15 || i === 19) out += "-";
  }
  return out;
}

/** 앱 결선 — 저장된 로그인 · 설정. background 스레드(효과 · 탭)에서만 부릅니다. */
export const ticketPurchaseClient = () =>
  createTicketPurchaseClient({
    token: () => currentAccessToken(),
    post: (build) => send(build, true),
  });
