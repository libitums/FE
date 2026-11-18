import { describe, expect, test } from "vitest";

import type { EpisodeIntroEvent } from "../episode-intro/episode-intro.contract";
import {
  FRIEND_RETURN_WINDOW_MS,
  friendReturnDue,
  friendReturnTracker,
  withFriendEvents,
} from "./friend-events";
import { memoryFriendStore } from "./friend-store";

// `unit` 계층(RF-U40 ~ U43): 추천 친구 파생 이벤트 — 첫 글은 `chat_message_sent`에서 한 번(계정 기록), 다시 찾음은 추가한 날 뒤 7일 안의
// 다른 날(하루 한 번). 인물 id 말고는 싣지 않는다.

const days = () => "4";
const DAY = 86_400_000;
const added = new Date(2026, 10, 19, 10, 0).getTime();
const sent = (characterId: string): EpisodeIntroEvent => ({
  name: "chat_message_sent",
  surface: "chat",
  daysSinceFirstOpen: "4",
  characterId,
  paid: false,
  cost: "0",
});

describe("첫 글 (RF-U40 · U41)", () => {
  test("RF-U40 추가한 친구에게 보낸 첫 글이면 friend_first_message를 한 번 더 낸다", () => {
    const events: EpisodeIntroEvent[] = [];
    const store = memoryFriendStore({ seoyeon: { addedAt: added, messaged: false } });
    const sink = withFriendEvents((event) => events.push(event), store, days);
    sink?.(sent("seoyeon"));
    sink?.(sent("seoyeon"));
    expect(events.map((e) => e.name)).toEqual([
      "chat_message_sent",
      "friend_first_message",
      "chat_message_sent",
    ]);
    expect(events[1]).toEqual({
      name: "friend_first_message",
      surface: "chat",
      characterId: "seoyeon",
      daysSinceFirstOpen: "4",
    });
    expect(store.read().get("seoyeon")?.messaged).toBe(true);
  });

  test("RF-U41 이야기 인물 · 추가 기록 없는 친구 · 다른 이벤트는 그대로 지나간다 · sink가 없으면 null", () => {
    const events: EpisodeIntroEvent[] = [];
    const sink = withFriendEvents((event) => events.push(event), memoryFriendStore(), days);
    sink?.(sent("mina"));
    sink?.(sent("daeun"));
    expect(events.map((e) => e.name)).toEqual(["chat_message_sent", "chat_message_sent"]);
    expect(withFriendEvents(null, memoryFriendStore(), days)).toBeNull();
  });
});

describe("다시 찾음 (RF-U42 · U43)", () => {
  test("RF-U42 추가한 날 뒤의 다른 날 · 7일 안이면 true — 같은 날 · 7일 뒤 · 기록 없음은 false", () => {
    const record = { addedAt: added, messaged: false };
    expect(friendReturnDue(record, added + 60_000)).toBe(false);
    expect(friendReturnDue(record, added + DAY)).toBe(true);
    expect(friendReturnDue(record, added + FRIEND_RETURN_WINDOW_MS)).toBe(true);
    expect(friendReturnDue(record, added + FRIEND_RETURN_WINDOW_MS + 1)).toBe(false);
    expect(friendReturnDue(undefined, added + DAY)).toBe(false);
  });

  test("RF-U43 방을 열면 하루 한 번 friend_return — 이야기 인물 · sink 없음은 아무것도 내지 않는다", () => {
    const events: EpisodeIntroEvent[] = [];
    const store = memoryFriendStore({ haejun: { addedAt: added, messaged: true } });
    const sink = (event: EpisodeIntroEvent) => events.push(event);
    const track = friendReturnTracker(days);
    track({ roomId: "haejun", store, sink, now: added + DAY });
    track({ roomId: "haejun", store, sink, now: added + DAY + 3_600_000 });
    track({ roomId: "haejun", store, sink, now: added + 2 * DAY });
    track({ roomId: "mina", store, sink, now: added + DAY });
    track({ roomId: "haejun", store, sink: null, now: added + 3 * DAY });
    expect(events).toEqual([
      { name: "friend_return", surface: "chat", characterId: "haejun", daysSinceFirstOpen: "4" },
      { name: "friend_return", surface: "chat", characterId: "haejun", daysSinceFirstOpen: "4" },
    ]);
  });
});
