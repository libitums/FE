import { expect, test } from "vitest";

import { createCompanionRemote, type CompanionRemoteDeps } from "./companion-api";

// `unit` 계층(CP-U11, ADR-0162 D5): 먼저 만나기는 RPC 둘(`companion_early_access_offers` · `companion_unlock_early`)을 토큰으로 부르고
// 응답을 풀어 돌려준다. 로그인이 없거나 실패 응답이면 null, 던지지 않는다.

const config = { url: "https://sb.test", anonKey: "anon" };

function setup(bodyText: string, token: string | null = "tok", status = 200) {
  const requests: { url: string; init: { body?: string } }[] = [];
  const deps = {
    token: async () => token,
    config: () => config,
    post: async (build) => {
      requests.push(build(config) as never);
      return { ok: true, status, bodyText };
    },
    stream: () => ({
      open: () => ({ streamId: "s", cancel: () => undefined }),
      dispose: () => undefined,
    }),
    now: () => 0,
  } as CompanionRemoteDeps;
  return { remote: createCompanionRemote(deps), requests };
}

test("CP-U11 제안 목록은 companion_early_access_offers를 인자 없이 부른다", async () => {
  const env = setup(JSON.stringify([{ characterId: "mina", price: 100, endsAt: null }]));
  expect(await env.remote.earlyAccess?.offers()).toEqual([
    { characterId: "mina", price: 100, endsAt: null },
  ]);
  expect(env.requests[0]?.url).toBe(`${config.url}/rest/v1/rpc/companion_early_access_offers`);
  expect(JSON.parse(env.requests[0]?.init.body ?? "null")).toEqual({});
});

test("CP-U11 열기는 companion_unlock_early(p_character_id)를 부르고 결과 · 잔액을 푼다", async () => {
  const env = setup(JSON.stringify({ result: "unlocked", wallet: { balance: 220 } }));
  expect(await env.remote.earlyAccess?.unlock("jaemin")).toEqual({
    result: "unlocked",
    shortBy: null,
    balance: 220,
  });
  expect(env.requests[0]?.url).toBe(`${config.url}/rest/v1/rpc/companion_unlock_early`);
  expect(JSON.parse(env.requests[0]?.init.body ?? "null")).toEqual({ p_character_id: "jaemin" });
});

test("CP-U11 로그인이 없거나 실패 응답이면 null", async () => {
  expect(await setup("[]", null).remote.earlyAccess?.offers()).toBeNull();
  expect(await setup("{}", "tok", 500).remote.earlyAccess?.unlock("mina")).toBeNull();
});
