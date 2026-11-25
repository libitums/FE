import { describe, expect, test } from "vitest";

import type { ChatMessage, ChatRoomSummary } from "../screens/messenger-chat/chat-source.contract";
import type { Screen } from "./nav-state";
import {
  initialReplyToastState,
  replyArrivals,
  replyToastPlaceOf,
  replyToastPreviewOf,
  replyToastReducer,
  type ReplyToastPlaceInput,
} from "./reply-toast";
import type {
  ReplyArrival,
  ReplyToastAction,
  ReplyToastPlace,
  ReplyToastState,
} from "./reply-toast.contract";

// `unit` 계층(RT-U1 ~ U7): 답장 도착 토스트의 순수 판정(ADR-0200).

const room = (id: string, over: Partial<ChatRoomSummary> = {}): ChatRoomSummary => ({
  roomId: `room-${id}`,
  counterpart: { id, name: id, avatarUrl: null },
  access: { kind: "open" },
  lastMessage: null,
  unread: 0,
  activity: "idle",
  updatedAt: 0,
  isNew: false,
  ...over,
});
const text = (from: "me" | "them", ko: string): ChatMessage => ({
  id: `${from}-${ko}`,
  at: 1,
  kind: "text",
  from,
  text: { ko, en: ko },
});

describe("replyArrivals (RT-U1)", () => {
  test("RT-U1a. 안 읽음이 오른 열린 방 하나가 도착 하나다 — 앞 줄이 내 글이면 reply", () => {
    const prev = [room("mina", { lastMessage: text("me", "안녕") }), room("duksu")];
    const next = [room("mina", { lastMessage: text("them", "안녕!"), unread: 1 }), room("duksu")];
    expect(replyArrivals(prev, next)).toEqual([
      { roomId: "room-mina", characterId: "mina", kind: "reply" },
    ]);
  });

  test("RT-U1b. 앞 줄이 인물의 말이거나 없으면 proactive(선톡 · 스토리 반응 · 첫 인사)", () => {
    const prev = [room("mina", { lastMessage: text("them", "어제 말"), unread: 2 }), room("doyun")];
    const next = [
      room("mina", { lastMessage: text("them", "오늘 말"), unread: 3 }),
      room("doyun", { lastMessage: text("them", "반가워"), unread: 1 }),
    ];
    expect(replyArrivals(prev, next).map((each) => each.kind)).toEqual(["proactive", "proactive"]);
  });

  test("RT-U1c. 안 읽음이 그대로 · 줄어듦 · 잠긴 방 · 처음 보는 방은 도착이 아니다", () => {
    const prev = [
      room("mina", { unread: 2 }),
      room("duksu", { unread: 1 }),
      room("doyun", { access: { kind: "locked", unlockEpisode: 3 } }),
    ];
    const next = [
      room("mina", { unread: 2, lastMessage: text("them", "조각 더") }),
      room("duksu", { unread: 0 }),
      room("doyun", { access: { kind: "locked", unlockEpisode: 3 }, unread: 1 }),
      room("new", { unread: 1 }),
    ];
    expect(replyArrivals(prev, next)).toEqual([]);
  });
});

const screen = (value: Screen): ReplyToastPlaceInput => ({
  inApp: true,
  canOpenChats: true,
  screen: value,
  storyViewerOpen: false,
});

describe("replyToastPlaceOf (RT-U2)", () => {
  test("RT-U2a. 다른 탭 · 레슨 끝 화면 · 메신저의 다른 화면은 바로 띄운다", () => {
    for (const value of [
      { name: "journey-map" },
      { name: "ranking", board: "weekly" },
      { name: "chat-settings" },
      {
        name: "catalog-unit-complete",
        episodeId: "e",
        unitKey: "u",
        results: [],
        skippedCount: 0,
        questionCount: 0,
      },
    ] as Screen[]) {
      expect(replyToastPlaceOf(screen(value)).kind).toBe("show");
    }
  });

  test("RT-U2b. 채팅 목록은 list, 스토리 보기가 위에 떠 있으면 show", () => {
    expect(replyToastPlaceOf(screen({ name: "messenger-list" }))).toEqual({ kind: "list" });
    expect(
      replyToastPlaceOf({ ...screen({ name: "messenger-list" }), storyViewerOpen: true }),
    ).toEqual({ kind: "show" });
  });

  test("RT-U2c. 방이면 그 방 id를 싣는다", () => {
    expect(replyToastPlaceOf(screen({ name: "messenger-chat", roomId: "room-mina" }))).toEqual({
      kind: "room",
      roomId: "room-mina",
    });
  });

  test("RT-U2d. 레슨 · 이야기 · 최종 테스트 · 롤플레이 진행 중은 defer", () => {
    for (const value of [
      { name: "catalog-lesson", episodeId: "e", unitKey: "u", activityIndex: 0 },
      { name: "catalog-story", episodeId: "e", unitKey: "u" },
      { name: "catalog-cover", episodeId: "e" },
      { name: "catalog-final", episodeId: "e" },
      { name: "catalog-epilogue", episodeId: "e" },
      { name: "roleplay-story", episodeId: "e" },
    ] as Screen[]) {
      expect(replyToastPlaceOf(screen(value)).kind).toBe("defer");
    }
  });

  test("RT-U2e. 앱 구간 밖 · 메신저를 못 여는 계정은 off", () => {
    expect(replyToastPlaceOf({ ...screen({ name: "journey-map" }), inApp: false }).kind).toBe(
      "off",
    );
    expect(
      replyToastPlaceOf({ ...screen({ name: "journey-map" }), canOpenChats: false }).kind,
    ).toBe("off");
  });
});

const arrival = (id: string, kind: ReplyArrival["kind"] = "reply"): ReplyArrival => ({
  roomId: `room-${id}`,
  characterId: id,
  kind,
});
const run = (
  actions: readonly ReplyToastAction[],
  from = initialReplyToastState,
): ReplyToastState => actions.reduce(replyToastReducer, from);
const show = { kind: "show" } as const;
const arrive = (id: string, now = 0, place: ReplyToastPlace = show): ReplyToastAction => ({
  type: "arrive",
  arrivals: [arrival(id)],
  place,
  now,
});

describe("replyToastReducer (RT-U3 ~ U6)", () => {
  test("RT-U3. show면 카드가 서고, 같은 인물이 또 오면 내용만 바꿔 낀다(「+N」 그대로 · 새 key)", () => {
    const first = run([arrive("mina")]);
    expect(first.card).toMatchObject({
      characterId: "mina",
      roomId: "room-mina",
      kind: "reply",
      more: 0,
      deferred: false,
    });
    const again = run([arrive("mina", 1000)], first);
    expect(again.card).toMatchObject({ characterId: "mina", more: 0 });
    expect(again.card?.key).not.toBe(first.card?.key);
    expect(again.shownAt).toEqual([0]);
  });

  test("RT-U3b. 다른 인물이 오면 최신으로 바꾸고 「+1」, 닫으면 카드가 사라진다", () => {
    const state = run([arrive("mina"), arrive("doyun", 500)]);
    expect(state.card).toMatchObject({ characterId: "doyun", more: 1 });
    expect(run([{ type: "dismiss" }], state).card).toBeNull();
  });

  test("RT-U4. 1분에 새 카드는 세 번까지 — 넷째는 띄우지 않고, 1분이 지나면 다시 띄운다", () => {
    const three = run([
      arrive("a", 0),
      { type: "dismiss" },
      arrive("b", 10_000),
      { type: "dismiss" },
      arrive("c", 20_000),
      { type: "dismiss" },
    ]);
    expect(run([arrive("d", 30_000)], three).card).toBeNull();
    expect(run([arrive("d", 60_001)], three).card).toMatchObject({ characterId: "d" });
  });

  test("RT-U5. list · room(그 인물) · off에서는 띄우지 않고, 다른 인물의 방이면 띄운다", () => {
    expect(run([arrive("mina", 0, { kind: "list" })]).card).toBeNull();
    expect(run([arrive("mina", 0, { kind: "off" })]).card).toBeNull();
    expect(run([arrive("mina", 0, { kind: "room", roomId: "room-mina" })]).card).toBeNull();
    expect(run([arrive("mina", 0, { kind: "room", roomId: "room-doyun" })]).card).toMatchObject({
      characterId: "mina",
    });
  });

  test("RT-U6a. 레슨 중(defer)에는 모아 두었다가, 레슨 밖으로 나오면 최신 하나 + 「+N」으로 한 번에 띄운다", () => {
    const defer = { kind: "defer" } as const;
    const held = run([
      arrive("mina", 0, defer),
      arrive("doyun", 1, defer),
      arrive("doyun", 2, defer),
    ]);
    expect(held.card).toBeNull();
    expect(held.deferred).toHaveLength(3);
    const out = run([{ type: "place", place: show, now: 5000 }], held);
    expect(out.card).toMatchObject({ characterId: "doyun", more: 1, deferred: true });
    expect(out.deferred).toEqual([]);
    expect(out.shownAt).toEqual([5000]);
  });

  test("RT-U6b. 미룬 사이 목록으로 가면 다 버리고, 그 방으로 가면 그 인물 것만 버리고 나머지를 띄운다", () => {
    const defer = { kind: "defer" } as const;
    const held = run([arrive("mina", 0, defer), arrive("doyun", 1, defer)]);
    expect(run([{ type: "place", place: { kind: "list" }, now: 2 }], held).deferred).toEqual([]);
    const inRoom = run(
      [{ type: "place", place: { kind: "room", roomId: "room-doyun" }, now: 2 }],
      held,
    );
    expect(inRoom.deferred).toEqual([]);
    expect(inRoom.card).toMatchObject({ characterId: "mina", more: 0 });
  });

  test("RT-U6c. 떠 있는 카드는 목록 · 그 방으로 가면 사라지고, 레슨으로 들어가도 남지 않는다", () => {
    const state = run([arrive("mina")]);
    expect(run([{ type: "place", place: { kind: "list" }, now: 1 }], state).card).toBeNull();
    expect(
      run([{ type: "place", place: { kind: "room", roomId: "room-mina" }, now: 1 }], state).card,
    ).toBeNull();
    expect(run([{ type: "place", place: { kind: "defer" }, now: 1 }], state).card).toBeNull();
    expect(run([{ type: "place", place: show, now: 1 }], state)).toBe(state);
  });
});

describe("replyToastPreviewOf (RT-U7)", () => {
  test("RT-U7. 말은 한국어 본문, 사진 · 음성은 종류, 내 글 · 대기 · 안내 줄은 null", () => {
    expect(replyToastPreviewOf(text("them", "보고 싶어"))).toEqual({
      kind: "text",
      text: "보고 싶어",
    });
    expect(
      replyToastPreviewOf({ id: "p", at: 1, kind: "photo", url: "u" } as unknown as ChatMessage),
    ).toEqual({ kind: "photo" });
    expect(
      replyToastPreviewOf({
        id: "v",
        at: 1,
        kind: "voice",
        durationMs: 0,
        text: { ko: "", en: "" },
      }),
    ).toEqual({ kind: "voice" });
    expect(replyToastPreviewOf(text("me", "안녕"))).toBeNull();
    expect(replyToastPreviewOf({ id: "w", at: 1, kind: "photo-pending" })).toBeNull();
    expect(
      replyToastPreviewOf({ id: "n", at: 1, kind: "notice", notice: "ai-disclosure" }),
    ).toBeNull();
    expect(replyToastPreviewOf(null)).toBeNull();
  });
});
