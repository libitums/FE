import { describe, expect, test } from "vitest";

import { createCompanionRemote, type CompanionRemoteDeps } from "./companion-api";

// `unit` 계층(MS-S1 ~ S4, state-data): 내 스토리 RPC(ADR-0194) — 경로 · 인자 · 풀기. 던지지 않습니다.

const config = { url: "https://example.supabase.co", anonKey: "anon" };

function setup(reply: { status: number; bodyText: string } | "throw") {
  const requests: { url: string; body: unknown }[] = [];
  const deps: CompanionRemoteDeps = {
    token: async () => "tok",
    config: () => config,
    post: async (build) => {
      const { url, init } = build(config);
      requests.push({ url, body: JSON.parse(init.body ?? "null") as unknown });
      if (reply === "throw") throw new Error("network");
      return { ok: true, ...reply };
    },
    stream: () => ({
      open: () => ({ streamId: "s", cancel: () => undefined }),
      dispose: () => {},
    }),
    now: () => 1_000,
  };
  return { remote: createCompanionRemote(deps), requests };
}

const rpc = (name: string) => `https://example.supabase.co/rest/v1/rpc/${name}`;
const draft = {
  clientId: "11111111-1111-4111-8111-111111111111",
  kind: "word" as const,
  word: { episodeId: "u01", ref: "voca:x" },
  ko: "야근",
  roman: "yageun",
  meaning: "overtime",
  example: null,
  lang: "en",
  tzOffsetMin: 540,
};

describe("MS-S 내 스토리 RPC", () => {
  test("MS-S1. 읽기 — companion_my_stories(p_tz_offset_min), 못 읽으면 null", async () => {
    const t = setup({
      status: 200,
      bodyText: JSON.stringify({ enabled: true, keep: true, stories: [] }),
    });
    expect(await t.remote.myStories?.list(540)).toEqual({
      enabled: true,
      keep: true,
      stories: [],
      window: null,
      kinds: ["word", "card"],
    });
    expect(t.requests).toEqual([
      { url: rpc("companion_my_stories"), body: { p_tz_offset_min: 540 } },
    ]);
    expect(await setup("throw").remote.myStories?.list(0)).toBeNull();
    expect(await setup({ status: 404, bodyText: "{}" }).remote.myStories?.list(0)).toBeNull();
  });

  test("MS-S2. 올리기 — 인자 이름 그대로, 실패는 failed", async () => {
    const t = setup({ status: 200, bodyText: JSON.stringify({ result: "daily_limit" }) });
    expect(await t.remote.myStories?.post(draft)).toEqual({ result: "daily_limit" });
    expect(t.requests[0]).toEqual({
      url: rpc("companion_post_my_story"),
      body: {
        p_client_id: draft.clientId,
        p_kind: "word",
        p_word: { episodeId: "u01", ref: "voca:x" },
        p_ko: "야근",
        p_roman: "yageun",
        p_meaning: "overtime",
        p_example_ko: null,
        p_example_meaning: null,
        p_lang: "en",
        p_tz_offset_min: 540,
      },
    });
    expect(await setup("throw").remote.myStories?.post(draft)).toEqual({ result: "failed" });
  });

  test("MS-S3. 지우기 — 하나 · 모두(null), 성공이면 true", async () => {
    const t = setup({ status: 200, bodyText: JSON.stringify({ deleted: 1 }) });
    expect(await t.remote.myStories?.remove("ms-1")).toBe(true);
    expect(await t.remote.myStories?.remove(null)).toBe(true);
    expect(t.requests.map((r) => r.body)).toEqual([{ p_story_id: "ms-1" }, { p_story_id: null }]);
    expect(await setup("throw").remote.myStories?.remove("ms-1")).toBe(false);
  });

  test("MS-S4. 보관 스위치 — 바뀐 값, 못 바꾸면 null", async () => {
    const t = setup({ status: 200, bodyText: JSON.stringify({ keep: false }) });
    expect(await t.remote.myStories?.setKeep(false)).toBe(false);
    expect(t.requests[0]).toEqual({
      url: rpc("companion_set_keep_my_stories"),
      body: { p_keep: false },
    });
    expect(await setup({ status: 200, bodyText: "{}" }).remote.myStories?.setKeep(true)).toBeNull();
  });
});
