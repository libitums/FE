import { expect, test } from "vitest";

import { claimStory, withStoryDirective } from "./chat-send-story.ts";
import type { OutboundRequest } from "./delete-account.contract.ts";

// 스토리 답장 판정 · 지시(ADR-0178 D5 · ADR-0179). 내 스토리(인물의 반응에 답함)는 `mine` — 지시에 단어와 그 인물의 반응을 싣는다.
const env = {
  supabaseUrl: "https://ref.supabase.co",
  supabaseAnonKey: "anon",
  supabaseServiceRoleKey: "service-secret",
};
const input = {
  userId: "u",
  storyId: "5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e8f",
  characterId: "mina",
  clientMessageId: "c",
  now: "2026-11-23T00:00:00.000Z",
};
const answering = (body: unknown) => async (_request: OutboundRequest) => ({
  status: 200,
  text: async () => JSON.stringify(body),
});

test("SS1. mine — 단어 · 반응을 돌려주고, 지시는 내 단어 스토리에 단 그 인물의 말에 답한다고 알린다", async () => {
  const story = await claimStory(
    answering({
      result: "mine",
      story: { line: "야근", wordKo: "야근", reaction: "야근 끝나면 라면 먹어!" },
    }),
    env,
    input,
  );
  expect(story).toEqual({ result: "mine", line: "야근", reaction: "야근 끝나면 라면 먹어!" });
  const directive = withStoryDirective(story, "Use 아/어요.");
  expect(directive).toContain('word story about "야근"');
  expect(directive).toContain('"야근 끝나면 라면 먹어!"');
  expect(directive).not.toContain("the story you posted today");
  expect(directive?.endsWith("\nUse 아/어요.")).toBe(true);
});

test("SS2. mine인데 반응이 없으면 단어만 싣고, 친구 스토리는 그대로", async () => {
  const story = await claimStory(
    answering({ result: "mine", story: { line: "도착하다", reaction: null } }),
    env,
    input,
  );
  expect(story).toEqual({ result: "mine", line: "도착하다", reaction: null });
  expect(withStoryDirective(story, null)).toContain('word story about "도착하다"');
  expect(withStoryDirective(story, null)).not.toContain("Your comment was");

  const friend = await claimStory(
    answering({ result: "free", story: { line: "야근 끝!" } }),
    env,
    input,
  );
  expect(friend).toEqual({ result: "free", line: "야근 끝!", reaction: null });
  expect(withStoryDirective(friend, null)).toContain('the story you posted today: "야근 끝!"');
});
