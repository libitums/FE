import { afterEach, expect, test, vi } from "vitest";

import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import type { MyStoriesState } from "../screens/messenger-chat/my-stories.contract";
import { myStoriesPortOf } from "./my-stories-wiring";
import { setEarlyAccessRemote } from "./suggested-friends-wiring";

// `unit` 계층(LS-U3, state-data): 내 스토리를 다시 읽었는데(보기를 연 동안 30초마다 · 앞으로 옴) 답이 늘었으면 메신저 목록도 맞춘다
// (`onReplies`) — 스토리 보기에는 새 답이 섰는데 그 인물의 방 · 목록 줄은 낡은 채로 남지 않게(ADR-0213). 첫 읽기는 기준일 뿐이다.

vi.mock("../lib/story-photo", () => ({
  storyPhotosAvailable: () => false,
  pickStoryPhoto: vi.fn(),
  discardStoryPhoto: vi.fn(),
}));

afterEach(() => setEarlyAccessRemote(null));

const stateWith = (replies: number[]): MyStoriesState =>
  ({
    enabled: true,
    stories: replies.map((count, index) => ({
      id: `ms-${index}`,
      reactions: Array.from({ length: count }, (_, n) => ({ characterId: `c${n}` })),
    })),
  }) as unknown as MyStoriesState;

function portWith(answers: (MyStoriesState | null)[], account = () => "acct") {
  const onReplies = vi.fn<() => void>();
  setEarlyAccessRemote(
    () =>
      ({
        myStories: { list: async () => (answers.length > 0 ? (answers.shift() ?? null) : null) },
      }) as unknown as ChatRemote,
  );
  const port = myStoriesPortOf({
    catalog: () => [],
    accountKey: account,
    seen: () => ({ seenIds: () => new Set(), markSeen: () => undefined }),
    onReplies,
  });
  return { port, onReplies };
}

test("LS-U3 답이 늘면 한 번 맞추고, 그대로 · 줄면 · 못 읽으면 맞추지 않는다", async () => {
  const { port, onReplies } = portWith([
    stateWith([1]),
    stateWith([1]),
    stateWith([1, 1]),
    null,
    stateWith([1]),
    stateWith([2]),
  ]);
  await port.load();
  await port.load();
  expect(onReplies).not.toHaveBeenCalled();
  await port.load();
  expect(onReplies).toHaveBeenCalledTimes(1);
  await port.load();
  await port.load();
  expect(onReplies).toHaveBeenCalledTimes(1);
  await port.load();
  expect(onReplies).toHaveBeenCalledTimes(2);
});

test("LS-U3 계정을 바꾸면 그 계정의 첫 읽기는 기준일 뿐이다", async () => {
  let account = "a";
  const { port, onReplies } = portWith([stateWith([1]), stateWith([3])], () => account);
  await port.load();
  account = "b";
  await port.load();
  expect(onReplies).not.toHaveBeenCalled();
});
