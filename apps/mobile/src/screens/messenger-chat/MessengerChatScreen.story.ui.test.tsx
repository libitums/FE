import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  KEYS_AN,
  mountChat,
  mountChatOpen,
  outgoingCount,
  tapId,
  tapKeys,
} from "./chat-ui.test-support";
import type { ChatMessage } from "./chat-source.contract";
import { friendStoriesTestIds as ids, type StoryReplyHandoff } from "./friend-stories.contract";
import { messengerChatTestIds as chat } from "./messenger-chat.contract";
import { putStoryReplyHandoff, takeStoryReplyHandoff } from "./story-reply-handoff";
import { createTrialStore } from "./trial-store";

// `ui` 계층(FS-UI9): 대화방이 스토리 답장 넘김을 받는다(ADR-0177 D5) — 칩 말은 곧바로 인용과 함께 보내고, 답장 칸이면 입력 줄 위
// 인용 띠를 붙여 다음 글에 싣는다. 무료 안내인 답장은 보내기 관문(체험 · 엽전)을 지나지 않고 이벤트가 난다.

const NOW = new Date(2026, 10, 23, 12, 0, 0).getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
  takeStoryReplyHandoff("mina");
});

const handoff = (text: string | null, free = true): StoryReplyHandoff => ({
  roomId: "mina",
  text,
  free,
  quote: {
    storyId: "st-mina",
    characterId: "mina",
    line: "우산 없는데 비가 많이 와요…",
    imagePath: "content/images/u08-umbrella/post-2.webp",
    postedAt: NOW - 2 * 3_600_000,
  },
});

const myMessages = (messages: readonly ChatMessage[]) =>
  messages.filter((m) => m.kind === "text" && m.from === "me");

test("FS-UI9. 칩 말이면 방이 서자마자 인용과 함께 보내고 내 말풍선 위에 인용 카드 — replied(chip) 이벤트", () => {
  putStoryReplyHandoff(handoff("괜찮아요?"));
  const sink = vi.fn();
  const { source } = mountChat({ eventSink: sink, tier: "free", trial: undefined, coinBalance: 0 });
  const sent = myMessages(source.thread("mina")?.messages ?? []);
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ text: { ko: "괜찮아요?" }, story: { storyId: "st-mina" } });
  expect(screen.getByTestId(ids.quote).textContent).toContain("You replied to 미나's story");
  expect(screen.queryByTestId(ids.quoteBar)).toBeNull();
  expect(sink.mock.calls.map(([e]) => e)).toContainEqual(
    expect.objectContaining({
      name: "friend_story_replied",
      characterId: "mina",
      via: "chip",
      free: true,
    }),
  );
});

test("FS-UI9. 답장 칸이면 인용 띠가 서고, 다음에 보내는 글에 인용이 실리며 띠가 사라진다 — replied(typed)", () => {
  putStoryReplyHandoff(handoff(null, false));
  const sink = vi.fn();
  const { source } = mountChatOpen({ eventSink: sink });
  expect(screen.getByTestId(ids.quoteBar).textContent).toContain("Replying to 미나's story");
  tapKeys(...KEYS_AN);
  tapId(chat.send);
  const sent = myMessages(source.thread("mina")?.messages ?? []);
  expect(sent[0]).toMatchObject({ text: { ko: "안" }, story: { storyId: "st-mina" } });
  expect(screen.queryByTestId(ids.quoteBar)).toBeNull();
  expect(sink.mock.calls.map(([e]) => e)).toContainEqual(
    expect.objectContaining({ name: "friend_story_replied", via: "typed", free: false }),
  );
  // 띠가 떨어진 뒤의 글에는 인용이 없다.
  tapKeys(...KEYS_AN);
  act(() => {
    tapId(chat.send);
  });
  expect(myMessages(source.thread("mina")?.messages ?? [])[1]).not.toHaveProperty("story");
});

test("FS-UI9. 인용 띠를 ×로 떼면 보내는 글에 인용이 없다", () => {
  putStoryReplyHandoff(handoff(null));
  const { source } = mountChatOpen();
  tapId(ids.quoteBarRemove);
  expect(screen.queryByTestId(ids.quoteBar)).toBeNull();
  tapKeys(...KEYS_AN);
  tapId(chat.send);
  expect(myMessages(source.thread("mina")?.messages ?? [])[0]).not.toHaveProperty("story");
  expect(outgoingCount()).toBe(1);
});

test("FS-UI9. 무료 칩은 chat_message_sent(paid false · cost 0)를 내고, 무료가 아닌 칩은 보내기 관문을 거친다(엽전 없으면 보내지 않음)", () => {
  putStoryReplyHandoff(handoff("괜찮아요?"));
  const sink = vi.fn();
  mountChat({ eventSink: sink, tier: "free", trial: createTrialStore(0), coinBalance: 0 });
  expect(sink.mock.calls.map(([e]) => e)).toContainEqual(
    expect.objectContaining({ name: "chat_message_sent", paid: false, cost: "0", storyFree: true }),
  );
  cleanup();
  putStoryReplyHandoff(handoff("괜찮아요?", false));
  const { source } = mountChat({ tier: "free", trial: createTrialStore(0), coinBalance: 0 });
  expect(myMessages(source.thread("mina")?.messages ?? [])).toHaveLength(0);
});

test("FS-UI9. 무료 인용 띠가 붙어 있어도 추천 답변(아이디어)은 보통 관문을 거친다", () => {
  putStoryReplyHandoff(handoff(null));
  const { source } = mountChatOpen({ tier: "free", trial: createTrialStore(0), coinBalance: 0 });
  tapId(chat.ideasButton);
  tapId(chat.idea(0));
  expect(myMessages(source.thread("mina")?.messages ?? [])).toHaveLength(0);
});

test("FS-UI9. 다른 방의 넘김은 꺼내지 않는다", () => {
  putStoryReplyHandoff({ ...handoff("괜찮아요?"), roomId: "other" });
  const { source } = mountChat();
  expect(myMessages(source.thread("mina")?.messages ?? [])).toHaveLength(0);
  expect(takeStoryReplyHandoff("other")).not.toBeNull();
});
