import { describe, expect, test, vi } from "vitest";

import type { AuthRequestOutcome } from "./supabase-transport";
import {
  createTicketPurchaseClient,
  ticketPurchaseFrom,
  ticketRequestId,
} from "./ticket-purchase-api";

// `unit` 계층: 학습 티켓을 엽전으로 사기(서버 RPC `companion_buy_ticket`, 사용자 결정 2026-11-23). 던지지 않습니다.

const ok = (body: unknown): AuthRequestOutcome =>
  ({ ok: true, status: 200, bodyText: JSON.stringify(body) }) as AuthRequestOutcome;

describe("응답 읽기", () => {
  test("TPA1. bought · already는 잔액과 값, short는 모자란 수까지 읽는다", () => {
    expect(
      ticketPurchaseFrom(JSON.stringify({ result: "bought", price: 20, wallet: { balance: 80 } })),
    ).toEqual({ result: "bought", price: 20, shortBy: null, balance: 80 });
    expect(
      ticketPurchaseFrom(
        JSON.stringify({ result: "short", price: 20, shortBy: 8, wallet: { balance: 12 } }),
      ),
    ).toEqual({ result: "short", price: 20, shortBy: 8, balance: 12 });
    expect(
      ticketPurchaseFrom(JSON.stringify({ result: "already", price: 20, wallet: {} })),
    ).toEqual({
      result: "already",
      price: 20,
      shortBy: null,
      balance: null,
    });
  });

  test("TPA2. 모양이 틀리면 null", () => {
    expect(ticketPurchaseFrom(null)).toBeNull();
    expect(ticketPurchaseFrom("")).toBeNull();
    expect(ticketPurchaseFrom("not json")).toBeNull();
    expect(ticketPurchaseFrom(JSON.stringify({ result: "free" }))).toBeNull();
  });
});

describe("요청", () => {
  test("TPA3. 로그인이 없으면 signed-out — 서버를 부르지 않는다", async () => {
    const post = vi.fn<(build: unknown) => Promise<AuthRequestOutcome>>();
    const client = createTicketPurchaseClient({ token: async () => null, post });
    expect(await client.buy("id-1")).toBe("signed-out");
    expect(post).not.toHaveBeenCalled();
  });

  test("TPA4. 요청 id를 실어 RPC를 부르고 응답을 읽는다", async () => {
    const calls: { url: string; body: unknown }[] = [];
    const client = createTicketPurchaseClient({
      token: async () => "token",
      post: async (build) => {
        const { url, init } = build({ url: "https://x.supabase.co", anonKey: "anon" } as never);
        calls.push({ url, body: JSON.parse(String(init.body)) });
        return ok({ result: "bought", price: 20, wallet: { balance: 5 } });
      },
    });
    expect(await client.buy("id-1")).toEqual({
      result: "bought",
      price: 20,
      shortBy: null,
      balance: 5,
    });
    expect(calls).toEqual([
      {
        url: "https://x.supabase.co/rest/v1/rpc/companion_buy_ticket",
        body: { p_request_id: "id-1" },
      },
    ]);
  });

  test("TPA5. 실패 응답 · 던짐은 null", async () => {
    const failed = createTicketPurchaseClient({
      token: async () => "token",
      post: async () => ({ ok: true, status: 500, bodyText: "" }) as AuthRequestOutcome,
    });
    expect(await failed.buy("id-1")).toBeNull();
    const thrown = createTicketPurchaseClient({
      token: async () => "token",
      post: async () => {
        throw new Error("offline");
      },
    });
    expect(await thrown.buy("id-1")).toBeNull();
  });
});

test("TPA6. 요청 id는 UUID v4 모양이고 부를 때마다 다르다", () => {
  const first = ticketRequestId();
  expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(ticketRequestId()).not.toBe(first);
  expect(ticketRequestId(() => 0)).toBe("00000000-0000-4000-8000-000000000000");
});
