import { describe, expect, test } from "vitest";

import { createCompanionRemote, type CompanionRemoteDeps } from "./companion-api";

// `unit` 계층(SA-F1 ~ F2, state-data): 추천 친구 RPC(20261216, ADR-0164) 요청 모양 · 실패 처리. 던지지 않습니다.

const config = { url: "https://example.supabase.co", anonKey: "anon" };

function setup(reply: { status: number; bodyText: string } | "throw" | "signed-out") {
  const requests: { url: string; body: unknown }[] = [];
  const deps: CompanionRemoteDeps = {
    token: async () => (reply === "signed-out" ? null : "tok"),
    config: () => config,
    post: async (build) => {
      const { url, init } = build(config);
      requests.push({ url, body: JSON.parse(init.body ?? "null") as unknown });
      if (reply === "throw" || reply === "signed-out") throw new Error("network");
      return { ok: true, ...reply };
    },
    stream: () => ({ open: () => ({ streamId: "s", cancel: () => undefined }), dispose: () => {} }),
    now: () => 1_000,
  };
  return { remote: createCompanionRemote(deps), requests };
}

describe("SA-F1 companion_friends()", () => {
  test("RPC를 인자 없이 부르고 보이는 친구를 푼다", async () => {
    const body = JSON.stringify({ friends: [{ id: "daeun", romanceTier: "standard" }] });
    const { remote, requests } = setup({ status: 200, bodyText: body });
    expect(await remote.friends?.visible()).toEqual([{ id: "daeun", romanceTier: "standard" }]);
    expect(requests).toEqual([
      { url: "https://example.supabase.co/rest/v1/rpc/companion_friends", body: {} },
    ]);
  });

  test("실패 · 로그아웃 · 틀린 본문이면 null", async () => {
    expect(await setup("throw").remote.friends?.visible()).toBeNull();
    expect(await setup("signed-out").remote.friends?.visible()).toBeNull();
    expect(await setup({ status: 404, bodyText: "" }).remote.friends?.visible()).toBeNull();
    expect(await setup({ status: 200, bodyText: "[]" }).remote.friends?.visible()).toBeNull();
  });
});

describe("SA-F2 companion_ack_adult()", () => {
  test("RPC를 인자 없이 부르고 동의 결과를 푼다", async () => {
    const ok = setup({ status: 200, bodyText: JSON.stringify({ ok: true, adultAck: true }) });
    expect(await ok.remote.friends?.ackAdult()).toBe(true);
    expect(ok.requests).toEqual([
      { url: "https://example.supabase.co/rest/v1/rpc/companion_ack_adult", body: {} },
    ]);
    const no = setup({ status: 200, bodyText: JSON.stringify({ ok: false, adultAck: false }) });
    expect(await no.remote.friends?.ackAdult()).toBe(false);
  });

  test("실패면 null", async () => {
    expect(await setup("throw").remote.friends?.ackAdult()).toBeNull();
    expect(await setup({ status: 500, bodyText: "{}" }).remote.friends?.ackAdult()).toBeNull();
  });
});
