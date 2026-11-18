import { describe, expect, test } from "vitest";

import { createCompanionRemote, type CompanionRemoteDeps } from "./companion-api";

// `unit` 계층(RF-U60 · U61): 추천 친구 RPC 요청 모양 — `companion_friends` · `companion_ack_adult`를 빈 본문으로 부르고, 없는 RPC(404) ·
// 끊김은 null이다(앱은 친구를 보이지 않습니다).

const config = { url: "https://example.supabase.co", anonKey: "anon" };

function setup(reply: (url: string) => { ok: boolean; status: number; bodyText: string }) {
  const urls: string[] = [];
  const bodies: (string | undefined)[] = [];
  const deps: CompanionRemoteDeps = {
    token: async () => "tok",
    config: () => config,
    post: async (build) => {
      const built = build(config);
      urls.push(built.url);
      bodies.push(built.init.body);
      return reply(built.url) as never;
    },
    stream: () => ({
      open: () => ({ streamId: "s", cancel: () => undefined }),
      dispose: () => undefined,
    }),
    now: () => 1,
  };
  return { remote: createCompanionRemote(deps), urls, bodies };
}

describe("추천 친구 RPC (RF-U60 · U61)", () => {
  test("RF-U60 companion_friends · companion_ack_adult를 빈 본문으로 부르고 답을 푼다", async () => {
    const { remote, urls, bodies } = setup((url) => ({
      ok: true,
      status: 200,
      bodyText: url.endsWith("companion_friends")
        ? JSON.stringify({ friends: [{ id: "daeun", romanceTier: "standard" }] })
        : JSON.stringify({ ok: true, adultAck: true }),
    }));
    expect(await remote.friends?.()).toEqual([{ id: "daeun", romanceTier: "standard" }]);
    expect(await remote.ackAdult?.()).toBe(true);
    expect(urls).toEqual([
      "https://example.supabase.co/rest/v1/rpc/companion_friends",
      "https://example.supabase.co/rest/v1/rpc/companion_ack_adult",
    ]);
    expect(bodies).toEqual(["{}", "{}"]);
  });

  test("RF-U61 없는 RPC(404)면 null", async () => {
    const { remote } = setup(() => ({ ok: true, status: 404, bodyText: "{}" }));
    expect(await remote.friends?.()).toBeNull();
    expect(await remote.ackAdult?.()).toBeNull();
  });
});
