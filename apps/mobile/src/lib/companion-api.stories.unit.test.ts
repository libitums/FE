import { describe, expect, test } from "vitest";

import type { ChatStreamRequest } from "./chat-stream.contract";
import { createCompanionRemote, type CompanionRemoteDeps } from "./companion-api";

// `unit` 계층(SA-S1 ~ S2, state-data): 친구 스토리 RPC · 답장 턴의 `story_id`(ADR-0178 D2 · D5). 던지지 않습니다.

const config = { url: "https://example.supabase.co", anonKey: "anon" };

function setup(reply: { status: number; bodyText: string } | "throw" | "signed-out") {
  const requests: { url: string; body: unknown }[] = [];
  let opened: ChatStreamRequest | null = null;
  const deps: CompanionRemoteDeps = {
    token: async () => (reply === "signed-out" ? null : "tok"),
    config: () => config,
    post: async (build) => {
      const { url, init } = build(config);
      requests.push({ url, body: JSON.parse(init.body ?? "null") as unknown });
      if (reply === "throw" || reply === "signed-out") throw new Error("network");
      return { ok: true, ...reply };
    },
    stream: () => ({
      open: (request) => {
        opened = request;
        return { streamId: "s", cancel: () => undefined };
      },
      dispose: () => {},
    }),
    now: () => 1_000,
  };
  return { remote: createCompanionRemote(deps), requests, opened: () => opened };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wire = {
  id: "st-1",
  characterId: "mina",
  postedAt: "2026-11-23T03:00:00.000Z",
  expiresAt: "2026-11-24T03:00:00.000Z",
  imagePath: "content/images/u08-umbrella/post-2.webp",
  line: { ko: "우산 없는데", roman: "usan", meaning: { en: "No umbrella" } },
  word: null,
  replies: ["괜찮아요?"],
  freeReply: true,
};

describe("SA-S1 companion_friend_stories()", () => {
  test("RPC를 인자 없이 부르고 스토리를 푼다", async () => {
    const { remote, requests } = setup({
      status: 200,
      bodyText: JSON.stringify({ stories: [wire] }),
    });
    const list = await remote.stories?.list();
    expect(list?.map((s) => s.id)).toEqual(["st-1"]);
    expect(requests).toEqual([
      { url: "https://example.supabase.co/rest/v1/rpc/companion_friend_stories", body: {} },
    ]);
  });

  test("실패 · 로그아웃 · 함수 없음(404) · 틀린 본문이면 null", async () => {
    expect(await setup("throw").remote.stories?.list()).toBeNull();
    expect(await setup("signed-out").remote.stories?.list()).toBeNull();
    expect(await setup({ status: 404, bodyText: "{}" }).remote.stories?.list()).toBeNull();
    expect(await setup({ status: 200, bodyText: "[]" }).remote.stories?.list()).toBeNull();
  });
});

describe("SA-S2 답장 턴", () => {
  test("storyId가 있으면 요청 몸에 story_id, 없으면 칸이 없다", async () => {
    const { remote, opened } = setup({ status: 200, bodyText: "{}" });
    const handlers = { onOpen: () => undefined, onEvent: () => undefined, onEnd: () => undefined };
    remote.openTurn(
      { characterId: "mina", text: "괜찮아요?", clientMessageId: "c1", storyId: "st-1" },
      handlers,
    );
    await flush();
    expect(JSON.parse(opened()?.body ?? "{}")).toMatchObject({ story_id: "st-1" });
    remote.openTurn({ characterId: "mina", text: "안녕", clientMessageId: "c2" }, handlers);
    await flush();
    expect(JSON.parse(opened()?.body ?? "{}")).not.toHaveProperty("story_id");
  });
});
