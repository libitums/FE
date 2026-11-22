import { describe, expect, test } from "vitest";

import { createRankingClient, rankingHiddenFrom, rankingLoadFrom } from "./ranking-api";

// `unit` 계층(ADR-0170 RK-U7 ~ U10): 주간 순위 RPC 응답 해석 · 요청 모양.

const config = { url: "https://example.supabase.co", anonKey: "anon" };
const body = (value: unknown) => JSON.stringify(value);

const ranked = {
  state: "ranked",
  board: "chat_words",
  endsAt: "2026-11-23T00:00:00Z",
  groupSize: 24,
  reward: null,
  rows: [
    { rank: 1, name: "Linh", country: "VN", episode: 6, score: 38, me: false },
    { rank: 2, name: "You", country: null, episode: null, score: 14, me: true },
  ],
  me: { rank: 2, score: 14 },
  next: { name: "Linh", more: 25 },
};

describe("응답", () => {
  test("RK-U7. ranked → ready 보드(나라 · 에피소드 null 허용, 보드 이름은 앱 이름으로)", () => {
    expect(rankingLoadFrom("chat-words", body(ranked))).toEqual({
      status: "ready",
      board: {
        kind: "chat-words",
        groupSize: 24,
        endsAt: "2026-11-23T00:00:00Z",
        reward: null,
        rows: [
          { rank: 1, name: "Linh", countryCode: "VN", episode: 6, score: 38, me: false },
          { rank: 2, name: "You", countryCode: null, episode: null, score: 14, me: true },
        ],
        me: { rank: 2, score: 14 },
        next: { name: "Linh", more: 25 },
      },
    });
    expect(
      rankingLoadFrom("lessons", body({ ...ranked, board: "lessons", reward: 30, next: null })),
    ).toMatchObject({ status: "ready", board: { kind: "lessons", reward: 30, next: null } });
  });

  test("RK-U8. not_joined · hidden, 틀린 모양 · 다른 보드 · 빈 본문은 error", () => {
    expect(
      rankingLoadFrom("lessons", body({ state: "not_joined", endsAt: ranked.endsAt })),
    ).toEqual({ status: "not-joined", endsAt: ranked.endsAt });
    expect(rankingLoadFrom("lessons", body({ state: "hidden" }))).toEqual({ status: "hidden" });
    expect(rankingLoadFrom("lessons", body(ranked))).toEqual({ status: "error" });
    expect(rankingLoadFrom("chat-words", body({ ...ranked, rows: [{ rank: "1" }] }))).toEqual({
      status: "error",
    });
    expect(rankingLoadFrom("chat-words", body({ ...ranked, me: null }))).toEqual({
      status: "error",
    });
    expect(rankingLoadFrom("chat-words", "<html>")).toEqual({ status: "error" });
    expect(rankingLoadFrom("chat-words", null)).toEqual({ status: "error" });
    expect(rankingHiddenFrom(body({ hidden: true }))).toEqual({ hidden: true });
    expect(rankingHiddenFrom(body({ hidden: "no" }))).toBeNull();
  });
});

describe("요청", () => {
  test("RK-U9. 보드 · 설정 RPC를 토큰으로 부른다(보드 이름은 서버 이름)", async () => {
    const calls: { url: string; body: unknown; auth: string | undefined }[] = [];
    const replies = [body(ranked), body({ hidden: false }), body({ hidden: true })];
    const client = createRankingClient({
      token: async () => "tok",
      post: async (build) => {
        const built = build(config);
        calls.push({
          url: built.url,
          body: JSON.parse(String(built.init.body)),
          auth: built.init.headers.Authorization,
        });
        return { ok: true, status: 200, bodyText: replies[calls.length - 1] ?? null };
      },
    });
    expect((await client.load("chat-words")).status).toBe("ready");
    expect(await client.preferences()).toEqual({ hidden: false });
    expect(await client.setHidden(true)).toEqual({ hidden: true });
    expect(calls).toEqual([
      {
        url: "https://example.supabase.co/rest/v1/rpc/ranking_board",
        body: { p_board: "chat_words" },
        auth: "Bearer tok",
      },
      {
        url: "https://example.supabase.co/rest/v1/rpc/ranking_preferences",
        body: {},
        auth: "Bearer tok",
      },
      {
        url: "https://example.supabase.co/rest/v1/rpc/ranking_set_hidden",
        body: { p_hidden: true },
        auth: "Bearer tok",
      },
    ]);
  });

  test("RK-U10. 로그인 없음 · 실패 응답 · 던짐은 error · null(던지지 않음)", async () => {
    const noToken = createRankingClient({
      token: async () => null,
      post: async () => ({ ok: true, status: 200, bodyText: body(ranked) }),
    });
    expect(await noToken.load("lessons")).toEqual({ status: "error" });
    expect(await noToken.preferences()).toBeNull();
    const failing = createRankingClient({
      token: async () => "tok",
      post: async () => ({ ok: true, status: 500, bodyText: "{}" }),
    });
    expect(await failing.load("lessons")).toEqual({ status: "error" });
    expect(await failing.setHidden(true)).toBeNull();
    const throwing = createRankingClient({
      token: async () => {
        throw new Error("x");
      },
      post: async () => ({ ok: true, status: 200, bodyText: "" }),
    });
    expect(await throwing.load("lessons")).toEqual({ status: "error" });
    expect(await throwing.preferences()).toBeNull();
  });
});
