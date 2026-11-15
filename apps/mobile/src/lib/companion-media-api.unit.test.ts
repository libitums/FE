import { describe, expect, test } from "vitest";

import { createCompanionMediaRemote, type CompanionMediaDeps } from "./companion-media-api";
import type { AuthRequestOutcome } from "./supabase-transport";

// `unit` 계층(CM-U8): 사진 · 음성 서버 요청 모양 · 실패 처리(ADR-0146 「앱 연결」). 던지지 않습니다.

const config = { url: "https://example.supabase.co", anonKey: "anon" };
const M1 = "33333333-3333-4333-8333-333333333333";
const A1 = "22222222-2222-4222-8222-222222222222";
const NOW = Date.parse("2026-11-15T10:20:00.000Z");
const row = {
  id: M1,
  characterId: "duksu",
  messageId: A1,
  kind: "snapshot",
  status: "pending",
  charge: "photo",
  cost: 35,
  path: null,
  mime: null,
  aspect: null,
  failure: null,
  aiGenerated: true,
  engine: null,
  model: null,
  createdAt: "2026-11-15T10:19:00.000Z",
  finishedAt: null,
};

function setup(reply: AuthRequestOutcome | (() => never), over: Partial<CompanionMediaDeps> = {}) {
  const requests: {
    url: string;
    init: { method: string; headers: Record<string, string>; body?: string };
  }[] = [];
  const deps: CompanionMediaDeps = {
    token: async () => "tok",
    config: () => config,
    post: async (build) => {
      requests.push(build(config) as never);
      return typeof reply === "function" ? reply() : reply;
    },
    now: () => NOW,
    ...over,
  };
  return { media: createCompanionMediaRemote(deps), requests };
}

const ok = (status: number, body: unknown): AuthRequestOutcome => ({
  ok: true,
  status,
  bodyText: JSON.stringify(body),
});

describe("요청", () => {
  test("CM-U8a 스냅샷 · 음성은 Edge Function에 message_id만, 토큰으로", async () => {
    const { media, requests } = setup(ok(202, { media: row, cached: false }));
    const result = await media.request("snapshot", A1);
    expect(result).toMatchObject({ kind: "accepted", cached: false, media: { id: M1 } });
    expect(requests[0]?.url).toBe(`${config.url}/functions/v1/companion-snapshot`);
    expect(requests[0]?.init.method).toBe("POST");
    expect(requests[0]?.init.headers["Authorization"]).toBe("Bearer tok");
    expect(JSON.parse(requests[0]?.init.body ?? "")).toEqual({ message_id: A1 });
    await media.request("voice", A1);
    expect(requests[1]?.url).toBe(`${config.url}/functions/v1/companion-voice`);
  });

  test("CM-U8b 오류 상태는 해석기로, 연결 실패 · 토큰 없음 · 던짐은 failed", async () => {
    expect(
      await setup(
        ok(429, { error: "attempt_limit", detail: { resetsAt: "2026-11-16T00:00:00.000Z" } }),
      ).media.request("snapshot", A1),
    ).toMatchObject({ kind: "refused", notice: "limit" });
    expect(await setup({ ok: false, reason: "network" }).media.request("snapshot", A1)).toEqual({
      kind: "failed",
    });
    const noToken = setup(ok(202, {}), { token: async () => null });
    expect(await noToken.media.request("voice", A1)).toEqual({ kind: "failed" });
    expect(noToken.requests).toHaveLength(0);
    const throws = setup(() => {
      throw new Error("boom");
    });
    expect(await throws.media.request("voice", A1)).toEqual({ kind: "failed" });
  });
});

describe("상태 · 서명 · 지갑", () => {
  test("CM-U8c 상태는 RPC companion_get_media(p_ids · p_message_ids)", async () => {
    const { media, requests } = setup(ok(200, [row]));
    expect(await media.load({ ids: [M1] })).toHaveLength(1);
    expect(requests[0]?.url).toBe(`${config.url}/rest/v1/rpc/companion_get_media`);
    expect(JSON.parse(requests[0]?.init.body ?? "")).toEqual({ p_ids: [M1], p_message_ids: null });
    await media.load({ messageIds: [A1] });
    expect(JSON.parse(requests[1]?.init.body ?? "")).toEqual({ p_ids: null, p_message_ids: [A1] });
    expect(await setup(ok(500, {})).media.load({ ids: [M1] })).toBeNull();
    expect(await setup({ ok: false, reason: "network" }).media.load({ ids: [M1] })).toBeNull();
  });

  test("CM-U8d 서명 URL은 Storage object/sign(하루), 결과는 Storage 주소에 이음", async () => {
    const { media, requests } = setup(
      ok(200, { signedURL: "/object/sign/companion-media/u/a.png?token=t" }),
    );
    expect(await media.sign("u/a.png")).toBe(
      `${config.url}/storage/v1/object/sign/companion-media/u/a.png?token=t`,
    );
    expect(requests[0]?.url).toBe(`${config.url}/storage/v1/object/sign/companion-media/u/a.png`);
    expect(JSON.parse(requests[0]?.init.body ?? "")).toEqual({ expiresIn: 86_400 });
    expect(await setup(ok(400, { error: "x" })).media.sign("u/a.png")).toBeNull();
  });

  test("CM-U8e 지갑은 RPC companion_get_wallet의 합", async () => {
    const { media, requests } = setup(ok(200, { sub: 0, grant: 15, paid: 100 }));
    expect(await media.balance()).toBe(115);
    expect(requests[0]?.url).toBe(`${config.url}/rest/v1/rpc/companion_get_wallet`);
    expect(await setup({ ok: false, reason: "unconfigured" }).media.balance()).toBeNull();
  });
});
