import { expect, test } from "vitest";

import type { ChatRoomSummary } from "./chat-source.contract";
import type { MyStoriesState, MyStory } from "./my-stories.contract";
import {
  MY_STORY_LIVE_MS,
  replyArrived,
  sharedRead,
  stateWithLive,
  withLatestMine,
} from "./my-story-live";
import { myViewerItemsOf } from "./my-story-viewer";
import { MS_NOW, myStory, reaction } from "./my-stories.test-support";

// `unit` 계층(LV-U1 ~ U6): 내 스토리 보기를 연 동안 다시 읽기(ADR-0194 개정 ⟨살아 있는 보기⟩) — 주기 · 정지 판정 · 답 도착 · 얹기 · 묶기.

const room = (roomId: string, unread: number, open = true) =>
  ({ roomId, unread, access: open ? { kind: "open" } : { kind: "locked" } }) as ChatRoomSummary;
const seen = (...ids: string[]) => ids.map((characterId) => ({ characterId, at: MS_NOW }));

test("LV-U1. 주기는 30초", () => {
  expect(MY_STORY_LIVE_MS).toBe(30_000);
});

test("LV-U2. 답 도착 — 열린 방의 안 읽음이 오를 때만(새 방 · 줄어듦 · 잠긴 방은 아님)", () => {
  const before = [room("a", 0), room("b", 2)];
  expect(replyArrived(before, [room("a", 1), room("b", 2)])).toBe(true);
  expect(replyArrived(before, [room("a", 0), room("b", 0)])).toBe(false);
  expect(replyArrived(before, [room("a", 0), room("b", 2), room("c", 3)])).toBe(false);
  expect(replyArrived(before, [room("a", 4, false), room("b", 2)])).toBe(false);
  expect(replyArrived(before, before)).toBe(false);
});

const stateOf = (stories: readonly MyStory[]): MyStoriesState => ({
  enabled: true,
  keep: true,
  stories,
  window: null,
  kinds: [],
});

test("LV-U3. 다시 읽은 Seen by · 반응만 얹는다 — 순서 · 다른 칸 · 없는 스토리는 그대로", () => {
  const a = myStory("a", { seenBy: seen("mina") });
  const b = myStory("b");
  const loaded = [
    myStory("b", {
      seenBy: seen("mina", "haejun"),
      reactions: [reaction("r1", "haejun")],
      ko: "딴말",
    }),
    myStory("new"),
  ];
  const next = stateWithLive(stateOf([a, b]), loaded)?.stories ?? [];
  expect(next.map((story) => story.id)).toEqual(["a", "b"]);
  expect(next[0]).toBe(a);
  expect(next[1]?.seenBy.map((s) => s.characterId)).toEqual(["mina", "haejun"]);
  expect(next[1]?.reactions.map((r) => r.id)).toEqual(["r1"]);
  expect(next[1]?.ko).toBe("야근");
});

test("LV-U4. 바뀐 게 없거나 상태가 없으면 같은 객체 — 다시 그리지 않는다", () => {
  const state = stateOf([
    myStory("a", { seenBy: seen("mina"), reactions: [reaction("r1", "mina")] }),
  ]);
  expect(stateWithLive(null, state.stories)).toBeNull();
  expect(
    stateWithLive(state, [
      myStory("a", { seenBy: seen("mina"), reactions: [reaction("r1", "mina")] }),
    ]),
  ).toBe(state);
  expect(stateWithLive(state, [])).toBe(state);
});

test("LV-U5. 보기 장은 열 때 순서 그대로, 내 스토리만 지금 목록의 것으로", () => {
  const old = myStory("a", { postedAt: MS_NOW - 3_600_000 });
  const opened = myViewerItemsOf([old], "a", MS_NOW, "Your story");
  const items = opened?.items ?? [];
  expect(withLatestMine(items, [])[0]).toBe(items[0]);
  const fresh = { ...old, seenBy: seen("mina") };
  const next = withLatestMine(items, [fresh]);
  expect(next[0]?.mine).toBe(fresh);
  expect(next[0]?.story).toBe(items[0]?.story);
});

test("LV-U6. 겹치는 읽기는 하나로 — 끝난 뒤 부르면 새로 읽는다, 실패도 묶음을 푼다", async () => {
  let calls = 0;
  let finish: (value: number) => void = () => undefined;
  const read = sharedRead(
    () =>
      new Promise<number>((resolve) => {
        calls += 1;
        finish = resolve;
      }),
  );
  const first = read();
  const second = read();
  expect(second).toBe(first);
  expect(calls).toBe(1);
  finish(7);
  expect(await first).toBe(7);
  void read();
  expect(calls).toBe(2);
  let fail = true;
  const failing = sharedRead(async () => {
    if (fail) throw new Error("x");
    return 1;
  });
  await expect(failing()).rejects.toThrow("x");
  fail = false;
  expect(await failing()).toBe(1);
});
