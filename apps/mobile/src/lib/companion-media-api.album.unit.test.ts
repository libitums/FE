import { describe, expect, test } from "vitest";

import { createCompanionMediaRemote, type CompanionMediaDeps } from "./companion-media-api";
import type { AuthRequestOutcome } from "./supabase-transport";

// `unit` 계층(AL-U8): 앨범 · 다시 만들기 · 내 모습 저장의 서버 요청 모양(ADR-0150). 던지지 않습니다.

const config = { url: "https://example.supabase.co", anonKey: "anon" };
const A1 = "22222222-2222-4222-8222-222222222222";
const NOW = Date.parse("2026-11-15T10:20:00.000Z");

function setup(reply: AuthRequestOutcome) {
  const bodies: { url: string; body: unknown }[] = [];
  const deps: CompanionMediaDeps = {
    token: async () => "tok",
    config: () => config,
    post: async (build) => {
      const { url, init } = build(config);
      bodies.push({ url, body: JSON.parse(String(init.body ?? "null")) });
      return reply;
    },
    now: () => NOW,
  };
  return { media: createCompanionMediaRemote(deps), bodies };
}

const ok = (status: number, bodyText: string): AuthRequestOutcome => ({
  ok: true,
  status,
  bodyText,
});

describe("AL-U8 앨범 · 다시 만들기 · 내 모습", () => {
  test("AL-U8a 다시 만들기는 again: true를 더한다(아니면 message_id만)", async () => {
    const { media, bodies } = setup(ok(500, ""));
    await media.request("snapshot", A1, true);
    await media.request("voice", A1, false);
    expect(bodies.map((b) => b.body)).toEqual([
      { message_id: A1, again: true },
      { message_id: A1 },
    ]);
  });

  test("AL-U8b 앨범은 companion_list_media에 인물 · 커서(ISO) · 쪽 크기, 종류는 null", async () => {
    const { media, bodies } = setup(ok(200, JSON.stringify({ items: [], hasMore: false })));
    expect(await media.list?.({ characterId: "duksu", before: NOW, limit: 30 })).toEqual({
      items: [],
      hasMore: false,
    });
    expect(bodies[0]).toEqual({
      url: `${config.url}/rest/v1/rpc/companion_list_media`,
      body: {
        p_character_id: "duksu",
        p_kind: null,
        p_before: "2026-11-15T10:20:00.000Z",
        p_limit: 30,
      },
    });
  });

  test("AL-U8c 내 모습 저장은 companion_save_profile(p_snapshot_self), 204면 true · 실패면 false", async () => {
    const saved = setup(ok(204, ""));
    expect(await saved.media.saveSelf?.("hidden")).toBe(true);
    expect(saved.bodies[0]?.url).toBe(`${config.url}/rest/v1/rpc/companion_save_profile`);
    expect(saved.bodies[0]?.body).toMatchObject({
      p_snapshot_self: "hidden",
      p_birth_year: null,
      p_age_source: null,
    });
    expect(await setup(ok(400, "{}")).media.saveSelf?.("male")).toBe(false);
  });
});

describe("AL-U12 내 모습 저장이 끝난 뒤에 사진을 요청한다(리뷰 #446)", () => {
  test("AL-U12 저장 응답이 늦어도 요청은 저장이 끝난 다음에 나간다", async () => {
    const order: string[] = [];
    let finishSave: (outcome: AuthRequestOutcome) => void = () => undefined;
    const deps: CompanionMediaDeps = {
      token: async () => "tok",
      config: () => config,
      post: (build) => {
        const { url } = build(config);
        const name = url.endsWith("companion_save_profile") ? "save" : "request";
        order.push(`${name}:sent`);
        if (name === "request") return Promise.resolve(ok(202, ""));
        return new Promise((resolve) => {
          finishSave = (outcome) => {
            order.push("save:done");
            resolve(outcome);
          };
        });
      },
      now: () => NOW,
    };
    const media = createCompanionMediaRemote(deps);
    const saving = media.saveSelf?.("male");
    const requesting = media.request("snapshot", A1, false);
    await new Promise((r) => setTimeout(r, 0));
    expect(order).toEqual(["save:sent"]);
    finishSave(ok(200, "{}"));
    await Promise.all([saving, requesting]);
    expect(order).toEqual(["save:sent", "save:done", "request:sent"]);
  });

  test("AL-U12b 저장이 실패해도 요청은 나간다", async () => {
    const { media, bodies } = setup({ ok: false, reason: "network" });
    await media.saveSelf?.("hidden");
    await media.request("snapshot", A1, false);
    expect(bodies.map((b) => b.url.split("/").pop())).toEqual([
      "companion_save_profile",
      "companion-snapshot",
    ]);
  });
});
