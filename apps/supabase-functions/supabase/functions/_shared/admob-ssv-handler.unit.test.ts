import { describe, expect, test, vi } from "vitest";
import { createAdmobSsvHandler } from "./admob-ssv-handler.ts";
import { signedQuery, testSigner } from "./admob-ssv.test-support.ts";
import type { AdmobKeys, AdmobSsvEnv, AdmobSsvLogEntry } from "./admob-ssv.contract.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

// AdMob SSV 처리기(ADR-0209) — 서명 확인 뒤에만 DB RPC 한 번. 상태 코드가 Google 재전송을 정한다(2xx가 아니면 다시 보냄).
const env: AdmobSsvEnv = {
  supabaseUrl: "https://db.example",
  supabaseServiceRoleKey: "sb_secret_x",
  adUnitIds: ["1234567890"],
};
const user = "00000000-0000-4000-8000-0000000000a1";
const requestId = "11111111-1111-4111-8111-111111111111";

async function setup(
  options: {
    env?: AdmobSsvEnv | null;
    rpcStatus?: number;
    rpcBody?: string;
    keys?: AdmobKeys;
  } = {},
) {
  const signer = await testSigner();
  const calls: OutboundRequest[] = [];
  const log = vi.fn<(entry: AdmobSsvLogEntry) => void>();
  const keys: AdmobKeys = options.keys ?? {
    keyFor: async (keyId) => (keyId === "3335741209" ? signer.publicKeyBase64 : null),
  };
  const handler = createAdmobSsvHandler({
    env: options.env === undefined ? env : options.env,
    outbound: async (call) => {
      calls.push(call);
      return {
        status: options.rpcStatus ?? 200,
        text: async () => options.rpcBody ?? '{"outcome":"granted"}',
      };
    },
    keys,
    log,
  });
  const get = (query: string, method = "GET") =>
    handler(new Request(`https://fn.example/admob-ssv?${query}`, { method }));
  return { signer, calls, log, get };
}

describe("AS-H1 정상 콜백", () => {
  test("서명이 맞으면 RPC 한 번(서버 키 · 값 넷) → 200 · DB 결과", async () => {
    const { signer, calls, get, log } = await setup();
    const response = await get(
      await signedQuery(signer.sign, { customData: requestId, userId: user }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: "granted" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: "https://db.example/rest/v1/rpc/ad_ticket_grant",
      method: "POST",
      headers: { apikey: "sb_secret_x" },
    });
    expect(JSON.parse(calls[0]!.body!)).toEqual({
      p_user_id: user,
      p_request_id: requestId,
      p_transaction_id: "tx-0001",
      p_ad_unit: "1234567890",
    });
    expect(log).toHaveBeenCalledWith({ event: "admob_ssv", status: 200, outcome: "granted" });
  });

  test("DB가 거절해도(상한 · 중복 · 대상 아님) 200 — 다시 보내도 같다", async () => {
    const { signer, get } = await setup({ rpcBody: '{"outcome":"limit"}' });
    const response = await get(
      await signedQuery(signer.sign, { customData: requestId, userId: user }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: "limit" });
  });
});

describe("AS-H2 거절", () => {
  test("서명이 틀리면 401 · DB를 부르지 않는다", async () => {
    const { signer, get, calls } = await setup();
    const forged = await signedQuery(
      signer.sign,
      { customData: requestId, userId: user },
      (content) => content.replace("tx-0001", "tx-9999"),
    );
    expect((await get(forged)).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  test("모르는 key_id는 500(키 교체 직후일 수 있어 다시 받는다)", async () => {
    const { signer, get, calls } = await setup();
    const query = await signedQuery(signer.sign, {
      customData: requestId,
      userId: user,
      keyId: "1",
    });
    expect((await get(query)).status).toBe(500);
    expect(calls).toHaveLength(0);
  });

  test("쿼리가 모자라거나 custom_data · user_id가 uuid가 아니면 400", async () => {
    const { signer, get, calls } = await setup();
    expect((await get("")).status).toBe(400);
    expect((await get(await signedQuery(signer.sign, { userId: user }))).status).toBe(400);
    expect(
      (await get(await signedQuery(signer.sign, { customData: "x", userId: user }))).status,
    ).toBe(400);
    expect(
      (await get(await signedQuery(signer.sign, { customData: requestId, userId: "42" }))).status,
    ).toBe(400);
    expect(calls).toHaveLength(0);
  });

  test("거래 id · 광고 단위가 200자를 넘으면 400(DB까지 가지 않는다)", async () => {
    const { signer, get, calls } = await setup();
    const long = "x".repeat(201);
    expect(
      (
        await get(
          await signedQuery(signer.sign, {
            customData: requestId,
            userId: user,
            transactionId: long,
          }),
        )
      ).status,
    ).toBe(400);
    expect(calls).toHaveLength(0);
  });

  test("목록 밖의 광고 단위는 403", async () => {
    const { signer, get, calls } = await setup({ env: { ...env, adUnitIds: ["555"] } });
    const query = await signedQuery(signer.sign, { customData: requestId, userId: user });
    expect((await get(query)).status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  test("GET이 아니면 405", async () => {
    const { get } = await setup();
    expect((await get("", "POST")).status).toBe(405);
  });
});

describe("AS-H3 재전송을 받아야 하는 실패는 500", () => {
  test("환경이 없으면 500", async () => {
    const { get } = await setup({ env: null });
    expect((await get("a=1")).status).toBe(500);
  });

  test("키 목록을 못 읽으면 500", async () => {
    const { signer, get } = await setup({
      keys: {
        keyFor: async () => {
          throw new Error("down");
        },
      },
    });
    expect(
      (await get(await signedQuery(signer.sign, { customData: requestId, userId: user }))).status,
    ).toBe(500);
  });

  test("DB가 2xx가 아니거나 닿지 않으면 500", async () => {
    const { signer, get } = await setup({ rpcStatus: 503 });
    expect(
      (await get(await signedQuery(signer.sign, { customData: requestId, userId: user }))).status,
    ).toBe(500);
  });
});
